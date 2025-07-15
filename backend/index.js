const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const db = require('./config/db');
const errorHandler = require('./middlewares/errorMiddleware');
require('dotenv').config();

// Importar rotas
const authRoutes = require('./routes/authRoutes');
const dividasRoutes = require('./routes/dividasRoutes');
const financeiroRoutes = require('./routes/financeiroRoutes');
const reservasRoutes = require('./routes/reservasRoutes');
const cartoesRoutes = require('./routes/cartoesRoutes');

const app = express();

// Configuração de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Middlewares
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));
app.use(limiter);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Rotas públicas
app.get(`${process.env.API_PREFIX}/health`, async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ 
      status: 'ok',
      message: 'API funcionando corretamente',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error',
      message: 'Problema na conexão com o banco de dados'
    });
  }
});

// Configurar rotas
app.use(`${process.env.API_PREFIX}/auth`, authRoutes);
app.use(`${process.env.API_PREFIX}/dividas`, dividasRoutes);
app.use(`${process.env.API_PREFIX}/financeiro`, financeiroRoutes);
app.use(`${process.env.API_PREFIX}/reservas`, reservasRoutes);
app.use(`${process.env.API_PREFIX}/cartoes`, cartoesRoutes);

// Rota para documentação
app.get('/docs', (req, res) => {
  res.send(`
    <h1>Documentação da API</h1>
    <h2>Endpoints públicos:</h2>
    <ul>
      <li>POST /api/v1/auth/register - Registrar novo usuário</li>
      <li>POST /api/v1/auth/login - Login de usuário</li>
      <li>GET /api/v1/health - Verifica saúde da API</li>
    </ul>
    <h2>Endpoints protegidos (requerem token JWT):</h2>
    <ul>
      <li>GET /api/v1/auth/me - Dados do usuário logado</li>
      <li>GET /api/v1/dividas - Lista todas as dívidas do usuário</li>
      <li>POST /api/v1/dividas - Cria nova dívida</li>
      <li>DELETE /api/v1/dividas/:id - Remove dívida</li>
      <li>GET /api/v1/financeiro - Dados financeiros do usuário</li>
      <li>POST /api/v1/financeiro - Atualiza dados financeiros</li>
      <li>GET /api/v1/reservas - Lista reservas do usuário</li>
      <li>POST /api/v1/reservas - Cria nova reserva</li>
      <li>PUT /api/v1/reservas/:id - Atualiza reserva</li>
      <li>DELETE /api/v1/reservas/:id - Remove reserva</li>
      <li>GET /api/v1/reservas/total - Total de reservas</li>
    </ul>
  `);
});

// Middleware de erro global
app.use(errorHandler);

// Inicialização do servidor
async function startServer() {
  try {
    await db.initializeDatabase();
    await db.checkConnection();
    
    app.listen(process.env.PORT, () => {
      console.log(`\n🟢 Servidor rodando na porta ${process.env.PORT}`);
      console.log(`🔗 Health check: http://localhost:${process.env.PORT}${process.env.API_PREFIX}/health`);
      console.log(`🔐 Endpoint de autenticação: http://localhost:${process.env.PORT}${process.env.API_PREFIX}/auth/login`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;