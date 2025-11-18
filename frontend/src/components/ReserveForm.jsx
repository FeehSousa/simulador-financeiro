import React from 'react';

const ReserveForm = ({
  newReserve,
  setNewReserve,
  loading,
  handleAddReserve
}) => {
  
  const handleInputChange = (field, value) => {
    setNewReserve(prev => ({
      ...prev,
      [field]: value === '' ? '' : Number(value)
    }));
  };

  return (
    <div className="section">
      <h2 className="section-title">💰 Adicionar Reserva Financeira</h2>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Nome da Reserva</label>
          <input 
            className="input"
            placeholder="Ex: Reserva Emergencial" 
            value={newReserve.name} 
            onChange={(e) => setNewReserve({ ...newReserve, name: e.target.value })}
            maxLength="100"
          />
        </div>
        
        <div className="input-group">
          <label className="label">Valor (R$)</label>
          <input 
            type="number"
            className="input"
            placeholder="0,00" 
            value={newReserve.value === 0 ? '' : newReserve.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </div>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Tipo de Reserva</label>
          <select
            className="input"
            value={newReserve.tipo}
            onChange={(e) => setNewReserve({ ...newReserve, tipo: e.target.value })}
          >
            <option value="poupança">Poupança</option>
            <option value="investimento">Investimento</option>
            <option value="fundo_emergencia">Fundo de Emergência</option>
            <option value="outros">Outros</option>
          </select>
        </div>
        
        <div className="input-group">
          <label className="label">Descrição</label>
          <input 
            type="text"
            className="input"
            placeholder="Opcional"
            value={newReserve.descricao}
            onChange={(e) => setNewReserve({ ...newReserve, descricao: e.target.value })}
          />
        </div>
      </div>
      
      <button 
        onClick={handleAddReserve}
        disabled={loading.addReserve}
        className="button button-secondary"
      >
        {loading.addReserve ? "Processando..." : "Adicionar Reserva"}
      </button>
    </div>
  );
};

export default ReserveForm;