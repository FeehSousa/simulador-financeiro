import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import * as XLSX from "xlsx";
import api from "../services/api";
import 'react-datepicker/dist/react-datepicker.css';
import '../css/FinanceSimulator.css';
import DatePicker from 'react-datepicker';

// Componente ErrorBoundary para capturar erros
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Erro capturado:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-fallback">
          <h2>Algo deu errado</h2>
          <p>{this.state.error?.message || "Erro desconhecido"}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="button button-primary"
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function FinanceSimulator() {
  // Estados básicos
  const [monthlyIncome, setMonthlyIncome] = useState(4600);
  const [months, setMonths] = useState(12);
  const [highlightedSeries, setHighlightedSeries] = useState(null);
  const [loading, setLoading] = useState({
    debts: false,
    addDebt: false,
    reserves: false,
    addReserve: false,
    financialInfo: false
  });
  const [error, setError] = useState(null);
  const [apiHealth, setApiHealth] = useState(null);

  // Estados para dívidas
  const [debts, setDebts] = useState([]);
  const [newDebt, setNewDebt] = useState({
    name: "",
    value: 0,
    startDate: new Date(),
    endDate: new Date(),
    fixed: false,
  });
  const [debtFilters, setDebtFilters] = useState({
    name: '',
    type: 'all',
    startDate: null,
    endDate: null,
  });


  // Estados para reservas
  const [reserves, setReserves] = useState([]);
  const [newReserve, setNewReserve] = useState({
    name: "",
    value: 0,
    targetValue: 0,
    tipo: "poupança",
    deadline: new Date(),
  });
  const [totalReserves, setTotalReserves] = useState(0);
  const [reserveFilters, setReserveFilters] = useState({
    name: '',
    type: 'all',
    minValue: '',
    maxValue: ''
  });

  // Estados para informações financeiras
  const [financialInfo, setFinancialInfo] = useState({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsGoal: 300000
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Verificar saúde da API
  useEffect(() => {
  const controller = new AbortController();
  let isMounted = true;
  
  const checkApiHealth = async () => {
    try {
      const response = await api.get('/health', {
        signal: controller.signal
      });
      
      if (!isMounted) return;
      
      const status = response.data?.status?.toUpperCase() || 'UNREACHABLE';
      setApiHealth(
        status === 'OK' ? 'healthy' :
        status === 'ERROR' ? 'unhealthy' :
        'unreachable'
      );
      
    } catch (error) {
      if (!isMounted) return;
      
      // Verifica se o erro foi por cancelamento
      if (error.name !== 'CanceledError') {
        console.error("Erro ao verificar saúde da API:", error);
        setApiHealth('unreachable');
      }
    }
  };
  
  checkApiHealth();
  
  return () => {
    isMounted = false;
    controller.abort(); // Cancela a requisição ao desmontar
  };
}, []);

  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
        // Carregar dívidas
        if (isMounted) setLoading(prev => ({ ...prev, debts: true }));
        const debtsResponse = await api.get('/dividas');
        
        if (!isMounted) return;
        
        const parsedDebts = debtsResponse.data.map(d => ({
          ...d,
          name: d.nome,
          value: Number(d.valor),
          startDate: new Date(d.mes_inicio),
          endDate: new Date(d.mes_fim),
          fixed: Boolean(d.fixa),
        }));
        setDebts(parsedDebts);

        // Carregar reservas
        if (isMounted) setLoading(prev => ({ ...prev, reserves: true }));
        const reservesResponse = await api.get('/reservas');
        
        if (!isMounted) return;
        setReserves(reservesResponse.data);

        const totalReservesResponse = await api.get('/reservas/total');
        if (!isMounted) return;
        setTotalReserves(Number(totalReservesResponse.data?.total) || 0);

        // Carregar informações financeiras
        if (isMounted) setLoading(prev => ({ ...prev, financialInfo: true }));
        const financialResponse = await api.get('/financeiro');
        
        if (!isMounted) return;
        setFinancialInfo({
          monthlyIncome: Number(financialResponse.data?.monthlyIncome) || 0,
          monthlyExpenses: Number(financialResponse.data?.monthlyExpenses) || 0,
          savingsGoal: Number(financialResponse.data?.savingsGoal) || 300000
        });
        setMonthlyIncome(Number(financialResponse.data?.monthlyIncome) || 4600);

      } catch (error) {
        if (isMounted) {
          console.error("Erro ao carregar dados:", error);
          setError("Erro ao carregar dados. Tente recarregar a página.");
        }
      } finally {
        if (isMounted) {
          setLoading({
            debts: false,
            addDebt: false,
            reserves: false,
            addReserve: false,
            financialInfo: false
          });
        }
      }
    };

    loadInitialData();
    
    return () => {
      isMounted = false;
    };
  }, []);

  const normalizeDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Manipulação de dívidas
  const handleAddDebt = async () => {
    if (!newDebt.name.trim()) {
      setError("Informe o nome da dívida");
      return;
    }

    if (newDebt.value <= 0) {
      setError("O valor deve ser maior que zero");
      return;
    }

    // Validação específica para dívidas temporárias
    if (!newDebt.fixed && newDebt.startDate > newDebt.endDate) {
      setError("Data de início não pode ser maior que data de término");
      return;
    }

    // Validação para dívidas fixas (precisa ter data de início)
    if (newDebt.fixed && !newDebt.startDate) {
      setError("Dívidas fixas precisam ter uma data de início");
      return;
    }

    const debtToSend = {
      nome: newDebt.name.trim(),
      valor: Number(newDebt.value),
      data_inicio: newDebt.startDate.toISOString().split('T')[0],
      data_fim: newDebt.fixed ? null : newDebt.endDate.toISOString().split('T')[0], // Envia null para dívidas fixas
      fixa: newDebt.fixed,
    };

    setLoading(prev => ({ ...prev, addDebt: true }));
    setError(null);
    
    try {
      const response = await api.post("/dividas", debtToSend);
      const newItem = { 
        ...newDebt,
        value: Number(newDebt.value),
        id: response.data.id,
        // Garante que o endDate seja null para dívidas fixas no estado local
        endDate: newDebt.fixed ? null : newDebt.endDate
      };
      
      setDebts((prev) => [...prev, newItem]);
      setNewDebt({ 
        name: "", 
        value: 0, 
        startDate: new Date(),
        endDate: new Date(),
        fixed: false 
      });
    } catch (err) {
      console.error("Erro ao adicionar dívida:", err);
      setError(`Erro ao salvar: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, addDebt: false }));
    }
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta dívida?")) {
      try {
        await api.delete(`/dividas/${id}`);
        setDebts(prev => prev.filter(debt => debt.id !== id));
      } catch (err) {
        console.error("Erro ao excluir dívida:", err);
        setError(`Erro ao excluir: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Manipulação de reservas
  const handleAddReserve = async () => {
    if (!newReserve.name.trim()) {
      setError("Informe o nome da reserva");
      return;
    }

    if (newReserve.value <= 0) {
      setError("O valor deve ser maior que zero");
      return;
    }

    setLoading(prev => ({ ...prev, addReserve: true }));
    setError(null);
    
    try {
      const response = await api.post("/reservas", {
        nome: newReserve.name.trim(),
        valor: Number(newReserve.value),
        tipo: newReserve.tipo,
        descricao: newReserve.descricao || ""
      });

      setReserves(prev => [...prev, {
        id: response.data.id,
        nome: newReserve.name.trim(),
        valor: Number(newReserve.value),
        tipo: newReserve.tipo,
        descricao: newReserve.descricao || "",
        created_at: new Date().toISOString()
      }]);
      
      // Atualizar total de reservas
      const totalResponse = await api.get('/reservas/total');
      setTotalReserves(Number(totalResponse.data?.total) || 0);
      
      // Reset form
      setNewReserve({
        name: "",
        value: 0,
        tipo: "poupança",
        descricao: ""
      });
    } catch (err) {
      console.error("Erro ao adicionar reserva:", err);
      setError(`Erro ao adicionar reserva: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, addReserve: false }));
    }
  };

  const handleDeleteReserve = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta reserva?")) {
      try {
        await api.delete(`/reservas/${id}`);
        setReserves(prev => prev.filter(reserve => reserve.id !== id));
        
        // Atualizar total de reservas
        const totalResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalResponse.data?.total) || 0);
      } catch (err) {
        console.error("Erro ao excluir reserva:", err);
        setError(`Erro ao excluir: ${err.response?.data?.message || err.message}`);
      }
    }
  };

  // Atualizar informações financeiras
  const handleUpdateFinancialInfo = async () => {
    const infoToSend = {
      monthlyIncome: Number(financialInfo.monthlyIncome),
      monthlyExpenses: Number(financialInfo.monthlyExpenses),
      savingsGoal: Number(financialInfo.savingsGoal)
    };
    console.log("financialInfo", financialInfo);
    setLoading(prev => ({ ...prev, financialInfo: true }));
    setError(null);
    
    try {
      await api.post("/financeiro", infoToSend);
      setFinancialInfo(infoToSend);
    } catch (err) {
      console.error("Erro ao atualizar informações:", err);
      setError(`Erro ao atualizar: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, financialInfo: false }));
    }
  };

  // Gerar dados do gráfico
  const generateChartData = () => {
    const data = [];
    const currentDate = new Date();
    
    const normalizeDate = (date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    const normalizedCurrentDate = normalizeDate(currentDate);

    for (let month = 0; month < months; month++) {
      const monthDate = new Date(normalizedCurrentDate);
      monthDate.setMonth(normalizedCurrentDate.getMonth() + month);
      
      const monthDebts = debts.reduce((acc, debt) => {
        const debtValue = Number(debt.value);
        const debtStart = normalizeDate(new Date(debt.startDate));
        const normalizedMonthDate = normalizeDate(monthDate);
        
        // Para dívidas fixas: só considera se o mês atual for >= data de início
        if (debt.fixed) {
          // Compara ano e mês apenas (ignora o dia)
          const debtStartYear = debtStart.getFullYear();
          const debtStartMonth = debtStart.getMonth();
          const currentYear = normalizedMonthDate.getFullYear();
          const currentMonth = normalizedMonthDate.getMonth();
          
          if (currentYear > debtStartYear || 
              (currentYear === debtStartYear && currentMonth >= debtStartMonth)) {
            return acc + debtValue;
          }
          return acc;
        }
        // Para dívidas temporárias: verifica o intervalo normal
        else {
          const debtEnd = debt.endDate ? normalizeDate(new Date(debt.endDate)) : null;
          if (debtEnd && normalizedMonthDate >= debtStart && normalizedMonthDate <= debtEnd) {
            return acc + debtValue;
          }
          return acc;
        }
      }, 0);
      
      const surplus = Number(monthlyIncome) - Number(monthDebts);
      const totalSaved = month === 0 
        ? Number(surplus) + Number(totalReserves) 
        : Number(surplus) + Number(data[month - 1]?.totalSaved || 0);
      data.push({
        month: `M${month + 1}`,
        date: monthDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        income: Number(monthlyIncome),
        debts: Number(monthDebts),
        surplus: Number(surplus),
        totalSaved: Number(totalSaved),
        reserves: Number(totalReserves)
      });
    }
    return data;
  };

  const chartData = generateChartData();

  const handleLegendClick = (entry) => {
    const { dataKey } = entry;
    setHighlightedSeries(highlightedSeries === dataKey ? null : dataKey);
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      chartData.map(item => ({
        Mês: item.month,
        Período: item.date,
        Renda: item.income,
        Dívidas: item.debts,
        Sobra: item.surplus,
        'Total Acumulado': item.totalSaved
      }))
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Simulação");
    XLSX.writeFile(workbook, "simulacao_financeira.xlsx");
  };

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

  const filteredDebts = debts.filter(debt => {
    const debtStartDate = new Date(debt.startDate);
    const debtEndDate = debt.fixed ? null : new Date(debt.endDate);
    
    // Filtro por nome
    if (debtFilters.name && !debt.name.toLowerCase().includes(debtFilters.name.toLowerCase())) {
      return false;
    }
    
    // Filtro por tipo
    if (debtFilters.type !== 'all') {
      if (debtFilters.type === 'fixed' && !debt.fixed) return false;
      if (debtFilters.type === 'temporary' && debt.fixed) return false;
    }
    
    // Se não há filtros de data, retorna true
    if (!debtFilters.startDate && !debtFilters.endDate) {
      return true;
    }
    
    const filterStartDate = debtFilters.startDate ? new Date(debtFilters.startDate) : null;
    const filterEndDate = debtFilters.endDate ? new Date(debtFilters.endDate) : null;
    
    // Para dívidas fixas
    if (debt.fixed) {
      // Se há filtro de data início, verifica se a dívida já começou
      if (filterStartDate && debtStartDate > filterStartDate) {
        return false;
      }
      // Se há filtro de data fim, verifica se a dívida já estava ativa
      if (filterEndDate && debtStartDate > filterEndDate) {
        return false;
      }
      return true;
    }
    
    // Para dívidas temporárias
    // Se a dívida termina antes do filtro começar
    if (filterStartDate && debtEndDate < filterStartDate) {
      return false;
    }
    // Se a dívida começa depois do filtro terminar
    if (filterEndDate && debtStartDate > filterEndDate) {
      return false;
    }
    return true;
  });

  // Filtrar reservas
  const filteredReserves = reserves.filter(reserve => {
    // Filtro por nome
    if (reserveFilters.name && !reserve.nome.toLowerCase().includes(reserveFilters.name.toLowerCase())) {
      return false;
    }
    
    // Filtro por tipo
    if (reserveFilters.type !== 'all' && reserve.tipo !== reserveFilters.type) {
      return false;
    }
    
    // Filtro por valor mínimo
    if (reserveFilters.minValue && Number(reserve.valor) < Number(reserveFilters.minValue)) {
      return false;
    }
    
    // Filtro por valor máximo
    if (reserveFilters.maxValue && Number(reserve.valor) > Number(reserveFilters.maxValue)) {
      return false;
    }
    
    return true;
  });

  // Funções para limpar filtros
  const clearDebtFilters = () => {
    setDebtFilters({
      name: '',
      type: 'all',
      startDate: null,
      endDate: null
    });
  };

  const clearReserveFilters = () => {
    setReserveFilters({
      name: '',
      type: 'all',
      minValue: '',
      maxValue: ''
    });
  };
  return (
    <ErrorBoundary>
      <div className="finance-simulator-container">
        <div className="api-status">
          Status da API: 
          <span className={`status-${apiHealth}`}>
            {apiHealth === 'healthy' ? '✅ Saudável' : 
             apiHealth === 'unhealthy' ? '⚠️ Com problemas' : '❌ Indisponível'}
          </span>
        </div>

        <h1 className="simulator-title">
          📊 Simulador Financeiro para Comprar sua Casa
        </h1>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {(loading.debts || loading.addDebt || loading.reserves || loading.addReserve) && (
          <div className="loading-container">
            <div className="loading-spinner"></div>
          </div>
        )}

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
                value={financialInfo.simulationMonths}
                onChange={(e) => setFinancialInfo({
                  ...financialInfo,
                  simulationMonths: Math.max(1, Number(e.target.value))
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
                value={newDebt.value} 
                onChange={(e) => setNewDebt({ ...newDebt, value: Number(e.target.value) })}
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
            
            {/* Mostra campo de data término apenas para dívidas temporárias */}
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
                  // Limpa a data de término ao marcar como fixa
                  endDate: e.target.checked ? null : newDebt.endDate || new Date()
                });
              }}
            />
            <label htmlFor="fixed-debt" className="label">
              Despesa Fixa (recorrente)
            </label>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            onClick={handleAddDebt}
            disabled={loading.addDebt}
            className="button button-primary"
          >
            {loading.addDebt ? "Processando..." : "Adicionar Dívida"}
          </button>
        </div>

        {debts.length > 0 && (
          <div className="section">
            <h2 className="section-title">📋 Lista de Dívidas Cadastradas</h2>
            
            {/* Filtros para dívidas */}
            <div className="input-grid">
              <div className="input-group">
                <label>Nome:</label>
                <input
                  type="text"
                  className="input"
                  value={debtFilters.name}
                  onChange={(e) => setDebtFilters({...debtFilters, name: e.target.value})}
                  placeholder="Filtrar por nome"
                />
              </div>
              
              <div className="input-group">
                <label>Tipo:</label>
                <select
                  className="input"
                  value={debtFilters.type}
                  onChange={(e) => setDebtFilters({...debtFilters, type: e.target.value})}
                >
                  <option value="all">Todos</option>
                  <option value="fixed">Fixa</option>
                  <option value="temporary">Temporária</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>Data Início:</label>
                <DatePicker
                  selected={debtFilters.startDate}
                  onChange={(date) => setDebtFilters({...debtFilters, startDate: date})}
                  placeholderText="Selecione a data"
                  dateFormat="dd/MM/yyyy"
                  className="date-picker-input"
                  isClearable
                />
              </div>
              
              <div className="input-group">
                <label>Data Término:</label>
                <DatePicker
                  selected={debtFilters.endDate}
                  onChange={(date) => setDebtFilters({...debtFilters, endDate: date})}
                  placeholderText="Selecione a data"
                  dateFormat="dd/MM/yyyy"
                  className="date-picker-input"
                  isClearable
                />
              </div>
              
              <button 
                onClick={clearDebtFilters}
                className="button button-small button-info"
                style={{ alignSelf: 'flex-end' }}
              >
                Limpar Filtros
              </button>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Valor (R$)</th>
                    <th>Início</th>
                    <th>Término</th>
                    <th>Tipo</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts
                    .slice((page - 1) * itemsPerPage, page * itemsPerPage)
                    .map(debt => (
                      <tr key={debt.id}>
                        <td>{debt.name}</td>
                        <td>{Number(debt.value).toFixed(2)}</td>
                        <td>{new Date(debt.startDate).toLocaleDateString('pt-BR')}</td>
                        <td>
                          {debt.fixed ? "Indeterminado" : new Date(debt.endDate).toLocaleDateString('pt-BR')}
                        </td>
                        <td>{debt.fixed ? "Fixa" : "Temporária"}</td>
                        <td>
                          <button 
                            onClick={() => handleDeleteDebt(debt.id)}
                            className="button button-danger button-small"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              
              <div className="pagination">
                <button 
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="button button-small"
                >
                  Anterior
                </button>
                
                <span>Página {page} de {Math.ceil(filteredDebts.length / itemsPerPage)}</span>
                
                <button 
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= Math.ceil(filteredDebts.length / itemsPerPage)}
                  className="button button-small"
                >
                  Próxima
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="section">
          <h2 className="section-title">💰 Adicionar Reserva Financeira</h2>
          
          <div className="input-grid">
            <div className="input-group">
              <label className="label">Nome da Reserva</label>
              <input 
                className="input"
                placeholder="Ex: Reserva Emergencial" 
                value={newReserve.name} 
                onChange={(e) => setNewReserve({ ...newReserve, name: e.target.value })}
                maxLength="100"
              />
            </div>
            
            <div className="input-group">
              <label className="label">Valor (R$)</label>
              <input 
                type="number"
                className="input"
                placeholder="0,00" 
                value={newReserve.value} 
                onChange={(e) => setNewReserve({ ...newReserve, value: Number(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
          </div>
          
          <div className="input-grid">
            <div className="input-group">
              <label className="label">Tipo de Reserva</label>
              <select
                className="input"
                value={newReserve.tipo}
                onChange={(e) => setNewReserve({ ...newReserve, tipo: e.target.value })}
              >
                <option value="poupança">Poupança</option>
                <option value="investimento">Investimento</option>
                <option value="fundo_emergencia">Fundo de Emergência</option>
                <option value="outros">Outros</option>
              </select>
            </div>
            
            <div className="input-group">
              <label className="label">Descrição</label>
              <input 
                type="text"
                className="input"
                placeholder="Opcional"
                value={newReserve.descricao}
                onChange={(e) => setNewReserve({ ...newReserve, descricao: e.target.value })}
              />
            </div>
          </div>
          
          <button 
            onClick={handleAddReserve}
            disabled={loading.addReserve}
            className="button button-secondary"
          >
            {loading.addReserve ? "Processando..." : "Adicionar Reserva"}
          </button>
        </div>

        {reserves.length > 0 && (
          <div className="section">
            <h2 className="section-title">📋 Lista de Reservas Financeiras</h2>
            
            {/* Filtros para reservas */}
            <div className="input-grid">
              <div className="input-group">
                <label>Nome:</label>
                <input
                  type="text"
                  className="input"
                  value={reserveFilters.name}
                  onChange={(e) => setReserveFilters({...reserveFilters, name: e.target.value})}
                  placeholder="Filtrar por nome"
                />
              </div>
              
              <div className="input-group">
                <label>Tipo:</label>
                <select
                  className="input"
                  value={reserveFilters.type}
                  onChange={(e) => setReserveFilters({...reserveFilters, type: e.target.value})}
                >
                  <option value="all">Todos</option>
                  <option value="poupança">Poupança</option>
                  <option value="investimento">Investimento</option>
                  <option value="fundo_emergencia">Fundo de Emergência</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>Valor Minimo:</label>
                <input
                  className="input"
                  type="number"
                  value={reserveFilters.minValue}
                  onChange={(e) => setReserveFilters({...reserveFilters, minValue: e.target.value})}
                  placeholder="Mínimo"
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="input-group">
                <label>Valor Máximo:</label>
                <input
                  className="input"
                  type="number"
                  value={reserveFilters.maxValue}
                  onChange={(e) => setReserveFilters({...reserveFilters, maxValue: e.target.value})}
                  placeholder="Máximo"
                  min="0"
                  step="0.01"
                />
              </div>
              <button 
                onClick={clearReserveFilters}
                className="button button-small button-info"
                style={{ alignSelf: 'flex-end' }}
              >
                Limpar Filtros
              </button>
            </div>
            
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Valor (R$)</th>
                    <th>Tipo</th>
                    <th>Descrição</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReserves.map(reserve => (
                    <tr key={reserve.id}>
                      <td>{reserve.nome}</td>
                      <td>R$ {Number(reserve.valor).toFixed(2)}</td>
                      <td>
                        <span className={`reserve-type ${reserve.tipo}`}>
                          {reserve.tipo.replace('_', ' ')}
                        </span>
                      </td>
                      <td>{reserve.descricao || '-'}</td>
                      <td>{new Date(reserve.created_at).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <button 
                          onClick={() => handleDeleteReserve(reserve.id)}
                          className="button button-danger button-small"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="total-reserves-section">
          <h2>💰 Total em Reservas: R$ {typeof totalReserves === 'number' ? totalReserves.toFixed(2) : '0.00'}</h2>
        </div>

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

        <div className="section">
          <h2 className="section-title">📥 Exportar Simulação</h2>
          <button 
            onClick={exportToExcel}
            className="button button-success"
          >
            Exportar para Excel
          </button>
        </div>

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
      </div>
    </ErrorBoundary>
  );
}

export default FinanceSimulator;