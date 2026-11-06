/**
 * database.js — conexão com o banco SQLite do FAP Solidário.
 *
 * O arquivo do banco fica em `api/data/banco.sqlite` (a pasta `data/`
 * é criada automaticamente na 1ª execução e NÃO vai para o Git).
 *
 * Exporta:
 *   - db                  → conexão sqlite3, usada pelos controladores/services;
 *   - iniciarBancoDeDados → Promise que devolve { db, bancoNovo } e segue a
 *     inicialização condicional: banco EXISTENTE é apenas aberto (integridade
 *     conferida + migrações pendentes — dados intactos); banco INEXISTENTE é
 *     criado com as tabelas e sinalizado para o server.js aplicar o seed.
 */
const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const PASTA_DADOS = path.join(__dirname, '..', 'data');
/* Caminho do banco — FAP_BANCO_SQLITE sobrepõe o padrão (usado pelos testes
   para rodarem num arquivo temporário isolado, sem tocar no banco real). */
const ARQUIVO_BANCO = process.env.FAP_BANCO_SQLITE || path.join(PASTA_DADOS, 'banco.sqlite');

// Garante que a pasta do banco exista antes de abrir a conexão
fs.mkdirSync(path.dirname(ARQUIVO_BANCO), { recursive: true });

/* 1. VERIFICAÇÃO DE EXISTÊNCIA — feita ANTES de abrir a conexão.
   O sqlite3 NUNCA sobrescreve um arquivo existente (apenas abre e mantém
   tudo); o sinalizador abaixo registra qual caminho o boot vai seguir. */
const BANCO_EXISTIA = fs.existsSync(ARQUIVO_BANCO);

if (!BANCO_EXISTIA) {
  /* Resíduos de WAL/SHM de um banco apagado manualmente seriam ignorados
     pelo SQLite, mas removê-los evita herdar qualquer lixo antigo. */
  for (const residuo of [`${ARQUIVO_BANCO}-wal`, `${ARQUIVO_BANCO}-shm`]) {
    if (fs.existsSync(residuo)) fs.rmSync(residuo, { force: true });
  }
  console.log(`[INFO] Banco não encontrado — um NOVO será criado em ${ARQUIVO_BANCO}`);
} else {
  console.log(`[INFO] Banco existente detectado — abrindo sem alterar dados: ${ARQUIVO_BANCO}`);
}

/* 2. ABERTURA — mantém o arquivo como está (dados intactos); as tabelas são
   garantidas em iniciarBancoDeDados() e o seed só entra em banco NOVO. */
const db = new sqlite3.Database(ARQUIVO_BANCO, (erro) => {
  if (erro) {
    console.error('[ERRO] Não foi possível abrir o banco de dados:', erro.message);
  }
});

/* Executa um comando SQL (com parâmetros opcionais) e devolve uma Promise. */
function executar(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.run(sql, params, function (erro) {
      return erro ? rejeitar(erro) : resolver(this); // `this` traz lastID/changes
    });
  });
}

/* Consultas de leitura promisificadas (usadas nas migrações abaixo). */
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

