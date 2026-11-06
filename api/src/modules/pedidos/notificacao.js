/**
 * notificacao.js — monta e agenda o e-mail enviado à empresa/ponto de coleta
 * quando um beneficiário solicita um item (POST /api/pedidos).
 *
 * O envio é feito em segundo plano (setImmediate), depois do COMMIT do pedido,
 * para não atrasar a resposta HTTP do beneficiário.
 */
const { db } = require('../../../database/database');
const { enviarEmail, emailSimulado } = require('../../services/email.service');

function consultarUmaLinha(sql, params = []) {
  return new Promise((resolver, rejeitar) => {
    db.get(sql, params, (erro, linha) => (erro ? rejeitar(erro) : resolver(linha)));
  });
}

function somenteDigitos(valor) {
  return String(valor || '').replace(/\D/g, '');
}

function escaparHtml(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function textoOuPadrao(valor, padrao = 'Não informado') {
  const texto = String(valor ?? '').trim();
  return texto || padrao;
}

function normalizarTelefoneWhatsapp(telefone) {
  let digitos = somenteDigitos(telefone);
  if (!digitos) return '';
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`;
  return digitos;
}

function montarLinkWhatsapp(telefone, nomeItem) {
  const numero = normalizarTelefoneWhatsapp(telefone);
  if (!numero) return '';
  const mensagem = `Olá, vi sua solicitação no FAP Solidário${
    nomeItem ? ` para o item "${nomeItem}"` : ''
  } e gostaria de combinar a entrega da doação.`;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

function montarEndereco(solicitante) {
  const partes = [];
  if (solicitante.rua) {
    partes.push(`${solicitante.rua}${solicitante.numero ? `, nº ${solicitante.numero}` : ''}`);
  }
  if (solicitante.complemento) partes.push(solicitante.complemento);
  if (solicitante.bairro) partes.push(`Bairro ${solicitante.bairro}`);
  if (solicitante.cep) partes.push(`CEP ${solicitante.cep}`);
  if (solicitante.ponto_referencia) partes.push(`Referência: ${solicitante.ponto_referencia}`);
  return partes.length > 0 ? partes.join(' - ') : 'Endereço não informado';
}

async function buscarEmpresaResponsavel(item) {
  let empresa = null;

  if (item.doador_id) {
    empresa = await consultarUmaLinha(
      'SELECT id, nome, email, telefone, tipo FROM usuarios WHERE id = ?',
      [item.doador_id]
    );
  }

  /* Fallback: itens antigos podem ter apenas o nome exibido da empresa. */
  if ((!empresa || !empresa.email) && item.empresa_nome) {
    const porNome = await consultarUmaLinha(
      `SELECT id, nome, email, telefone, tipo
         FROM usuarios
        WHERE tipo = 'Empresa' AND LOWER(nome) = LOWER(?)
        LIMIT 1`,
      [item.empresa_nome]
    );
    if (porNome && porNome.email) empresa = porNome;
  }

  return empresa;
}

async function buscarSolicitante(recebedor) {
  const usuario = await consultarUmaLinha(
    'SELECT id, nome, email, telefone FROM usuarios WHERE id = ?',
    [recebedor.id]
  );
  const perfil = await consultarUmaLinha(
    `SELECT cpf, rg, data_nascimento, telefone, nis, cep, rua, bairro, numero, complemento,
            ponto_referencia, adultos, criancas, idosos, renda_familiar, necessidades
       FROM beneficiarios
      WHERE usuario_id = ?`,
    [recebedor.id]
  );

  return {
    nome: usuario?.nome || recebedor.nome || 'Beneficiário',
    email: usuario?.email || recebedor.email || '',
    telefone: perfil?.telefone || usuario?.telefone || '',
    cpf: perfil?.cpf || '',
    rg: perfil?.rg || '',
    data_nascimento: perfil?.data_nascimento || '',
    nis: perfil?.nis || '',
    cep: perfil?.cep || '',
    rua: perfil?.rua || '',
    bairro: perfil?.bairro || '',
    numero: perfil?.numero || '',
    complemento: perfil?.complemento || '',
    ponto_referencia: perfil?.ponto_referencia || '',
    adultos: Number(perfil?.adultos) || 0,
    criancas: Number(perfil?.criancas) || 0,
    idosos: Number(perfil?.idosos) || 0,
    renda_familiar: perfil?.renda_familiar || '',
    necessidades: perfil?.necessidades || '',
  };
}

function montarHtml({ empresaNome, item, quantidade, solicitante, endereco, whatsappUrl }) {
  const composicao = `${solicitante.adultos} adulto(s), ${solicitante.criancas} criança(s) (0-12 anos), ${solicitante.idosos} idoso(s)`;
  const botaoWhatsapp = whatsappUrl
    ? `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px auto 4px;">
         <tr>
           <td align="center" bgcolor="#5bbd5e" style="border-radius:8px;">
             <a href="${escaparHtml(whatsappUrl)}"
                target="_blank"
                style="display:inline-block;padding:14px 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:8px;">
               Falar no WhatsApp com o Solicitante
             </a>
           </td>
         </tr>
       </table>`
    : `<p style="margin:24px 0 0;text-align:center;color:#b45309;font-size:14px;">
         Telefone/WhatsApp do solicitante não informado.
       </p>`;

  return `<!doctype html>
<html lang="pt-br">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Nova Solicitação de Doação</title>
  </head>
  <body style="margin:0;padding:0;background-color:#eef4f7;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef4f7;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(19,137,172,0.15);">
            <tr>
              <td style="background-color:#1389ac;padding:28px 32px;text-align:center;">
                <h1 style="margin:0;font-family:Arial,sans-serif;font-size:26px;line-height:1.2;color:#ffffff;letter-spacing:1px;">
                  FAP <span style="color:#f1db0c;">SOLIDÁRIO</span>
                </h1>
                <p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:14px;color:#d7eef6;">
                  Nova solicitação de doação recebida
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:30px 32px 8px;">
                <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:16px;color:#334155;">
                  Olá, <strong>${escaparHtml(empresaNome)}</strong>!
                </p>
                <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.6;color:#64748b;">
                  Um beneficiário solicitou um item doado por vocês. Confira os dados abaixo e entre em
                  contato para combinar a entrega.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f0f9fc;border-left:5px solid #1389ac;border-radius:8px;">
                  <tr>
                    <td style="padding:18px 20px;">
                      <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#0e6b8a;">
                        Item solicitado
                      </p>
                      <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:20px;font-weight:bold;color:#1e293b;">
                        ${escaparHtml(item.nome_item)}
                      </p>
                      <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:14px;color:#475569;">
                        Quantidade solicitada: <strong>${escaparHtml(quantidade)}</strong> unidade(s)
                        ${item.categoria ? `&nbsp;|&nbsp; Categoria: <strong>${escaparHtml(item.categoria)}</strong>` : ''}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:24px 32px 0;">
                <h2 style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:16px;color:#1389ac;border-bottom:2px solid #f1db0c;padding-bottom:6px;">
                  Ficha do Solicitante
                </h2>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-family:Arial,sans-serif;font-size:14px;color:#334155;">
                  <tr>
                    <td style="padding:7px 0;width:42%;color:#64748b;">Nome completo</td>
                    <td style="padding:7px 0;font-weight:bold;">${escaparHtml(solicitante.nome)}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Telefone / WhatsApp</td>
                    <td style="padding:7px 0;font-weight:bold;">${escaparHtml(textoOuPadrao(solicitante.telefone))}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">E-mail</td>
                    <td style="padding:7px 0;">${escaparHtml(textoOuPadrao(solicitante.email))}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Endereço completo</td>
                    <td style="padding:7px 0;">${escaparHtml(endereco)}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Bairro</td>
                    <td style="padding:7px 0;">${escaparHtml(textoOuPadrao(solicitante.bairro))}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Composição familiar</td>
                    <td style="padding:7px 0;">${escaparHtml(composicao)}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">NIS / CadÚnico</td>
                    <td style="padding:7px 0;">${escaparHtml(textoOuPadrao(solicitante.nis))}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Renda familiar</td>
                    <td style="padding:7px 0;">${escaparHtml(textoOuPadrao(solicitante.renda_familiar))}</td>
                  </tr>
                  <tr>
                    <td style="padding:7px 0;color:#64748b;">Necessidades</td>
                    <td style="padding:7px 0;">${escaparHtml(textoOuPadrao(solicitante.necessidades))}</td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:0 32px 8px;">
                ${botaoWhatsapp}
              </td>
            </tr>

            <tr>
              <td style="padding:20px 32px 30px;text-align:center;">
                <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;line-height:1.6;color:#94a3b8;">
                  Este e-mail foi gerado automaticamente pelo FAP Solidário ao registrar um pedido.
                  Os dados do solicitante são de uso exclusivo para combinar esta doação.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function montarTexto({ empresaNome, item, quantidade, solicitante, endereco, whatsappUrl }) {
  const linhas = [
    `Olá, ${empresaNome}!`,
    '',
    'Nova solicitação de doação no FAP Solidário:',
    `Item: ${item.nome_item}`,
    `Quantidade solicitada: ${quantidade}`,
    item.categoria ? `Categoria: ${item.categoria}` : '',
    '',
    'Ficha do solicitante:',
    `Nome: ${solicitante.nome}`,
    `Telefone/WhatsApp: ${textoOuPadrao(solicitante.telefone)}`,
    `E-mail: ${textoOuPadrao(solicitante.email)}`,
    `Endereço: ${endereco}`,
    `Bairro: ${textoOuPadrao(solicitante.bairro)}`,
    `Composição familiar: ${solicitante.adultos} adulto(s), ${solicitante.criancas} criança(s), ${solicitante.idosos} idoso(s)`,
    `NIS/CadÚnico: ${textoOuPadrao(solicitante.nis)}`,
    `Renda familiar: ${textoOuPadrao(solicitante.renda_familiar)}`,
    `Necessidades: ${textoOuPadrao(solicitante.necessidades)}`,
    '',
    whatsappUrl ? `Falar no WhatsApp: ${whatsappUrl}` : 'Telefone/WhatsApp do solicitante não informado.',
  ];

  return linhas.filter((linha) => linha !== '').join('\n');
}

/**
 * Consulta os dados necessários e monta a mensagem. Retorna também
 * `podeEnviar`/`destinatario` para a API informar o frontend.
 */
async function prepararNotificacaoSolicitacao(pedido, recebedor) {
  const item = await consultarUmaLinha(
    'SELECT id, nome_item, categoria, empresa_nome, doador_id FROM estoque WHERE id = ?',
    [pedido.id_item]
  );

  if (!item) {
    return {
      podeEnviar: false,
      destinatario: null,
      motivo: 'Item da solicitação não encontrado.',
    };
  }

  const empresa = await buscarEmpresaResponsavel(item);
  const solicitante = await buscarSolicitante(recebedor);
  const empresaNome = textoOuPadrao(item.empresa_nome || empresa?.nome, 'Instituição parceira');
  const endereco = montarEndereco(solicitante);
  const whatsappUrl = montarLinkWhatsapp(solicitante.telefone, item.nome_item);
  const assunto = `[FAP Solidário] Nova Solicitação de Doação: ${item.nome_item}`;
  const dados = {
    empresaNome,
    item,
    quantidade: pedido.quantidade_pedida,
    solicitante,
    endereco,
    whatsappUrl,
  };

  return {
    podeEnviar: Boolean(empresa?.email),
    destinatario: empresa?.email || null,
    empresaNome,
    assunto,
    html: montarHtml(dados),
    texto: montarTexto(dados),
    motivo: empresa?.email ? null : 'A empresa/ponto de coleta não possui e-mail cadastrado.',
  };
}

/* Agenda o envio para depois da resposta HTTP (não bloqueia o beneficiário). */
function agendarEnvioNotificacao(notificacao) {
  if (!notificacao || !notificacao.podeEnviar) return;

  setImmediate(async () => {
    try {
      await enviarEmail({
        para: notificacao.destinatario,
        assunto: notificacao.assunto,
        html: notificacao.html,
        texto: notificacao.texto,
      });
    } catch (erro) {
      console.error('[EMAIL] Erro inesperado ao notificar a empresa:', erro.message);
    }
  });
}

module.exports = {
  prepararNotificacaoSolicitacao,
  agendarEnvioNotificacao,
  emailSimulado,
};
