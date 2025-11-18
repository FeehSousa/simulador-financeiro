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

      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // ✅ Inserir a dívida como PAGA se tem reserva
        const isPaid = Boolean(reserva_id);
        const valorPago = isPaid ? parseFloat(valor) : 0;

        const [result] = await conn.query(
          `INSERT INTO dividas 
           (nome, valor, mes_inicio, mes_fim, fixa, metodo_pagamento, cartao_id, usuario_id, pago, valor_pago) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nome, 
            parseFloat(valor), 
            mes_inicio, 
            mes_fim, 
            Boolean(fixa), 
            metodo_pagamento, 
            cartao_id, 
            req.user.id,
            isPaid,
            valorPago
          ]
        );

        // Se foi pago com reserva
        if (reserva_id) {
          // ✅ CORREÇÃO: Verificar o VALOR total da reserva em vez do saldo_atual
          const [reserva] = await conn.query(
            'SELECT valor FROM reservas WHERE id = ? AND usuario_id = ? FOR UPDATE',
            [reserva_id, req.user.id]
          );

          if (!reserva[0]) {
            await conn.rollback();
            return res.status(404).json({ error: 'Reserva não encontrada' });
          }

          const valorTotalReserva = Number(reserva[0].valor) || 0;
          const valorDebito = parseFloat(valor);

          if (valorTotalReserva < valorDebito) {
            await conn.rollback();
            return res.status(400).json({ 
              error: 'Valor insuficiente na reserva',
              details: `Valor total da reserva: R$ ${valorTotalReserva.toFixed(2)}, Valor necessário: R$ ${valorDebito.toFixed(2)}`
            });
          }

          // ✅ CORREÇÃO: Atualizar o VALOR da reserva (não o saldo_atual)
          await conn.query(
            'UPDATE reservas SET valor = valor - ? WHERE id = ? AND usuario_id = ?',
            [valorDebito, reserva_id, req.user.id]
          );

          // Registrar a transação de saída
          await conn.query(
            `INSERT INTO transacoes 
             (tipo, valor, descricao, data, metodo_pagamento, cartao_id, reserva_id, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['saida', valorDebito, `Pagamento: ${nome}`, new Date(), metodo_pagamento, cartao_id, reserva_id, req.user.id]
          );

          // ✅ CORREÇÃO: Verificar se a reserva zerou pelo VALOR
          const [reservaAtualizada] = await conn.query(
            'SELECT valor FROM reservas WHERE id = ? AND usuario_id = ?',
            [reserva_id, req.user.id]
          );

          const novoValor = Number(reservaAtualizada[0]?.valor) || 0;
          if (novoValor <= 0) {
            await conn.query(
              'DELETE FROM reservas WHERE id = ? AND usuario_id = ?',
              [reserva_id, req.user.id]
            );
          }
        }

        await conn.commit();
        
        const [dividaCriada] = await conn.query(
          'SELECT * FROM dividas WHERE id = ? AND usuario_id = ?',
          [result.insertId, req.user.id]
        );
        
        res.status(201).json({
          success: true,
          id: result.insertId,
          debt: dividaCriada[0],
          message: reserva_id ? 
            'Dívida cadastrada e paga com reserva com sucesso! 💰' : 
            'Dívida cadastrada com sucesso!'
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

      // CORREÇÃO: Garantir precisão decimal
      const valorPago = Number(parseFloat(valor_pago).toFixed(2));
      
      const conn = await db.getConnection();
      await conn.beginTransaction();

      try {
        // 1. Buscar a dívida
        const [debt] = await conn.query(
          'SELECT * FROM dividas WHERE id = ? AND usuario_id = ? FOR UPDATE',
          [id, req.user.id]
        );

        if (!debt[0]) {
          await conn.rollback();
          return res.status(404).json({ error: 'Dívida não encontrada' });
        }

        const currentPaid = Number(debt[0].valor_pago) || 0;
        const newPaidValue = currentPaid + valorPago;
        const isFullyPaid = newPaidValue >= Number(debt[0].valor);

        console.log('=== PAYMENT DEBUG ===');
        console.log('Valor pago:', valorPago);
        console.log('Current paid:', currentPaid);
        console.log('New paid value:', newPaidValue);

        // 2. Atualizar a dívida
        await conn.query(
          `UPDATE dividas 
           SET valor_pago = ?, pago = ?, metodo_pagamento = ?, cartao_id = ? 
           WHERE id = ? AND usuario_id = ?`,
          [newPaidValue, isFullyPaid, metodo_pagamento, cartao_id, id, req.user.id]
        );

        // 3. Se foi pago com reserva, validar e processar
        if (reserva_id) {
          // CORREÇÃO: Usar a MESMA lógica do getTotalReservas
          const [saldoReserva] = await conn.query(
            `SELECT 
              COALESCE(SUM(
                (SELECT COALESCE(SUM(valor), 0) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'entrada' AND t.usuario_id = ?) -
                (SELECT COALESCE(SUM(valor), 0) FROM transacoes t WHERE t.reserva_id = r.id AND t.tipo = 'saida' AND t.usuario_id = ?)
              ), 0) AS saldo
             FROM reservas r 
             WHERE r.id = ? AND r.usuario_id = ?`,
            [req.user.id, req.user.id, reserva_id, req.user.id]
          );

          const saldoAtual = Number(saldoReserva[0]?.saldo) || 0;
          
          console.log('=== SALDO RESERVA DEBUG ===');
          console.log('Reserva ID:', reserva_id);
          console.log('Saldo atual calculado:', saldoAtual);
          console.log('Valor a pagar:', valorPago);

          if (saldoAtual < valorPago) {
            await conn.rollback();
            return res.status(400).json({ 
              error: 'Saldo insuficiente na reserva',
              details: `Saldo disponível: R$ ${saldoAtual.toFixed(2)}, Valor solicitado: R$ ${valorPago.toFixed(2)}`
            });
          }

          // 4. Registrar a transação de saída
          await conn.query(
            `INSERT INTO transacoes 
             (tipo, valor, descricao, data, metodo_pagamento, cartao_id, reserva_id, usuario_id) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            ['saida', valorPago, `Pagamento dívida: ${debt[0].nome}`, new Date(), 
             metodo_pagamento, cartao_id, reserva_id, req.user.id]
          );

          // ✅ CORREÇÃO: Buscar o valor atual da reserva para verificar se vai zerar
          const [reservaAtual] = await conn.query(
            'SELECT valor FROM reservas WHERE id = ? AND usuario_id = ?',
            [reserva_id, req.user.id]
          );

          const valorReservaAtual = Number(reservaAtual[0]?.valor) || 0;
          const novoValorReserva = valorReservaAtual - valorPago;

          console.log('=== ATUALIZAÇÃO DE RESERVA ===');
          console.log('Valor atual da reserva:', valorReservaAtual);
          console.log('Novo valor da reserva:', novoValorReserva);

          // ✅ CORREÇÃO: Deletar a reserva se o valor ficar zero ou negativo
          if (novoValorReserva <= 0) {
            console.log(`Deletando reserva ${reserva_id} - valor chegou a zero`);
            await conn.query(
              'DELETE FROM reservas WHERE id = ? AND usuario_id = ?',
              [reserva_id, req.user.id]
            );
          } else {
            // Se ainda sobrar dinheiro, apenas atualiza o valor
            console.log(`Atualizando reserva ${reserva_id} para R$ ${novoValorReserva}`);
            await conn.query(
              'UPDATE reservas SET valor = ? WHERE id = ? AND usuario_id = ?',
              [novoValorReserva, reserva_id, req.user.id]
            );
          }
        }

        await conn.commit();

        // Buscar dívida atualizada para retornar
        const [updatedDebt] = await conn.query(
          'SELECT * FROM dividas WHERE id = ? AND usuario_id = ?',
          [id, req.user.id]
        );

        // Buscar também a reserva atualizada se foi usada (se não foi deletada)
        let updatedReserve = null;
        if (reserva_id) {
          const [reserve] = await conn.query(
            'SELECT * FROM reservas WHERE id = ? AND usuario_id = ?',
            [reserva_id, req.user.id]
          );
          updatedReserve = reserve[0]; // Será null se a reserva foi deletada
        }

        res.json({ 
          success: true,
          message: 'Dívida atualizada com sucesso',
          fullyPaid: isFullyPaid,
          debt: updatedDebt[0],
          reserve: updatedReserve // ✅ Retornará null se a reserva foi deletada
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