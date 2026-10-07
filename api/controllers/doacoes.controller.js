/**
 * doacoes.controller.js — esqueleto dos controladores de doações.
 * No FAP Solidário, "doação registrada" = item do ESTOQUE compartilhado.
 *
 * A implementar (RN01 — docs/escopo_projeto.md):
 *   - somente perfis `doador` podem registrar itens (POST);
 *   - validar categoria/quantidade/validade e gravar em `doacoes`.
 */

/* GET /api/doacoes — lista o estoque de doações (com alertas de validade) */
function listar(req, res) {
  // TODO: SELECT em `doacoes` (JOIN com `usuarios` para o nome do doador)
  return res.status(501).json({ mensagem: 'GET /api/doacoes no ar — implementação pendente.' });
}

/* POST /api/doacoes — registra uma doação no estoque (perfil doador) */
function registrar(req, res) {
  const { item, categoria, quantidade } = req.body || {};
  // TODO: exigir sessão com papel 'doador' (401/403) e INSERT em `doacoes`
  return res.status(501).json({
    mensagem: 'POST /api/doacoes no ar — implementação pendente.',
    recebido: { item, categoria, quantidade },
  });
}

/* GET /api/doacoes/:id — detalhe de uma doação */
function obter(req, res) {
  const { id } = req.params;
  // TODO: SELECT por id (404 se não existir)
  return res.status(501).json({
    mensagem: `GET /api/doacoes/${id} no ar — implementação pendente.`,
  });
}

/* PUT /api/doacoes/:id — atualiza uma doação */
function atualizar(req, res) {
  const { id } = req.params;
  // TODO: exigir sessão, validar entrada e UPDATE em `doacoes`
  return res.status(501).json({
    mensagem: `PUT /api/doacoes/${id} no ar — implementação pendente.`,
  });
}

/* DELETE /api/doacoes/:id — remove uma doação do estoque */
function remover(req, res) {
  const { id } = req.params;
  // TODO: exigir sessão e DELETE em `doacoes` (cuidado com pedidos ligados)
  return res.status(501).json({
    mensagem: `DELETE /api/doacoes/${id} no ar — implementação pendente.`,
  });
}

module.exports = { listar, registrar, obter, atualizar, remover };
