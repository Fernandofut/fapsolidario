/**
 * service.js — consultas consolidadas do módulo de dashboard (RN05).
 * Agrega as tabelas `estoque` (doações) e `pedidos` para a tela principal.
 * Somente LEITURA: nenhuma linha é alterada aqui (consultas parametrizadas).
 */
const { db } = require('../../../database/database');

/* Promisifica db.get / db.all do sqlite3. */
function consultarUmaLinha(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.get(sql, params, (erro, linha) => (erro ? rejeitar(erro) : resolver(linha)));
  });
}

function consultarTodos(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.all(sql, params, (erro, linhas) => (erro ? rejeitar(erro) : resolver(linhas)));
  });
}

/* Soma de quantidade por categoria — alimenta o gráfico de pizza do dashboard. */
async function totaisPorCategoria() {
  return consultarTodos(`
    SELECT categoria, SUM(quantidade) AS total
      FROM estoque
     GROUP BY categoria
     ORDER BY total DESC, categoria ASC
  `);
}

/* Ranking de doadores por `empresa_nome` — maior total primeiro. */
async function rankingDoadores() {
  return consultarTodos(`
    SELECT empresa_nome, SUM(quantidade) AS total_doado
      FROM estoque
     GROUP BY empresa_nome
     ORDER BY total_doado DESC, empresa_nome ASC
  `);
}

/* Contagens gerais: registros de doação, unidades em estoque e pedidos. */
async function contagensGerais() {
  return consultarUmaLinha(`
    SELECT (SELECT COUNT(*) FROM estoque) AS doacoes,
           (SELECT COALESCE(SUM(quantidade), 0) FROM estoque) AS quantidade_itens,
           (SELECT COUNT(*) FROM pedidos) AS pedidos
  `);
}

/* GET /api/dashboard — resposta completa em uma única montagem. */
async function montarDashboard() {
  const [categorias, ranking, contagens] = await Promise.all([
    totaisPorCategoria(),
    rankingDoadores(),
    contagensGerais(),
  ]);

  return {
    categorias, // [{ categoria, total }] → pizza + cards
    ranking, // [{ empresa_nome, total_doado }] → pódio de doadores
    totais: {
      doacoes: contagens.doacoes, // contagem de registros de doação
      pedidos: contagens.pedidos, // contagem geral de pedidos
      quantidade_itens: contagens.quantidade_itens, // unidades em estoque
      categorias: categorias.length,
      empresas: ranking.length,
    },
  };
}

module.exports = { montarDashboard };
