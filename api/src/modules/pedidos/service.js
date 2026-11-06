/**
 * service.js — regras e acesso a dados do módulo de pedidos (RN02, RN03 e RN04).
 * É o único lugar que conversa com a tabela `pedidos` (e lê/atualiza `estoque`
 * para validar disponibilidade e dar a baixa) — sempre com consultas
 * parametrizadas (proteção contra SQL Injection).
 */
const { db } = require('../../../database/database');
const ApiErro = require('../../utils/ApiErro');

/* Status que o BENEFICIÁRIO pode informar no PUT /api/pedidos/:id/status.
 * O ciclo gerido pela empresa (em_atendimento/entregue) tem contrato próprio. */
const STATUS = ['pendente', 'pendente_contato', 'concluido', 'cancelado'];

/* Mapa para aceitar o status em qualquer capitalização/acento ('Concluído' → 'concluido'). */
const STATUS_NORMALIZADOS = {
  pendente: 'pendente',
  pendente_contato: 'pendente_contato',
  pendentecontato: 'pendente_contato',
  solicitado: 'pendente_contato',
  aguardando_contato: 'pendente_contato',
  aguardandocontato: 'pendente_contato',
  concluido: 'concluido',
  cancelado: 'cancelado',
};

/* Status em que o pedido ainda aguarda contato/decisão da empresa. */
const STATUS_AGUARDANDO = ['pendente', 'pendente_contato'];

/* Mesmo teto aplicado pelo módulo de estoque, para mensagens consistentes. */
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

/* ' Concluído ' → 'concluido' (ignora maiúsculas/minúsculas e acentos). */
function normalizarStatus(valor) {
  const chave = String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  return STATUS_NORMALIZADOS[chave] || null;
}

/**
 * Fila de transações — o projeto usa UMA conexão SQLite compartilhada (o `db`
 * exportado por database.js), então apenas UMA transação pode estar aberta por
 * vez. A fila serializa os POST /api/pedidos simultâneos e evita o erro
 * "cannot start a transaction within a transaction" quando dois pedidos chegam
 * juntos (RN04).
 */
let filaTransacoes = Promise.resolve();

function emTransacao(bloco) {
  const promessa = filaTransacoes.then(() => bloco());
  // A fila continua andando mesmo se esta transação falhar.
  filaTransacoes = promessa.then(
    () => undefined,
    () => undefined
  );
  return promessa;
}

/* SELECT base: pedido + detalhes do item (JOIN com o estoque). Os apelidos
   (id_item, quantidade_pedida, data_pedido) seguem o contrato que o frontend
   (receber.html) já consome. */
const SQL_PEDIDO_COM_ITEM = `
  SELECT p.id,
         p.estoque_id  AS id_item,
         e.nome_item,
         e.categoria,
         e.empresa_nome,
         e.data_validade,
         p.quantidade  AS quantidade_pedida,
         p.status,
         p.criado_em   AS data_pedido
    FROM pedidos p
    JOIN estoque e ON e.id = p.estoque_id
`;

/* GET /api/pedidos — histórico de pedidos do recebedor logado (RN02),
   do mais recente para o mais antigo, com os detalhes de cada item. */
async function listarPedidos(recebedor) {
  return consultarTodos(`${SQL_PEDIDO_COM_ITEM} WHERE p.recebedor_id = ? ORDER BY p.id DESC`, [
    recebedor.id,
  ]);
}

/* GET /api/pedidos/:id — detalhe de UM pedido do próprio recebedor. */
async function obterPedido(idBruto, recebedor) {
  const id = Number(String(idBruto ?? '').trim());
  if (!Number.isInteger(id) || id < 1) throw new ApiErro(400, 'Informe um id de pedido válido.');

  const pedido = await consultarUmaLinha(`${SQL_PEDIDO_COM_ITEM} WHERE p.id = ? AND p.recebedor_id = ?`, [
    id,
    recebedor.id,
  ]);
  if (!pedido) throw new ApiErro(404, 'Pedido não encontrado.');
  return pedido;
}