/* Esquema inicial — ajustável conforme os módulos evoluírem. */
const SQL_CRIAR_TABELAS = [
  `CREATE TABLE IF NOT EXISTS usuarios (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      nome       TEXT    NOT NULL,
      email      TEXT    NOT NULL UNIQUE,
      senha_hash TEXT    NOT NULL,
      papel      TEXT    NOT NULL DEFAULT 'doador'
                 CHECK (papel IN ('doador', 'recebedor')),
      tipo       TEXT    NOT NULL DEFAULT 'Doador Comum'
                 CHECK (tipo IN ('Doador Comum', 'Empresa', 'Beneficiário')),
      telefone   TEXT    NOT NULL DEFAULT '',
      criado_em  TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS doadores (
      id                   INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id           INTEGER NOT NULL UNIQUE REFERENCES usuarios (id) ON DELETE CASCADE,
      tipo_pessoa          TEXT    NOT NULL DEFAULT 'PF'
                           CHECK (tipo_pessoa IN ('PF', 'PJ')),
      documento            TEXT    NOT NULL DEFAULT '',
      telefone             TEXT    NOT NULL DEFAULT '',
      cep                  TEXT    NOT NULL DEFAULT '',
      rua                  TEXT    NOT NULL DEFAULT '',
      bairro               TEXT    NOT NULL DEFAULT '',
      numero               TEXT    NOT NULL DEFAULT '',
      complemento          TEXT    NOT NULL DEFAULT '',
      ponto_referencia     TEXT    NOT NULL DEFAULT '',
      logistica            TEXT    NOT NULL DEFAULT 'ponto_coleta'
                           CHECK (logistica IN ('ponto_coleta', 'retirada_domicilio')),
      categorias           TEXT    NOT NULL DEFAULT '',
      horario_funcionamento TEXT   NOT NULL DEFAULT '',
      criado_em            TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS beneficiarios (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id       INTEGER NOT NULL UNIQUE REFERENCES usuarios (id) ON DELETE CASCADE,
      cpf              TEXT    NOT NULL DEFAULT '',
      rg               TEXT    NOT NULL DEFAULT '',
      data_nascimento  TEXT    NOT NULL DEFAULT '',
      telefone         TEXT    NOT NULL DEFAULT '',
      nis              TEXT    NOT NULL DEFAULT '',
      cep              TEXT    NOT NULL DEFAULT '',
      rua              TEXT    NOT NULL DEFAULT '',
      bairro           TEXT    NOT NULL DEFAULT '',
      numero           TEXT    NOT NULL DEFAULT '',
      complemento      TEXT    NOT NULL DEFAULT '',
      ponto_referencia TEXT    NOT NULL DEFAULT '',
      adultos          INTEGER NOT NULL DEFAULT 0 CHECK (adultos >= 0),
      criancas         INTEGER NOT NULL DEFAULT 0 CHECK (criancas >= 0),
      idosos           INTEGER NOT NULL DEFAULT 0 CHECK (idosos >= 0),
      renda_familiar   TEXT    NOT NULL DEFAULT 'Sem renda fixa'
                       CHECK (renda_familiar IN ('Até 1 salário mínimo', '1 a 2 salários mínimos', 'Sem renda fixa')),
      necessidades     TEXT    NOT NULL DEFAULT '',
      criado_em        TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS estoque (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      doador_id     INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
      nome_item     TEXT    NOT NULL,
      categoria     TEXT    NOT NULL
                    CHECK (categoria IN ('Alimentos', 'Roupas', 'Higiene', 'Moveis', 'Cultura', 'Dinheiro', 'Outros')),
      quantidade    INTEGER NOT NULL CHECK (quantidade >= 0),
      empresa_nome  TEXT    NOT NULL,
      data_validade TEXT,
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
  `CREATE TABLE IF NOT EXISTS pedidos (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      estoque_id   INTEGER NOT NULL REFERENCES estoque (id),
      recebedor_id INTEGER NOT NULL REFERENCES usuarios (id),
      quantidade   INTEGER NOT NULL CHECK (quantidade > 0),
      status       TEXT    NOT NULL DEFAULT 'pendente_contato'
                   CHECK (status IN ('pendente', 'pendente_contato', 'em_atendimento',
                                     'entregue', 'concluido', 'cancelado')),
      criado_em    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
   );`,
];

/* ---------------------------------------------------------------------
 * Migração v1→v2: a tabela `doacoes` do esqueleto inicial virou `estoque`,
 * com as colunas reais usadas pelo frontend (nome_item, empresa_nome,
 * data_validade) e categorias na forma capitalizada. Os dados existentes
 * são preservados e reinseridos após a criação do esquema novo.
 * ------------------------------------------------------------------- */
const MAPA_CATEGORIAS_LEGADO = {
  alimentos: 'Alimentos',
  roupas: 'Roupas',
  higiene: 'Higiene',
  moveis: 'Moveis',
  cultura: 'Cultura',
  dinheiro: 'Dinheiro',
};

async function migrarDoacoesParaEstoque() {
  const existe = await consultarUmaLinha(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'doacoes'"
  );
  if (!existe) return null; // banco novo ou já migrado — nada a fazer

  /* Segurança: cópia integral do banco ANTES do único passo destrutivo do
     boot (os DROP TABLE abaixo). Se algo falhar no meio, o arquivo
     `.backup-<data>.sqlite` preserva o estado original dos dados. */
  const carimbo = new Date().toISOString().replace(/[:.]/g, '-');
  const arquivoBackup = `${ARQUIVO_BANCO}.backup-${carimbo}`;
  await executar(`VACUUM INTO '${arquivoBackup.replace(/'/g, "''")}'`);
  console.log(`[OK] Backup de segurança criado antes da migração: ${arquivoBackup}`);

  const itens = await consultarTodos('SELECT * FROM doacoes');
  const temPedidos = await consultarUmaLinha(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'pedidos'"
  );
  const pedidos = temPedidos ? await consultarTodos('SELECT * FROM pedidos') : [];

  await executar('DROP TABLE pedidos;'); // recriada abaixo com FK para `estoque`
  await executar('DROP TABLE doacoes;');
  return { itens, pedidos };
}

