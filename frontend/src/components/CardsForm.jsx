import React from 'react';

const CardsForm = ({
  newCard,
  setNewCard,
  loading,
  handleAddCard
}) => {
  const cardTypes = [
    { value: 'credito', label: 'Crédito' },
    { value: 'debito', label: 'Débito' },
    { value: 'credito_debito', label: 'Crédito e Débito' }
  ];

  const banks = [
    'Nubank', 'Santander', 'Itaú', 'Bradesco', 
    'Caixa', 'Banco do Brasil', 'C6 Bank', 'Inter',
    'Sicoob', 'Sicredi', 'Outro'
  ];

  const handleInputChange = (field, value) => {
    setNewCard(prev => ({
      ...prev,
      [field]: value === '' ? '' : Number(value)
    }));
  };

  const handleNumberInputChange = (field, value) => {
    // Para campos numéricos que não podem ser vazios (como dias)
    const numericValue = value === '' ? 1 : Number(value);
    setNewCard(prev => ({
      ...prev,
      [field]: numericValue
    }));
  };

  return (
    <div className="section">
      <h2 className="section-title">💳 Adicionar Cartão</h2>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Nome do Cartão</label>
          <input 
            className="input"
            placeholder="Ex: Cartão Nubank, Cartão Santander" 
            value={newCard.name} 
            onChange={(e) => setNewCard({ ...newCard, name: e.target.value })}
            maxLength="50"
          />
        </div>
        
        <div className="input-group">
          <label className="label">Tipo</label>
          <select
            className="input"
            value={newCard.type}
            onChange={(e) => setNewCard({ ...newCard, type: e.target.value })}
          >
            {cardTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="input-group">
          <label className="label">Banco</label>
          <select
            className="input"
            value={newCard.bank}
            onChange={(e) => setNewCard({ ...newCard, bank: e.target.value })}
          >
            {banks.map(bank => (
              <option key={bank} value={bank}>
                {bank}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {(newCard.type === 'credito' || newCard.type === 'credito_debito') && (
        <div className="input-grid">
          <div className="input-group">
            <label className="label">Limite (R$)</label>
            <input 
              type="number"
              className="input"
              placeholder="0,00" 
              value={newCard.limit === 0 ? '' : newCard.limit}
              onChange={(e) => handleInputChange('limit', e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="input-group">
            <label className="label">Dia de Fechamento</label>
            <input 
              type="number"
              className="input"
              placeholder="1-31" 
              value={newCard.closingDay}
              onChange={(e) => handleNumberInputChange('closingDay', e.target.value)}
              min="1"
              max="31"
            />
          </div>
          
          <div className="input-group">
            <label className="label">Dia de Vencimento</label>
            <input 
              type="number"
              className="input"
              placeholder="1-31" 
              value={newCard.dueDay}
              onChange={(e) => handleNumberInputChange('dueDay', e.target.value)}
              min="1"
              max="31"
            />
          </div>
        </div>
      )}
      
      <button 
        onClick={handleAddCard}
        disabled={loading.addCard}
        className="button button-primary"
      >
        {loading.addCard ? "Processando..." : "Adicionar Cartão"}
      </button>
    </div>
  );
};

export default CardsForm;