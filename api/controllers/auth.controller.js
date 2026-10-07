/**
 * auth.controller.js — esqueleto dos controladores de autenticação.
 *
 * A implementar (ver docs/escopo_projeto.md §3.1 e §10):
 *   - validação de entrada e e-mail único;
 *   - hash de senha com scrypt + salt (nunca texto puro);
 *   - sessão por cookie HttpOnly assinado (HMAC/SESSION_SECRET), expira em 8h;
 *   - papel derivado do tipo de conta: Beneficiário → 'recebedor'; demais → 'doador'.
 */

/* POST /api/auth/cadastro — cria conta (Doador Comum, Empresa ou Beneficiário) */
function cadastrar(req, res) {
  const { nome, email, tipoConta } = req.body || {};
  // TODO: validar campos → derivar papel → gravar hash scrypt em `usuarios`
  return res.status(501).json({
    mensagem: 'Rota /api/auth/cadastro no ar — implementação pendente.',
    recebido: { nome, email, tipoConta },
  });
}

/* POST /api/auth/login — autentica e-mail + senha e abre a sessão */
function login(req, res) {
  const { email } = req.body || {};
  // TODO: buscar usuário, conferir hash scrypt e emitir o cookie de sessão
  return res.status(501).json({
    mensagem: 'Rota /api/auth/login no ar — implementação pendente.',
    recebido: { email },
  });
}

/* GET /api/auth/sessao — devolve o usuário logado (ou 401) */
function sessao(req, res) {
  // TODO: ler/validar o cookie assinado e devolver { id, nome, email, papel }
  return res.status(501).json({
    mensagem: 'Rota /api/auth/sessao no ar — implementação pendente (por enquanto ninguém está logado).',
  });
}

/* POST /api/auth/logout — encerra a sessão no servidor e limpa o cookie */
function logout(req, res) {
  // TODO: invalidar a sessão e limpar o cookie
  return res.status(501).json({
    mensagem: 'Rota /api/auth/logout no ar — implementação pendente.',
  });
}

module.exports = { cadastrar, login, sessao, logout };
