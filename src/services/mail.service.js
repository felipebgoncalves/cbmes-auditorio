// src/services/mail.service.js
const { Resend } = require('resend');

// Inicializa o cliente Resend usando a API Key do .env
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarEmail({ to, subject, html }) {
  try {
    if (!to) {
      console.warn('[MAILER] E-mail de destino vazio. Cancelando envio.');
      return;
    }

    console.log('[MAILER] Enviando e-mail via RESEND API...', { to, subject });

    const response = await resend.emails.send({
      from: 'noreply@comunidadefacil.com.br', // domínio verificado!
      to,
      subject,
      html,
    });

    console.log('[MAILER] E-mail enviado com sucesso!', response);
    return response;
  } catch (err) {
    console.error('[MAILER] Erro ao enviar e-mail via RESEND API:', err);
    throw err;
  }
}

module.exports = { enviarEmail };

