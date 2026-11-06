/**
 * service.js — regras e acesso a dados do módulo de autenticação.
 * É o único lugar que conversa com a tabela `usuarios` (sempre com
 * consultas SQL parametrizadas — proteção contra SQL Injection).
 */
const { db } = require('../../../database/database');
const ApiErro = require('../../utils/ApiErro');
const { hashSenha, verificarSenha } = require('./password');

/* Tipos de conta do cadastro → papel interno (docs/escopo_projeto.md §2). */
const TIPOS_CONTA = {
  'doador': { tipo: 'Doador Comum', papel: 'doador' },
  'doador comum': { tipo: 'Doador Comum', papel: 'doador' },
  'beneficiário': { tipo: 'Beneficiário', papel: 'recebedor' },
  'beneficiario': { tipo: 'Beneficiário', papel: 'recebedor' },
  'beneficiário/recebedor': { tipo: 'Beneficiário', papel: 'recebedor' },
  'beneficiario/recebedor': { tipo: 'Beneficiário', papel: 'recebedor' },
  'recebedor': { tipo: 'Beneficiário', papel: 'recebedor' },
  'empresa': { tipo: 'Empresa', papel: 'doador' },
  'nova empresa / ponto de coleta': { tipo: 'Empresa', papel: 'doador' },
  'nova empresa/ponto de coleta': { tipo: 'Empresa', papel: 'doador' },
  'ponto de coleta': { tipo: 'Empresa', papel: 'doador' },
};

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENHA_MINIMA = 6;
const RENDAS_VALIDAS = ['Até 1 salário mínimo', '1 a 2 salários mínimos', 'Sem renda fixa'];
const LOGISTICAS_VALIDAS = ['ponto_coleta', 'retirada_domicilio'];

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function texto(valor) {
  return String(valor ?? '').trim();
}

/* Aceita array ou string com vírgulas e devolve uma lista sem duplicados. */
function normalizarLista(valor) {
  const bruto = Array.isArray(valor) ? valor : String(valor || '').split(',');
  return [
    ...new Set(
      bruto
        .flatMap((item) => String(item || '').split(','))
        .map((item) => item.trim())
        .filter(Boolean)
    ),
  ];
}

/* Validação básica de CPF (11 dígitos) e CNPJ (14 dígitos), recusando
 * sequências repetidas do tipo 000.000.000-00. A máscara é aplicada no
 * frontend; aqui a comparação é feita apenas com os dígitos. */
function documentoValido(documento, tipoPessoa) {
  const digitos = somenteDigitos(documento);
  const tamanhoEsperado = tipoPessoa === 'PJ' ? 14 : 11;
  if (digitos.length !== tamanhoEsperado) return false;
  return !/^(\d)\1+$/.test(digitos);
}

/* Data de nascimento no formato ISO (AAAA-MM-DD), não futura. */
function dataNascimentoValida(data) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const nascimento = new Date(`${data}T00:00:00`);
  if (Number.isNaN(nascimento.getTime())) return false;
  return nascimento <= new Date();
}

function inteiroNaoNegativo(valor) {
  const numero = Number.parseInt(valor, 10);
  return Number.isInteger(numero) && numero >= 0 ? numero : 0;
}

function validarEndereco(dados, { exigirPontoReferencia = false } = {}) {
  if (somenteDigitos(dados.cep).length !== 8) {
    throw new ApiErro(400, 'Informe um CEP válido (8 dígitos).');
  }
  if (dados.rua.length < 2) throw new ApiErro(400, 'Informe o nome da rua.');
  if (dados.bairro.length < 2) throw new ApiErro(400, 'Informe o bairro.');
  if (dados.numero.length < 1) throw new ApiErro(400, 'Informe o número da casa/prédio.');
  if (exigirPontoReferencia && dados.ponto_referencia.length < 2) {
    throw new ApiErro(400, 'Informe um ponto de referência para facilitar a entrega.');
  }
}

/* Promisifica db.get / db.run do sqlite3. */
function consultarUmaLinha(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.get(sql, params, (erro, linha) => (erro ? rejeitar(erro) : resolver(linha)));
  });
}

function executar(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.run(sql, params, function (erro) {
      return erro ? rejeitar(erro) : resolver(this); // `this` traz lastID/changes
    });
  });
}

