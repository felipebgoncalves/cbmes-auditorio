const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const reservasRoutes = require('./routes/reservas');
const authRoutes = require('./routes/auth');

const app = express();

// Parse de JSON e formulários
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SESSÃO – precisa vir ANTES das rotas /api
app.use(session({
  secret: process.env.SESSION_SECRET || 'uma_senha_muito_grande_e_secreta',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 8 * 60 * 60 * 1000 // 8 horas
  }
}));

// Arquivos estáticos (front)
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rotas de API (já recebem req.session)
app.use('/api', authRoutes);
app.use('/api', reservasRoutes);

// Sobe o servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
