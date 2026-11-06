/**
 * service.js — regras de negócio e persistência para locais e instituições de doação.
 *
 * A tabela `locais` guarda a morada estruturada (CEP, rua, bairro, número,
 * complemento) e também a morada formatada pronta para exibição/cópia:
 *   "Rua X, nº Y, Bairro Z - CEP W".
 * O telefone é guardado no formato de exibição e em `telefone_link`
 * (apenas dígitos, com DDI 55) pronto para `tel:` e `wa.me`.
 */
const { db } = require('../../../database/database');

const LOCAIS_INICIAIS = [
  {
    nome: 'Centro Espírita Paulo de Tarso',
    telefone: '(66) 99978-0094',
    endereco: 'Rua Cuiabá, Barra do Garças - MT',
    categorias: 'roupas,alimentos,dinheiro',
    tipo: 'Ponto de Coleta',
    mapa_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.2629596847873!2d-52.27337342401574!3d-15.89528882544928!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93656f0d3586bbd7%3A0x417f9880a24a89be!2sCentro%20Esp%C3%ADrita%20Paulo%20de%20Tarso!5e0!3m2!1spt-BR!2sbr!4v1778066716612!5m2!1spt-BR!2sbr',
  },
  {
    nome: 'APAE Barra do Garças',
    telefone: '(66) 99227-0756',
    endereco: 'Rua 31 de Março, Barra do Garças - MT',
    categorias: 'roupas,alimentos,higiene,moveis,cultura,dinheiro',
    tipo: 'Instituição Beneficente',
    mapa_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.7577127809254!2d-52.27098352401625!3d-15.869326524806352!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93656f502b007a4f%3A0x8f9109baf89081df!2sAPAE%20Associa%C3%A7%C3%A3o%20de%20Pais%20e%20Amigos%20dos%20Excepcionais!5e0!3m2!1spt-BR!2sbr!4v1778066789542!5m2!1spt-BR!2sbr',
  },
  {
    nome: 'Associação Barragarcense dos Cegos',
    telefone: '(66) 99663-4281',
    endereco: 'Av. Gabriel Ferreira, Barra do Garças - MT',
    categorias: 'alimentos,higiene,dinheiro',
    tipo: 'Ponto de Coleta',
    mapa_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.4108802716664!2d-52.27800732398152!3d-15.887530984765919!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93656f11fea8c595%3A0xa685f8374a806e27!2sAssocia%C3%A7%C3%A3o%20Barragarcense%20dos%20Cegos!5e0!3m2!1spt-BR!2sbr!4v1778590890012!5m2!1spt-BR!2sbr',
  },
  {
    nome: 'Vicentinos - Casa de Ozanam',
    telefone: '(66) 99257-8687',
    endereco: 'Sociedade São Vicente de Paulo, Barra do Garças - MT',
    categorias: 'alimentos,dinheiro',
    tipo: 'Instituição Beneficente',
    mapa_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.498365473498!2d-52.2507661!3d-15.882940999999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93656f16dc3daab5%3A0x1b021b1d4c436808!2sCasa%20De%20Ozanam%20Sociedade%20S%C3%A3o%20Vicente%20De%20Paulo!5e0!3m2!1spt-BR!2sbr!4v1778591149595!5m2!1spt-BR!2sbr',
  },
  {
    nome: 'Obras Sociais Francisco de Assis',
    telefone: '(66) 99252-8688',
    endereco: 'Rua São Francisco, Barra do Garças - MT',
    categorias: 'alimentos,dinheiro',
    tipo: 'Instituição Beneficente',
    mapa_url:
      'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3837.1178228740546!2d-52.30699682398117!3d-15.902897084752748!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x936568e3f21fedc5%3A0xc4b8c58f41295128!2sObras%20Sociais%20Francisco%20de%20Assis!5e0!3m2!1spt-BR!2sbr!4v1778591670832!5m2!1spt-BR!2sbr',
  },
];

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
      return erro ? rejeitar(erro) : resolver(this);
    });
  });
}

/** Devolve apenas dígitos, com DDI 55 quando for telefone brasileiro. */
function normalizarTelefoneLink(telefone) {
  let digitos = String(telefone || '').replace(/\D/g, '');
  if (!digitos) return '';
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos;
}

