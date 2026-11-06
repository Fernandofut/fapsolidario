/**
 * tests/empresa.test.js — gestão de solicitações pela Empresa/Ponto de Coleta.
 *
 * Sobe a API com banco temporário e valida o fluxo real:
 *   seed empresa@fap.com → login/redirecionamento → pedido do beneficiário →
 *   listagem com ficha social → transições de status → estoque/visibilidade.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PASTA_API = path.join(__dirname, '..');
const PORTA = 8000 + crypto.randomInt(0, 900);
const BASE = `http://127.0.0.1:${PORTA}`;
const BANCO_TEMPORARIO = path.join(os.tmpdir(), `fap-empresa-${crypto.randomUUID()}.sqlite`);
const ARQUIVO_EMAIL = path.join(os.tmpdir(), `fap-empresa-email-${crypto.randomUUID()}.jsonl`);

let servidor = null;
const cookies = { empresa: null, beneficiario: null, doador: null };

async function chamar(metodo, caminho, { corpo, cookie } = {}) {
  const cabecalhos = {};
  if (corpo) cabecalhos['Content-Type'] = 'application/json';
  if (cookie) cabecalhos.Cookie = cookie;
  return fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

async function login(email, senha) {
  const resposta = await chamar('POST', '/api/auth/login', { corpo: { email, senha } });
  assert.equal(resposta.status, 200, `login de ${email} deveria funcionar`);
  return {
    cookie: (resposta.headers.get('set-cookie') || '').split(';')[0],
    dados: await resposta.json(),
  };
}

async function criarItem(nome, quantidade) {
  const resposta = await chamar('POST', '/api/estoque', {
    cookie: cookies.empresa,
    corpo: {
      nome_item: nome,
      categoria: 'Alimentos',
      quantidade,
      empresa_nome: 'Ponto Solidário Central',
      data_validade: '',
    },
  });
  assert.equal(resposta.status, 201, `item "${nome}" deveria ser criado`);
  return (await resposta.json()).item;
}

async function criarPedido(idItem, quantidade) {
  const resposta = await chamar('POST', '/api/pedidos', {
    cookie: cookies.beneficiario,
    corpo: { id_item: idItem, quantidade_pedida: quantidade },
  });
  assert.equal(resposta.status, 201, 'pedido deveria ser criado');
  return (await resposta.json()).pedido;
}

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: PASTA_API,
    env: {
      ...process.env,
      PORT: String(PORTA),
      FAP_BANCO_SQLITE: BANCO_TEMPORARIO,
      SESSION_SECRET: 'segredo-de-teste-empresa-32-caracteres!',
      EMAIL_SIMULADO_FILE: ARQUIVO_EMAIL,
      SMTP_HOST: '',
      SMTP_USER: '',
      SMTP_PASS: '',
    },
    stdio: 'ignore',
  });

  const limite = Date.now() + 15000;
  for (;;) {
    try {
      const resposta = await fetch(`${BASE}/api/status`);
      if (resposta.ok) break;
    } catch {
      /* servidor ainda subindo */
    }
    if (Date.now() > limite) throw new Error('A API não subiu em 15s.');
    await new Promise((resolver) => setTimeout(resolver, 150));
  }

  const empresa = await login('empresa@fap.com', '123456');
  cookies.empresa = empresa.cookie;
  assert.equal(empresa.dados.tipo, 'Empresa');
  assert.equal(empresa.dados.redirecionar, '/pages/dashboard.html?aba=solicitacoes');
  cookies.beneficiario = (await login('recebedor@fap.com', '123456')).cookie;
  cookies.doador = (await login('teste@fap.com', '123456')).cookie;
});

after(() => {
  if (servidor && !servidor.killed) servidor.kill('SIGINT');
  for (const sufixo of ['', '-wal', '-shm']) {
    fs.rmSync(`${BANCO_TEMPORARIO}${sufixo}`, { force: true });
  }
  fs.rmSync(ARQUIVO_EMAIL, { force: true });
});

test('seed cria empresa, perfil e itens disponíveis no estoque', async () => {
  const resposta = await chamar('GET', '/api/estoque', { cookie: cookies.empresa });
  assert.equal(resposta.status, 200);
  const itens = await resposta.json();
  const nomes = itens.map((item) => item.nome_item);
  assert.ok(nomes.includes('Cesta Básica'));
  assert.ok(nomes.includes('Casaco M'));
  assert.ok(nomes.includes('Kit de Higiene'));
  assert.ok(itens.every((item) => item.empresa_nome === 'Ponto Solidário Central'));
});

test('sem sessão → 401; doador comum → 403 na gestão da empresa', async () => {
  const semSessao = await chamar('GET', '/api/empresa/solicitacoes');
  assert.equal(semSessao.status, 401);

  const comum = await chamar('GET', '/api/empresa/solicitacoes', { cookie: cookies.doador });
  assert.equal(comum.status, 403);
});

