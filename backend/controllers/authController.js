const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

module.exports = {
  async register(req, res) {
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
  },

  async login(req, res) {
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
        process.env.JWT_SECRET,
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
  },

  getMe(req, res) {
    res.json({ user: req.user });
  }
};