/**
 * POST /api/pedidos — registra a solicitação e dá a baixa no estoque na MESMA
 * transação (BEGIN IMMEDIATE → COMMIT; qualquer falha → ROLLBACK — RN04):
 *   a) confirma que o item existe (404) e tem quantidade suficiente (409) — RN03;
 *   b) insere o registo na tabela `pedidos`;
 *   c) subtrai a quantidade pedida do estoque (baixa automática).
 * Devolve o pedido completo (JOIN com o estoque) para o frontend exibir.
 */
async function criarPedido(dados, recebedor) {
  const idItem = Number(String(dados.id_item ?? '').trim());
  const quantidadePedida = Number(String(dados.quantidade_pedida ?? '').trim());

  if (!Number.isInteger(idItem) || idItem < 1) {
    throw new ApiErro(400, 'Informe o id_item (código do item no estoque).');
  }
  if (!Number.isInteger(quantidadePedida) || quantidadePedida < 1) {
    throw new ApiErro(400, 'A quantidade pedida deve ser um número inteiro maior que zero.');
  }
  if (quantidadePedida > QUANTIDADE_MAXIMA) {
    throw new ApiErro(400, `A quantidade pedida não pode passar de ${QUANTIDADE_MAXIMA}.`);
  }

  return emTransacao(async () => {
    try {
      /* BEGIN IMMEDIATE: trava o banco para escrita desde o início, garantindo
         que nenhuma outra baixa aconteça entre a verificação e a atualização. */
      await executar('BEGIN IMMEDIATE TRANSACTION;');

      /* a) O item existe e tem estoque suficiente? */
      const item = await consultarUmaLinha('SELECT id, nome_item, quantidade FROM estoque WHERE id = ?', [
        idItem,
      ]);
      if (!item) throw new ApiErro(404, 'Item não encontrado no estoque.');
      if (item.quantidade < quantidadePedida) {
        throw new ApiErro(
          409,
          `Estoque insuficiente para "${item.nome_item}": disponível ${item.quantidade}, solicitado ${quantidadePedida}.`
        );
      }

      /* b) Registra o pedido já como `pendente_contato`: a empresa recebeu
         a notificação e entrará em contato para combinar a entrega. */
      const insercao = await executar(
        `INSERT INTO pedidos (estoque_id, recebedor_id, quantidade, status)
         VALUES (?, ?, ?, 'pendente_contato')`,
        [idItem, recebedor.id, quantidadePedida]
      );

      /* c) Baixa automática — o `AND quantidade >= ?` é a segunda linha de
         defesa: se o estoque mudar entre o SELECT e o UPDATE, nada é
         subtraído a mais e a transação é desfeita. */
      const baixa = await executar(
        'UPDATE estoque SET quantidade = quantidade - ? WHERE id = ? AND quantidade >= ?',
        [quantidadePedida, idItem, quantidadePedida]
      );
      if (baixa.changes !== 1) {
        throw new ApiErro(
          409,
          `Estoque insuficiente para "${item.nome_item}": disponível ${item.quantidade}, solicitado ${quantidadePedida}.`
        );
      }

      /* Monta a resposta com os detalhes do item enquanto a transação ainda
         está aberta (os dados já são os definitivos). */
      const pedido = await consultarUmaLinha(`${SQL_PEDIDO_COM_ITEM} WHERE p.id = ?`, [insercao.lastID]);

      await executar('COMMIT;');
      return pedido;
    } catch (erro) {
      /* RN04: qualquer falha desfaz TUDO — pedido e baixa voltam atrás. */
      try {
        await executar('ROLLBACK;');
      } catch {
        /* Sem transação aberta (ex.: o próprio BEGIN falhou) — segue o erro original. */
      }
      throw erro;
    }
  });
}


/**
 * PUT /api/pedidos/:id/status — atualiza o status de um pedido do próprio
 * recebedor. Transições válidas (a partir de 'pendente' ou 'pendente_contato'):
 *   'concluido' → apenas grava o novo status;
 *   'cancelado' → devolve a quantidade ao estoque na MESMA transação (RN04).
 */