async function restaurarDadosLegados(legado) {
  if (!legado) return;

  for (const linha of legado.itens) {
    let empresaNome = 'Doador Solidário';
    if (linha.doador_id) {
      const doador = await consultarUmaLinha('SELECT nome FROM usuarios WHERE id = ?', [linha.doador_id]);
      if (doador) empresaNome = doador.nome;
    }
    await executar(
      `INSERT INTO estoque (id, doador_id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        linha.id,
        linha.doador_id,
        linha.item,
        MAPA_CATEGORIAS_LEGADO[linha.categoria] || 'Outros',
        linha.quantidade,
        empresaNome,
        linha.validade,
        linha.criado_em,
      ]
    );
  }

  for (const pedido of legado.pedidos) {
    await executar(
      `INSERT INTO pedidos (id, estoque_id, recebedor_id, quantidade, status, criado_em)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [pedido.id, pedido.doacao_id, pedido.recebedor_id, pedido.quantidade, pedido.status, pedido.criado_em]
    );
  }

  console.log(
    `[OK] Migração aplicada: tabela \`doacoes\` → \`estoque\` (${legado.itens.length} itens, ${legado.pedidos.length} pedidos preservados).`
  );
}

/**
 * Prepara o banco: PRAGMAs + migrações + criação das tabelas.
 * Chamada pelo server.js ANTES de o Express começar a escutar.
 */
async function iniciarBancoDeDados() {
  /* 3. Banco EXISTENTE: valida a integridade ANTES de qualquer alteração —
     arquivo corrompido/inválido falha aqui com mensagem clara, em vez de
     quebrar no meio de uma consulta qualquer. */
  if (BANCO_EXISTIA) {
    const verificacao = await consultarUmaLinha('PRAGMA quick_check;');
    if (!verificacao || verificacao.quick_check !== 'ok') {
      const detalhe = verificacao ? verificacao.quick_check : 'sem resposta do SQLite';
      throw new Error(`Banco de dados corrompido ou inválido (${detalhe}): ${ARQUIVO_BANCO}`);
    }
  }
  await executar('PRAGMA foreign_keys = ON;'); // ativa chaves estrangeiras
  await executar('PRAGMA journal_mode = WAL;'); // evita "database is locked" com requisições concorrentes

  /* Se o banco antigo tinha `doacoes`, ela sai daqui e os dados voltam já
     no esquema novo logo após o CREATE abaixo. */
  const legado = await migrarDoacoesParaEstoque();

  for (const sql of SQL_CRIAR_TABELAS) {
    await executar(sql);
  }

  await restaurarDadosLegados(legado);

  /* v2→v3: `estoque` passa a aceitar quantidade 0 (item totalmente distribuído). */
  await migrarEstoqueAceitarZerado();

  /* v3→v5: o CHECK de `pedidos.status` ganha o ciclo de vida gerido pela
     empresa (`em_atendimento`, `entregue`) além de `pendente_contato`. */
  await migrarPedidosStatusSolicitacoes();

  /* Migrações suaves da tabela `usuarios`: bancos criados antes das colunas
     `tipo` e `telefone` ganham as colunas com valor padrão (o SQLite não
     altera tabelas existentes no CREATE). */
  const colunas = await consultarTodos('PRAGMA table_info(usuarios)');
  const nomesColunas = new Set(colunas.map((coluna) => coluna.name));

  if (!nomesColunas.has('tipo')) {
    await executar("ALTER TABLE usuarios ADD COLUMN tipo TEXT NOT NULL DEFAULT 'Doador Comum';");
    console.log('[OK] Migração aplicada: coluna `tipo` adicionada à tabela usuarios.');
  }

  if (!nomesColunas.has('telefone')) {
    await executar("ALTER TABLE usuarios ADD COLUMN telefone TEXT NOT NULL DEFAULT '';");
    console.log('[OK] Migração aplicada: coluna `telefone` adicionada à tabela usuarios.');
  }

  /* 4. RESUMO do boot — deixa explícito o que aconteceu com o banco. */
  if (BANCO_EXISTIA) {
    console.log(`[OK] Banco EXISTENTE aberto em ${ARQUIVO_BANCO} — dados preservados e esquema em dia.`);
  } else {
    console.log(`[OK] Banco NOVO criado em ${ARQUIVO_BANCO} (usuarios, doadores, beneficiarios, estoque, pedidos).`);
  }
  return { db, bancoNovo: !BANCO_EXISTIA };
}

