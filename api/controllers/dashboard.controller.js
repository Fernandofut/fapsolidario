/**
 * dashboard.controller.js — camada HTTP do módulo de dashboard (RN05).
 * A sessão já foi verificada pelo middleware exigirSessao na rota;
 * aqui fica apenas requisição/resposta.
 */
const servico = require('../src/modules/dashboard/service');

/* GET /api/dashboard — dados consolidados da tela principal.
 * Resposta: { categorias: [{categoria,total}], ranking: [{empresa_nome,total_doado}],
 *             totais: { doacoes, pedidos, quantidade_itens, categorias, empresas } } */
async function obter(req, res, proximo) {
  try {
    const dados = await servico.montarDashboard();
    return res.json(dados);
  } catch (erro) {
    return proximo(erro);
  }
}

module.exports = { obter };
