import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DebtList = ({
  debts,
  filteredDebts,
  debtFilters,
  setDebtFilters,
  clearDebtFilters,
  page,
  setPage,
  itemsPerPage,
  handleDeleteDebt,
  handlePayDebt,
  reserves
}) => {
  const [paymentAmounts, setPaymentAmounts] = useState({});
  const [paymentReserves, setPaymentReserves] = useState({});
  const [expandedDebt, setExpandedDebt] = useState(null);

  const handlePaymentChange = (debtId, value) => {
    const numericValue = value === '' ? '' : Number(value);
    setPaymentAmounts((prev) => ({
      ...prev,
      [debtId]: numericValue,
    }));
  };

  const handleReserveChange = (debtId, reserveId) => {
    setPaymentReserves((prev) => ({
      ...prev,
      [debtId]: reserveId || null,
    }));
  };

  const handlePayDebtClick = (debtId, currentAmount, currentReserve) => {
    const amount = currentAmount === '' ? 0 : Number(currentAmount);
    const reserveId = currentReserve || null;
    
    handlePayDebt(debtId, amount, reserveId);
    
    setPaymentAmounts((prev) => ({ ...prev, [debtId]: '' }));
    setPaymentReserves((prev) => ({ ...prev, [debtId]: null }));
    setExpandedDebt(null);
  };

  const toggleExpandDebt = (debtId) => {
    setExpandedDebt(expandedDebt === debtId ? null : debtId);
  };

  // Calcular totais
  const totalDebts = filteredDebts.reduce((sum, debt) => sum + Number(debt.value), 0);
  const totalPaid = filteredDebts.reduce((sum, debt) => sum + Number(debt.valor_pago || 0), 0);
  const totalRemaining = totalDebts - totalPaid;

  return (
    <div className="section">
      <h2 className="section-title">📋 Lista de Dívidas</h2>

      {/* Resumo Compacto */}
      <div className="summary-cards">
        <div className="summary-card">
          <h3>Total Dívidas</h3>
          <p className="summary-value">R$ {totalDebts.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>Total Pago</h3>
          <p className="summary-value text-success">R$ {totalPaid.toFixed(2)}</p>
        </div>
        <div className="summary-card">
          <h3>A Pagar</h3>
          <p className="summary-value text-warning">R$ {totalRemaining.toFixed(2)}</p>
        </div>
      </div>

      {/* Filtros Compactos */}
      <div className="filter-section">
        <div className="filter-grid">
          <input
            type="text"
            className="input input-small"
            placeholder="🔍 Filtrar por nome"
            value={debtFilters.name}
            onChange={(e) => setDebtFilters({ ...debtFilters, name: e.target.value })}
          />
          
          <select
            className="input input-small"
            value={debtFilters.type}
            onChange={(e) => setDebtFilters({ ...debtFilters, type: e.target.value })}
          >
            <option value="all">📊 Todos os tipos</option>
            <option value="fixed">🔄 Fixa</option>
            <option value="temporary">📅 Temporária</option>
          </select>

          <select
            className="input input-small"
            value={debtFilters.status}
            onChange={(e) => setDebtFilters({ ...debtFilters, status: e.target.value })}
          >
            <option value="all">📈 Todos status</option>
            <option value="paid">✅ Pagas</option>
            <option value="pending">⏳ Pendentes</option>
          </select>

          <button
            onClick={clearDebtFilters}
            className="button button-small button-info"
          >
            🗑️ Limpar
          </button>
        </div>
      </div>

      {/* Tabela Compacta */}
      <div className="table-container">
        <table className="table compact-table">
          <thead>
            <tr>
              <th>Dívida</th>
              <th>Valor</th>
              <th>Pago</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts.length === 0 ? (
              <tr>
                <td colSpan="5" className="text-center">
                  📝 Nenhuma dívida encontrada
                </td>
              </tr>
            ) : (
              filteredDebts
                .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                .map((debt) => {
                  const remainingAmount = debt.value - (debt.valor_pago || 0);
                  const currentPayment = paymentAmounts[debt.id] || '';
                  const currentReserve = paymentReserves[debt.id] || null;
                  const selectedReserve = reserves.find(r => r.id === currentReserve);
                  const hasEnoughBalance = selectedReserve ? 
                    (selectedReserve.saldo_atual || 0) >= (currentPayment || 0) : true;
                  const isExpanded = expandedDebt === debt.id;
                  
                  return (
                    <React.Fragment key={debt.id}>
                      <tr className={debt.pago ? 'debt-paid' : ''}>
                        <td>
                          <div className="debt-main-info">
                            <strong>{debt.name}</strong>
                            <div className="debt-details">
                              <small>
                                {debt.fixed ? '🔄 Fixa' : '📅 Temp'} • 
                                {debt.paymentMethod === 'credito' && ' 💳 Crédito'}
                                {debt.paymentMethod === 'debito' && ' 💳 Débito'}
                                {debt.paymentMethod === 'dinheiro' && ' 💵 Dinheiro'}
                                {debt.card && ` • ${debt.card.name}`}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="amount-column">
                            <div>R$ {Number(debt.value).toFixed(2)}</div>
                            <small className="text-muted">
                              Início: {new Date(debt.startDate).toLocaleDateString('pt-BR')}
                            </small>
                          </div>
                        </td>
                        <td>
                          <div className="amount-column">
                            <div className={debt.valor_pago ? 'text-success' : ''}>
                              R$ {Number(debt.valor_pago || 0).toFixed(2)}
                            </div>
                            <small className="text-warning">
                              Resta: R$ {remainingAmount.toFixed(2)}
                            </small>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${debt.pago ? 'paid' : 'pending'}`}>
                            {debt.pago ? '✅ Paga' : '⏳ Pendente'}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {!debt.pago && remainingAmount > 0 && (
                              <button
                                onClick={() => toggleExpandDebt(debt.id)}
                                className="button button-success button-small"
                              >
                                {isExpanded ? '▲' : '💰 Pagar'}
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="button button-danger button-small"
                              title="Excluir dívida"
                            >
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Linha expandida para pagamento */}
                      {isExpanded && !debt.pago && remainingAmount > 0 && (
                        <tr className="expanded-row">
                          <td colSpan="5">
                            <div className="payment-expanded">
                              <h4>💳 Pagar "{debt.name}"</h4>
                              <div className="payment-controls">
                                <div className="payment-input-group">
                                  <label>Valor do pagamento:</label>
                                  <input
                                    type="number"
                                    placeholder="0.00"
                                    value={currentPayment}
                                    onChange={(e) => handlePaymentChange(debt.id, e.target.value)}
                                    min="0.01"
                                    max={remainingAmount}
                                    step="0.01"
                                    className="input"
                                  />
                                  <small>Máximo: R$ {remainingAmount.toFixed(2)}</small>
                                </div>
                                
                                <div className="payment-input-group">
                                  <label>Usar reserva:</label>
                                  <select
                                    value={currentReserve || ''}
                                    onChange={(e) => handleReserveChange(debt.id, e.target.value || null)}
                                    className="input"
                                  >
                                    <option value="">💳 Pagar sem reserva</option>
                                    {reserves.map(reserve => (
                                      <option key={reserve.id} value={reserve.id}>
                                        🏦 {reserve.nome} (Saldo: R$ {(reserve.saldo_atual || 0).toFixed(2)})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                
                                <div className="payment-actions">
                                  <button
                                    onClick={() => handlePayDebtClick(debt.id, currentPayment, currentReserve)}
                                    className="button button-success"
                                    disabled={
                                      currentPayment === '' ||
                                      Number(currentPayment) <= 0 ||
                                      Number(currentPayment) > remainingAmount ||
                                      !hasEnoughBalance
                                    }
                                  >
                                    ✅ Confirmar Pagamento
                                  </button>
                                  
                                  <button
                                    onClick={() => setExpandedDebt(null)}
                                    className="button button-secondary"
                                  >
                                    ❌ Cancelar
                                  </button>
                                  
                                  {!hasEnoughBalance && currentReserve && (
                                    <span className="error-text">❌ Saldo insuficiente na reserva</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
            )}
          </tbody>
        </table>

        {/* Paginação */}
        {filteredDebts.length > 0 && (
          <div className="pagination">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="button button-small"
            >
              ← Anterior
            </button>

            <span className="pagination-info">
              Página {page} de {Math.ceil(filteredDebts.length / itemsPerPage)}
              <br />
              <small>{filteredDebts.length} dívidas</small>
            </span>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(filteredDebts.length / itemsPerPage)}
              className="button button-small"
            >
              Próxima →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtList;