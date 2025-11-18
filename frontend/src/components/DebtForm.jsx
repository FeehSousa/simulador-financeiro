import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DebtForm = ({
  newDebt,
  setNewDebt,
  error,
  loading,
  paymentMethods,
  reserves,
  handleAddDebt
}) => {
  
  const handleInputChange = (field, value) => {
    setNewDebt(prev => ({
      ...prev,
      [field]: value === '' ? '' : Number(value)
    }));
  };

  return (
    <div className="section">
      <h2 className="section-title">➕ Adicionar Dívida</h2>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Nome da Dívida</label>
          <input 
            className="input"
            placeholder="Ex: Aluguel, Cartão de Crédito" 
            value={newDebt.name} 
            onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
            maxLength="50"
          />
        </div>
        
        <div className="input-group">
          <label className="label">Valor (R$)</label>
          <input 
            type="number"
            className="input"
            placeholder="0,00" 
            value={newDebt.value === 0 ? '' : newDebt.value}
            onChange={(e) => handleInputChange('value', e.target.value)}
            min="0"
            step="0.01"
          />
        </div>
      </div>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Data de Início</label>
          <DatePicker
            selected={newDebt.startDate}
            onChange={(date) => setNewDebt({ ...newDebt, startDate: date })}
            dateFormat="dd/MM/yyyy"
            placeholderText="Selecione a data"
            className="date-picker-input"
            required
          />
        </div>
        
        {!newDebt.fixed && (
          <div className="input-group">
            <label className="label">Data de Término</label>
            <DatePicker
              selected={newDebt.endDate}
              onChange={(date) => setNewDebt({ ...newDebt, endDate: date })}
              dateFormat="dd/MM/yyyy"
              placeholderText="Selecione a data"
              minDate={newDebt.startDate}
              className="date-picker-input"
              required={!newDebt.fixed}
            />
          </div>
        )}
      </div>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">Método de Pagamento</label>
          <select
            className="input"
            value={newDebt.paymentMethod}
            onChange={(e) => setNewDebt({ ...newDebt, paymentMethod: e.target.value })}
          >
            {paymentMethods?.methods?.map(method => (
              <option key={method.value} value={method.value}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
        
        {(newDebt.paymentMethod === 'credito' || newDebt.paymentMethod === 'debito') && (
          <div className="input-group">
            <label className="label">Cartão</label>
            <select
              className="input"
              value={newDebt.cardId || ''}
              onChange={(e) => setNewDebt({ ...newDebt, cardId: e.target.value || null })}
            >
              <option value="">Selecione um cartão</option>
              {paymentMethods?.cards
                ?.filter(card => 
                  newDebt.paymentMethod === 'credito' ? 
                  (card.type === 'credito' || card.type === 'credito_debito') :
                  (card.type === 'debito' || card.type === 'credito_debito')
                )
                .map(card => (
                  <option key={card.id} value={card.id}>
                    {card.name} ({card.bank})
                  </option>
                ))}
            </select>
          </div>
        )}
      </div>
      
      <div className="input-grid">
        <div className="input-group">
          <label className="label">💰 Pagar com Reserva</label>
          <select
            className="input"
            value={newDebt.reserveId || ''}
            onChange={(e) => setNewDebt({ ...newDebt, reserveId: e.target.value || null })}
          >
            <option value="">⏳ Deixar para pagar depois</option>
            {reserves?.map(reserve => {
              // ✅ CORREÇÃO: Usar VALOR total da reserva em vez de saldo_atual
              const valorTotalReserva = Number(reserve.valor) || 0;
              const valorDesejado = Number(newDebt.value) || 0;
              
              return (
                <option 
                  key={reserve.id} 
                  value={reserve.id}
                  disabled={valorTotalReserva < valorDesejado}
                >
                  🏦 {reserve.nome} (Total: R$ {valorTotalReserva.toFixed(2)})
                  {valorTotalReserva < valorDesejado && " - Valor insuficiente ❌"}
                </option>
              );
            })}
          </select>
          <small className="text-muted">
            {newDebt.reserveId ? 
              "✅ A dívida será paga automaticamente com o valor total desta reserva" : 
              "⚠️ A dívida ficará como pendente para pagamento futuro"}
          </small>
        </div>
      </div>
      
      <div className="checkbox-group">
        <input 
          type="checkbox" 
          id="fixed-debt"
          className="checkbox"
          checked={newDebt.fixed} 
          onChange={(e) => {
            setNewDebt({ 
              ...newDebt, 
              fixed: e.target.checked,
              endDate: e.target.checked ? null : newDebt.endDate || new Date()
            });
          }}
        />
        <label htmlFor="fixed-debt" className="label">
          Despesa Fixa (recorrente)
        </label>
      </div>
      
      {/* ✅ CORREÇÃO: Verificação segura para error */}
      {error && typeof error === 'object' && error.addDebt && (
        <div className="error-message">
          ❌ {error.addDebt}
        </div>
      )}
      
      <button 
        onClick={handleAddDebt}
        disabled={loading?.addDebt}
        className="button button-primary"
      >
        {loading?.addDebt ? "⏳ Processando..." : "✅ Adicionar Dívida"}
      </button>
    </div>
  );
};

export default DebtForm;