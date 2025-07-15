import React from 'react';

const ExportButton = ({ exportToExcel }) => (
  <div className="section">
    <h2 className="section-title">📥 Exportar Simulação</h2>
    <button 
      onClick={exportToExcel}
      className="button button-success"
    >
      Exportar para Excel
    </button>
  </div>
);

export default ExportButton;