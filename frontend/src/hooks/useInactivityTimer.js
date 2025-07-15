// src/hooks/useInactivityTimer.js
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const useInactivityTimer = (timeout = 1 * 60 * 1000, warningTime = 30 * 1000) => {
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(Math.floor(warningTime / 1000));

  useEffect(() => {
    let timer;
    let warningTimer;
    let countdownInterval;
    let lastActivityTime = Date.now();

    const logout = () => {
      api.logout();
      window.location.href = '/login';
    };

    const showWarningModal = () => {
      setShowWarning(true);
      setCountdown(Math.floor(warningTime / 1000));
      
      countdownInterval = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            logout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    const resetTimers = () => {
      lastActivityTime = Date.now();
      setShowWarning(false);
      clearTimeout(timer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      
      // Timer para mostrar o aviso
      warningTimer = setTimeout(showWarningModal, timeout - warningTime);
      
      // Timer para logout completo
      timer = setTimeout(logout, timeout);
    };

    const handleContinue = () => {
      resetTimers();
      // Dispara um evento fake para registrar atividade
      window.dispatchEvent(new Event('mousedown'));
    };

    // Eventos que resetam o timer
    const events = [
      'mousedown', 'mousemove', 'keydown', 
      'scroll', 'touchstart', 'click',
      'wheel', 'keypress', 'resize'
    ];

    // Adiciona listeners
    events.forEach(event => {
      window.addEventListener(event, resetTimers);
    });

    // Inicia os timers
    resetTimers();

    return () => {
      clearTimeout(timer);
      clearTimeout(warningTimer);
      clearInterval(countdownInterval);
      events.forEach(event => {
        window.removeEventListener(event, resetTimers);
      });
    };
  }, [navigate, timeout, warningTime]);

  return { showWarning, countdown };
};

export default useInactivityTimer;