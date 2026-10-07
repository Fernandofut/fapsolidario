/**
 * index.js — ponto de entrada das rotas da API.
 * Todos os routers são montados sob o prefixo /api (ver server.js).
 */
const { Router } = require('express');

const authRoutes = require('./auth.routes');
const doacoesRoutes = require('./doacoes.routes');
const pedidosRoutes = require('./pedidos.routes');

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
rotas.use('/doacoes', doacoesRoutes); // /api/doacoes/*
// Alias: o frontend consome /api/estoque (doações registradas no estoque — RN01)
rotas.use('/estoque', doacoesRoutes); // /api/estoque/*
rotas.use('/pedidos', pedidosRoutes); // /api/pedidos/*
// TODO futuro: rotas.use('/dashboard', dashboardRoutes) — GET /api/dashboard

module.exports = rotas;