async function atualizarStatus(idBruto, statusBruto, recebedor) {
  const id = Number(String(idBruto ?? '').trim());
  const status = normalizarStatus(statusBruto);

  if (!Number.isInteger(id) || id < 1) throw new ApiErro(400, 'Informe um id de pedido válido.');
  if (!status) throw new ApiErro(400, `Status inválido. Use: ${STATUS.join(', ')}.`);

  /* Garante que o pedido existe e pertence ao recebedor da sessão. */
  const pedido = await obterPedido(id, recebedor);

  if (pedido.status === status) throw new ApiErro(400, `O pedido já está com status "${status}".`);
  if (!STATUS_AGUARDANDO.includes(pedido.status)) {
    throw new ApiErro(
      400,
      `Somente pedidos pendentes podem ser atualizados (status atual: "${pedido.status}").`
    );
  }

  return emTransacao(async () => {
    try {
      await executar('BEGIN IMMEDIATE TRANSACTION;');

      /* O `AND status IN (...)` garante que, se duas atualizações chegarem
         ao mesmo tempo, apenas a primeira vence (a outra recebe 409) — nada é
         devolvido ao estoque duas vezes. */
      const atualizacao = await executar(
        'UPDATE pedidos SET status = ? WHERE id = ? AND status IN (?, ?)',
        [status, id, ...STATUS_AGUARDANDO]
      );
      if (atualizacao.changes !== 1) {
        throw new ApiErro(409, 'O pedido não está mais disponível para atualização.');
      }

      if (status === 'cancelado') {
        /* Cancelamento devolve a quantidade ao estoque, na mesma transação. */
        await executar('UPDATE estoque SET quantidade = quantidade + ? WHERE id = ?', [
          pedido.quantidade_pedida,
          pedido.id_item,
        ]);
      }

      await executar('COMMIT;');
      return { ...pedido, status };
    } catch (erro) {
      try {
        await executar('ROLLBACK;');
      } catch {
        /* Sem transação aberta — segue o erro original. */
      }
      throw erro;
    }
  });
}


/* ---------------------------------------------------------------------
 * Gestão de solicitações recebidas pela Empresa/Ponto de Coleta
 * ------------------------------------------------------------------- */

/* Status expostos no painel da empresa (contrato em MAIÚSCULAS). */
const STATUS_EMPRESA = ['PENDENTE', 'EM_ATENDIMENTO', 'ENTREGUE', 'CANCELADO'];

const STATUS_EMPRESA_NORMALIZADOS = {
  pendente: 'PENDENTE',
  pendente_contato: 'PENDENTE',
  pendentecontato: 'PENDENTE',
  solicitado: 'PENDENTE',
  em_atendimento: 'EM_ATENDIMENTO',
  ematendimento: 'EM_ATENDIMENTO',
  atendimento: 'EM_ATENDIMENTO',
  entregue: 'ENTREGUE',
  concluido: 'ENTREGUE',
  cancelado: 'CANCELADO',
};

const STATUS_EMPRESA_PARA_INTERNO = {
  PENDENTE: 'pendente_contato',
  EM_ATENDIMENTO: 'em_atendimento',
  ENTREGUE: 'entregue',
  CANCELADO: 'cancelado',
};

const STATUS_EMPRESA_TERMINAIS = ['ENTREGUE', 'CANCELADO'];

const SQL_SOLICITACAO_EMPRESA = `
  SELECT p.id,
         p.estoque_id,
         p.quantidade       AS quantidade_solicitada,
         p.status           AS status_interno,
         p.criado_em        AS data_solicitacao,
         e.nome_item,
         e.categoria,
         e.empresa_nome,
         e.quantidade       AS estoque_disponivel,
         u.id               AS beneficiario_id,
         u.nome             AS beneficiario_nome,
         u.email            AS beneficiario_email,
         COALESCE(NULLIF(b.telefone, ''), u.telefone, '') AS telefone,
         b.cep,
         b.rua,
         b.numero,
         b.complemento,
         b.bairro,
         b.ponto_referencia,
         b.nis,
         COALESCE(b.adultos, 0)  AS adultos,
         COALESCE(b.criancas, 0) AS criancas,
         COALESCE(b.idosos, 0)   AS idosos,
         b.renda_familiar,
         b.necessidades
    FROM pedidos p
    JOIN estoque e       ON e.id = p.estoque_id
    JOIN usuarios u      ON u.id = p.recebedor_id
    LEFT JOIN beneficiarios b ON b.usuario_id = u.id
`;