/* ---------------------------------------------------------------------
 * Migração v2→v3: o CHECK antigo da tabela `estoque` (`quantidade > 0`)
 * impedia a baixa automática do módulo de pedidos de ZERAR um item — e a
 * RN03 permite solicitar toda a quantidade disponível. Como o SQLite não
 * altera um CHECK no lugar, a tabela é reconstruída com `quantidade >= 0`,
 * preservando dados e chaves estrangeiras.
 * ------------------------------------------------------------------- */
async function migrarEstoqueAceitarZerado() {
  const tabela = await consultarUmaLinha(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'estoque'"
  );
  /* Bancos recém-criados já nascem com o CHECK novo — nada a migrar. */
  if (!tabela || !/CHECK\s*\(\s*quantidade\s*>\s*0\s*\)/i.test(tabela.sql)) return;

  /* As chaves estrangeiras ficam desligadas apenas durante a reconstrução
     (a tabela `pedidos` aponta para `estoque` e o DROP seria bloqueado). */
  await executar('PRAGMA foreign_keys = OFF;');
  try {
    await executar(`CREATE TABLE estoque_nova (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        doador_id     INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
        nome_item     TEXT    NOT NULL,
        categoria     TEXT    NOT NULL
                      CHECK (categoria IN ('Alimentos', 'Roupas', 'Higiene', 'Moveis', 'Cultura', 'Dinheiro', 'Outros')),
        quantidade    INTEGER NOT NULL CHECK (quantidade >= 0),
        empresa_nome  TEXT    NOT NULL,
        data_validade TEXT,
        criado_em     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
     );`);
    await executar(
      `INSERT INTO estoque_nova (id, doador_id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em)
       SELECT id, doador_id, nome_item, categoria, quantidade, empresa_nome, data_validade, criado_em
         FROM estoque;`
    );
    await executar('DROP TABLE estoque;');
    await executar('ALTER TABLE estoque_nova RENAME TO estoque;');
  } finally {
    await executar('PRAGMA foreign_keys = ON;');
  }

  console.log('[OK] Migração aplicada: `estoque` agora aceita quantidade 0 (item totalmente distribuído).');
}

/**
 * Migração v3→v5: o CHECK antigo de `pedidos.status` não conhecia
 * `pendente_contato` nem o ciclo gerido pela empresa (`em_atendimento`,
 * `entregue`). Como o SQLite não altera um CHECK no lugar, a tabela é
 * reconstruída preservando ids, datas e pedidos antigos.
 */
async function migrarPedidosStatusSolicitacoes() {
  const tabela = await consultarUmaLinha(
    "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'pedidos'"
  );
  if (
    !tabela ||
    (/\bpendente_contato\b/i.test(tabela.sql) &&
      /\bem_atendimento\b/i.test(tabela.sql) &&
      /\bentregue\b/i.test(tabela.sql))
  ) {
    return;
  }

  await executar('PRAGMA foreign_keys = OFF;');
  try {
    await executar(`CREATE TABLE pedidos_nova (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        estoque_id   INTEGER NOT NULL REFERENCES estoque (id),
        recebedor_id INTEGER NOT NULL REFERENCES usuarios (id),
        quantidade   INTEGER NOT NULL CHECK (quantidade > 0),
        status       TEXT    NOT NULL DEFAULT 'pendente_contato'
                     CHECK (status IN ('pendente', 'pendente_contato', 'em_atendimento',
                                       'entregue', 'concluido', 'cancelado')),
        criado_em    TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
     );`);
    await executar(
      `INSERT INTO pedidos_nova (id, estoque_id, recebedor_id, quantidade, status, criado_em)
       SELECT id, estoque_id, recebedor_id, quantidade, status, criado_em
         FROM pedidos;`
    );
    await executar('DROP TABLE pedidos;');
    await executar('ALTER TABLE pedidos_nova RENAME TO pedidos;');
  } finally {
    await executar('PRAGMA foreign_keys = ON;');
  }

  console.log('[OK] Migração aplicada: status de solicitações da empresa liberados em pedidos.');
}

module.exports = { db, iniciarBancoDeDados };
