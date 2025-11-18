const db = require('../config/db');

module.exports = {
  async listReservas(req, res) {
    try {
      const reservas = await db.query(
        `SELECT r.*, 
         (SELECT SUM(valor) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'entrada') as total_depositado,
         (SELECT SUM(valor) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'saida') as total_retirado
         FROM reservas r 
         WHERE r.usuario_id = ? 
         ORDER BY nome`,
        [req.user.id]
      );
      
      // Calcular saldo atualizado
      const reservasComSaldo = reservas.map(r => ({
        ...r,
        saldo_atual: r.total_depositado - (r.total_retirado || 0)
      }));
      
      res.json(reservasComSaldo);
    } catch (error) {
      console.error('Erro ao buscar reservas:', error);
      res.status(500).json({ error: 'Erro ao buscar reservas' });
    }
  },

  async createReserva(req, res) {
    try {
      const { nome, valor, tipo, descricao = '' } = req.body;
      
      if (!nome || !valor || !tipo) {
        return res.status(400).json({
          error: 'Campos obrigatórios faltando',
          details: 'Nome, valor e tipo são obrigatórios'
        });
      }

      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // Criar a reserva
        const [result] = await conn.query(
          'INSERT INTO reservas (nome, valor, tipo, descricao, usuario_id) VALUES (?, ?, ?, ?, ?)',
          [nome, parseFloat(valor), tipo, descricao, req.user.id]
        );

        // Registrar a transação de depósito inicial
        await conn.query(
          `INSERT INTO transacoes 
           (tipo, valor, descricao, data, metodo_pagamento, reserva_id, usuario_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['entrada', parseFloat(valor), 'Depósito inicial', new Date(), 'transferencia', result.insertId, req.user.id]
        );

        await conn.commit();

        res.status(201).json({
          success: true,
          id: result.insertId,
          message: 'Reserva criada com sucesso'
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      res.status(500).json({ error: 'Erro ao criar reserva' });
    }
  },

  async updateReserva(req, res) {
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
  },

  async deleteReserva(req, res) {
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
  },

  async getTotalReservas(req, res) {
    try {
      // VERIFIQUE qual query está sendo usada
      const [result] = await db.query(
        `SELECT 
          COALESCE(SUM(
            (SELECT COALESCE(SUM(valor), 0) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'entrada' AND t.usuario_id = ?) -
            (SELECT COALESCE(SUM(valor), 0) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'saida' AND t.usuario_id = ?)
          ), 0) AS total
        FROM reservas r 
        WHERE r.usuario_id = ?`,
        [req.user.id, req.user.id, req.user.id]
      );
      
      console.log('=== TOTAL RESERVAS DEBUG ===');
      console.log('Total calculado:', result.total);
      
      res.json({ 
        total: Number(result.total) || 0
      });
    } catch (error) {
      console.error('Erro ao calcular total de reservas:', error);
      res.status(500).json({ error: 'Erro ao calcular total de reservas' });
    }
  },

  async addToReserve(req, res) {
    try {
      const { reserva_id, valor, descricao = 'Depósito', metodo_pagamento = 'transferencia' } = req.body;

      if (!reserva_id || !valor) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios faltando',
          details: 'Reserva e valor são obrigatórios'
        });
      }

      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // Registrar a transação de entrada
        await conn.query(
          `INSERT INTO transacoes 
           (tipo, valor, descricao, data, metodo_pagamento, reserva_id, usuario_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          ['entrada', parseFloat(valor), descricao, new Date(), metodo_pagamento, reserva_id, req.user.id]
        );

        // Atualizar o saldo da reserva
        await conn.query(
          'UPDATE reservas SET saldo_atual = saldo_atual + ? WHERE id = ? AND usuario_id = ?',
          [parseFloat(valor), reserva_id, req.user.id]
        );

        await conn.commit();

        res.json({
          success: true,
          message: 'Valor adicionado à reserva com sucesso'
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao adicionar valor à reserva:', error);
      res.status(500).json({ error: 'Erro ao adicionar valor à reserva' });
    }
  }
};