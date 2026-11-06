/**
 * locais.controller.js — camada HTTP para consulta e cadastro de locais de doação.
 */
const servico = require('../src/modules/locais/service');

/* GET /api/locais?categoria=roupas */
async function listar(req, res, proximo) {
  try {
    const { categoria } = req.query;
    const locais = await servico.listarLocais(categoria);
    return res.json(locais);
  } catch (erro) {
    return proximo(erro);
  }
}

/* POST /api/locais */
async function registrar(req, res, proximo) {
  try {
    const local = await servico.criarLocal(req.body || {}, req.usuario ? req.usuario.id : null);
    return res.status(201).json({ mensagem: 'Local cadastrado com sucesso!', local });
  } catch (erro) {
    return proximo(erro);
  }
}

module.exports = { listar, registrar };
