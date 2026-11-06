/**
 * pedidos.controller.js — camada HTTP do módulo de pedidos (RN02, RN03 e RN04).
 * A sessão e o papel já foram verificados pelos middlewares na rota
 * (exigirSessao / exigirPapel); aqui fica apenas requisição/resposta.
 */
const servico = require('../src/modules/pedidos/service');
const notificacao = require('../src/modules/pedidos/notificacao');

/* GET /api/pedidos — histórico de pedidos do recebedor logado.
 * Resposta é um ARRAY PURO: receber.html faz `dados.forEach` e lê
 * id / nome_item / categoria / quantidade_pedida / data_pedido. */
async function listar(req, res, proximo) {
  try {
    const pedidos = await servico.listarPedidos(req.usuario);
    return res.json(pedidos);
  } catch (erro) {
    return proximo(erro);
  }
}

/* POST /api/pedidos — solicita um item do estoque ({ id_item, quantidade_pedida }).
 * RN04: o pedido e a baixa no estoque acontecem na MESMA transação. */
async function criar(req, res, proximo) {
  try {
    const pedido = await servico.criarPedido(req.body || {}, req.usuario);

    /* A notificação é preparada depois do COMMIT e o envio é agendado para
       segundo plano: uma falha de SMTP nunca desfaz o pedido nem atrasa a
       resposta HTTP do beneficiário. */
    let statusNotificacao = { agendada: false, motivo: null };
    try {
      const dadosNotificacao = await notificacao.prepararNotificacaoSolicitacao(pedido, req.usuario);
      notificacao.agendarEnvioNotificacao(dadosNotificacao);
      statusNotificacao = {
        agendada: dadosNotificacao.podeEnviar,
        empresa: dadosNotificacao.empresaNome || null,
        motivo: dadosNotificacao.motivo || null,
        modo_simulado: dadosNotificacao.podeEnviar ? notificacao.emailSimulado() : false,
      };
    } catch (erroNotificacao) {
      console.error('[PEDIDO] Falha ao preparar notificação:', erroNotificacao.message);
      statusNotificacao = { agendada: false, motivo: 'Não foi possível preparar a notificação.' };
    }

    return res.status(201).json({
      mensagem: 'Pedido registrado com sucesso!',
      pedido,
      notificacao: statusNotificacao,
    });
  } catch (erro) {
    return proximo(erro);
  }
}

/* GET /api/pedidos/:id — detalhe de um pedido do próprio recebedor. */
async function obter(req, res, proximo) {
  try {
    const pedido = await servico.obterPedido(req.params.id, req.usuario);
    return res.json(pedido);
  } catch (erro) {
    return proximo(erro);
  }
}

/* PUT /api/pedidos/:id/status — atualiza o status do pedido do recebedor.
 * 'cancelado' devolve a quantidade ao estoque na mesma transação (RN04). */
async function atualizarStatus(req, res, proximo) {
  try {
    const pedido = await servico.atualizarStatus(req.params.id, (req.body || {}).status, req.usuario);
    return res.json({ mensagem: `Status do pedido ${pedido.id} atualizado para "${pedido.status}".`, pedido });
  } catch (erro) {
    return proximo(erro);
  }
}

module.exports = { listar, criar, obter, atualizarStatus };
