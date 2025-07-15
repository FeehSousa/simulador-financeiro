import React from 'react';

const GoalProgress = ({ financialInfo, chartData }) => (
  <div className="section">
    <h2 className="section-title">🏡 Meta: Casa de R$ {Number(financialInfo.savingsGoal).toLocaleString('pt-BR')}</h2>
    <p>Com base no total acumulado, veja quanto falta para sua meta.</p>
    <p>Total acumulado: <strong>R$ {Number(chartData[chartData.length - 1]?.totalSaved || 0).toFixed(2)}</strong></p>
    <p>Faltam: <strong>R$ {Math.max(0, (financialInfo.savingsGoal - (Number(chartData[chartData.length - 1]?.totalSaved || 0)))).toFixed(2)}</strong></p>
    <div className="progress-bar">
      <div 
        className="progress-fill"
        style={{
            width: `${chartData && chartData.length > 0
            ? Math.min(100, ((chartData[chartData.length - 1]?.totalSaved || 0) / financialInfo.savingsGoal * 100))
            : 0}%`
        }}
      />
    </div>
  </div>
);

export default GoalProgress;