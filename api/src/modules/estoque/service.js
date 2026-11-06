/**
 * service.js — regras e acesso a dados do módulo de estoque/doações (RN01).
 * É o único lugar que conversa com a tabela `estoque` (consultas
 * parametrizadas — proteção contra SQL Injection).
 */
const { db } = require('../../../database/database');
const ApiErro = require('../../utils/ApiErro');

/* Categorias válidas — exatamente as opções do formulário de estoque. */
const CATEGORIAS = ['Alimentos', 'Roupas', 'Higiene', 'Moveis', 'Cultura', 'Dinheiro', 'Outros'];

/* Mapa para aceitar a categoria com qualquer capitalização/acento. */
const CATEGORIAS_NORMALIZADAS = {
  alimentos: 'Alimentos',
  roupas: 'Roupas',
  higiene: 'Higiene',
  moveis: 'Moveis',
  cultura: 'Cultura',
  dinheiro: 'Dinheiro',
  outros: 'Outros',
};

const DATA_VALIDADE_FORMATO = /^\d{4}-\d{2}-\d{2}$/;
const QUANTIDADE_MAXIMA = 1000000;

/* Promisifica db.get / db.all / db.run do sqlite3. */
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

function executar(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.run(sql, params, function (erro) {
      return erro ? rejeitar(erro) : resolver(this); // `this` traz lastID/changes
    });
  });
}

/* ' moveis ' → 'Moveis' (ignora maiúsculas/minúsculas e acentos). */
function normalizarCategoria(valor) {
  const chave = String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return CATEGORIAS_NORMALIZADAS[chave] || null;
}

/* GET /api/estoque — itens DISPONÍVEIS, do mais recente para o mais antigo.
 * Itens com quantidade 0 ficam ocultos da listagem pública após a entrega. */
async function listarItens() {
  return consultarTodos(`
    SELECT id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em
      FROM estoque
     WHERE quantidade > 0
     ORDER BY id DESC
  `);
}

/* POST /api/estoque — valida a doação e grava no estoque.
 * RN01: o papel 'doador' já foi exigido pelo middleware exigirPapel na rota;
 * `doador` é o req.usuario anexado pelo exigirSessao. */
async function criarItem(dados, doador) {
  const nomeItem = String(dados.nome_item || '').trim();
  const categoria = normalizarCategoria(dados.categoria);
  const quantidade = Number(String(dados.quantidade ?? '').trim());
  const empresaNome = String(dados.empresa_nome || '').trim();
  const dataValidadeBruta = String(dados.data_validade || '').trim();

  if (nomeItem.length < 2) throw new ApiErro(400, 'Informe o nome do item (mínimo 2 caracteres).');
  if (!categoria) {
    throw new ApiErro(400, 'Categoria inválida. Use: Alimentos, Roupas, Higiene, Moveis, Cultura, Dinheiro ou Outros.');
  }
  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new ApiErro(400, 'A quantidade deve ser um número inteiro maior que zero.');
  }
  if (quantidade > QUANTIDADE_MAXIMA) {
    throw new ApiErro(400, `A quantidade não pode passar de ${QUANTIDADE_MAXIMA}.`);
  }
  if (empresaNome.length < 2) {
    throw new ApiErro(400, 'Informe o nome do doador/empresa (mínimo 2 caracteres).');
  }

  /* O formulário envia string vazia quando a data fica em branco. */
  let dataValidade = null;
  if (dataValidadeBruta) {
    if (!DATA_VALIDADE_FORMATO.test(dataValidadeBruta) || Number.isNaN(Date.parse(`${dataValidadeBruta}T00:00:00`))) {
      throw new ApiErro(400, 'A data de validade deve estar no formato AAAA-MM-DD.');
    }
    dataValidade = dataValidadeBruta;
  }

  const resultado = await executar(
    `INSERT INTO estoque (doador_id, nome_item, categoria, quantidade, empresa_nome, data_validade)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [doador.id, nomeItem, categoria, quantidade, empresaNome, dataValidade]
  );

  return consultarUmaLinha(
    `SELECT id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em
       FROM estoque WHERE id = ?`,
    [resultado.lastID]
  );
}

// CRUD functions for individual items
async function obterItem(id) {
  return consultarUmaLinha(
    `SELECT id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em FROM estoque WHERE id = ?`,
    [id]
  );
}

async function atualizarItem(id, dados) {
  const campos = [];
  const valores = [];

  if (dados.nome_item) {
    campos.push('nome_item = ?');
    valores.push(String(dados.nome_item).trim());
  }
  if (dados.categoria) {
    const cat = normalizarCategoria(dados.categoria);
    if (cat) {
      campos.push('categoria = ?');
      valores.push(cat);
    }
  }
  if (dados.quantidade !== undefined) {
    const q = Number(dados.quantidade);
    if (Number.isInteger(q) && q > 0) {
      campos.push('quantidade = ?');
      valores.push(q);
    }
  }
  if (dados.empresa_nome) {
    campos.push('empresa_nome = ?');
    valores.push(String(dados.empresa_nome).trim());
  }
  if (dados.data_validade) {
    if (DATA_VALIDADE_FORMATO.test(dados.data_validade)) {
      campos.push('data_validade = ?');
      valores.push(dados.data_validade);
    }
  }

  if (campos.length === 0) return null;

  const sql = `UPDATE estoque SET ${campos.join(', ')} WHERE id = ?`;
  valores.push(id);
  const result = await executar(sql, valores);
  if (result.changes === 0) return null;
  return obterItem(id);
}

async function removerItem(id) {
  const result = await executar('DELETE FROM estoque WHERE id = ?', [id]);
  return result.changes > 0;
}

module.exports = { CATEGORIAS, listarItens, criarItem, obterItem, atualizarItem, removerItem };
