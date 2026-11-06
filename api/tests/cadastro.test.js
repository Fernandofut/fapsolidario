/**
 * tests/cadastro.test.js — testes de integração do cadastro por perfil.
 *
 * Sobe o server.js num banco SQLite TEMPORÁRIO (FAP_BANCO_SQLITE) e confirma
 * que Doador, Beneficiário e Empresa são validados, criados em `usuarios` e
 * persistidos nas tabelas de perfil (`doadores` / `beneficiarios`).
 */
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sqlite3 = require('sqlite3');

const PASTA_API = path.join(__dirname, '..');
const PORTA = 9000 + crypto.randomInt(0, 1000);
const BASE = `http://127.0.0.1:${PORTA}`;
const BANCO_TEMPORARIO = path.join(os.tmpdir(), `fap-cadastro-${crypto.randomUUID()}.sqlite`);

let servidor = null;

async function chamar(metodo, caminho, corpo) {
  return fetch(`${BASE}${caminho}`, {
    method: metodo,
    headers: corpo ? { 'Content-Type': 'application/json' } : {},
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
}

function abrirBanco() {
  return new Promise((resolver, rejeitar) => {
    const db = new sqlite3.Database(BANCO_TEMPORARIO, sqlite3.OPEN_READONLY, (erro) =>
      erro ? rejeitar(erro) : resolver(db)
    );
  });
}

function consultar(db, sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.all(sql, params, (erro, linhas) => (erro ? rejeitar(erro) : resolver(linhas)));
  });
}