/* Campos públicos do usuário — NUNCA inclui senha_hash nas respostas. */
function campoPublico(linha) {
  return { id: linha.id, nome: linha.nome, email: linha.email, papel: linha.papel, tipo: linha.tipo };
}

/* POST /api/auth/cadastro — valida a entrada e cria a conta + perfil. */
async function criarUsuario(dados) {
  const nome = texto(dados.nome);
  const email = texto(dados.email).toLowerCase();
  const senha = String(dados.senha || '');
  const conta = TIPOS_CONTA[texto(dados.tipo).toLowerCase()];

  if (nome.length < 2) throw new ApiErro(400, 'Informe seu nome completo (mínimo 2 caracteres).');
  if (!EMAIL_VALIDO.test(email)) throw new ApiErro(400, 'Informe um e-mail válido.');
  if (senha.length < SENHA_MINIMA) {
    throw new ApiErro(400, `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`);
  }
  if (!conta) {
    throw new ApiErro(400, 'Tipo de conta inválido. Use: Doador Comum, Empresa ou Beneficiário.');
  }

  /* Dados compartilhados pelos três perfis. */
  const perfil = {
    tipo_pessoa: conta.tipo === 'Empresa' ? 'PJ' : texto(dados.tipo_pessoa).toUpperCase() === 'PJ' ? 'PJ' : 'PF',
    documento: texto(dados.documento),
    telefone: texto(dados.telefone),
    cep: texto(dados.cep),
    rua: texto(dados.rua),
    bairro: texto(dados.bairro),
    numero: texto(dados.numero),
    complemento: texto(dados.complemento),
    ponto_referencia: texto(dados.ponto_referencia),
    logistica: texto(dados.logistica) || 'ponto_coleta',
    categorias: normalizarLista(dados.categorias).join(','),
    horario_funcionamento: texto(dados.horario_funcionamento),
    cpf: texto(dados.cpf),
    rg: texto(dados.rg),
    data_nascimento: texto(dados.data_nascimento),
    nis: somenteDigitos(dados.nis),
    adultos: inteiroNaoNegativo(dados.adultos),
    criancas: inteiroNaoNegativo(dados.criancas),
    idosos: inteiroNaoNegativo(dados.idosos),
    renda_familiar: texto(dados.renda_familiar),
    necessidades: normalizarLista(dados.necessidades).join(','),
  };

  if (conta.tipo === 'Beneficiário') {
    perfil.cpf = texto(dados.cpf) || perfil.documento;
    if (!documentoValido(perfil.cpf, 'PF')) {
      throw new ApiErro(400, 'Informe um CPF válido (11 dígitos).');
    }
    if (perfil.rg.length < 3) throw new ApiErro(400, 'Informe o RG.');
    if (!dataNascimentoValida(perfil.data_nascimento)) {
      throw new ApiErro(400, 'Informe uma data de nascimento válida.');
    }
    if (somenteDigitos(perfil.telefone).length < 10) {
      throw new ApiErro(400, 'Informe um telefone/WhatsApp válido com DDD.');
    }
    if (perfil.nis && perfil.nis.length !== 11) {
      throw new ApiErro(400, 'O NIS/CadÚnico deve ter 11 dígitos (ou pode ficar em branco).');
    }
    validarEndereco(perfil, { exigirPontoReferencia: true });
    if (perfil.adultos + perfil.criancas + perfil.idosos < 1) {
      throw new ApiErro(400, 'Informe pelo menos uma pessoa na composição familiar.');
    }
    if (!RENDAS_VALIDAS.includes(perfil.renda_familiar)) {
      throw new ApiErro(400, 'Informe a faixa de renda familiar mensal.');
    }
    if (!perfil.necessidades) {
      throw new ApiErro(400, 'Selecione pelo menos uma necessidade atual.');
    }
  } else {
    if (conta.tipo === 'Doador Comum' && !documentoValido(perfil.documento, perfil.tipo_pessoa)) {
      const rotulo = perfil.tipo_pessoa === 'PJ' ? 'CNPJ (14 dígitos)' : 'CPF (11 dígitos)';
      throw new ApiErro(400, `Informe um ${rotulo} válido.`);
    }
    /* Empresa: CNPJ é validado quando informado (compatível com cadastros antigos). */
    if (conta.tipo === 'Empresa' && perfil.documento && !documentoValido(perfil.documento, 'PJ')) {
      throw new ApiErro(400, 'Informe um CNPJ válido (14 dígitos).');
    }
    if (somenteDigitos(perfil.telefone).length < 10) {
      throw new ApiErro(400, 'Informe um telefone/WhatsApp válido com DDD.');
    }
    validarEndereco(perfil);
    if (!perfil.categorias) {
      throw new ApiErro(400, 'Selecione pelo menos uma categoria de doação.');
    }
    if (conta.tipo === 'Doador Comum' && !LOGISTICAS_VALIDAS.includes(perfil.logistica)) {
      throw new ApiErro(400, 'Selecione a opção de logística da doação.');
    }
  }

  const existente = await consultarUmaLinha('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existente) throw new ApiErro(409, 'Este e-mail já está cadastrado. Faça login para continuar.');

  const senhaHash = await hashSenha(senha);
  let idCriado;

  try {
    await executar('BEGIN TRANSACTION;');

    const resultado = await executar(
      'INSERT INTO usuarios (nome, email, senha_hash, papel, tipo, telefone) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, email, senhaHash, conta.papel, conta.tipo, perfil.telefone]
    );
    idCriado = resultado.lastID;

    if (conta.tipo === 'Beneficiário') {
      await executar(
        `INSERT INTO beneficiarios
           (usuario_id, cpf, rg, data_nascimento, telefone, nis, cep, rua, bairro, numero,
            complemento, ponto_referencia, adultos, criancas, idosos, renda_familiar, necessidades)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idCriado,
          somenteDigitos(perfil.cpf),
          perfil.rg,
          perfil.data_nascimento,
          perfil.telefone,
          perfil.nis,
          perfil.cep,
          perfil.rua,
          perfil.bairro,
          perfil.numero,
          perfil.complemento,
          perfil.ponto_referencia,
          perfil.adultos,
          perfil.criancas,
          perfil.idosos,
          perfil.renda_familiar,
          perfil.necessidades,
        ]
      );
    } else {
      await executar(
        `INSERT INTO doadores
           (usuario_id, tipo_pessoa, documento, telefone, cep, rua, bairro, numero, complemento,
            ponto_referencia, logistica, categorias, horario_funcionamento)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          idCriado,
          perfil.tipo_pessoa,
          somenteDigitos(perfil.documento),
          perfil.telefone,
          perfil.cep,
          perfil.rua,
          perfil.bairro,
          perfil.numero,
          perfil.complemento,
          perfil.ponto_referencia,
          perfil.logistica,
          perfil.categorias,
          perfil.horario_funcionamento,
        ]
      );
    }

    await executar('COMMIT;');
  } catch (erro) {
    await executar('ROLLBACK;').catch(() => {});
    // Corrida rara: outro pedido registrou o mesmo e-mail entre o SELECT e o INSERT
    if (/UNIQUE constraint failed: usuarios\.email/i.test(String(erro.message))) {
      throw new ApiErro(409, 'Este e-mail já está cadastrado. Faça login para continuar.');
    }
    throw erro;
  }

  /* Empresas/Pontos de Coleta também aparecem na lista pública de locais.
   * Beneficiários NÃO são publicados: a morada familiar é dado sensível. */
  if (conta.tipo === 'Empresa') {
    try {
      const servicoLocais = require('../locais/service');
      await servicoLocais.criarLocal(
        {
          nome,
          telefone: perfil.telefone || '(66) 99999-0000',
          cep: perfil.cep,
          rua: perfil.rua,
          bairro: perfil.bairro,
          numero: perfil.numero,
          complemento: perfil.complemento,
          endereco: dados.endereco || 'Barra do Garças - MT',
          tipo: 'Empresa Parceira',
          categorias: perfil.categorias || 'todas',
        },
        idCriado
      );
    } catch (errLocal) {
      console.warn('[AVISO] Não foi possível vincular local ao usuário cadastrado:', errLocal.message);
    }
  }

  return { id: idCriado, nome, email, papel: conta.papel, tipo: conta.tipo };
}

