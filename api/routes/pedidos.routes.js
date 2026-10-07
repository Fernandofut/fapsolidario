/**
 * pedidos.routes.js — esqueleto das rotas de pedidos (/api/pedidos).
 */
const { Router } = require('express');

const controller = require('../controllers/pedidos.controller');

const rotas = Router();

rotas.get('/', controller.listar); // GET  /api/pedidos
rotas.post('/', controller.criar); // POST /api/pedidos
rotas.get('/:id', controller.obter); // GET  /api/pedidos/:id
rotas.put('/:id/status', controller.atualizarStatus); // PUT  /api/pedidos/:id/status

module.exports = rotas;
