/**
 * estoque.routes.js — rotas de estoque/doações.
 *
 * Proteção (integrada com o módulo de autenticação):
 *   - exigirSessao         → valida o cookie `fap_sessao` em todas as rotas;
 *   - exigirPapel('doador') → RN01: só doador registra itens.
 */
const { Router } = require('express');

const controller = require('../controllers/estoque.controller');
const { exigirSessao, exigirPapel } = require('../src/modules/auth/middleware');

const rotas = Router();

rotas.get('/', exigirSessao, controller.listar); // GET    /api/estoque
rotas.post('/', exigirSessao, exigirPapel('doador'), controller.registrar); // POST   /api/estoque
rotas.get('/:id', exigirSessao, controller.obter); // GET    /api/estoque/:id
rotas.put('/:id', exigirSessao, exigirPapel('doador'), controller.atualizar); // PUT    /api/estoque/:id
rotas.delete('/:id', exigirSessao, exigirPapel('doador'), controller.remover); // DELETE /api/estoque/:id

module.exports = rotas;
