import React from 'react';

const ApiStatusIndicator = ({ status }) => {
  const statusMap = {
    healthy: { text: '✅ Saudável', className: 'healthy' },
    unhealthy: { text: '⚠️ Com problemas', className: 'unhealthy' },
    unreachable: { text: '❌ Indisponível', className: 'unreachable' }
  };

  const currentStatus = statusMap[status] || { text: 'Desconhecido', className: 'unknown' };

  return (
    <div className="api-status">
      Status da API: 
      <span className={`status-${currentStatus.className}`}>
        {currentStatus.text}
      </span>
    </div>
  );
};

export default ApiStatusIndicator;