/**
 * tests/locais.test.js — testes de integração do módulo de locais e instituições parceiras.
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const PASTA_API = path.join(__dirname, '..');
const PORTA = 4000 + crypto.randomInt(2000, 3000);
const BASE = `http://127.0.0.1:${PORTA}`;
const BANCO_TEMPORARIO = path.join(os.tmpdir(), `fap-locais-${crypto.randomUUID()}.sqlite`);

let servidor = null;

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

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: PASTA_API,
    env: {
      ...process.env,
      PORT: String(PORTA),
      FAP_BANCO_SQLITE: BANCO_TEMPORARIO,
      SESSION_SECRET: 'segredo-de-teste-locais-32-chars-long!',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolver, rejeitar) => {
    const temporizador = setTimeout(() => {
      rejeitar(new Error('Servidor não subiu em 5s'));
    }, 5000);

    servidor.stdout.on('data', (dado) => {
      if (dado.toString().includes('API FAP Solidário rodando')) {
        clearTimeout(temporizador);
        resolver();
      }
    });

    servidor.on('error', (erro) => {
      clearTimeout(temporizador);
      rejeitar(erro);
    });
  });
});

after(() => {
  if (servidor && !servidor.killed) servidor.kill('SIGINT');
  try {
    if (fs.existsSync(BANCO_TEMPORARIO)) fs.rmSync(BANCO_TEMPORARIO, { force: true });
  } catch {}
});

test('GET /api/locais — retorna lista com instituições iniciais', async () => {
  const resp = await chamar('GET', '/locais');
  assert.equal(resp.status, 200);

  const locais = await resp.json();
  assert.ok(Array.isArray(locais));
  assert.ok(locais.length >= 5);

  const apae = locais.find((l) => l.nome.includes('APAE'));
  assert.ok(apae, 'APAE deve estar na lista de locais');
  assert.ok(apae.telefone);
  assert.ok(apae.mapa_url);
});

test('GET /api/locais?categoria=roupas — filtra instituições da categoria', async () => {
  const resp = await chamar('GET', '/locais?categoria=roupas');
  assert.equal(resp.status, 200);

  const locais = await resp.json();
  assert.ok(Array.isArray(locais));
  for (const l of locais) {
    const cats = String(l.categorias).toLowerCase();
    assert.ok(cats.includes('roupas') || cats.includes('todas'));
  }
});

test('Novo cadastro de Empresa — aparece dinamicamente em /api/locais', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const nomeEmpresa = `Mercado Solidário ${idUnico}`;

  const respCadastro = await chamar('POST', '/auth/cadastro', {
    corpo: {
      nome: nomeEmpresa,
      email: `empresa_${idUnico}@teste.com`,
      senha: 'senha-segura-123',
      tipo: 'Empresa',
      telefone: '(66) 99777-6655',
      cep: '78600-000',
      rua: 'das Flores',
      bairro: 'Centro',
      numero: '123',
      complemento: 'Sala 2',
      categorias: 'alimentos,roupas',
    },
  });
  assert.equal(respCadastro.status, 201);

  const respLocais = await chamar('GET', '/locais?categoria=alimentos');
  assert.equal(respLocais.status, 200);

  const locais = await respLocais.json();
  const encontrada = locais.find((l) => l.nome === nomeEmpresa);
  assert.ok(encontrada, 'A nova empresa cadastrada deve aparecer dinamicamente na lista de locais');
  assert.equal(encontrada.tipo, 'Empresa Parceira');
  assert.equal(encontrada.telefone, '(66) 99777-6655');
  assert.equal(encontrada.telefone_link, '5566997776655');
  assert.equal(encontrada.cep, '78600-000');
  assert.equal(encontrada.rua, 'das Flores');
  assert.equal(encontrada.bairro, 'Centro');
  assert.equal(encontrada.numero, '123');
  assert.equal(encontrada.complemento, 'Sala 2');
  assert.equal(encontrada.endereco, 'Rua das Flores, nº 123, Sala 2, Bairro Centro - CEP 78600-000');
  assert.match(encontrada.categorias, /alimentos/);
  assert.match(encontrada.categorias, /roupas/);
});

test('Empresa sem dados obrigatórios — cadastro recusado com 400', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const resp = await chamar('POST', '/auth/cadastro', {
    corpo: {
      nome: `Empresa Incompleta ${idUnico}`,
      email: `incompleta_${idUnico}@teste.com`,
      senha: 'senha-segura-123',
      tipo: 'Empresa',
      telefone: '(66) 99777-6655',
    },
  });

  assert.equal(resp.status, 400);
  const corpo = await resp.json();
  assert.match(corpo.mensagem, /CEP|rua|bairro|número/i);
});

