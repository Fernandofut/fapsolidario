/**
 * locais.routes.js — rotas de consulta e registro de locais e instituições parceiras.
 */
const { Router } = require('express');
const controlador = require('../controllers/locais.controller');

const rotas = Router();

/* GET /api/locais — lista de locais com filtro opcional ?categoria= */
rotas.get('/', controlador.listar);

/* POST /api/locais — adiciona um novo local */
rotas.post('/', controlador.registrar);

module.exports = rotas;