test('lista solicitação com item, data, status e ficha completa do beneficiário', async () => {
  const item = await criarItem('Item Ficha Teste', 10);
  const pedido = await criarPedido(item.id, 3);

  const resposta = await chamar('GET', '/api/empresa/solicitacoes', { cookie: cookies.empresa });
  assert.equal(resposta.status, 200);
  const solicitacoes = await resposta.json();
  assert.ok(Array.isArray(solicitacoes));

  const solicitacao = solicitacoes.find((linha) => linha.id === pedido.id);
  assert.ok(solicitacao, 'pedido do item da empresa deveria aparecer');
  assert.equal(solicitacao.status, 'PENDENTE');
  assert.equal(solicitacao.status_interno, 'pendente_contato');
  assert.equal(solicitacao.nome_item, 'Item Ficha Teste');
  assert.equal(solicitacao.quantidade_solicitada, 3);
  assert.ok(solicitacao.data_solicitacao);
  assert.equal(solicitacao.beneficiario.nome, 'Maria da Silva (Beneficiária de Teste)');
  assert.equal(solicitacao.beneficiario.possui_nis, true);
  assert.ok(solicitacao.beneficiario.composicao_familiar.total >= 1);
  assert.ok(solicitacao.beneficiario.endereco_completo.includes('Rua das Flores'));
  assert.equal(solicitacao.prioridade_social.nivel, 'alta');
});

test('beneficiário não pode usar PATCH da empresa; dono e status são validados', async () => {
  const resposta = await chamar('PATCH', '/api/pedidos/1/status', {
    cookie: cookies.beneficiario,
    corpo: { status: 'EM_ATENDIMENTO' },
  });
  assert.equal(resposta.status, 403);

  const invalido = await chamar('PATCH', '/api/pedidos/1/status', {
    cookie: cookies.empresa,
    corpo: { status: 'QUALQUER' },
  });
  assert.equal(invalido.status, 400);

  const inexistente = await chamar('PATCH', '/api/pedidos/999999/status', {
    cookie: cookies.empresa,
    corpo: { status: 'EM_ATENDIMENTO' },
  });
  assert.equal(inexistente.status, 404);
});

test('EM_ATENDIMENTO → ENTREGUE, sem dupla baixa, oculta item zerado', async () => {
  const item = await criarItem('Item Entrega Teste', 4);
  const pedido = await criarPedido(item.id, 4);

  const atendimento = await chamar('PATCH', `/api/pedidos/${pedido.id}/status`, {
    cookie: cookies.empresa,
    corpo: { status: 'EM_ATENDIMENTO' },
  });
  assert.equal(atendimento.status, 200);
  assert.equal((await atendimento.json()).solicitacao.status, 'EM_ATENDIMENTO');

  const entrega = await chamar('PATCH', `/api/pedidos/${pedido.id}/status`, {
    cookie: cookies.empresa,
    corpo: { status: 'ENTREGUE' },
  });
  assert.equal(entrega.status, 200);
  assert.equal((await entrega.json()).solicitacao.status, 'ENTREGUE');

  const estoque = await chamar('GET', `/api/estoque/${item.id}`, { cookie: cookies.empresa });
  assert.equal(estoque.status, 200);
  assert.equal((await estoque.json()).quantidade, 0, 'ENTREGUE não pode subtrair de novo');

  const lista = await chamar('GET', '/api/estoque', { cookie: cookies.empresa });
  const itens = await lista.json();
  assert.ok(!itens.some((linha) => linha.id === item.id), 'item zerado não deve ser listado');

  const repetir = await chamar('PATCH', `/api/pedidos/${pedido.id}/status`, {
    cookie: cookies.empresa,
    corpo: { status: 'CANCELADO' },
  });
  assert.equal(repetir.status, 409, 'status terminal não pode ser reaberto');
});

test('CANCELAMENTO devolve a quantidade ao estoque uma única vez', async () => {
  const item = await criarItem('Item Cancelamento Teste', 6);
  const pedido = await criarPedido(item.id, 2);

  const antes = await chamar('GET', `/api/estoque/${item.id}`, { cookie: cookies.empresa });
  assert.equal((await antes.json()).quantidade, 4);

  const cancelamento = await chamar('PATCH', `/api/pedidos/${pedido.id}/status`, {
    cookie: cookies.empresa,
    corpo: { status: 'CANCELADO' },
  });
  assert.equal(cancelamento.status, 200);
  assert.equal((await cancelamento.json()).solicitacao.status, 'CANCELADO');

  const depois = await chamar('GET', `/api/estoque/${item.id}`, { cookie: cookies.empresa });
  assert.equal((await depois.json()).quantidade, 6);

  const repetir = await chamar('PATCH', `/api/pedidos/${pedido.id}/status`, {
    cookie: cookies.empresa,
    corpo: { status: 'CANCELADO' },
  });
  assert.equal(repetir.status, 200, 'repetir o mesmo status é idempotente');

  const confirmacao = await chamar('GET', `/api/estoque/${item.id}`, { cookie: cookies.empresa });
  assert.equal((await confirmacao.json()).quantidade, 6, 'estoque não pode ser devolvido duas vezes');
});
