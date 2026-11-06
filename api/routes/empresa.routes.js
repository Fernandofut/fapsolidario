/**
 * empresa.routes.js — rotas exclusivas da Empresa/Ponto de Coleta.
 * Montado em /api/empresa (ver routes/index.js).
 */
const { Router } = require('express');

const controller = require('../controllers/empresa.controller');
const { exigirSessao, exigirEmpresa } = require('../src/modules/auth/middleware');

const rotas = Router();

rotas.get('/solicitacoes', exigirSessao, exigirEmpresa, controller.listarSolicitacoes);

module.exports = rotas;
