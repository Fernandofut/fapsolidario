/**
 * estoque.controller.js — camada HTTP do módulo de estoque/doações.
 * A sessão e o papel já foram verificados pelos middlewares na rota
 * (exigirSessao / exigirPapel); aqui fica apenas requisição/resposta.
 */
const servico = require('../src/modules/estoque/service');

/* GET /api/estoque — lista do mais recente para o mais antigo.
 * Resposta é um ARRAY PURO: estoque.html e receber.html fazem `dados.forEach`
 * e leem id / nome_item / categoria / quantidade / empresa_nome / data_validade. */
async function listar(req, res, proximo) {
  try {
    const itens = await servico.listarItens();
    return res.json(itens);
  } catch (erro) {
    return proximo(erro);
  }
}

/* POST /api/estoque — registra a doação (RN01: papel 'doador' exigido na rota). */
async function registrar(req, res, proximo) {
  try {
    const item = await servico.criarItem(req.body || {}, req.usuario);
    return res.status(201).json({ mensagem: 'Doação registrada com sucesso!', item });
  } catch (erro) {
    return proximo(erro);
  }
}

/* GET /api/estoque/:id — obtém item específico */
async function obter(req, res, proximo) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new Error('ID inválido');
    const item = await servico.obterItem(id);
    if (!item) return res.status(404).json({ mensagem: 'Item não encontrado.' });
    return res.json(item);
  } catch (erro) {
    return proximo(erro);
  }
}

/* PUT /api/estoque/:id — atualiza item existente */
async function atualizar(req, res, proximo) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new Error('ID inválido');
    const itemAtualizado = await servico.atualizarItem(id, req.body || {});
    if (!itemAtualizado) return res.status(404).json({ mensagem: 'Item não encontrado.' });
    return res.json(itemAtualizado);
  } catch (erro) {
    return proximo(erro);
  }
}

/* DELETE /api/estoque/:id — remove item */
async function remover(req, res, proximo) {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) throw new Error('ID inválido');
    const sucesso = await servico.removerItem(id);
    if (!sucesso) return res.status(404).json({ mensagem: 'Item não encontrado.' });
    return res.json({ mensagem: 'Item removido com sucesso.' });
  } catch (erro) {
    return proximo(erro);
  }
}

module.exports = { listar, registrar, obter, atualizar, remover };