/* POST /api/auth/login — confere e-mail + senha.
 * A mensagem de erro é a mesma para e-mail inexistente e senha errada
 * (não revela quais e-mails estão cadastrados). */
async function autenticar(email, senha) {
  const emailNormalizado = String(email || '').trim().toLowerCase();
  const senhaInformada = String(senha || '');

  const usuario = await consultarUmaLinha(
    'SELECT id, nome, email, senha_hash, papel, tipo FROM usuarios WHERE email = ?',
    [emailNormalizado]
  );

  const senhaConfere = usuario ? await verificarSenha(senhaInformada, usuario.senha_hash) : false;
  if (!usuario || !senhaConfere) throw new ApiErro(401, 'E-mail ou senha incorretos.');

  return campoPublico(usuario);
}

/* GET /api/auth/sessao — carrega o usuário apontado pelo token assinado. */
async function buscarUsuarioPorId(id) {
  const linha = await consultarUmaLinha(
    'SELECT id, nome, email, papel, tipo FROM usuarios WHERE id = ?',
    [id]
  );
  return linha ? campoPublico(linha) : null;
}

/**
 * Contas e dados de demonstração exibidos na tela de login.
 * A operação é IDEMPOTENTE: pode rodar em todo boot sem duplicar usuários,
 * perfis, locais ou itens. Senhas são sempre gravadas com hash scrypt.
 */