before(async () => {
  servidor = spawn(process.execPath, ['server.js'], {
    cwd: PASTA_API,
    env: {
      ...process.env,
      PORT: String(PORTA),
      FAP_BANCO_SQLITE: BANCO_TEMPORARIO,
      SESSION_SECRET: 'segredo-de-teste-cadastro-32-chars!',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  await new Promise((resolver, rejeitar) => {
    const temporizador = setTimeout(() => rejeitar(new Error('Servidor não subiu em 15s')), 15000);

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
  for (const sufixo of ['', '-wal', '-shm']) {
    fs.rmSync(`${BANCO_TEMPORARIO}${sufixo}`, { force: true });
  }
});

test('Doador — dados pessoais, logística e categorias persistidos', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const email = `doador_${idUnico}@teste.com`;

  const resposta = await chamar('POST', '/api/auth/registro', {
    nome: `Doador ${idUnico}`,
    email,
    senha: 'senha-segura-123',
    tipo: 'Doador Comum',
    tipo_pessoa: 'PF',
    documento: '12345678901',
    telefone: '(66) 99999-1111',
    cep: '78600-000',
    rua: 'Rua A',
    bairro: 'Centro',
    numero: '10',
    complemento: 'Casa',
    logistica: 'retirada_domicilio',
    categorias: 'alimentos,roupas',
  });
  assert.equal(resposta.status, 201);

  const db = await abrirBanco();
  const linhas = await consultar(
    db,
    `SELECT u.nome, u.telefone, d.tipo_pessoa, d.documento, d.logistica, d.categorias
       FROM usuarios u JOIN doadores d ON d.usuario_id = u.id
      WHERE u.email = ?`,
    [email]
  );
  db.close();

  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].telefone, '(66) 99999-1111');
  assert.equal(linhas[0].tipo_pessoa, 'PF');
  assert.equal(linhas[0].documento, '12345678901');
  assert.equal(linhas[0].logistica, 'retirada_domicilio');
  assert.equal(linhas[0].categorias, 'alimentos,roupas');
});

test('Beneficiário — triagem social, NIS, composição familiar e necessidades', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const email = `beneficiario_${idUnico}@teste.com`;

  const resposta = await chamar('POST', '/api/auth/registro', {
    nome: `Beneficiário ${idUnico}`,
    email,
    senha: 'senha-segura-123',
    tipo: 'Beneficiário',
    cpf: '98765432101',
    rg: '1234567-8 SSP/MT',
    data_nascimento: '1990-05-10',
    telefone: '(66) 98888-2222',
    nis: '12345678901',
    cep: '78600-001',
    rua: 'Rua B',
    bairro: 'Jardim',
    numero: '20',
    ponto_referencia: 'Ao lado da escola',
    adultos: 2,
    criancas: 3,
    idosos: 1,
    renda_familiar: 'Até 1 salário mínimo',
    necessidades: 'Cesta Básica / Alimentos,Itens de Higiene',
  });
  assert.equal(resposta.status, 201);

  const db = await abrirBanco();
  const linhas = await consultar(
    db,
    `SELECT b.cpf, b.nis, b.ponto_referencia, b.adultos, b.criancas, b.idosos,
            b.renda_familiar, b.necessidades
       FROM usuarios u JOIN beneficiarios b ON b.usuario_id = u.id
      WHERE u.email = ?`,
    [email]
  );
  db.close();

  assert.equal(linhas.length, 1);
  assert.equal(linhas[0].nis, '12345678901');
  assert.equal(linhas[0].ponto_referencia, 'Ao lado da escola');
  assert.equal(linhas[0].adultos, 2);
  assert.equal(linhas[0].criancas, 3);
  assert.equal(linhas[0].idosos, 1);
  assert.equal(linhas[0].renda_familiar, 'Até 1 salário mínimo');
  assert.match(linhas[0].necessidades, /Higiene/);
});

test('Empresa — CNPJ, horário e local de coleta sincronizado', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const email = `empresa_${idUnico}@teste.com`;
  const nome = `Ponto Solidário ${idUnico}`;

  const resposta = await chamar('POST', '/api/auth/registro', {
    nome,
    email,
    senha: 'senha-segura-123',
    tipo: 'Empresa',
    tipo_pessoa: 'PJ',
    documento: '12345678000199',
    telefone: '(66) 97777-3333',
    cep: '78600-002',
    rua: 'Rua C',
    bairro: 'Industrial',
    numero: '30',
    complemento: 'Galpão',
    ponto_referencia: 'Em frente à praça',
    horario_funcionamento: 'Seg a sex, das 8h às 18h',
    categorias: 'alimentos,moveis',
  });
  assert.equal(resposta.status, 201);

  const db = await abrirBanco();
  const perfil = await consultar(
    db,
    `SELECT d.documento, d.horario_funcionamento, d.ponto_referencia
       FROM usuarios u JOIN doadores d ON d.usuario_id = u.id
      WHERE u.email = ?`,
    [email]
  );
  const local = await consultar(db, 'SELECT tipo, telefone FROM locais WHERE nome = ?', [nome]);
  db.close();

  assert.equal(perfil.length, 1);
  assert.equal(perfil[0].documento, '12345678000199');
  assert.match(perfil[0].horario_funcionamento, /18h/);
  assert.equal(perfil[0].ponto_referencia, 'Em frente à praça');

  assert.equal(local.length, 1);
  assert.equal(local[0].tipo, 'Empresa Parceira');
  assert.equal(local[0].telefone, '(66) 97777-3333');
});

test('Beneficiário sem composição familiar/necessidades — recusado com 400', async () => {
  const idUnico = crypto.randomUUID().slice(0, 8);
  const resposta = await chamar('POST', '/api/auth/registro', {
    nome: `Inválido ${idUnico}`,
    email: `invalido_${idUnico}@teste.com`,
    senha: 'senha-segura-123',
    tipo: 'Beneficiário',
    cpf: '98765432101',
    rg: '1234567-8',
    data_nascimento: '1990-05-10',
    telefone: '(66) 98888-2222',
    cep: '78600-001',
    rua: 'Rua B',
    bairro: 'Jardim',
    numero: '20',
    ponto_referencia: 'Ao lado da escola',
    adultos: 0,
    criancas: 0,
    idosos: 0,
    renda_familiar: 'Sem renda fixa',
    necessidades: '',
  });

  assert.equal(resposta.status, 400);
  const corpo = await resposta.json();
  assert.match(corpo.mensagem, /composição familiar|necessidade/i);
});
