const db = require('../config/db');

module.exports = {
  async getFinanceiro(req, res) {
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
  },

  async updateFinanceiro(req, res) {
    try {
      const { monthlyIncome, savingsGoal, simulationMonths } = req.body;
      
      // Buscar se já existe registro
      const currentData = await db.query(
        'SELECT * FROM financeiro WHERE usuario_id = ? LIMIT 1',
        [req.user.id]
      );
      const exists = currentData.length > 0;
      
      // Usar valores enviados (não preserve zeros)
      const salario = parseFloat(monthlyIncome) || 0;
      const meta = parseFloat(savingsGoal) || 0;
      const meses = parseInt(simulationMonths) || 12;
      
      console.log('Dados recebidos:', { monthlyIncome, savingsGoal, simulationMonths });
      console.log('Dados processados:', { salario, meta, meses });
      console.log('Registro existe:', exists);
      
      if (exists) {
        // UPDATE do registro existente
        await db.query(
          'UPDATE financeiro SET salario_mensal = ?, meta_economias = ?, meses_simulacao = ? WHERE usuario_id = ?',
          [salario, meta, meses, req.user.id ]
        );
      } else {
        // INSERT do novo registro
        await db.query(
          'INSERT INTO financeiro (usuario_id, salario_mensal, meta_economias, meses_simulacao) VALUES (?, ?, ?, ?)',
          [req.user.id, salario, meta, meses]
        );
      }
      
      res.json({ 
        success: true,
        salario_mensal: salario,
        meta_economias: meta,
        meses_simulacao: meses
      });
    } catch (error) {
      console.error('Erro ao atualizar dados financeiros:', error);
      res.status(500).json({ error: 'Erro ao atualizar dados financeiros' });
    }
  }
};