const BENEFICIARIO_TESTE = {
  nome: 'Maria da Silva (Beneficiária de Teste)',
  email: 'recebedor@fap.com',
  senha: '123456',
  cpf: '12345678901',
  rg: '1234567-8 SSP/MT',
  data_nascimento: '1990-05-10',
  telefone: '(66) 98888-2222',
  nis: '12345678901',
  cep: '78600-001',
  rua: 'Rua das Flores',
  bairro: 'Jardim Esperança',
  numero: '120',
  complemento: 'Casa 2',
  ponto_referencia: 'Ao lado da Escola Municipal',
  adultos: 2,
  criancas: 2,
  idosos: 1,
  renda_familiar: 'Até 1 salário mínimo',
  necessidades: 'Cesta Básica / Alimentos,Roupas',
};

const EMPRESA_TESTE = {
  nome: 'Ponto Solidário Central',
  email: 'empresa@fap.com',
  senha: '123456',
  tipo: 'Empresa',
  tipo_pessoa: 'PJ',
  documento: '12345678000199',
  telefone: '5566999998888',
  cep: '78600000',
  rua: 'Rua Principal',
  bairro: 'Centro',
  numero: '500',
  complemento: '',
  ponto_referencia: 'Próximo à praça central',
  categorias: 'alimentos,roupas,higiene',
  horario_funcionamento: 'Segunda a sexta, das 8h às 18h',
};

const ITENS_EMPRESA_TESTE = [
  { nome_item: 'Cesta Básica', categoria: 'Alimentos', quantidade: 20 },
  { nome_item: 'Casaco M', categoria: 'Roupas', quantidade: 8 },
  { nome_item: 'Kit de Higiene', categoria: 'Higiene', quantidade: 12 },
];

async function garantirContaTeste({ nome, email, senha, tipo, papel }) {
  const existente = await consultarUmaLinha('SELECT id FROM usuarios WHERE email = ?', [email]);
  if (existente) return { id: existente.id, criada: false };

  const senhaHash = await hashSenha(senha);
  const resultado = await executar(
    'INSERT INTO usuarios (nome, email, senha_hash, papel, tipo) VALUES (?, ?, ?, ?, ?)',
    [nome, email, senhaHash, papel, tipo]
  );
  return { id: resultado.lastID, criada: true };
}

