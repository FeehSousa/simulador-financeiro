import React from 'react';

const ReserveList = ({
  reserves,
  filteredReserves,
  reserveFilters,
  setReserveFilters,
  clearReserveFilters,
  handleDeleteReserve
}) => (
  <div className="section">
    <h2 className="section-title">📋 Lista de Reservas Financeiras</h2>
    
    <div className="input-grid">
      <div className="input-group">
        <label>Nome:</label>
        <input
          type="text"
          className="input"
          value={reserveFilters.name}
          onChange={(e) => setReserveFilters({...reserveFilters, name: e.target.value})}
          placeholder="Filtrar por nome"
        />
      </div>
      
      <div className="input-group">
        <label>Tipo:</label>
        <select
          className="input"
          value={reserveFilters.type}
          onChange={(e) => setReserveFilters({...reserveFilters, type: e.target.value})}
        >
          <option value="all">Todos</option>
          <option value="poupança">Poupança</option>
          <option value="investimento">Investimento</option>
          <option value="fundo_emergencia">Fundo de Emergência</option>
          <option value="outros">Outros</option>
        </select>
      </div>
      
      <div className="input-group">
        <label>Valor Minimo:</label>
        <input
          className="input"
          type="number"
          value={reserveFilters.minValue}
          onChange={(e) => setReserveFilters({...reserveFilters, minValue: e.target.value})}
          placeholder="Mínimo"
          min="0"
          step="0.01"
        />
      </div>
      <div className="input-group">
        <label>Valor Máximo:</label>
        <input
          className="input"
          type="number"
          value={reserveFilters.maxValue}
          onChange={(e) => setReserveFilters({...reserveFilters, maxValue: e.target.value})}
          placeholder="Máximo"
          min="0"
          step="0.01"
        />
      </div>
      <button 
        onClick={clearReserveFilters}
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
            <th>Valor (R$)</th>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {filteredReserves.map(reserve => (
            <tr key={reserve.id}>
              <td>{reserve.nome}</td>
              <td>R$ {Number(reserve.valor).toFixed(2)}</td>
              <td>
                <span className={`reserve-type ${reserve.tipo}`}>
                  {reserve.tipo.replace('_', ' ')}
                </span>
              </td>
              <td>{reserve.descricao || '-'}</td>
              <td>{new Date(reserve.created_at).toLocaleDateString('pt-BR')}</td>
              <td>
                <button 
                  onClick={() => handleDeleteReserve(reserve.id)}
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

export default ReserveList;