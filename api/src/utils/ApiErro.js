/**
 * ApiErro.js — erro de aplicação com status HTTP embutido.
 *
 * Os módulos lançam `new ApiErro(status, mensagem)` e o handler global
 * do server.js responde exatamente com esse status + { mensagem } —
 * o formato JSON que o frontend (api.js) já consabe exibir.
 */
class ApiErro extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.name = 'ApiErro';
    this.status = status;
  }
}

module.exports = ApiErro;
