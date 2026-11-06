/**
 * tests/notificacao.test.js — e-mail de nova solicitação de doação.
 *
 * Sobe a API com banco temporário e EMAIL_SIMULADO_FILE. Sem SMTP configurado,
 * o Nodemailer usa jsonTransport e grava o e-mail em JSONL, permitindo validar
 * o fluxo completo sem enviar mensagens reais.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PASTA_API = path.join(__dirname, '..');
const PORTA = 7000 + crypto.randomInt(0, 1000);
const BASE = `http://127.0.0.1:${PORTA}`;
const BANCO_TEMPORARIO = path.join(os.tmpdir(), `fap-notificacao-${crypto.randomUUID()}.sqlite`);
const ARQUIVO_EMAIL = path.join(os.tmpdir(), `fap-email-${crypto.randomUUID()}.jsonl`);

let servidor = null;
let cookieEmpresa = null;
let cookieBeneficiario = null;
let idItem = null;
let idPedido = null;
let emailEmpresa = null;
const nomeEmpresa = `Empresa Notificada ${crypto.randomUUID().slice(0, 8)}`;
const nomeBeneficiario = `Beneficiário Notificado ${crypto.randomUUID().slice(0, 8)}`;

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
  return (resposta.headers.get('set-cookie') || '').split(';')[0];
}

async function esperarEmailSimulado() {
  const limite = Date.now() + 8000;
  for (;;) {
    if (fs.existsSync(ARQUIVO_EMAIL)) {
      const linhas = fs.readFileSync(ARQUIVO_EMAIL, 'utf8').trim().split('\n').filter(Boolean);
      if (linhas.length > 0) return JSON.parse(linhas[linhas.length - 1]);
    }
    if (Date.now() > limite) throw new Error('E-mail simulado não foi gravado em 8s.');
    await new Promise((resolver) => setTimeout(resolver, 100));
  }
}

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: PASTA_API,
    env: {
      ...process.env,
      PORT: String(PORTA),
      FAP_BANCO_SQLITE: BANCO_TEMPORARIO,
      SESSION_SECRET: 'segredo-de-teste-notificacao-32-chars!',
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

  const sufixo = crypto.randomUUID().slice(0, 8);
  emailEmpresa = `empresa_notificada_${sufixo}@teste.com`;
  const senha = 'senha-segura-123';

  const empresa = await chamar('POST', '/api/auth/registro', {
    corpo: {
      nome: nomeEmpresa,
      email: emailEmpresa,
      senha,
      tipo: 'Empresa',
      tipo_pessoa: 'PJ',
      documento: '12345678000199',
      telefone: '(66) 97777-3333',
      cep: '78600-002',
      rua: 'Rua da Empresa',
      bairro: 'Industrial',
      numero: '30',
      horario_funcionamento: 'Seg a sex, das 8h às 18h',
      categorias: 'alimentos',
    },
  });
  assert.equal(empresa.status, 201, 'cadastro da empresa deveria funcionar');

  const beneficiario = await chamar('POST', '/api/auth/registro', {
    corpo: {
      nome: nomeBeneficiario,
      email: `beneficiario_notificado_${sufixo}@teste.com`,
      senha,
      tipo: 'Beneficiário',
      cpf: '98765432101',
      rg: '1234567-8 SSP/MT',
      data_nascimento: '1990-05-10',
      telefone: '(66) 98888-2222',
      nis: '12345678901',
      cep: '78600-001',
      rua: 'Rua do Beneficiário',
      bairro: 'Jardim Solidário',
      numero: '20',
      ponto_referencia: 'Ao lado da escola',
      adultos: 2,
      criancas: 3,
      idosos: 1,
      renda_familiar: 'Até 1 salário mínimo',
      necessidades: 'Cesta Básica / Alimentos',
    },
  });
  assert.equal(beneficiario.status, 201, 'cadastro do beneficiário deveria funcionar');

  cookieEmpresa = await login(emailEmpresa, senha);
  cookieBeneficiario = await login(`beneficiario_notificado_${sufixo}@teste.com`, senha);

  const doacao = await chamar('POST', '/api/estoque', {
    cookie: cookieEmpresa,
    corpo: {
      nome_item: 'Cesta Básica Notificação',
      categoria: 'Alimentos',
      quantidade: 5,
      empresa_nome: nomeEmpresa,
      data_validade: '',
    },
  });
  assert.equal(doacao.status, 201, 'doação deveria ser criada');
  idItem = (await doacao.json()).item.id;
});

after(() => {
  if (servidor && !servidor.killed) servidor.kill('SIGINT');
  for (const sufixo of ['', '-wal', '-shm']) {
    fs.rmSync(`${BANCO_TEMPORARIO}${sufixo}`, { force: true });
  }
  fs.rmSync(ARQUIVO_EMAIL, { force: true });
});

test('POST /api/pedidos — grava pendente_contato, agenda e envia e-mail simulado', async () => {
  const resposta = await chamar('POST', '/api/pedidos', {
    cookie: cookieBeneficiario,
    corpo: { id_item: idItem, quantidade_pedida: 2 },
  });
  assert.equal(resposta.status, 201);

  const dados = await resposta.json();
  assert.equal(dados.pedido.status, 'pendente_contato');
  assert.equal(dados.notificacao.agendada, true);
  assert.equal(dados.notificacao.modo_simulado, true);
  assert.equal(dados.notificacao.empresa, nomeEmpresa);
  idPedido = dados.pedido.id;

  const email = await esperarEmailSimulado();
  assert.equal(email.para, emailEmpresa);
  assert.match(email.assunto, /^\[FAP Solidário\] Nova Solicitação de Doação: Cesta Básica Notificação$/);
  assert.match(email.html, /Ficha do Solicitante/);
  assert.ok(email.html.includes(nomeBeneficiario), 'HTML deve conter o nome do solicitante');
  assert.match(email.html, /Rua do Beneficiário/);
  assert.match(email.html, /Jardim Solidário/);
  assert.match(email.html, /12345678901/);
  assert.match(email.html, /wa\.me\/5566988882222/);
  assert.match(email.html, /Quantidade solicitada: <strong>2<\/strong>/);
  assert.equal(email.simulado, true);
});

test('GET /api/pedidos — devolve o novo status para a interface', async () => {
  const resposta = await chamar('GET', '/api/pedidos', { cookie: cookieBeneficiario });
  assert.equal(resposta.status, 200);

  const pedidos = await resposta.json();
  const pedido = pedidos.find((item) => item.id === idPedido);
  assert.ok(pedido, 'pedido criado deve aparecer no histórico');
  assert.equal(pedido.status, 'pendente_contato');
});

test('Pedido pendente_contato pode ser cancelado e devolve o estoque', async () => {
  const cancelamento = await chamar('PUT', `/api/pedidos/${idPedido}/status`, {
    cookie: cookieBeneficiario,
    corpo: { status: 'cancelado' },
  });
  assert.equal(cancelamento.status, 200);
  assert.equal((await cancelamento.json()).pedido.status, 'cancelado');

  const estoque = await chamar('GET', '/api/estoque', { cookie: cookieBeneficiario });
  assert.equal(estoque.status, 200);
  const item = (await estoque.json()).find((linha) => linha.id === idItem);
  assert.equal(item.quantidade, 5, 'cancelamento deve devolver as 2 unidades ao estoque');
});

test('Sem SMTP real, nenhuma conexão externa é tentada (modo simulado)', async () => {
  const servico = require('../src/services/email.service');
  assert.equal(servico.emailSimulado(), true);
});
