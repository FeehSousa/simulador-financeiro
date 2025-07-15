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
  }
};