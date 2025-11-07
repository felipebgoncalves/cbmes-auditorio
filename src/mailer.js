const nodemailer = require('nodemailer');
require('dotenv').config();

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  MAIL_FROM,
  APP_PUBLIC_URL
} = process.env;

// === TRANSPORTER GERAL ======================================================

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT || 587),
  secure: SMTP_SECURE === 'true',
  auth: SMTP_USER
    ? { user: SMTP_USER, pass: SMTP_PASS }
    : undefined
});

async function enviarEmail({ to, subject, html }) {
  if (!to) return;
  try {
    await transporter.sendMail({
      from: MAIL_FROM || '"Auditório CBMES" <nao-responder@cbmes.es.gov.br>',
      to,
      subject,
      html
    });
    console.log(`📧 E-mail enviado para ${to}: ${subject}`);
  } catch (err) {
    console.error('Erro ao enviar e-mail:', err);
  }
}

// === HELPERS DE DATA ========================================================

function formatarDataBR(data) {
  if (!data) return '';
  const d = new Date(data);
  return d.toLocaleDateString('pt-BR');
}

function textoIntervaloBR(reserva) {
  const ini = formatarDataBR(reserva.data_evento);
  const fim = reserva.data_fim && reserva.data_fim !== reserva.data_evento
    ? formatarDataBR(reserva.data_fim)
    : ini;

  return ini === fim ? ini : `${ini} a ${fim}`;
}

// === E-MAIL: NOVA RESERVA ===================================================

async function enviarEmailNovaReserva(reserva) {
  const assunto = `CBMES – Recebemos sua solicitação de uso do auditório (#${reserva.id})`;
  const urlSistema = APP_PUBLIC_URL || 'http://localhost:3000';

  const html = `
    <p>Prezado(a) ${reserva.responsavel},</p>

    <p>Recebemos sua <strong>solicitação de uso do auditório do CBMES</strong>.</p>

    <p><strong>Dados da solicitação:</strong></p>
    <ul>
      <li><strong>ID:</strong> ${reserva.id}</li>
      <li><strong>Instituição:</strong> ${reserva.instituicao}</li>
      <li><strong>Data do evento:</strong> ${textoIntervaloBR(reserva)}</li>
      <li><strong>Período:</strong> ${reserva.periodo}</li>
      <li><strong>Finalidade:</strong> ${reserva.finalidade}</li>
      <li><strong>Status:</strong> ${reserva.status}</li>
    </ul>

    <p>Sua solicitação será analisada pela equipe responsável do CBMES.</p>

    <p>Este e-mail é automático. Em caso de dúvidas, favor entrar em contato pelos canais oficiais do CBMES.</p>

    <p>Atenciosamente,<br>
    <strong>Corpo de Bombeiros Militar do Espírito Santo</strong><br>
    Sistema de Agendamento do Auditório</p>

    <p><a href="${urlSistema}" target="_blank">Acessar a plataforma de agendamento</a></p>
  `;

  await enviarEmail({
    to: reserva.email,
    subject: assunto,
    html
  });
}

// === E-MAIL: DECISÃO (APROVADA / NEGADA / CANCELADA) =======================

async function enviarEmailDecisaoReserva(reserva) {
  const status = (reserva.status || '').toUpperCase();
  const urlSistema = APP_PUBLIC_URL || 'http://localhost:3000';

  let assunto;
  let textoDecisao = '';

  if (status === 'APROVADA') {
    assunto = `CBMES – Sua reserva de auditório foi APROVADA (#${reserva.id})`;
    textoDecisao = `
      <p>Sua solicitação de uso do auditório do CBMES foi <strong>APROVADA</strong>.</p>

      <p><strong>Informações sobre a estrutura do auditório:</strong></p>
      <ul>
        <li><strong>Capacidade de cadeiras:</strong> aproximadamente 80 lugares sentados (ajuste conforme a realidade).</li>
        <li><strong>Multimídia:</strong> projetor/datashow com tela de projeção frontal.</li>
        <li><strong>Áudio:</strong> mesa de som básica com entrada para notebook e microfones.</li>
        <li><strong>Microfones:</strong> 1 microfone com fio e 1 microfone sem fio (se disponível no dia do evento).</li>
        <li><strong>Climatização:</strong> ambiente climatizado.</li>
        <li><strong>Apoio:</strong> ponto de energia próximo à área de apresentação.</li>
      </ul>

      <p><strong>Orientações gerais:</strong></p>
      <ul>
        <li>Chegar com antecedência mínima de 30 minutos para teste de som e imagem.</li>
        <li>Trazer apresentações em pen drive e, se possível, também em arquivo PDF como alternativa.</li>
        <li>Qualquer necessidade específica (equipamentos adicionais, montagem especial etc.) deve ser comunicada previamente ao responsável do CBMES.</li>
        <li>Manter o ambiente organizado ao término do evento.</li>
      </ul>
    `;
  } else if (status === 'NEGADA') {
    assunto = `CBMES – Sua solicitação de auditório foi NEGADA (#${reserva.id})`;
    textoDecisao = `
      <p>Sua solicitação de uso do auditório do CBMES foi <strong>NEGADA</strong>.</p>
      ${
        reserva.motivo_decisao
          ? `<p><strong>Motivo informado:</strong> ${reserva.motivo_decisao}</p>`
          : ''
      }
    `;
  } else if (status === 'CANCELADA') {
    assunto = `CBMES – Sua reserva de auditório foi CANCELADA (#${reserva.id})`;
    textoDecisao = `
      <p>Sua <strong>reserva</strong> de uso do auditório do CBMES foi <strong>CANCELADA</strong>.</p>
      ${
        reserva.motivo_decisao
          ? `<p><strong>Motivo informado:</strong> ${reserva.motivo_decisao}</p>`
          : ''
      }
    `;
  } else {
    assunto = `CBMES – Atualização na sua solicitação de auditório (#${reserva.id})`;
    textoDecisao = `<p>Houve uma atualização no status da sua solicitação.</p>`;
  }

  const html = `
    <p>Prezado(a) ${reserva.responsavel},</p>

    ${textoDecisao}

    <p><strong>Dados da solicitação:</strong></p>
    <ul>
      <li><strong>ID:</strong> ${reserva.id}</li>
      <li><strong>Instituição:</strong> ${reserva.instituicao}</li>
      <li><strong>Data do evento:</strong> ${textoIntervaloBR(reserva)}</li>
      <li><strong>Período:</strong> ${reserva.periodo}</li>
      <li><strong>Finalidade:</strong> ${reserva.finalidade}</li>
      ${
        reserva.analisado_por
          ? `<li><strong>Decisão registrada por:</strong> ${reserva.analisado_por}${
              reserva.analisado_email ? ' (' + reserva.analisado_email + ')' : ''
            }</li>`
          : ''
      }
    </ul>

    <p>Este e-mail é automático. Em caso de dúvidas, favor entrar em contato pelos canais oficiais do CBMES.</p>

    <p>Atenciosamente,<br>
    <strong>Corpo de Bombeiros Militar do Espírito Santo</strong><br>
    Sistema de Agendamento do Auditório</p>

    <p><a href="${urlSistema}" target="_blank">Acessar a plataforma de agendamento</a></p>
  `;

  await enviarEmail({
    to: reserva.email,
    subject: assunto,
    html
  });
}

module.exports = {
  enviarEmail,
  enviarEmailNovaReserva,
  enviarEmailDecisaoReserva
};
