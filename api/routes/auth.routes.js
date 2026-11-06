/**
 * auth.routes.js — rotas de autenticação (/api/auth).
 * A lógica vive em src/modules/auth/ e a camada HTTP em controllers/.
 *
 * Segurança (auditoria 2026-10-29):
 *   - Rate-limiting aplicado em /login e /cadastro para mitigar
 *     ataques de força bruta (max 10 tentativas / 15 min por IP).
 */
const { Router } = require('express');
const rateLimit = require('express-rate-limit');

const controller = require('../controllers/auth.controller');
const { exigirSessao } = require('../src/modules/auth/middleware');

/* Limitador de taxa para endpoints sensíveis de autenticação.
 * Janela de 15 minutos, máximo 10 tentativas por IP.
 * Após o limite, responde com 429 Too Many Requests. */
const limitadorAuth = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true, // cabeçalhos RateLimit-* na resposta
  legacyHeaders: false,  // desativa X-RateLimit-*
  message: {
    mensagem: 'Demasiadas tentativas. Aguarde 15 minutos antes de tentar novamente.',
  },
});

const rotas = Router();

rotas.post('/cadastro', limitadorAuth, controller.cadastrar); // POST /api/auth/cadastro
rotas.post('/registro', limitadorAuth, controller.cadastrar); // POST /api/auth/registro (alias)
rotas.post('/login', limitadorAuth, controller.login);       // POST /api/auth/login
rotas.get('/sessao', exigirSessao, controller.sessao);       // GET  /api/auth/sessao
rotas.post('/logout', controller.logout);                    // POST /api/auth/logout

module.exports = rotas;