/** Aceita array ou string com vírgulas e devolve uma lista normalizada. */
function normalizarCategorias(categorias) {
  const bruto = Array.isArray(categorias) ? categorias : String(categorias || '').split(',');
  const limpas = [
    ...new Set(
      bruto
        .flatMap((item) => String(item || '').split(','))
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  return limpas.length > 0 ? limpas.join(',') : 'todas';
}

/** Monta a morada formatada: "Rua X, nº Y, Bairro Z - CEP W". */
function montarEndereco(dados) {
  const rua = String(dados.rua || '').trim();
  const bairro = String(dados.bairro || '').trim();
  const numero = String(dados.numero || '').trim();
  const cep = String(dados.cep || '').trim();
  const complemento = String(dados.complemento || '').trim();

  if (!rua && !bairro && !numero && !cep) {
    return String(dados.endereco || 'Barra do Garças - MT').trim();
  }

  const ruaFormatada = /^(rua|avenida|av\.?|travessa|alameda|rodovia|estrada|praça|praca)\s+/i.test(rua)
    ? rua
    : rua
      ? `Rua ${rua}`
      : '';
  const bairroFormatado = /^bairro\s+/i.test(bairro) ? bairro : bairro ? `Bairro ${bairro}` : '';

  const partes = [];
  if (ruaFormatada) partes.push(ruaFormatada);
  if (numero) partes.push(`nº ${numero}`);
  if (complemento) partes.push(complemento);

  let endereco = partes.join(', ');
  if (bairroFormatado) endereco += `${endereco ? ', ' : ''}${bairroFormatado}`;
  if (cep) endereco += `${endereco ? ' - ' : ''}CEP ${cep}`;

  return endereco || 'Barra do Garças - MT';
}

/**
 * Cria a tabela locais caso ainda não exista, adiciona colunas novas em bancos
 * antigos e insere os registros semente se a tabela estiver vazia.
 */
async function garantirTabelaESeed() {
  await executar(`
    CREATE TABLE IF NOT EXISTS locais (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id    INTEGER REFERENCES usuarios (id) ON DELETE SET NULL,
      nome          TEXT    NOT NULL,
      telefone      TEXT    NOT NULL DEFAULT '',
      telefone_link TEXT    NOT NULL DEFAULT '',
      cep           TEXT    NOT NULL DEFAULT '',
      rua           TEXT    NOT NULL DEFAULT '',
      bairro        TEXT    NOT NULL DEFAULT '',
      numero        TEXT    NOT NULL DEFAULT '',
      complemento   TEXT    NOT NULL DEFAULT '',
      endereco      TEXT    NOT NULL DEFAULT 'Barra do Garças - MT',
      categorias    TEXT    NOT NULL DEFAULT 'todas',
      mapa_url      TEXT    DEFAULT '',
      tipo          TEXT    NOT NULL DEFAULT 'Ponto de Coleta',
      criado_em     TEXT    NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  /* Migração suave: bancos criados antes deste módulo ganham as colunas novas. */
  const colunas = await consultarTodos('PRAGMA table_info(locais)');
  const existentes = new Set(colunas.map((coluna) => coluna.name));
  const novasColunas = [
    ['telefone_link', "TEXT NOT NULL DEFAULT ''"],
    ['cep', "TEXT NOT NULL DEFAULT ''"],
    ['rua', "TEXT NOT NULL DEFAULT ''"],
    ['bairro', "TEXT NOT NULL DEFAULT ''"],
    ['numero', "TEXT NOT NULL DEFAULT ''"],
    ['complemento', "TEXT NOT NULL DEFAULT ''"],
  ];

  for (const [nome, definicao] of novasColunas) {
    if (!existentes.has(nome)) {
      await executar(`ALTER TABLE locais ADD COLUMN ${nome} ${definicao};`);
    }
  }

  const contagem = await consultarUmaLinha('SELECT COUNT(*) AS total FROM locais');
  if (contagem && contagem.total === 0) {
    for (const local of LOCAIS_INICIAIS) {
      await executar(
        `INSERT INTO locais (nome, telefone, telefone_link, endereco, categorias, mapa_url, tipo)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          local.nome,
          local.telefone,
          normalizarTelefoneLink(local.telefone),
          local.endereco,
          normalizarCategorias(local.categorias),
          local.mapa_url,
          local.tipo,
        ]
      );
    }
  }

  /* Preenche `telefone_link` de registos antigos que ainda estejam vazios. */
  const semLink = await consultarTodos("SELECT id, telefone FROM locais WHERE telefone_link = '' AND telefone <> ''");
  for (const local of semLink) {
    await executar('UPDATE locais SET telefone_link = ? WHERE id = ?', [
      normalizarTelefoneLink(local.telefone),
      local.id,
    ]);
  }
}

