/**
 * pedidos.controller.js — esqueleto dos controladores de pedidos.
 *
 * A implementar (RN02, RN03 e RN04 — docs/escopo_projeto.md):
 *   - somente perfis `recebedor` pedem itens e listam seus pedidos;
 *   - quantidade pedida ≤ estoque disponível, senão erro;
 *   - pedido + baixa no estoque na MESMA transação
 *     (BEGIN IMMEDIATE / COMMIT / ROLLBACK).
 */

/* GET /api/pedidos — histórico de pedidos do recebedor logado */
function listar(req, res) {
  // TODO: filtrar pelo recebedor_id da sessão (JOIN com `doacoes`)
  return res.status(501).json({ mensagem: 'GET /api/pedidos no ar — implementação pendente.' });
}

/* POST /api/pedidos — solicita um item do estoque (perfil recebedor) */
function criar(req, res) {
  const { doacaoId, quantidade } = req.body || {};
  // TODO: transação → INSERT em `pedidos` + UPDATE da quantidade em `doacoes`
  return res.status(501).json({
    mensagem: 'POST /api/pedidos no ar — implementação pendente.',
    recebido: { doacaoId, quantidade },
  });
}

/* GET /api/pedidos/:id — detalhe de um pedido */
function obter(req, res) {
  const { id } = req.params;
  // TODO: SELECT por id (garantindo que pertence ao recebedor da sessão)
  return res.status(501).json({
    mensagem: `GET /api/pedidos/${id} no ar — implementação pendente.`,
  });
}

/* PUT /api/pedidos/:id/status — atualiza o status do pedido */
function atualizarStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body || {};
  // TODO: validar o status (pendente/concluido/cancelado) e fazer UPDATE
  return res.status(501).json({
    mensagem: `PUT /api/pedidos/${id}/status no ar — implementação pendente.`,
    recebido: { status },
  });
}

module.exports = { listar, criar, obter, atualizarStatus };
