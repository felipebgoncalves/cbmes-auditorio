const mailer = require('./mailer');

(async () => {
  await mailer.enviarEmail({
    to: 'seu.email@exemplo.com',
    subject: 'Teste de envio pelo CBMES Agendamento',
    html: '<p>Este é um teste do sistema de e-mails via Gmail.</p>'
  });
})();
