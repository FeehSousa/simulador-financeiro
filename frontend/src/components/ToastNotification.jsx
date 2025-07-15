import React, { useState, useEffect } from 'react';
import '../css/ToastNotification.css'; // Criar este arquivo CSS

const ToastNotification = ({ message, type = 'success', duration = 3000 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div className={`toast-notification toast-${type}`}>
        {message}
    </div>
  );
};

export default ToastNotification;