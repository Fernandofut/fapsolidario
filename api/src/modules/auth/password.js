/**
 * password.js — hash e verificação de senhas com scrypt + salt aleatório.
 *
 * O escopo (docs/escopo_projeto.md §3.1) exige scrypt + salt — implementado
 * com o módulo `node:crypto`, sem dependências externas.
 *
 * Formato gravado em `usuarios.senha_hash`:
 *   scrypt$<salt base64url>$<hash base64url>
 * O salt é único por usuário: duas senhas iguais geram hashes diferentes
 * (proteção extra contra rainbow tables).
 */
const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);

/* Parâmetros de custo do scrypt (padrões recomendados pelo Node.js). */
const PARAMETROS = { N: 16384, r: 8, p: 1 };
const TAMANHO_HASH = 64; // bytes

/* Gera o hash seguro de uma senha em texto puro (nunca a armazenamos). */
async function hashSenha(senha) {
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(String(senha), salt, TAMANHO_HASH, PARAMETROS);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

/* Confere a senha informada contra o hash armazenado (comparação em tempo constante). */
async function verificarSenha(senha, senhaHash) {
  try {
    const [algoritmo, saltB64, hashB64] = String(senhaHash).split('$');
    if (algoritmo !== 'scrypt' || !saltB64 || !hashB64) return false;

    const salt = Buffer.from(saltB64, 'base64url');
    const hashEsperado = Buffer.from(hashB64, 'base64url');
    const hashInformado = await scrypt(String(senha), salt, hashEsperado.length, PARAMETROS);

    return crypto.timingSafeEqual(hashEsperado, hashInformado);
  } catch {
    return false; // hash corrompido ou formato inválido → recusa sem quebrar a rota
  }
}

module.exports = { hashSenha, verificarSenha };
