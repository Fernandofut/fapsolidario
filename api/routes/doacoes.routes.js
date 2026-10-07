/**
 * doacoes.routes.js — esqueleto das rotas de doações (/api/doacoes).
 * O mesmo router também atende /api/estoque (alias usado pelo frontend).
 */
const { Router } = require('express');

const controller = require('../controllers/doacoes.controller');

const rotas = Router();

rotas.get('/', controller.listar); // GET    /api/doacoes
rotas.post('/', controller.registrar); // POST   /api/doacoes
rotas.get('/:id', controller.obter); // GET    /api/doacoes/:id
rotas.put('/:id', controller.atualizar); // PUT    /api/doacoes/:id
rotas.delete('/:id', controller.remover); // DELETE /api/doacoes/:id

module.exports = rotas;
