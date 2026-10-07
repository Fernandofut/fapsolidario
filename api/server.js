/**
 * server.js — bootstrap da API do FAP Solidário.
 *
 * Fluxo de inicialização:
 *   1. Carrega as variáveis do api/.env (porta, CORS…);
 *   2. Prepara o banco SQLite (api/data/banco.sqlite);
 *   3. Sobe o Express com CORS + JSON + rotas sob /api.
 */
require('dotenv').config({ quiet: true });

const path = require('node:path');
const express = require('express');
const cors = require('cors');

const { db, iniciarBancoDeDados } = require('./database/database');
const rotas = require('./routes');

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

/* ---------------------------- Middlewares ---------------------------- */

// CORS: em desenvolvimento o .env pode fixar a origem do frontend
// (CORS_ORIGIN). Sem CORS_ORIGIN, qualquer origem é aceita (facilita
// o Live Server etc.). `credentials` é necessário para o cookie de
// sessão que será usado no módulo de autenticação.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || true,
    credentials: true,
  })
);

// Habilita a recepção de corpos em JSON (o frontend envia application/json)
app.use(express.json());

// Serve o frontend estático — dá para testar tudo em http://localhost:PORTA
// (as páginas chamam /api/* por caminho absoluto, sem precisar de proxy).
const PASTA_FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(PASTA_FRONTEND));

/* ------------------------------- Rotas ------------------------------- */

app.use('/api', rotas);

/* 404 — rota inexistente (sempre responde em JSON, padrão da API) */
app.use((req, res) => {
  res.status(404).json({ mensagem: `Rota não encontrada: ${req.method} ${req.originalUrl}` });
});

/* Erro não tratado — mantém a resposta em JSON para o frontend */
app.use((erro, req, res, _proximo) => {
  console.error('[ERRO]', erro.message);
  res.status(erro.status || 500).json({ mensagem: erro.message || 'Erro interno no servidor' });
});

/* --------------------------- Inicialização --------------------------- */

iniciarBancoDeDados()
  .then(() => {
    app.listen(PORTA, () => {
      console.log(`[OK] API FAP Solidário rodando em http://localhost:${PORTA}`);
      console.log(`     Healthcheck: http://localhost:${PORTA}/api/status`);
    });
  })
  .catch((erro) => {
    console.error('[ERRO] Falha ao preparar o banco de dados:', erro.message);
    process.exit(1);
  });

/* Encerra limpando a conexão com o SQLite (Ctrl+C) */
process.on('SIGINT', () => {
  db.close(() => process.exit(0));
});
