/**
 * empresa.controller.js — camada HTTP do painel da Empresa/Ponto de Coleta.
 *
 * GET   /api/empresa/solicitacoes       → pedidos vinculados aos itens da empresa
 * PATCH /api/pedidos/:id/status         → atualiza o status de uma solicitação
 *
 * A sessão e o perfil são validados pelos middlewares das rotas; aqui só há
 * requisição/resposta. Consultas SQL ficam no módulo de pedidos.
 */
const servico = require('../src/modules/pedidos/service');

/* GET /api/empresa/solicitacoes — array puro consumido por empresa.js. */
async function listarSolicitacoes(req, res, proximo) {
  try {
    const solicitacoes = await servico.listarSolicitacoesEmpresa(req.usuario);
    return res.json(solicitacoes);
  } catch (erro) {
    return proximo(erro);
  }
}

/* PATCH /api/pedidos/:id/status — status em MAIÚSCULAS (PENDENTE,
 * EM_ATENDIMENTO, ENTREGUE, CANCELADO). A baixa já ocorreu no pedido. */
async function atualizarStatus(req, res, proximo) {
  try {
    const solicitacao = await servico.atualizarStatusEmpresa(
      req.params.id,
      (req.body || {}).status,
      req.usuario
    );
    return res.json({
      mensagem: `Solicitação ${solicitacao.id} atualizada para "${solicitacao.status}".`,
      solicitacao,
      pedido: solicitacao,
    });
  } catch (erro) {
    return proximo(erro);
  }
}

module.exports = { listarSolicitacoes, atualizarStatus };
