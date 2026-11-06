/**
 * email.service.js — envio de e-mails transacionais do FAP Solidário.
 *
 * Configuração por variáveis de ambiente (api/.env):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM
 *
 * Sem SMTP configurado, o serviço entra em modo SIMULAÇÃO (transporte JSON do
 * Nodemailer): o e-mail é montado e registrado no console, sem tentar conexão
 * externa. Isso mantém o ambiente local e os testes totalmente offline.
 *
 * Opcional em desenvolvimento:
 *   EMAIL_SIMULADO_FILE=/caminho/arquivo.jsonl  → grava cada e-mail simulado.
 */
const fs = require('node:fs');
const path = require('node:path');
const nodemailer = require('nodemailer');

const PORTA_PADRAO = 587;
const REMETENTE_PADRAO = 'FAP Solidário <no-reply@fapsolidario.org>';

let transporte = null;
let configuracao = null;

function obterConfiguracao() {
  if (configuracao) return configuracao;

  const host = String(process.env.SMTP_HOST || '').trim();
  const porta = Number(process.env.SMTP_PORT) || PORTA_PADRAO;
  const usuario = String(process.env.SMTP_USER || '').trim();
  const senha = String(process.env.SMTP_PASS || '');
  const remetente = String(process.env.SMTP_FROM || '').trim() || usuario || REMETENTE_PADRAO;

  const simulado = !(host && usuario && senha);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || porta === 465;

  configuracao = {
    simulado,
    remetente,
    opcoes: simulado
      ? { jsonTransport: true }
      : {
          host,
          port: porta,
          secure,
          auth: { user: usuario, pass: senha },
          connectionTimeout: 10000,
          greetingTimeout: 10000,
          socketTimeout: 15000,
        },
  };

  if (simulado) {
    console.warn(
      '[EMAIL] SMTP não configurado — modo SIMULAÇÃO ativo. Defina SMTP_HOST/SMTP_USER/SMTP_PASS para envio real.'
    );
  }

  return configuracao;
}

function obterTransporte() {
  if (transporte) return transporte;
  const cfg = obterConfiguracao();
  transporte = nodemailer.createTransport(cfg.opcoes);
  return transporte;
}

/* Indica se o serviço está em modo de simulação (sem conexão SMTP real). */
function emailSimulado() {
  return obterConfiguracao().simulado;
}

/* Grava o e-mail simulado em JSONL quando EMAIL_SIMULADO_FILE está definido. */
function registarSimulacao(registro) {
  const arquivo = String(process.env.EMAIL_SIMULADO_FILE || '').trim();
  if (!arquivo) return;

  try {
    fs.mkdirSync(path.dirname(arquivo), { recursive: true });
    fs.appendFileSync(arquivo, `${JSON.stringify(registro)}\n`, 'utf8');
  } catch (erro) {
    console.warn('[EMAIL] Não foi possível gravar EMAIL_SIMULADO_FILE:', erro.message);
  }
}

/**
 * Envia (ou simula) um e-mail HTML.
 * @param {{para: string, assunto: string, html: string, texto?: string}} mensagem
 * @returns {Promise<{enviado: boolean, simulado: boolean, id?: string, motivo?: string}>}
 */
async function enviarEmail({ para, assunto, html, texto }) {
  const destinatario = String(para || '').trim();
  if (!destinatario) {
    return { enviado: false, simulado: emailSimulado(), motivo: 'Destinatário sem e-mail cadastrado.' };
  }

  const cfg = obterConfiguracao();
  const mensagem = {
    from: cfg.remetente,
    to: destinatario,
    subject: String(assunto || '').trim(),
    html: String(html || ''),
    text: String(texto || ''),
  };

  try {
    const info = await obterTransporte().sendMail(mensagem);

    if (cfg.simulado) {
      console.log(`[EMAIL:SIMULADO] Para: ${destinatario} | Assunto: ${mensagem.subject}`);
      registarSimulacao({
        data: new Date().toISOString(),
        para: destinatario,
        assunto: mensagem.subject,
        html: mensagem.html,
        texto: mensagem.text,
        simulado: true,
      });
      return { enviado: true, simulado: true, id: info.messageId };
    }

    console.log(`[EMAIL] Enviado para ${destinatario} (id ${info.messageId}).`);
    return { enviado: true, simulado: false, id: info.messageId };
  } catch (erro) {
    console.error(`[EMAIL] Falha ao enviar para ${destinatario}:`, erro.message);
    return { enviado: false, simulado: cfg.simulado, motivo: erro.message };
  }
}

module.exports = { enviarEmail, emailSimulado };
