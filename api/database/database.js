/**
 * database.js — conexão com o banco SQLite do FAP Solidário.
 *
 * O arquivo do banco fica em `api/data/banco.sqlite` (a pasta `data/`
 * é criada automaticamente na 1ª execução e NÃO vai para o Git).
 *
 * Exporta:
 *   - db                  → conexão sqlite3, usada pelos controladores/services;
 *   - iniciarBancoDeDados → Promise que cria o esquema inicial (tabelas).
 */
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const PASTA_DADOS = path.join(__dirname, '..', 'data');
const ARQUIVO_BANCO = path.join(PASTA_DADOS, 'banco.sqlite');

// Garante que api/data/ exista antes de abrir o banco
fs.mkdirSync(PASTA_DADOS, { recursive: true });

const db = new sqlite3.Database(ARQUIVO_BANCO, (erro) => {
  if (erro) {
    console.error('[ERRO] Não foi possível abrir o banco de dados:', erro.message);
  }
});

/* Executa um comando SQL e devolve uma Promise (facilita o `await`). */
function executar(sql) {
  return new Promise((resolver, rejeitar) => {
    db.run(sql, (erro) => (erro ? rejeitar(erro) : resolver()));
  });
}

/* Esquema inicial — ajustável conforme os módulos evoluírem. */
const SQL_CRIAR_TABELAS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      senha_hash TEXT    NOT NULL,
      papel      TEXT    NOT NULL DEFAULT 'doador'
                 CHECK (papel IN ('doador', 'recebedor')),
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS doacoes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      doador_id  INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
      item       TEXT    NOT NULL,
      categoria  TEXT    NOT NULL
                 CHECK (categoria IN ('alimentos', 'roupas', 'higiene', 'moveis', 'cultura', 'dinheiro')),
      quantidade INTEGER NOT NULL CHECK (quantidade > 0),
      validade   TEXT,
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS pedidos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      doacao_id    INTEGER NOT NULL REFERENCES doacoes (id),
      recebedor_id INTEGER NOT NULL REFERENCES usuarios (id),
      quantidade   INTEGER NOT NULL CHECK (quantidade > 0),
      status       TEXT    NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pendente', 'concluido', 'cancelado')),
      criado_em    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
];

/**
 * Prepara o banco: PRAGMAs + criação das tabelas (se não existirem).
 * Chamada pelo server.js ANTES de o Express começar a escutar.
 */
async function iniciarBancoDeDados() {
  await executar('PRAGMA foreign_keys = ON;'); // ativa chaves estrangeiras
  await executar('PRAGMA journal_mode = WAL;'); // evita "database is locked" com requisições concorrentes

  for (const sql of SQL_CRIAR_TABELAS) {
    await executar(sql);
  }

  console.log(`[OK] Banco de dados pronto em ${ARQUIVO_BANCO}`);
  return db;
}

module.exports = { db, iniciarBancoDeDados };
