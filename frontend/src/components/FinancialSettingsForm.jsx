import React from 'react';

const FinancialSettingsForm = ({
  financialInfo,
  setFinancialInfo,
  loading,
  handleUpdateFinancialInfo
}) => (
  <div className="section">
    <h2 className="section-title">Configurações Financeiras</h2>
    
    <div className="input-grid">
      <div className="input-group">
        <label className="label">Renda Mensal (R$)</label>
        <input
          type="number"
          className="input"
          value={financialInfo.monthlyIncome}
          onChange={(e) => setFinancialInfo({
            ...financialInfo,
            monthlyIncome: Number(e.target.value)
          })}
          min="0"
          step="100"
        />
      </div>
      
      <div className="input-group">
        <label className="label">Meses de simulação</label>
        <input
          type="number"
          className="input"
          value={financialInfo.monthlyExpenses}
          onChange={(e) => setFinancialInfo({
            ...financialInfo,
            monthlyExpenses: Math.max(1, Number(e.target.value))
          })}
          min="1"
          max="60"
        />
      </div>

      <div className="input-group">
        <label className="label">Meta de Economia (R$)</label>
        <input
          type="number"
          className="input"
          value={financialInfo.savingsGoal}
          onChange={(e) => setFinancialInfo({
            ...financialInfo,
            savingsGoal: Number(e.target.value)
          })}
          min="0"
          step="1000"
        />
      </div>
    </div>

    <button 
      onClick={handleUpdateFinancialInfo}
      disabled={loading.financialInfo}
      className="button button-warning"
    >
      {loading.financialInfo ? "Salvando..." : "Salvar Configurações"}
    </button>
  </div>
);

export default FinancialSettingsForm;