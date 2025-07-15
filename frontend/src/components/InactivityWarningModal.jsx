import React, { useState, useEffect } from 'react';
import '../css/InactivityWarningModal.css';

const InactivityWarningModal = ({ 
  show, 
  onContinue, 
  onLogout, 
  countdown 
}) => {
  if (!show) return null;

  return (
    <div className="inactivity-modal-overlay">
      <div className="inactivity-modal">
        <h2>Sessão Inativa</h2>
        <p>Você será desconectado em {countdown} segundos por inatividade.</p>
        <div className="inactivity-modal-buttons">
          <button 
            onClick={onContinue}
            className="inactivity-modal-button-continue"
          >
            Continuar Sessão
          </button>
          <button 
            onClick={onLogout}
            className="inactivity-modal-button-logout"
          >
            Sair Agora
          </button>
        </div>
      </div>
    </div>
  );
};

export default InactivityWarningModal;