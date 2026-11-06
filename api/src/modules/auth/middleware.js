/**
 * middleware.js — middlewares de sessão/autorização do módulo de autenticação.
 *
 *   exigirSessao     → valida o cookie `fap_sessao`, carrega o usuário do
 *                      banco e o anexa em `req.usuario` (401 se não houver
 *                      sessão válida);
 *   exigirPapel(papel) → exige o papel informado (403 se o usuário logado
 *                      tiver outro papel) — RN01/RN02 do escopo;
 *   exigirEmpresa   → libera apenas Empresa/Ponto de Coleta (CNPJ), usado na
 *                      gestão das solicitações recebidas.
 *
 * Qualquer módulo (estoque, pedidos, dashboard…) reutiliza estes middlewares.
 */
const { NOME_COOKIE, lerToken } = require('./session');
const servico = require('./service');

async function exigirSessao(req, res, proximo) {
  try {
    const token = req.cookies ? req.cookies[NOME_COOKIE] : undefined;
    const dados = lerToken(token);
    if (!dados) {
      return res.status(401).json({ mensagem: 'Sessão inexistente ou expirada. Faça login novamente.' });
    }

    const usuario = await servico.buscarUsuarioPorId(dados.id);
    if (!usuario) {
      return res.status(401).json({ mensagem: 'Sessão inválida (usuário não existe mais). Faça login novamente.' });
    }

    req.usuario = usuario; // disponível para o controller e para exigirPapel
    return proximo();
  } catch (erro) {
    return proximo(erro);
  }
}

function exigirPapel(papel) {
  return (req, res, proximo) => {
    if (!req.usuario) {
      return res.status(401).json({ mensagem: 'Faça login para acessar este recurso.' });
    }
    if (req.usuario.papel !== papel) {
      return res
        .status(403)
        .json({ mensagem: `Acesso negado: apenas perfis "${papel}" podem executar esta ação.` });
    }
    return proximo();
  };
}

function exigirEmpresa(req, res, proximo) {
  if (!req.usuario) {
    return res.status(401).json({ mensagem: 'Faça login para acessar este recurso.' });
  }
  if (!servico.ehEmpresa(req.usuario)) {
    return res
      .status(403)
      .json({ mensagem: 'Acesso negado: apenas Empresas/Pontos de Coleta podem gerir solicitações.' });
  }
  return proximo();
}

module.exports = { exigirSessao, exigirPapel, exigirEmpresa };