async function garantirPerfilBeneficiarioTeste(usuarioId) {
  const perfil = await consultarUmaLinha('SELECT id FROM beneficiarios WHERE usuario_id = ?', [
    usuarioId,
  ]);
  if (perfil) return false;

  await executar(
    `INSERT INTO beneficiarios
       (usuario_id, cpf, rg, data_nascimento, telefone, nis, cep, rua, bairro, numero,
        complemento, ponto_referencia, adultos, criancas, idosos, renda_familiar, necessidades)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      usuarioId,
      BENEFICIARIO_TESTE.cpf,
      BENEFICIARIO_TESTE.rg,
      BENEFICIARIO_TESTE.data_nascimento,
      BENEFICIARIO_TESTE.telefone,
      BENEFICIARIO_TESTE.nis,
      BENEFICIARIO_TESTE.cep,
      BENEFICIARIO_TESTE.rua,
      BENEFICIARIO_TESTE.bairro,
      BENEFICIARIO_TESTE.numero,
      BENEFICIARIO_TESTE.complemento,
      BENEFICIARIO_TESTE.ponto_referencia,
      BENEFICIARIO_TESTE.adultos,
      BENEFICIARIO_TESTE.criancas,
      BENEFICIARIO_TESTE.idosos,
      BENEFICIARIO_TESTE.renda_familiar,
      BENEFICIARIO_TESTE.necessidades,
    ]
  );
  return true;
}

async function garantirEmpresaTeste() {
  let empresa = await consultarUmaLinha(
    'SELECT id, nome FROM usuarios WHERE email = ?',
    [EMPRESA_TESTE.email]
  );
  let empresaCriada = false;

  if (!empresa) {
    await criarUsuario(EMPRESA_TESTE);
    empresa = await consultarUmaLinha('SELECT id, nome FROM usuarios WHERE email = ?', [
      EMPRESA_TESTE.email,
    ]);
    empresaCriada = true;
  }

  const perfil = await consultarUmaLinha('SELECT id FROM doadores WHERE usuario_id = ?', [empresa.id]);
  if (!perfil) {
    await executar(
      `INSERT INTO doadores
         (usuario_id, tipo_pessoa, documento, telefone, cep, rua, bairro, numero, complemento,
          ponto_referencia, logistica, categorias, horario_funcionamento)
       VALUES (?, 'PJ', ?, ?, ?, ?, ?, ?, ?, ?, 'ponto_coleta', ?, ?)`,
      [
        empresa.id,
        somenteDigitos(EMPRESA_TESTE.documento),
        EMPRESA_TESTE.telefone,
        EMPRESA_TESTE.cep,
        EMPRESA_TESTE.rua,
        EMPRESA_TESTE.bairro,
        EMPRESA_TESTE.numero,
        EMPRESA_TESTE.complemento,
        EMPRESA_TESTE.ponto_referencia,
        EMPRESA_TESTE.categorias,
        EMPRESA_TESTE.horario_funcionamento,
      ]
    );
  }

  const totalItens = await consultarUmaLinha(
    'SELECT COUNT(*) AS total FROM estoque WHERE doador_id = ?',
    [empresa.id]
  );

  let itensCriados = 0;
  if (!totalItens || totalItens.total === 0) {
    for (const item of ITENS_EMPRESA_TESTE) {
      await executar(
        `INSERT INTO estoque (doador_id, nome_item, categoria, quantidade, empresa_nome, data_validade)
         VALUES (?, ?, ?, ?, ?, NULL)`,
        [empresa.id, item.nome_item, item.categoria, item.quantidade, empresa.nome]
      );
      itensCriados += 1;
    }
  }

  return { id: empresa.id, empresaCriada, itensCriados };
}

async function seedContasDeTeste() {
  const doador = await garantirContaTeste({
    nome: 'Doador de Teste',
    email: 'teste@fap.com',
    senha: '123456',
    tipo: 'Doador Comum',
    papel: 'doador',
  });

  const beneficiario = await garantirContaTeste({
    nome: BENEFICIARIO_TESTE.nome,
    email: BENEFICIARIO_TESTE.email,
    senha: BENEFICIARIO_TESTE.senha,
    tipo: 'Beneficiário',
    papel: 'recebedor',
  });
  const perfilCriado = await garantirPerfilBeneficiarioTeste(beneficiario.id);

  const empresa = await garantirEmpresaTeste();

  if (doador.criada || beneficiario.criada || perfilCriado || empresa.empresaCriada || empresa.itensCriados > 0) {
    console.log(
      `[OK] Dados de teste prontos: teste@fap.com, recebedor@fap.com e empresa@fap.com (senha 123456). ` +
        `Itens da empresa: ${empresa.itensCriados}.`
    );
  }

  return { empresaId: empresa.id };
}

function ehEmpresa(usuario) {
  if (!usuario) return false;
  const normalizar = (valor) =>
    String(valor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[\s-]+/g, '_');

  const tipo = normalizar(usuario.tipo);
  const papel = normalizar(usuario.papel);
  return (
    ['empresa', 'ponto_de_coleta', 'instituicao', 'ong'].includes(tipo) ||
    ['empresa', 'ponto_de_coleta'].includes(papel)
  );
}

module.exports = {
  TIPOS_CONTA,
  criarUsuario,
  autenticar,
  buscarUsuarioPorId,
  seedContasDeTeste,
  ehEmpresa,
};
