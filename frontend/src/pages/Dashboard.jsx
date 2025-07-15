import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../css/Dashboard.css';

function Dashboard() {
  const [goal, setGoal] = useState({
    target: 300000,
    monthlySavings: 2000,
    deadline: new Date(new Date().setFullYear(new Date().getFullYear() + 5)),
  });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSave = async () => {
    setLoading(true);
    try {
      await api.post('/metas', goal);
      navigate('/simulador');
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao salvar metas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <h1>📌 Configure Sua Meta Financeira</h1>
      
      <div className="goal-form">
        <label>
          Valor da Meta (R$):
          <input
            type="number"
            value={goal.target}
            onChange={(e) => setGoal({ ...goal, target: Number(e.target.value) })}
          />
        </label>

        <label>
          Economia Mensal (R$):
          <input
            type="number"
            value={goal.monthlySavings}
            onChange={(e) => setGoal({ ...goal, monthlySavings: Number(e.target.value) })}
          />
        </label>

        <label>
          Prazo Final:
          <input
            type="date"
            value={goal.deadline.toISOString().split('T')[0]}
            onChange={(e) => setGoal({ ...goal, deadline: new Date(e.target.value) })}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button onClick={handleSave} disabled={loading}>
          {loading ? 'Salvando...' : 'Iniciar Simulação'}
        </button>
      </div>
    </div>
  );
}

export default Dashboard;