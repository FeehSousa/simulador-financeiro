const db = require('../config/db');

module.exports = {
  async listCards(req, res) {
    try {
      const cards = await db.query(
        'SELECT * FROM cartoes WHERE usuario_id = ? ORDER BY nome',
        [req.user.id]
      );
      
      // Formatar os dados para o frontend
      const formattedCards = cards.map(c => ({
        id: c.id,
        name: c.nome,
        type: c.tipo,
        bank: c.banco,
        limit: c.limite,
        closingDay: c.dia_fechamento,
        dueDay: c.dia_vencimento,
        createdAt: c.created_at
      }));
      
      res.json(formattedCards);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
      res.status(500).json({ error: 'Erro ao buscar cartões' });
    }
  },

  async createCard(req, res) {
    try {
      const { name, type, bank, limit, closingDay, dueDay } = req.body;
      
      if (!name || !type || !bank) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios faltando',
          details: 'Nome, tipo e banco são obrigatórios'
        });
      }

      // Validações específicas para cartão de crédito
      if (type === 'credito' || type === 'credito_debito') {
        if (!closingDay || !dueDay) {
          return res.status(400).json({ 
            error: 'Para cartões de crédito, os dias de fechamento e vencimento são obrigatórios'
          });
        }
        
        if (limit === undefined || limit === null) {
          return res.status(400).json({ 
            error: 'Para cartões de crédito, o limite é obrigatório'
          });
        }
      }

      const result = await db.query(
        'INSERT INTO cartoes (nome, tipo, banco, limite, dia_fechamento, dia_vencimento, usuario_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, type, bank, limit, closingDay, dueDay, req.user.id]
      );

      res.status(201).json({
        success: true,
        id: result.insertId,
        message: 'Cartão cadastrado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao cadastrar cartão:', error);
      res.status(500).json({ error: 'Erro ao cadastrar cartão' });
    }
  },

  async updateCard(req, res) {
    try {
      const { id } = req.params;
      const { nome, tipo, banco, limite, dia_fechamento, dia_vencimento } = req.body;

      const result = await db.query(
        `UPDATE cartoes 
         SET nome = ?, tipo = ?, banco = ?, limite = ?, dia_fechamento = ?, dia_vencimento = ? 
         WHERE id = ? AND usuario_id = ?`,
        [nome, tipo, banco, limite, dia_fechamento, dia_vencimento, id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Cartão não encontrado ou não pertence ao usuário'
        });
      }

      res.json({ 
        success: true,
        message: 'Cartão atualizado com sucesso'
      });
    } catch (error) {
      console.error('Erro ao atualizar cartão:', error);
      res.status(500).json({ error: 'Erro ao atualizar cartão' });
    }
  },

  async deleteCard(req, res) {
    try {
      const { id } = req.params;
      
      // Verificar se o cartão está sendo usado em alguma dívida
      const debtCheck = await db.query(
        'SELECT COUNT(*) as count FROM dividas WHERE cartao_id = ?',
        [id]
      );
      
      if (debtCheck[0].count > 0) {
        return res.status(400).json({
          error: 'Não é possível excluir este cartão pois está vinculado a uma ou mais dívidas'
        });
      }

      const result = await db.query(
        'DELETE FROM cartoes WHERE id = ? AND usuario_id = ?',
        [id, req.user.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: 'Cartão não encontrado ou não pertence ao usuário'
        });
      }

      res.json({ 
        success: true,
        message: 'Cartão removido com sucesso'
      });
    } catch (error) {
      console.error('Erro ao remover cartão:', error);
      res.status(500).json({ error: 'Erro ao remover cartão' });
    }
  },

  async getCardTypes(req, res) {
    try {
      // Tipos de cartão fixos
      const cardTypes = [
        { value: 'credito', label: 'Crédito' },
        { value: 'debito', label: 'Débito' },
        { value: 'credito_debito', label: 'Crédito e Débito' }
      ];

      // Bancos mais comuns (pode ser expandido)
      const banks = [
        'Nubank', 'Santander', 'Itaú', 'Bradesco', 
        'Caixa', 'Banco do Brasil', 'C6 Bank', 'Inter',
        'Sicoob', 'Sicredi', 'Outro'
      ];

      res.json({
        cardTypes,
        banks
      });
    } catch (error) {
      console.error('Erro ao buscar tipos de cartão:', error);
      res.status(500).json({ error: 'Erro ao buscar tipos de cartão' });
    }
  }
};