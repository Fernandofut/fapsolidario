/**
 * pedidos.routes.js — rotas de pedidos (/api/pedidos).
 *
 * Proteção (integrada com o módulo de autenticação):
 *   - exigirSessao             → valida o cookie `fap_sessao` em todas as rotas;
 *   - exigirPapel('recebedor')  → RN02: só recebedor lista e cria pedidos
 *     (doador recebe 403 e visitante, 401 — matriz de acesso do escopo §7).
 */
const { Router } = require('express');

const controller = require('../controllers/pedidos.controller');
const empresaController = require('../controllers/empresa.controller');
const { exigirSessao, exigirPapel, exigirEmpresa } = require('../src/modules/auth/middleware');

const rotas = Router();

rotas.get('/', exigirSessao, exigirPapel('recebedor'), controller.listar); // GET  /api/pedidos
rotas.post('/', exigirSessao, exigirPapel('recebedor'), controller.criar); // POST /api/pedidos
rotas.get('/:id', exigirSessao, exigirPapel('recebedor'), controller.obter); // GET  /api/pedidos/:id
rotas.put('/:id/status', exigirSessao, exigirPapel('recebedor'), controller.atualizarStatus); // PUT  /api/pedidos/:id/status (beneficiário)
rotas.patch('/:id/status', exigirSessao, exigirEmpresa, empresaController.atualizarStatus); // PATCH /api/pedidos/:id/status (empresa)

module.exports = rotas;
