import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const FinanceChart = ({
  chartData,
  highlightedSeries,
  setHighlightedSeries
}) => {
  const getBarStyle = (seriesKey) => {
    if (highlightedSeries === null) return { fill: getDefaultColor(seriesKey), opacity: 1 };
    return {
      fill: highlightedSeries === seriesKey ? getHighlightColor(seriesKey) : getDefaultColor(seriesKey) + '80',
      opacity: highlightedSeries === seriesKey ? 1 : 0.6
    };
  };

  const getDefaultColor = (key) => {
    const colors = {
      income: '#82ca9d',
      debts: '#f87171',
      surplus: '#60a5fa',
      totalSaved: '#a78bfa'
    };
    return colors[key];
  };

  const getHighlightColor = (key) => {
    const colors = {
      income: '#4CAF50',
      debts: '#e53935',
      surplus: '#1E88E5',
      totalSaved: '#7c3aed'
    };
    return colors[key];
  };

  const handleLegendClick = (entry) => {
    const { dataKey } = entry;
    setHighlightedSeries(highlightedSeries === dataKey ? null : dataKey);
  };

  return (
    <div className="section">
      <h2 className="section-title">📈 Evolução Financeira</h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip 
              formatter={(value, name) => {
                if (typeof value === 'number') return [value.toFixed(2), name];
                return [value, name];
              }}
            />
            <Legend onClick={handleLegendClick} wrapperStyle={{ cursor: 'pointer' }} />
            
            <Bar 
              dataKey="income" 
              name="Renda"
              {...getBarStyle('income')}
            />
            <Bar 
              dataKey="debts" 
              name="Dívidas"
              {...getBarStyle('debts')}
            />
            <Bar 
              dataKey="surplus" 
              name="Sobra Mensal"
              {...getBarStyle('surplus')}
            />
            <Bar 
              dataKey="totalSaved" 
              name="Total Acumulado"
              {...getBarStyle('totalSaved')}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <button 
        onClick={() => setHighlightedSeries(null)}
        className="button button-info"
      >
        Mostrar todas as séries
      </button>
    </div>
  );
};

export default FinanceChart;