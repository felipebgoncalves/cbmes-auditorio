const express = require('express');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const mailer = require('../mailer');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Não autenticado.' });
  }
  next();
}


// === CONFIGURAÇÃO DO UPLOAD (anexos) =======================================

const uploadsDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const time = Date.now();
    const sanitized = file.originalname.normalize('NFD').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${time}_${sanitized}`);
  }
});

const upload = multer({ storage });

// === HELPERS ================================================================

function normalizarTipoSolicitacao(valor) {
  if (!valor) return null;
  const t = valor.toString().trim().toUpperCase();
  if (t === 'INTERNA' || t === 'EXTERNA') return t;
  return null;
}

// Rota PÚBLICA para o calendário externo
// Retorna apenas o que o usuário externo pode ver
router.get('/reservas-public', async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT
         id,
         data_evento,
         data_fim,
         periodo,
         tipo_solicitacao,
         instituicao,
         responsavel,
         email,
         telefone,
         finalidade,
         observacoes,
         status
       FROM auditorio_reserva
       WHERE status IN ('PENDENTE', 'APROVADA')
       ORDER BY data_evento ASC, periodo ASC`
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar reservas públicas:', err);
    res.status(500).json({ error: 'Erro ao listar reservas públicas.' });
  }
});

// === GET /api/reservas  (lista todas as reservas) ==========================

router.get('/reservas', requireAuth, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,
              data_evento,
              data_fim,
              periodo,
              tipo_solicitacao,
              instituicao,
              responsavel,
              email,
              telefone,
              finalidade,
              observacoes,
              anexo_url,
              status,
              analisado_por,
              analisado_email,
              motivo_decisao,
              data_decisao,
              criado_em
         FROM auditorio_reserva
        ORDER BY status = 'PENDENTE' DESC,
                 data_evento ASC,
                 periodo ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar reservas:', err);
    res.status(500).json({ error: 'Erro ao listar reservas.' });
  }
});

// === GET /api/periodos-livres?data=YYYY-MM-DD ===============================
//
// Agora considera reservas que ocupem um INTERVALO de datas.
// O dia é considerado ocupado se estiver entre data_evento e data_fim.

router.get('/periodos-livres', async (req, res) => {
  const { data } = req.query;

  if (!data) {
    return res.status(400).json({ error: 'Parâmetro "data" é obrigatório (YYYY-MM-DD).' });
  }

  try {
    const { rows } = await db.query(
      `SELECT periodo, status
         FROM auditorio_reserva
        WHERE $1 BETWEEN data_evento AND COALESCE(data_fim, data_evento)
          AND status IN ('PENDENTE', 'APROVADA')`,
      [data]
    );

    const ocupados = new Set(rows.map(r => r.periodo));

    const todosPeriodos = [
      { id: 'INTEGRAL', label: 'Integral (08h às 18h)' },
      { id: 'MANHA',    label: 'Manhã (08h às 12h)' },
      { id: 'TARDE',    label: 'Tarde (13h às 17h)' },
      { id: 'NOITE',    label: 'Noite (18h às 21h)' }
    ];

    const livres = todosPeriodos.filter(p => !ocupados.has(p.id));

    res.json(livres);
  } catch (err) {
    console.error('Erro ao consultar períodos livres:', err);
    res.status(500).json({ error: 'Erro ao consultar períodos livres.' });
  }
});

// === POST /api/reservas  (nova solicitação) =================================
//
// Já preparado para intervalo de datas: data_evento (início) + data_fim (fim).
// Se data_fim não vier, assume igual a data_evento (comportamento atual).

