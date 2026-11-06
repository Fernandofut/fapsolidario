/**
 * auth.controller.js — camada HTTP do módulo de autenticação.
 *
 * A lógica (hash scrypt, banco, validações, seed) vive em src/modules/auth/;
 * aqui ficam apenas requisição/resposta e a gestão do cookie de sessão.
 *
 * Contrato com o frontend:
 *   - cadastro → dados comuns { nome, email, senha, tipo } + campos do perfil:
 *       Doador: tipo_pessoa, documento (CPF/CNPJ), telefone, morada, logistica, categorias;
 *       Beneficiário: cpf, rg, data_nascimento, telefone, nis, morada,
 *                     composição familiar, renda_familiar, necessidades;
 *       Empresa: documento (CNPJ), telefone, morada, ponto_referencia,
 *                horario_funcionamento, categorias;
 *     (tipo: 'Doador Comum' | 'Empresa' | 'Beneficiário');
 *   - login    → o frontend lê `dados.papel` no TOPO da resposta para redirecionar;
 *   - sessao   → devolve { id, nome, email, papel, tipo } no topo (páginas usam
 *                sessao.nome / sessao.tipo / sessao.papel) ou 401 com { mensagem }.
 */
const servico = require('../src/modules/auth/service');
const {
  NOME_COOKIE,
  criarToken,
  opcoesCookie,
  opcoesLimpezaCookie,
} = require('../src/modules/auth/session');

/* POST /api/auth/cadastro — cria a conta (Doador Comum, Empresa ou Beneficiário) */
async function cadastrar(req, res, proximo) {
  try {
    const usuario = await servico.criarUsuario(req.body || {});
    return res.status(201).json({
      mensagem: 'Conta criada com sucesso! Faça login para continuar.',
      usuario,
    });
  } catch (erro) {
    return proximo(erro);
  }
}

/* POST /api/auth/login — autentica e emite o cookie de sessão assinado */
async function login(req, res, proximo) {
  try {
    const { email, senha } = req.body || {};
    const usuario = await servico.autenticar(email, senha);

    res.cookie(NOME_COOKIE, criarToken(usuario.id), opcoesCookie());

    // Empresa/Ponto de Coleta cai direto na aba de solicitações recebidas.
    const redirecionar = servico.ehEmpresa(usuario)
      ? '/pages/dashboard.html?aba=solicitacoes'
      : usuario.papel === 'recebedor'
        ? '/pages/receber.html'
        : '/pages/opcoes.html';
    return res.status(200).json({ mensagem: `Bem-vindo(a), ${usuario.nome}!`, ...usuario, redirecionar });
  } catch (erro) {
    return proximo(erro);
  }
}

/* GET /api/auth/sessao — informa ao frontend se há usuário logado (e quem é).
 * O middleware exigirSessao (src/modules/auth/middleware.js) já validou o
 * cookie `fap_sessao` e anexou o usuário em req.usuario. */
function sessao(req, res) {
  return res.status(200).json({ mensagem: 'Sessão ativa.', ...req.usuario });
}

/* POST /api/auth/logout — limpa o cookie e encerra a sessão */
function logout(req, res) {
  res.clearCookie(NOME_COOKIE, opcoesLimpezaCookie());
  return res.status(200).json({ mensagem: 'Sessão encerrada com sucesso.' });
}

module.exports = { cadastrar, login, sessao, logout };
