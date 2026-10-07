/**
 * auth.routes.js — esqueleto das rotas de autenticação (/api/auth).
 */
const { Router } = require('express');

const controller = require('../controllers/auth.controller');

const rotas = Router();

rotas.post('/cadastro', controller.cadastrar); // POST /api/auth/cadastro
rotas.post('/login', controller.login); // POST /api/auth/login
rotas.get('/sessao', controller.sessao); // GET  /api/auth/sessao
rotas.post('/logout', controller.logout); // POST /api/auth/logout

module.exports = rotas;
