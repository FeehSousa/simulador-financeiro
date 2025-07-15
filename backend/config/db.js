const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_NAME', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Variável de ambiente faltando: ${envVar}`);
    process.exit(1);
  }
}

const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const pool = mysql.createPool(dbConfig);

const setupSQL = [
  `CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`,
  `USE ${process.env.DB_NAME}`,
  `CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS cartoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    tipo ENUM('credito', 'debito', 'credito_debito') NOT NULL,
    banco VARCHAR(100) NOT NULL,
    limite DECIMAL(10,2),
    dia_fechamento INT,
    dia_vencimento INT,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS reservas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    saldo_atual DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tipo ENUM('poupança', 'investimento', 'fundo_emergencia', 'outros') NOT NULL,
    descricao TEXT,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`,
  `CREATE TABLE IF NOT EXISTS transacoes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo ENUM('entrada', 'saida') NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    descricao VARCHAR(255),
    data DATE NOT NULL,
    metodo_pagamento ENUM('debito', 'credito', 'dinheiro', 'pix', 'transferencia', 'outro') NOT NULL,
    cartao_id INT,
    reserva_id INT,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (cartao_id) REFERENCES cartoes(id),
    FOREIGN KEY (reserva_id) REFERENCES reservas(id)
  )`,
  `CREATE TABLE IF NOT EXISTS dividas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    valor DECIMAL(10,2) NOT NULL,
    valor_pago DECIMAL(10,2) DEFAULT 0,
    mes_inicio DATE,
    mes_fim DATE,
    fixa BOOLEAN DEFAULT FALSE,
    origem VARCHAR(50),
    metodo_pagamento ENUM('debito', 'credito', 'dinheiro', 'pix', 'outro'),
    pago BOOLEAN DEFAULT FALSE,
    cartao_id INT,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    FOREIGN KEY (cartao_id) REFERENCES cartoes(id)
  )`,
  `CREATE TABLE IF NOT EXISTS financeiro (
    id INT AUTO_INCREMENT PRIMARY KEY,
    salario_mensal DECIMAL(10,2) DEFAULT 0,
    usuario_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
  )`
];

async function initializeDatabase() {
  let tempConnection;
  try {
    tempConnection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306
    });

    for (const sql of setupSQL) {
      await tempConnection.query(sql);
      console.log(`✅ Comando executado: ${sql.split(' ')[0]}...`);
    }

    const [users] = await pool.query('SELECT COUNT(*) AS count FROM usuarios');
    if (users[0].count === 0) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await pool.query(
        'INSERT INTO usuarios (nome, email, senha_hash, ativo) VALUES (?, ?, ?, ?)',
        ['Admin', 'admin@example.com', senhaHash, true]
      );
      console.log('✅ Usuário admin criado: admin@example.com / admin123');
    }

    console.log('✅ Banco de dados e tabelas verificados/criados com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    throw error;
  } finally {
    if (tempConnection) await tempConnection.end();
  }
}

module.exports = {
  pool,
  query: async (sql, values) => {
    try {
      const [rows] = await pool.query(sql, values);
      return rows;
    } catch (error) {
      console.error('Erro na query:', error);
      throw error;
    }
  },
  getConnection: async () => {
    return await pool.getConnection();
  },
  initializeDatabase,
  checkConnection: async () => {
    try {
      const connection = await pool.getConnection();
      connection.release();
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar ao MySQL:', error);
      return false;
    }
  },
  getUserByEmail: async (email) => {
    const [user] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return user[0] || null;
  },
  createUser: async ({ nome, email, senha }) => {
    const senhaHash = await bcrypt.hash(senha, 10);
    const [result] = await pool.query(
      'INSERT INTO usuarios (nome, email, senha_hash) VALUES (?, ?, ?)',
      [nome, email, senhaHash]
    );
    return { id: result.insertId, nome, email };
  },
  // Novas funções para cartões
  getCardsByUser: async (userId) => {
    const [cards] = await pool.query('SELECT * FROM cartoes WHERE usuario_id = ?', [userId]);
    return cards;
  },
  createCard: async ({ nome, tipo, banco, limite, dia_fechamento, dia_vencimento, usuario_id }) => {
    const [result] = await pool.query(
      'INSERT INTO cartoes (nome, tipo, banco, limite, dia_fechamento, dia_vencimento, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, tipo, banco, limite, dia_fechamento, dia_vencimento, usuario_id]
    );
    return { id: result.insertId };
  },
  // Funções atualizadas para reservas
  updateReserveBalance: async (reservaId, valor) => {
    await pool.query(
      'UPDATE reservas SET saldo_atual = saldo_atual - ? WHERE id = ?',
      [valor, reservaId]
    );
  }
};