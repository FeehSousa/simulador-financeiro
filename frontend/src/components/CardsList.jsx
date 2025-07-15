import React from 'react';

const CardsList = ({
  cards,
  filteredCards,
  cardFilters,
  setCardFilters,
  clearCardFilters,
  handleDeleteCard
}) => (
  <div className="section">
    <h2 className="section-title">💳 Meus Cartões</h2>
    
    <div className="input-grid">
      <div className="input-group">
        <label>Nome:</label>
        <input
          type="text"
          className="input"
          value={cardFilters.name}
          onChange={(e) => setCardFilters({...cardFilters, name: e.target.value})}
          placeholder="Filtrar por nome"
        />
      </div>
      
      <div className="input-group">
        <label>Tipo:</label>
        <select
          className="input"
          value={cardFilters.type}
          onChange={(e) => setCardFilters({...cardFilters, type: e.target.value})}
        >
          <option value="all">Todos</option>
          <option value="credito">Crédito</option>
          <option value="debito">Débito</option>
          <option value="credito_debito">Crédito e Débito</option>
        </select>
      </div>
      
      <div className="input-group">
        <label>Banco:</label>
        <select
          className="input"
          value={cardFilters.bank}
          onChange={(e) => setCardFilters({...cardFilters, bank: e.target.value})}
        >
          <option value="all">Todos</option>
          <option value="Nubank">Nubank</option>
          <option value="Santander">Santander</option>
          <option value="Itaú">Itaú</option>
          <option value="Bradesco">Bradesco</option>
          <option value="C6 Bank">C6 Bank</option>
          <option value="Inter">Inter</option>
          <option value="Outro">Outro</option>
        </select>
      </div>
      
      <button 
        onClick={clearCardFilters}
        className="button button-small button-info"
        style={{ alignSelf: 'flex-end' }}
      >
        Limpar Filtros
      </button>
    </div>
    
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Banco</th>
            <th>Tipo</th>
            <th>Limite</th>
            <th>Fechamento</th>
            <th>Vencimento</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredCards.map(card => (
            <tr key={card.id}>
              <td>{card.name}</td>
              <td>{card.bank}</td>
              <td>
                {card.type === 'credito' && 'Crédito'}
                {card.type === 'debito' && 'Débito'}
                {card.type === 'credito_debito' && 'Crédito/Débito'}
              </td>
              <td>
                {card.limit ? `R$ ${card.limit.toFixed(2)}` : '-'}
              </td>
              <td>
                {card.closingDay || '-'}
              </td>
              <td>
                {card.dueDay || '-'}
              </td>
              <td>
                <button 
                  onClick={() => handleDeleteCard(card.id)}
                  className="button button-danger button-small"
                >
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default CardsList;