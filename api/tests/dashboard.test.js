/**
 * tests/dashboard.test.js — testes de integração do GET /api/dashboard.
 *
 * Sobe o server.js num banco SQLite TEMPORÁRIO (FAP_BANCO_SQLITE) para não
 * tocar no banco real, e valida com node:test:
 *   1. proteção de sessão (401 sem cookie / cookie forjado);
 *   2. contrato JSON esperado pelo frontend (dashboard.html);
 *   3. consolidação correta de categorias, ranking e totais.
 * Executar: cd api && npm test
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PASTA_API = path.join(__dirname, '..');
const PORTA = 4000 + crypto.randomInt(1000, 2000);
const BASE = `http://127.0.0.1:${PORTA}`;
const BANCO_TEMPORARIO = path.join(os.tmpdir(), `fap-dashboard-${crypto.randomUUID()}.sqlite`);

const cookieDoador = { valor: null };
const cookieRecebedor = { valor: null };

let servidor = null;

/* --------------------------- utilitários HTTP --------------------------- */

async function chamar(metodo, caminho, { corpo, cookie } = {}) {
  const cabecalhos = {};
  if (corpo) cabecalhos['Content-Type'] = 'application/json';
  if (cookie) cabecalhos.Cookie = cookie;
  return fetch(`${BASE}/api${caminho}`, {
    method: metodo,
    headers: cabecalhos,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

async function login(email, senha) {
  const resposta = await chamar('POST', '/auth/login', { corpo: { email, senha } });
  assert.equal(resposta.status, 200, `login de ${email} deveria funcionar`);
  return (resposta.headers.get('set-cookie') || '').split(';')[0];
}

/* ------------------------- ciclo de vida do teste ------------------------ */

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: PASTA_API,
    env: { ...process.env, PORT: String(PORTA), FAP_BANCO_SQLITE: BANCO_TEMPORARIO },
    stdio: 'ignore',
  });

  const limite = Date.now() + 15000;
  for (;;) {
    try {
      const status = await fetch(`${BASE}/api/status`);
      if (status.ok) break;
    } catch {
      /* servidor ainda subindo */
    }
    if (Date.now() > limite) throw new Error('A API não subiu em 15s.');
    await new Promise((resolver) => setTimeout(resolver, 150));
  }

  cookieDoador.valor = await login('teste@fap.com', '123456');
  cookieRecebedor.valor = await login('recebedor@fap.com', '123456');
});

after(() => {
  if (servidor) servidor.kill();
  for (const sufixo of ['', '-wal', '-shm']) {
    fs.rmSync(`${BANCO_TEMPORARIO}${sufixo}`, { force: true });
  }
});

/* -------------------------------- testes -------------------------------- */

test('sem sessão → 401 com mensagem JSON', async () => {
  const resposta = await chamar('GET', '/dashboard');
  assert.equal(resposta.status, 401);
  const corpo = await resposta.json();
  assert.match(corpo.mensagem, /sess/i);
});

test('cookie forjado → 401', async () => {
  const resposta = await chamar('GET', '/dashboard', {
    cookie: 'fap_sessao=v1.eyJpZCI6OTk5OTk5OTk5OX0.abc123',
  });
  assert.equal(resposta.status, 401);
});

test('sessão válida em banco inicial → 200 com o formato do frontend', async () => {
  const resposta = await chamar('GET', '/dashboard', { cookie: cookieDoador.valor });
  assert.equal(resposta.status, 200);

  const dados = await resposta.json();
  assert.ok(Array.isArray(dados.categorias), 'categorias deve ser array');
  assert.ok(Array.isArray(dados.ranking), 'ranking deve ser array');

  /* O seed idempotente cria o Ponto Solidário Central com 3 itens, inclusive
     em bancos novos. O teste valida o contrato sobre esse estado inicial. */
  assert.deepEqual(dados.categorias, [
    { categoria: 'Alimentos', total: 20 },
    { categoria: 'Higiene', total: 12 },
    { categoria: 'Roupas', total: 8 },
  ]);
  assert.deepEqual(dados.ranking, [{ empresa_nome: 'Ponto Solidário Central', total_doado: 40 }]);
  assert.deepEqual(dados.totais, {
    doacoes: 3,
    pedidos: 0,
    quantidade_itens: 40,
    categorias: 3,
    empresas: 1,
  });
});

test('consolida doações, pedidos, categorias e ranking', async () => {
  /* Três doações: Empresa X em 2 categorias, Empresa Y em outra. */
  const doacoes = [
    { nome_item: 'Arroz', categoria: 'Alimentos', quantidade: 10, empresa_nome: 'Empresa X', data_validade: '' },
    { nome_item: 'Calca', categoria: 'Roupas', quantidade: 5, empresa_nome: 'Empresa X', data_validade: '' },
    { nome_item: 'Sabonete', categoria: 'Higiene', quantidade: 7, empresa_nome: 'Empresa Y', data_validade: '' },
  ];
  let idItemAlimentos = null;
  for (const doacao of doacoes) {
    const resposta = await chamar('POST', '/estoque', { corpo: doacao, cookie: cookieDoador.valor });
    assert.equal(resposta.status, 201, `doação "${doacao.nome_item}" deveria ser aceita`);
    const { item } = await resposta.json();
    if (doacao.categoria === 'Alimentos') idItemAlimentos = item.id;
  }

  /* Um pedido baixa 3 unidades de Alimentos (RN04). */
  const pedido = await chamar('POST', '/pedidos', {
    corpo: { id_item: idItemAlimentos, quantidade_pedida: 3 },
    cookie: cookieRecebedor.valor,
  });
  assert.equal(pedido.status, 201, 'pedido deveria ser aceito');

  const resposta = await chamar('GET', '/dashboard', { cookie: cookieRecebedor.valor });
  assert.equal(resposta.status, 200);
  const dados = await resposta.json();

  /* Totais por categoria (inclui o seed e já desconta a baixa do pedido). */
  const porCategoria = Object.fromEntries(dados.categorias.map((c) => [c.categoria, c.total]));
  assert.deepEqual(porCategoria, { Alimentos: 27, Higiene: 19, Roupas: 13 });

  /* Ranking por empresa, do maior para o menor (com o Ponto Solidário Central). */
  assert.deepEqual(dados.ranking, [
    { empresa_nome: 'Ponto Solidário Central', total_doado: 40 },
    { empresa_nome: 'Empresa X', total_doado: 12 },
    { empresa_nome: 'Empresa Y', total_doado: 7 },
  ]);

  /* Contagens gerais. */
  assert.equal(dados.totais.doacoes, 6);
  assert.equal(dados.totais.pedidos, 1);
  assert.equal(dados.totais.quantidade_itens, 59);
  assert.equal(dados.totais.categorias, 3);
  assert.equal(dados.totais.empresas, 3);

  /* Coerência entre os blocos da resposta (soma bate com o total geral). */
  const somaCategorias = dados.categorias.reduce((acc, c) => acc + c.total, 0);
  const somaRanking = dados.ranking.reduce((acc, e) => acc + e.total_doado, 0);
  assert.equal(somaCategorias, dados.totais.quantidade_itens);
  assert.equal(somaRanking, dados.totais.quantidade_itens);
});
