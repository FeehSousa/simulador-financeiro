import React from 'react';
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
}) => {
  const [paymentAmounts, setPaymentAmounts] = useState({});

  const handlePaymentChange = (debtId, amount) => {
    setPaymentAmounts((prev) => ({
      ...prev,
      [debtId]: amount,
    }));
  };

  return (
    <div className="section">
      <h2 className="section-title">📋 Lista de Dívidas Cadastradas</h2>

      <div className="input-grid">
        <div className="input-group">
          <label>Nome:</label>
          <input
            type="text"
            className="input"
            value={debtFilters.name}
            onChange={(e) =>
              setDebtFilters({ ...debtFilters, name: e.target.value })
            }
            placeholder="Filtrar por nome"
          />
        </div>

        <div className="input-group">
          <label>Tipo:</label>
          <select
            className="input"
            value={debtFilters.type}
            onChange={(e) =>
              setDebtFilters({ ...debtFilters, type: e.target.value })
            }
          >
            <option value="all">Todos</option>
            <option value="fixed">Fixa</option>
            <option value="temporary">Temporária</option>
          </select>
        </div>

        <div className="input-group">
          <label>Data Início:</label>
          <DatePicker
            selected={debtFilters.startDate}
            onChange={(date) =>
              setDebtFilters({ ...debtFilters, startDate: date })
            }
            placeholderText="Selecione a data"
            dateFormat="dd/MM/yyyy"
            className="date-picker-input"
            isClearable
          />
        </div>

        <div className="input-group">
          <label>Data Término:</label>
          <DatePicker
            selected={debtFilters.endDate}
            onChange={(date) =>
              setDebtFilters({ ...debtFilters, endDate: date })
            }
            placeholderText="Selecione a data"
            dateFormat="dd/MM/yyyy"
            className="date-picker-input"
            isClearable
          />
        </div>

        <button
          onClick={clearDebtFilters}
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
              <th>Pago (R$)</th>
              <th>Início</th>
              <th>Término</th>
              <th>Tipo</th>
              <th>Pagamento</th>
              <th>Cartão</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredDebts
              .slice((page - 1) * itemsPerPage, page * itemsPerPage)
              .map((debt) => (
                <tr key={debt.id}>
                  <td>{debt.name}</td>
                  <td>{Number(debt.value).toFixed(2)}</td>
                  <td>{Number(debt.valor_pago || 0).toFixed(2)}</td>
                  <td>
                    {new Date(debt.startDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    {debt.fixed
                      ? 'Indeterminado'
                      : debt.endDate
                      ? new Date(debt.endDate).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td>{debt.fixed ? 'Fixa' : 'Temporária'}</td>
                  <td>
                    {debt.paymentMethod === 'credito' && 'Crédito'}
                    {debt.paymentMethod === 'debito' && 'Débito'}
                    {debt.paymentMethod === 'dinheiro' && 'Dinheiro'}
                    {debt.paymentMethod === 'pix' && 'PIX'}
                    {debt.paymentMethod === 'transferencia' && 'Transferência'}
                    {debt.paymentMethod === 'outro' && 'Outro'}
                  </td>
                  <td>
                    {debt.card ? `${debt.card.name} (${debt.card.bank})` : '-'}
                  </td>
                  <td>
                    <div className="debt-actions">
                      {!debt.pago && (
                        <div className="payment-input">
                          <input
                            type="number"
                            placeholder="Valor"
                            value={paymentAmounts[debt.id] || ''}
                            onChange={(e) =>
                              handlePaymentChange(debt.id, e.target.value)
                            }
                            min="0"
                            max={debt.value - (debt.valor_pago || 0)}
                            step="0.01"
                            className="input input-small"
                          />
                          <button
                            onClick={() =>
                              handlePayDebt(
                                debt.id,
                                parseFloat(paymentAmounts[debt.id] || 0)
                              )
                            }
                            className="button button-success button-small"
                            disabled={
                              !paymentAmounts[debt.id] ||
                              parseFloat(paymentAmounts[debt.id]) <= 0
                            }
                          >
                            Pagar
                          </button>
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteDebt(debt.id)}
                        className="button button-danger button-small"
                      >
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div className="pagination">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            className="button button-small"
          >
            Anterior
          </button>

          <span>
            Página {page} de {Math.ceil(filteredDebts.length / itemsPerPage)}
          </span>

          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(filteredDebts.length / itemsPerPage)}
            className="button button-small"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebtList;
