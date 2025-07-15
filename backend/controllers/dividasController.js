const db = require('../config/db');

module.exports = {
  async listDividas(req, res) {
    try {
      const dividas = await db.query(
        `SELECT d.*, c.nome as cartao_nome, c.banco as cartao_banco 
         FROM dividas d 
         LEFT JOIN cartoes c ON d.cartao_id = c.id 
         WHERE d.usuario_id = ?`,
        [req.user.id]
      );
      
      // Formatar os dados para o frontend
      const formattedDebts = dividas.map(d => ({
        ...d,
        startDate: d.mes_inicio,
        endDate: d.mes_fim,
        fixed: Boolean(d.fixa),
        paid: Boolean(d.pago),
        paymentMethod: d.metodo_pagamento,
        card: d.cartao_id ? {
          id: d.cartao_id,
          name: d.cartao_nome,
          bank: d.cartao_banco
        } : null
      }));
      
      res.json(formattedDebts);
    } catch (error) {
      console.error('Erro ao buscar dívidas:', error);
      res.status(500).json({ error: 'Erro ao buscar dívidas' });
    }
  },

  async createDivida(req, res) {
    try {
      const { 
        nome, 
        valor, 
        data_inicio, 
        data_fim, 
        fixa = false, 
        metodo_pagamento,
        cartao_id,
        reserva_id
      } = req.body;
      
      if (!nome || !valor) {
        return res.status(400).json({ 
          error: 'Campos obrigatórios faltando',
          details: 'Nome e valor são obrigatórios'
        });
      }

      const mes_inicio = data_inicio ? new Date(data_inicio).toISOString().split('T')[0] : null;
      const mes_fim = fixa ? null : (data_fim ? new Date(data_fim).toISOString().split('T')[0] : null);

      // Iniciar transação para garantir consistência
      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // Inserir a dívida
        const [result] = await conn.query(
          `INSERT INTO dividas 
           (nome, valor, mes_inicio, mes_fim, fixa, metodo_pagamento, cartao_id, usuario_id) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [nome, parseFloat(valor), mes_inicio, mes_fim, Boolean(fixa), metodo_pagamento, cartao_id, req.user.id]
        );

        // Se foi pago e tem reserva associada, atualizar o saldo
        if (reserva_id) {
          await conn.query(
            'UPDATE reservas SET saldo_atual = saldo_atual - ? WHERE id = ? AND usuario_id = ?',
            [parseFloat(valor), reserva_id, req.user.id]
          );

          // Registrar a transação de saída
          await conn.query(
            `INSERT INTO transacoes 
             (tipo, valor, descricao, data, metodo_pagamento, cartao_id, reserva_id, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['saida', parseFloat(valor), `Pagamento: ${nome}`, new Date(), metodo_pagamento, cartao_id, reserva_id, req.user.id]
          );
        }

        await conn.commit();
        
        res.status(201).json({
          success: true,
          id: result.insertId,
          message: 'Dívida cadastrada com sucesso'
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao cadastrar dívida:', error);
      res.status(500).json({ error: 'Erro ao cadastrar dívida' });
    }
  },

  async payDebt(req, res) {
    try {
      const { id } = req.params;
      const { valor_pago, metodo_pagamento, cartao_id, reserva_id } = req.body;

      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // 1. Atualizar o status da dívida para pago
        const [debt] = await conn.query(
          'SELECT * FROM dividas WHERE id = ? AND usuario_id = ? FOR UPDATE',
          [id, req.user.id]
        );

        if (!debt[0]) {
          return res.status(404).json({ error: 'Dívida não encontrada' });
        }

        const newPaidValue = (debt[0].valor_pago || 0) + parseFloat(valor_pago);
        const isFullyPaid = newPaidValue >= debt[0].valor;

        await conn.query(
          `UPDATE dividas 
           SET valor_pago = ?, pago = ?, metodo_pagamento = ?, cartao_id = ? 
           WHERE id = ? AND usuario_id = ?`,
          [newPaidValue, isFullyPaid, metodo_pagamento, cartao_id, id, req.user.id]
        );

        // 2. Se foi pago com reserva, atualizar o saldo
        if (reserva_id) {
          await conn.query(
            'UPDATE reservas SET saldo_atual = saldo_atual - ? WHERE id = ? AND usuario_id = ?',
            [parseFloat(valor_pago), reserva_id, req.user.id]
          );

          // 3. Registrar a transação
          await conn.query(
            `INSERT INTO transacoes 
             (tipo, valor, descricao, data, metodo_pagamento, cartao_id, reserva_id, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['saida', parseFloat(valor_pago), `Pagamento dívida: ${debt[0].nome}`, new Date(), 
             metodo_pagamento, cartao_id, reserva_id, req.user.id]
          );
        }

        await conn.commit();

        res.json({ 
          success: true,
          message: 'Dívida atualizada com sucesso',
          fullyPaid: isFullyPaid
        });
      } catch (error) {
        await conn.rollback();
        throw error;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Erro ao pagar dívida:', error);
      res.status(500).json({ error: 'Erro ao pagar dívida' });
    }
  },

  async deleteDivida(req, res) {
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
  },

  async getPaymentMethods(req, res) {
    try {
      // Métodos de pagamento fixos
      const fixedMethods = [
        { value: 'debito', label: 'Débito' },
        { value: 'credito', label: 'Crédito' },
        { value: 'dinheiro', label: 'Dinheiro' },
        { value: 'pix', label: 'PIX' },
        { value: 'transferencia', label: 'Transferência' },
        { value: 'outro', label: 'Outro' }
      ];

      // Cartões do usuário
      const cards = await db.query(
        'SELECT id, nome, banco, tipo FROM cartoes WHERE usuario_id = ?',
        [req.user.id]
      );

      res.json({
        methods: fixedMethods,
        cards: cards.map(c => ({
          id: c.id,
          name: c.nome,
          bank: c.banco,
          type: c.tipo
        }))
      });
    } catch (error) {
      console.error('Erro ao buscar métodos de pagamento:', error);
      res.status(500).json({ error: 'Erro ao buscar métodos de pagamento' });
    }
  }
};