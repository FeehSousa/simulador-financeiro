const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('./db');
const app = express();
require('dotenv').config();

// Configurações básicas
const PORT = process.env.PORT || 5000;
const API_PREFIX = '/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'seu_segredo_super_secreto';

// Configuração de rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite de 100 requisições por IP
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

// Middleware de autenticação JWT
const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getUserByEmail(decoded.email);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.ativo) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    res.status(401).json({ error: 'Autenticação falhou' });
  }
};

// Rotas públicas
app.get(`${API_PREFIX}/health`, async (req, res) => {
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

// Rotas de autenticação
const authRouter = express.Router();

authRouter.post('/register', async (req, res) => {
  try {
    const { nome, email, senha } = req.body;
    
    if (!nome || !email || !senha) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    const userExists = await db.getUserByEmail(email);
    if (userExists) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    await db.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );

    res.status(201).json({ success: true, message: 'Usuário registrado com sucesso' });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro ao registrar usuário' });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await db.getUserByEmail(email);

    if (!user || !(await bcrypt.compare(senha, user.senha_hash))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    if (!user.ativo) {
      return res.status(403).json({ error: 'Usuário desativado' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro no processo de login' });
  }
});

authRouter.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

app.use(`${API_PREFIX}/auth`, authRouter);

// Rotas protegidas (requerem autenticação)
const apiRouter = express.Router();
apiRouter.use(authenticate);

// Rotas para dívidas
const dividasRouter = express.Router();

dividasRouter.get('/', async (req, res) => {
  try {
    const dividas = await db.query(
      'SELECT * FROM dividas WHERE usuario_id = ?',
      [req.user.id]
    );
    res.json(dividas);
  } catch (error) {
    console.error('Erro ao buscar dívidas:', error);
    res.status(500).json({ error: 'Erro ao buscar dívidas' });
  }
});

dividasRouter.post('/', async (req, res) => {
  try {
    const { nome, valor, data_inicio, data_fim, fixa = false } = req.body;
    
    if (!nome || !valor) {
      return res.status(400).json({ 
        error: 'Campos obrigatórios faltando',
        details: 'Nome e valor são obrigatórios'
      });
    }

    const mes_inicio = data_inicio ? new Date(data_inicio).toISOString().split('T')[0] : null;
    const mes_fim = fixa ? null : (data_fim ? new Date(data_fim).toISOString().split('T')[0] : null);

    const result = await db.query(
      'INSERT INTO dividas (nome, valor, mes_inicio, mes_fim, fixa, usuario_id) VALUES (?, ?, ?, ?, ?, ?)',
      [nome, parseFloat(valor), mes_inicio, mes_fim, Boolean(fixa), req.user.id]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Dívida cadastrada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao cadastrar dívida:', error);
    res.status(500).json({ error: 'Erro ao cadastrar dívida' });
  }
});

dividasRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM dividas WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Dívida não encontrada ou não pertence ao usuário'
      });
    }

    res.json({ 
      success: true,
      message: 'Dívida removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover dívida:', error);
    res.status(500).json({ error: 'Erro ao remover dívida' });
  }
});

// Rotas para financeiro
const financeiroRouter = express.Router();

financeiroRouter.get('/', async (req, res) => {
  try {
    const [financeiro] = await db.query(
      'SELECT * FROM financeiro WHERE usuario_id = ? LIMIT 1',
      [req.user.id]
    );
    res.json(financeiro || { salario_mensal: 0 });
  } catch (error) {
    console.error('Erro ao buscar dados financeiros:', error);
    res.status(500).json({ error: 'Erro ao buscar dados financeiros' });
  }
});

financeiroRouter.post('/', async (req, res) => {
  try {
    const { salario_mensal = 0 } = req.body;
    
    const [count] = await db.query(
      'SELECT COUNT(*) AS total FROM financeiro WHERE usuario_id = ?',
      [req.user.id]
    );
    
    const query = count.total === 0
      ? 'INSERT INTO financeiro (salario_mensal, usuario_id) VALUES (?, ?)'
      : 'UPDATE financeiro SET salario_mensal = ? WHERE usuario_id = ?';
    
    await db.query(query, [parseFloat(salario_mensal), req.user.id]);
    
    res.json({ 
      success: true,
      salario_mensal: parseFloat(salario_mensal)
    });
  } catch (error) {
    console.error('Erro ao atualizar dados financeiros:', error);
    res.status(500).json({ error: 'Erro ao atualizar dados financeiros' });
  }
});

// Rotas para reservas
const reservasRouter = express.Router();

reservasRouter.get('/', async (req, res) => {
  try {
    const reservas = await db.query(
      'SELECT * FROM reservas WHERE usuario_id = ? ORDER BY nome',
      [req.user.id]
    );
    res.json(reservas);
  } catch (error) {
    console.error('Erro ao buscar reservas:', error);
    res.status(500).json({ error: 'Erro ao buscar reservas' });
  }
});

reservasRouter.post('/', async (req, res) => {
  try {
    const { nome, valor, tipo, descricao = '' } = req.body;
    
    if (!nome || !valor || !tipo) {
      return res.status(400).json({
        error: 'Campos obrigatórios faltando',
        details: 'Nome, valor e tipo são obrigatórios'
      });
    }

    const result = await db.query(
      'INSERT INTO reservas (nome, valor, tipo, descricao, usuario_id) VALUES (?, ?, ?, ?, ?)',
      [nome, parseFloat(valor), tipo, descricao, req.user.id]
    );

    res.status(201).json({
      success: true,
      id: result.insertId,
      message: 'Reserva criada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar reserva:', error);
    res.status(500).json({ error: 'Erro ao criar reserva' });
  }
});

reservasRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, valor, tipo, descricao } = req.body;

    const result = await db.query(
      'UPDATE reservas SET nome = ?, valor = ?, tipo = ?, descricao = ? WHERE id = ? AND usuario_id = ?',
      [nome, parseFloat(valor), tipo, descricao, id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Reserva não encontrada ou não pertence ao usuário'
      });
    }

    res.json({ 
      success: true,
      message: 'Reserva atualizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar reserva:', error);
    res.status(500).json({ error: 'Erro ao atualizar reserva' });
  }
});

reservasRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      'DELETE FROM reservas WHERE id = ? AND usuario_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: 'Reserva não encontrada ou não pertence ao usuário'
      });
    }

    res.json({ 
      success: true,
      message: 'Reserva removida com sucesso'
    });
  } catch (error) {
    console.error('Erro ao remover reserva:', error);
    res.status(500).json({ error: 'Erro ao remover reserva' });
  }
});

reservasRouter.get('/total', async (req, res) => {
  try {
    const [result] = await db.query(
      'SELECT SUM(valor) AS total FROM reservas WHERE usuario_id = ?',
      [req.user.id]
    );
    res.json({ 
      total: result.total || 0 
    });
  } catch (error) {
    console.error('Erro ao calcular total de reservas:', error);
    res.status(500).json({ error: 'Erro ao calcular total de reservas' });
  }
});

// Montar todas as rotas protegidas
apiRouter.use('/dividas', dividasRouter);
apiRouter.use('/financeiro', financeiroRouter);
apiRouter.use('/reservas', reservasRouter);

app.use(API_PREFIX, apiRouter);

// Middleware de erro global
app.use((error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    error: true,
    message: 'Erro interno no servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
});

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

// Inicialização do servidor
async function startServer() {
  try {
    await db.initializeDatabase();
    await db.checkConnection();
    
    app.listen(PORT, () => {
      console.log(`\n🟢 Servidor rodando na porta ${PORT}`);
      console.log(`🔗 Health check: http://localhost:${PORT}${API_PREFIX}/health`);
      console.log(`🔐 Endpoint de autenticação: http://localhost:${PORT}${API_PREFIX}/auth/login`);
    });
  } catch (error) {
    console.error('❌ Falha ao iniciar o servidor:', error);
    process.exit(1);
  }
}

startServer();

module.exports = app;