router.post('/reservas', upload.single('anexo'), async (req, res) => {
  try {
    const {
      data_evento,
      data_fim,           // opcional por enquanto
      periodo,
      tipo_solicitacao,
      instituicao,
      responsavel,
      email,
      telefone,
      finalidade,
      observacoes
    } = req.body;

    const tipo = normalizarTipoSolicitacao(tipo_solicitacao);

    // se o front ainda não manda data_fim, usamos a mesma da data_evento
    const dataFimFinal = (data_fim && data_fim.trim() !== '') ? data_fim : data_evento;

    const arquivo = req.file;
    const anexo_url = arquivo ? `/uploads/${arquivo.filename}` : null;

    if (!data_evento || !dataFimFinal || !periodo || !instituicao || !responsavel ||
        !email || !telefone || !finalidade || !tipo) {
      return res.status(400).json({ error: 'Campos obrigatórios não informados.' });
    }

    // valida tipo
    if (!['INTERNA', 'EXTERNA'].includes(tipo)) {
      return res.status(400).json({ error: 'Tipo de solicitação inválido (use Interna ou Externa).' });
    }

    // valida intervalo: data_fim não pode ser antes da data_evento
    // (formatos YYYY-MM-DD permitem essa comparação como string)
    if (dataFimFinal < data_evento) {
      return res.status(400).json({ error: 'Data final não pode ser anterior à data inicial.' });
    }

    // Verificar conflito de período com outras reservas (PENDENTE/APROVADA)
    // Critério: mesmo período E intervalo de datas se sobrepõe.
    const conflitoQuery = `
      SELECT 1
        FROM auditorio_reserva
       WHERE periodo = $1
         AND status IN ('PENDENTE','APROVADA')
         AND NOT ($3 < data_evento OR $2 > COALESCE(data_fim, data_evento))
       LIMIT 1;
    `;
    const conflitoValues = [periodo, data_evento, dataFimFinal];
    const conflito = await db.query(conflitoQuery, conflitoValues);

    if (conflito.rows.length > 0) {
      return res.status(400).json({
        error: 'Já existe reserva para este período em parte do intervalo de datas informado.'
      });
    }

    const insertQuery = `
      INSERT INTO auditorio_reserva
      (data_evento, data_fim, periodo, tipo_solicitacao,
       instituicao, responsavel, email, telefone,
       finalidade, observacoes, anexo_url, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'PENDENTE')
      RETURNING *;
    `;

    const values = [
      data_evento,
      dataFimFinal,
      periodo,
      tipo,
      instituicao,
      responsavel,
      email,
      telefone,
      finalidade,
      observacoes || null,
      anexo_url
    ];

    const { rows } = await db.query(insertQuery, values);
    const reserva = rows[0];

    // responde para o front
    res.status(201).json(reserva);

    // dispara e-mail de recebimento em background
    mailer.enviarEmailNovaReserva(reserva).catch(err => {
      console.error('Falha ao enviar e-mail de nova reserva:', err);
    });

  } catch (err) {
    console.error('Erro ao criar reserva:', err);
    res.status(500).json({ error: 'Erro ao criar reserva.' });
  }
});

// === PATCH /api/reservas/:id/status  (aprovar/negar/cancelar) ===============

router.patch('/reservas/:id/status', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { status, motivo_decisao } = req.body;

  const statusUpper = (status || '').toUpperCase();

  // valida status permitido
  if (!['PENDENTE', 'APROVADA', 'NEGADA', 'CANCELADA'].includes(statusUpper)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  // NEGADA e CANCELADA exigem motivo
  if ((statusUpper === 'NEGADA' || statusUpper === 'CANCELADA') &&
      (!motivo_decisao || motivo_decisao.trim() === '')) {
    return res.status(400).json({
      error: 'Para negar ou cancelar uma reserva é obrigatório informar o motivo.'
    });
  }

  // usuário logado (vem da sessão)
  const usuario = req.session?.user;
  if (!usuario) {
    return res.status(401).json({ error: 'Sessão expirada. Faça login novamente.' });
  }

  const analisadoPor    = usuario.nome  || 'Usuário CBMES';
  const analisadoEmail  = usuario.email || null;

  try {
    const updateQuery = `
      UPDATE auditorio_reserva
         SET status          = $1,
             analisado_por   = $2,
             analisado_email = $3,
             motivo_decisao  = $4,
             data_decisao    = NOW()
       WHERE id = $5
      RETURNING *;
    `;

    const values = [
      statusUpper,
      analisadoPor,
      analisadoEmail,
      motivo_decisao || null,
      id
    ];

    const { rows } = await db.query(updateQuery, values);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Reserva não encontrada.' });
    }

    const reservaAtualizada = rows[0];

    // e-mail de decisão em background
    const mailer = require('../mailer');
    mailer.enviarEmailDecisaoReserva(reservaAtualizada).catch(err => {
      console.error('Falha ao enviar e-mail de decisão:', err);
    });

    res.json(reservaAtualizada);
  } catch (err) {
    console.error('Erro ao atualizar status:', err);
    return res.status(500).json({ error: 'Erro ao atualizar status da reserva.' });
  }
});



module.exports = router;
