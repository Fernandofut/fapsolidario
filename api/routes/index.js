/**
 * index.js — ponto de entrada das rotas da API.
 * Todos os routers são montados sob o prefixo /api (ver server.js).
 */
const { Router } = require('express');

const authRoutes = require('./auth.routes');
const estoqueRoutes = require('./estoque.routes');
const pedidosRoutes = require('./pedidos.routes');
const dashboardRoutes = require('./dashboard.routes');
const locaisRoutes = require('./locais.routes');
const empresaRoutes = require('./empresa.routes');

const rotas = Router();

/* GET /api/status — healthcheck para validar a ligação frontend ↔ API */
rotas.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    mensagem: 'API FAP Solidário a responder normalmente!',
    horario: new Date().toISOString(),
  });
});

rotas.use('/auth', authRoutes); // /api/auth/*
// Nome principal usado pelo frontend (estoque.html, receber.html)
rotas.use('/estoque', estoqueRoutes); // /api/estoque/*
// Alias: /api/doacoes aponta para o mesmo módulo de estoque
rotas.use('/doacoes', estoqueRoutes); // /api/doacoes/*
rotas.use('/pedidos', pedidosRoutes); // /api/pedidos/*
rotas.use('/dashboard', dashboardRoutes); // GET /api/dashboard
rotas.use('/locais', locaisRoutes); // GET e POST /api/locais
rotas.use('/empresa', empresaRoutes); // GET /api/empresa/solicitacoes

module.exports = rotas;
