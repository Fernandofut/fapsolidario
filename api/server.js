/**
 * server.js — bootstrap da API do FAP Solidário.
 *
 * Fluxo de inicialização:
 *   1. Carrega as variáveis do api/.env (porta, CORS…);
 *   2. Prepara o banco SQLite (api/data/banco.sqlite);
 *   3. Sobe o Express com CORS + JSON + CSP + rotas sob /api.
 *
 * Correções de segurança aplicadas (auditoria 2026-10-29):
 *   - SESSION_SECRET persistido em ficheiro para sobreviver a reinícios;
 *   - CORS restrito à origem autorizada (não mais origin:true);
 *   - Cabeçalho Content-Security-Policy (CSP) em todas as respostas.
 */
require('dotenv').config({ quiet: true });

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const { db, iniciarBancoDeDados } = require('./database/database');
const { seedContasDeTeste } = require('./src/modules/auth/service');
const rotas = require('./routes');

/* -------- Segredo de sessão persistido (sobrevive a reinícios) -------- */
// 1.ª prioridade: variável no .env;
// 2.ª prioridade: lê de api/data/session_secret.txt;
// 3.ª prioridade: gera um novo, grava no ficheiro e avisa no console.
if (!process.env.SESSION_SECRET) {
  const caminhoSegredo = path.join(__dirname, 'data', 'session_secret.txt');
  try {
    process.env.SESSION_SECRET = fs.readFileSync(caminhoSegredo, 'utf8').trim();
    console.log('[OK] SESSION_SECRET carregado de api/data/session_secret.txt.');
  } catch {
    const novoSegredo = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(caminhoSegredo), { recursive: true });
    fs.writeFileSync(caminhoSegredo, novoSegredo, 'utf8');
    process.env.SESSION_SECRET = novoSegredo;
    console.warn('[AVISO] SESSION_SECRET gerado e gravado em api/data/session_secret.txt.');
  }
}

const app = express();
const PORTA = Number(process.env.PORT) || 3000;

/* ---------------------------- Middlewares ---------------------------- */

/* CORS restrito: aceita apenas a origem definida em CORS_ORIGIN (.env).
 * Padrão: http://localhost:<PORTA> — a mesma origem do servidor estático.
 * Em produção, defina CORS_ORIGIN com o domínio real. */
const origemPermitida = process.env.CORS_ORIGIN || `http://localhost:${PORTA}`;
app.use(
  cors({
    origin: origemPermitida,
    credentials: true,
  })
);

/* Content-Security-Policy — mitiga XSS ao restringir fontes de recursos.
 * unsafe-inline em style-src é necessário para estilos embutidos do
 * frontend atual; quando possível, migrar para nonces/hashes. */
app.use((req, res, proximo) => {
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://translate.google.com https://translate.googleapis.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://translate.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: https://www.google.com https://translate.google.com https://*.gstatic.com",
      "frame-src 'self' https://www.google.com https://maps.google.com https://translate.google.com",
      "connect-src 'self' https://translate.googleapis.com https://translate.google.com https://viacep.com.br",
    ].join('; ')
  );
  proximo();
});

// Habilita a recepção de corpos em JSON (o frontend envia application/json)
app.use(express.json());

// Lê os cookies das requisições (sessão de autenticação em req.cookies)
app.use(cookieParser());

// Serve o frontend estático — dá para testar tudo em http://localhost:PORTA
// (as páginas chamam /api/* por caminho absoluto, sem precisar de proxy).
const PASTA_FRONTEND = path.join(__dirname, '..', 'frontend');
app.use(express.static(PASTA_FRONTEND, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
    } else if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));
app.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.sendFile(path.join(PASTA_FRONTEND, 'index.html'));
});

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
  /* Seed IDEMPOTENTE das contas de demonstração (doador, beneficiário e
     empresa) + itens do Ponto Solidário Central. Rodar em todo boot garante
     as credenciais nativas também em bancos já existentes, sem duplicar dados. */
  .then(() => seedContasDeTeste())
  .then(() => {
    app.listen(PORTA, () => {
      console.log(`[OK] API FAP Solidário rodando em http://localhost:${PORTA}`);
      console.log(`     CORS origin: ${origemPermitida}`);
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
