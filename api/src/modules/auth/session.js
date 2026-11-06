/**
 * session.js — sessão sem estado (stateless) por cookie HttpOnly assinado.
 *
 * O cookie guarda `v1.<payload>.<assinatura>`:
 *   - payload    → base64url de JSON { id, exp } (exp = validade em ms);
 *   - assinatura → HMAC-SHA256 do payload com SESSION_SECRET (do api/.env).
 * Qualquer alteração no cookie invalida a assinatura → 401.
 *
 * Conforme o escopo (§3.1 e §10): cookie HttpOnly + SameSite=Lax,
 * expira em 8 horas, token assinado com HMAC (SESSION_SECRET).
 */
const crypto = require('node:crypto');

const NOME_COOKIE = 'fap_sessao';
const DURACAO_MS = 8 * 60 * 60 * 1000; // 8 horas

/* Assina um payload com HMAC-SHA256 usando o segredo do .env. */
function assinar(payload) {
  return crypto
    .createHmac('sha256', process.env.SESSION_SECRET || '')
    .update(payload)
    .digest('base64url');
}

/* Gera o token assinado de sessão para o usuário informado. */
function criarToken(idUsuario) {
  const payload = Buffer.from(
    JSON.stringify({ id: idUsuario, exp: Date.now() + DURACAO_MS })
  ).toString('base64url');

  return `v1.${payload}.${assinar(payload)}`;
}

/* Valida o token do cookie: assinatura íntegra e não expirada → { id, exp }. */
function lerToken(token) {
  if (typeof token !== 'string') return null;

  const [versao, payload, assinatura] = token.split('.');
  if (versao !== 'v1' || !payload || !assinatura) return null;

  const informada = Buffer.from(assinatura);
  const valida = Buffer.from(assinar(payload));
  if (informada.length !== valida.length || !crypto.timingSafeEqual(informada, valida)) {
    return null; // cookie adulterado
  }

  try {
    const dados = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!Number.isInteger(dados.id) || typeof dados.exp !== 'number') return null;
    if (dados.exp < Date.now()) return null; // expirada
    return dados;
  } catch {
    return null;
  }
}

/* Opções de emissão do cookie de sessão.
 * Auditoria 2026-10-29: sameSite elevado para 'Strict' (era 'lax')
 * para proteção máxima contra CSRF. Compatível pois frontend e API
 * partilham a mesma origem (Express serve ambos). */
function opcoesCookie() {
  return {
    httpOnly: true,          // inacessível ao JavaScript do navegador (mitiga XSS)
    sameSite: 'Strict',      // nunca envia o cookie em requisições cross-site (mitiga CSRF)
    secure: process.env.COOKIE_SECURE === 'true', // ligar atrás de HTTPS
    path: '/',
    maxAge: DURACAO_MS,
  };
}

/* Opções para o clearCookie no logout (mesmas flags, sem maxAge). */
function opcoesLimpezaCookie() {
  const { maxAge, ...resto } = opcoesCookie();
  return resto;
}

module.exports = { NOME_COOKIE, DURACAO_MS, criarToken, lerToken, opcoesCookie, opcoesLimpezaCookie };