const FILTRO_EMPRESA = `(e.doador_id = ? OR (e.doador_id IS NULL AND LOWER(e.empresa_nome) = LOWER(?)))`;

function normalizarStatusEmpresa(valor) {
  const chave = String(valor || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s-]+/g, '_');
  return STATUS_EMPRESA_NORMALIZADOS[chave] || null;
}

/* Converte o status persistido no SQLite para o contrato do painel. */
function statusEmpresaDe(statusInterno) {
  return normalizarStatusEmpresa(statusInterno) || 'PENDENTE';
}

function apenasDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function telefoneWhatsapp(telefone) {
  let digitos = apenasDigitos(telefone);
  if (!digitos) return '';
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos;
}

function montarEnderecoSolicitante(linha) {
  const partes = [];
  if (linha.rua) {
    partes.push(`${linha.rua}${linha.numero ? `, nº ${linha.numero}` : ''}`);
  } else if (linha.numero) {
    partes.push(`Nº ${linha.numero}`);
  }
  if (linha.complemento) partes.push(linha.complemento);
  if (linha.bairro) partes.push(`Bairro ${linha.bairro}`);
  if (linha.cep) partes.push(`CEP ${linha.cep}`);
  if (linha.ponto_referencia) partes.push(`Referência: ${linha.ponto_referencia}`);
  return partes.length > 0 ? partes.join(' - ') : 'Endereço não informado';
}

function formatarSolicitacaoEmpresa(linha) {
  const adultos = Number(linha.adultos) || 0;
  const criancas = Number(linha.criancas) || 0;
  const idosos = Number(linha.idosos) || 0;
  const totalFamilia = adultos + criancas + idosos;
  const nis = apenasDigitos(linha.nis);
  const possuiNis = nis.length === 11;
  const telefone = linha.telefone || '';
  const status = statusEmpresaDe(linha.status_interno);

  const beneficiario = {
    id: linha.beneficiario_id,
    nome: linha.beneficiario_nome,
    telefone,
    whatsapp: telefoneWhatsapp(telefone),
    email: linha.beneficiario_email || '',
    endereco_completo: montarEnderecoSolicitante(linha),
    cep: linha.cep || '',
    rua: linha.rua || '',
    numero: linha.numero || '',
    complemento: linha.complemento || '',
    bairro: linha.bairro || '',
    ponto_referencia: linha.ponto_referencia || '',
    nis,
    possui_nis: possuiNis,
    adultos,
    criancas,
    idosos,
    total_familia: totalFamilia,
    composicao_familiar: {
      adultos,
      criancas,
      idosos,
      total: totalFamilia,
    },
    composicao_familiar_texto: `${adultos} adulto(s), ${criancas} criança(s), ${idosos} idoso(s)`,
    faixa_renda: linha.renda_familiar || 'Não informada',
    renda_familiar: linha.renda_familiar || 'Não informada',
    necessidades: linha.necessidades || '',
  };

  return {
    id: linha.id,
    pedido_id: linha.id,
    estoque_id: linha.estoque_id,
    item_id: linha.estoque_id,
    quantidade_solicitada: linha.quantidade_solicitada,
    data_solicitacao: linha.data_solicitacao,
    status,
    status_interno: linha.status_interno,
    nome_item: linha.nome_item,
    categoria: linha.categoria,
    empresa_nome: linha.empresa_nome,
    estoque_disponivel: linha.estoque_disponivel,
    item: {
      id: linha.estoque_id,
      nome_item: linha.nome_item,
      categoria: linha.categoria,
      empresa_nome: linha.empresa_nome,
      quantidade_disponivel: linha.estoque_disponivel,
    },
    beneficiario,
    solicitante: beneficiario,
    prioridade_social: {
      possui_nis: possuiNis,
      criancas,
      idosos,
      total_familia: totalFamilia,
      nivel: possuiNis || idosos > 0 || criancas >= 2 ? 'alta' : criancas > 0 ? 'media' : 'baixa',
    },
  };
}

