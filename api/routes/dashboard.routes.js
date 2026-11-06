/**
 * dashboard.routes.js — rota de dashboard analítico.
 *
 * Proteção (auditoria 2026-10-29):
 *   - exigirSessao → sessão válida obrigatória; visitantes recebem 401.
 *   Doadores e recebedores autenticados podem consultar as métricas.
 */
const { Router } = require('express');

const controller = require('../controllers/dashboard.controller');
const { exigirSessao } = require('../src/modules/auth/middleware');

const rotas = Router();

rotas.get('/', exigirSessao, controller.obter); // GET /api/dashboard

module.exports = rotas;

