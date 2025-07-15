const axios = require('axios');

module.exports = {
  async recordTransaction(data) {
    try {
      const response = await axios.post('http://localhost:8545/transactions', {
        payload: data,
        timestamp: new Date().toISOString()
      });
      return response.data;
    } catch (error) {
      console.error('Erro no blockchain:', error);
      throw new Error('Falha ao registrar no blockchain');
    }
  }
};