async function listarSolicitacoesEmpresa(empresa) {
  const linhas = await consultarTodos(
    `${SQL_SOLICITACAO_EMPRESA}
      WHERE ${FILTRO_EMPRESA}
      ORDER BY p.id DESC`,
    [empresa.id, empresa.nome]
  );
  return linhas.map(formatarSolicitacaoEmpresa);
}

async function obterSolicitacaoEmpresa(id, empresa) {
  const linha = await consultarUmaLinha(
    `${SQL_SOLICITACAO_EMPRESA}
      WHERE p.id = ? AND ${FILTRO_EMPRESA}`,
    [id, empresa.id, empresa.nome]
  );
  return linha ? formatarSolicitacaoEmpresa(linha) : null;
}

/**
 * PATCH /api/pedidos/:id/status — a empresa altera o status de uma solicitação
 * vinculada a um item seu. A baixa no estoque já acontece na criação do pedido
 * (RN03); marcar ENTREGUE apenas finaliza o ciclo, sem dupla subtração. Se o
 * pedido for CANCELADO, a quantidade reservada volta ao estoque.
 */
async function atualizarStatusEmpresa(idBruto, statusBruto, empresa) {
  const id = Number(String(idBruto ?? '').trim());
  const status = normalizarStatusEmpresa(statusBruto);

  if (!Number.isInteger(id) || id < 1) throw new ApiErro(400, 'Informe um id de pedido válido.');
  if (!status) {
    throw new ApiErro(400, `Status inválido. Use: ${STATUS_EMPRESA.join(', ')}.`);
  }

  return emTransacao(async () => {
    try {
      await executar('BEGIN IMMEDIATE TRANSACTION;');

      const pedido = await consultarUmaLinha(
        `SELECT p.id, p.estoque_id, p.quantidade, p.status,
                e.doador_id, e.empresa_nome
           FROM pedidos p
           JOIN estoque e ON e.id = p.estoque_id
          WHERE p.id = ? AND ${FILTRO_EMPRESA}`,
        [id, empresa.id, empresa.nome]
      );
      if (!pedido) throw new ApiErro(404, 'Solicitação não encontrada para esta empresa.');

      const statusAtual = statusEmpresaDe(pedido.status);
      if (statusAtual === status) {
        await executar('COMMIT;');
        return obterSolicitacaoEmpresa(id, empresa);
      }
      if (STATUS_EMPRESA_TERMINAIS.includes(statusAtual)) {
        throw new ApiErro(
          409,
          `A solicitação já está finalizada como "${statusAtual}" e não pode ser alterada.`
        );
      }

      const novoStatusInterno = STATUS_EMPRESA_PARA_INTERNO[status];
      const atualizacao = await executar(
        'UPDATE pedidos SET status = ? WHERE id = ? AND status = ?',
        [novoStatusInterno, id, pedido.status]
      );
      if (atualizacao.changes !== 1) {
        throw new ApiErro(409, 'A solicitação foi alterada por outra operação. Recarregue a lista.');
      }

      /* Cancelamento devolve a reserva feita no POST /api/pedidos. */
      if (status === 'CANCELADO') {
        await executar('UPDATE estoque SET quantidade = quantidade + ? WHERE id = ?', [
          pedido.quantidade,
          pedido.estoque_id,
        ]);
      }

      await executar('COMMIT;');
      return obterSolicitacaoEmpresa(id, empresa);
    } catch (erro) {
      try {
        await executar('ROLLBACK;');
      } catch {
        /* Sem transação aberta — segue o erro original. */
      }
      throw erro;
    }
  });
}

module.exports = {
  STATUS,
  listarPedidos,
  obterPedido,
  criarPedido,
  atualizarStatus,
  STATUS_EMPRESA,
  listarSolicitacoesEmpresa,
  obterSolicitacaoEmpresa,
  atualizarStatusEmpresa,
};
