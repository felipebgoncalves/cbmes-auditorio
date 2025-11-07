const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { enviarEmail } = require('../mailer');

const APP_PUBLIC_URL = process.env.APP_PUBLIC_URL || 'http://localhost:3000';

// Middleware simples de autenticação (para alterar senha logado)
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  next();
}

// =============== LOGIN / LOGOUT / ME ====================

// POST /api/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: 'Informe e-mail e senha.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, nome, email_login, senha_hash, ativo FROM auditorio_usuario WHERE email_login = $1',
      [email]
    );

    if (rows.length === 0 || !rows[0].ativo) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    const usuario = rows[0];
    const ok = await bcrypt.compare(senha, usuario.senha_hash);

    if (!ok) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos.' });
    }

    req.session.user = {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email_login
    };

    res.json({ ok: true, usuario: req.session.user });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ error: 'Erro ao efetuar login.' });
  }
});

// POST /api/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// GET /api/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  res.json(req.session.user);
});

// =============== ALTERAR SENHA (LOGADO) =================

// POST /api/alterar-senha
router.post('/alterar-senha', requireAuth, async (req, res) => {
  const { senha_atual, nova_senha } = req.body;

  if (!senha_atual || !nova_senha) {
    return res.status(400).json({ error: 'Informe a senha atual e a nova senha.' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const userId = req.session.user.id;

    const { rows } = await db.query(
      'SELECT senha_hash FROM auditorio_usuario WHERE id = $1',
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const ok = await bcrypt.compare(senha_atual, rows[0].senha_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Senha atual incorreta.' });
    }

    const novoHash = await bcrypt.hash(nova_senha, 10);

    await db.query(
      'UPDATE auditorio_usuario SET senha_hash = $1 WHERE id = $2',
      [novoHash, userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro ao alterar senha.' });
  }
});

// =============== ESQUECI MINHA SENHA ====================

// POST /api/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Informe o e-mail de login.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, nome, email_login, ativo FROM auditorio_usuario WHERE email_login = $1',
      [email]
    );

    // Mesmo que não exista, respondemos "ok" pra não revelar se o e-mail é válido
    if (rows.length === 0 || !rows[0].ativo) {
      return res.json({ ok: true });
    }

    const usuario = rows[0];

    const token = crypto.randomBytes(32).toString('hex');
    const expira = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await db.query(
      'UPDATE auditorio_usuario SET reset_token = $1, reset_expira_em = $2 WHERE id = $3',
      [token, expira, usuario.id]
    );

    const link = `${APP_PUBLIC_URL}/reset-senha.html?token=${token}`;

    const html = `
      <p>Olá, ${usuario.nome}.</p>
      <p>Foi solicitada a redefinição da sua senha de acesso ao <strong>painel interno do auditório do CBMES</strong>.</p>
      <p>Para criar uma nova senha, acesse o link abaixo em até <strong>1 hora</strong>:</p>
      <p><a href="${link}" target="_blank">${link}</a></p>
      <p>Se você não solicitou essa redefinição, pode ignorar este e-mail.</p>
      <p>Atenciosamente,<br>
      <strong>Corpo de Bombeiros Militar do Espírito Santo</strong><br>
      Sistema de Agendamento do Auditório</p>
    `;

    await enviarEmail({
      to: usuario.email_login,
      subject: 'CBMES – Redefinição de senha do painel do auditório',
      html
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao solicitar recuperação de senha:', err);
    res.status(500).json({ error: 'Erro ao solicitar recuperação de senha.' });
  }
});

// GET /api/reset-token?token=...
router.get('/reset-token', async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ error: 'Token não informado.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id FROM auditorio_usuario WHERE reset_token = $1 AND reset_expira_em > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao validar token de reset:', err);
    res.status(500).json({ error: 'Erro ao validar token.' });
  }
});

// POST /api/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, nova_senha } = req.body;

  if (!token || !nova_senha) {
    return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
  }

  if (nova_senha.length < 6) {
    return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
  }

  try {
    const { rows } = await db.query(
      'SELECT id FROM auditorio_usuario WHERE reset_token = $1 AND reset_expira_em > NOW()',
      [token]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado.' });
    }

    const userId = rows[0].id;
    const novoHash = await bcrypt.hash(nova_senha, 10);

    await db.query(
      `UPDATE auditorio_usuario
          SET senha_hash = $1,
              reset_token = NULL,
              reset_expira_em = NULL
        WHERE id = $2`,
      [novoHash, userId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('Erro ao redefinir senha:', err);
    res.status(500).json({ error: 'Erro ao redefinir senha.' });
  }
});

module.exports = router;