/**
 * Normaliza e sincroniza empresas cadastradas como 'Empresa' para que também
 * apareçam nos locais de doação. Beneficiários NÃO são sincronizados: a
 * morada familiar é dado sensível e não deve ser publicada como ponto público.
 */
async function sincronizarUsuariosParceiros() {
  const usuarios = await consultarTodos(
    "SELECT id, nome, tipo FROM usuarios WHERE tipo = 'Empresa'"
  );

  for (const u of usuarios) {
    const jaExiste = await consultarUmaLinha(
      'SELECT id FROM locais WHERE usuario_id = ? OR LOWER(nome) = LOWER(?)',
      [u.id, u.nome]
    );

    if (!jaExiste) {
      const mapaUrl = `https://maps.google.com/maps?q=${encodeURIComponent(u.nome + ' Barra do Garças MT')}&output=embed`;
      await executar(
        `INSERT INTO locais (usuario_id, nome, telefone, telefone_link, endereco, categorias, mapa_url, tipo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.id,
          u.nome,
          '(66) 99999-0000',
          normalizarTelefoneLink('(66) 99999-0000'),
          'Barra do Garças - MT',
          'todas',
          mapaUrl,
          'Empresa Parceira',
        ]
      );
    }
  }
}

/**
 * Lista locais de doação, filtrando opcionalmente por categoria.
 */
async function listarLocais(categoriaFiltro) {
  await garantirTabelaESeed();
  await sincronizarUsuariosParceiros();

  const todasLinhas = await consultarTodos(
    `SELECT id, usuario_id, nome, telefone, telefone_link, cep, rua, bairro, numero, complemento,
            endereco, categorias, mapa_url, tipo, criado_em
       FROM locais
      ORDER BY id ASC`
  );

  if (!categoriaFiltro || categoriaFiltro.trim() === '' || categoriaFiltro.toLowerCase() === 'todas') {
    return todasLinhas;
  }

  const termo = categoriaFiltro.trim().toLowerCase();

  return todasLinhas.filter((local) => {
    const cats = String(local.categorias || '').toLowerCase();
    return cats.includes(termo) || cats.includes('todas');
  });
}

/**
 * Cria um novo local de doação com morada estruturada e telefone pronto
 * para geração dos links `tel:` e `wa.me`.
 */
async function criarLocal(dados, usuarioId = null) {
  await garantirTabelaESeed();

  const nome = String(dados.nome || '').trim();
  const telefone = String(dados.telefone || '').trim();
  const telefoneLink = normalizarTelefoneLink(telefone);
  const cep = String(dados.cep || '').trim();
  const rua = String(dados.rua || '').trim();
  const bairro = String(dados.bairro || '').trim();
  const numero = String(dados.numero || '').trim();
  const complemento = String(dados.complemento || '').trim();
  const endereco = montarEndereco({ cep, rua, bairro, numero, complemento, endereco: dados.endereco });
  const categorias = normalizarCategorias(dados.categorias);
  const tipo = String(dados.tipo || 'Ponto de Coleta').trim();

  let mapaUrl = String(dados.mapa_url || '').trim();
  if (!mapaUrl) {
    const consulta = [nome, endereco, 'Barra do Garças MT'].filter(Boolean).join(' ');
    mapaUrl = `https://maps.google.com/maps?q=${encodeURIComponent(consulta)}&output=embed`;
  }

  const res = await executar(
    `INSERT INTO locais
        (usuario_id, nome, telefone, telefone_link, cep, rua, bairro, numero, complemento,
         endereco, categorias, mapa_url, tipo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      nome,
      telefone,
      telefoneLink,
      cep,
      rua,
      bairro,
      numero,
      complemento,
      endereco,
      categorias,
      mapaUrl,
      tipo,
    ]
  );

  return consultarUmaLinha('SELECT * FROM locais WHERE id = ?', [res.lastID]);
}

module.exports = {
  garantirTabelaESeed,
  sincronizarUsuariosParceiros,
  listarLocais,
  criarLocal,
  normalizarTelefoneLink,
  normalizarCategorias,
  montarEndereco,
};
