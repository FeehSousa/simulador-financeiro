import React, { useState, useEffect } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import ApiStatusIndicator from "../components/ApiStatusIndicator";
import FinancialSettingsForm from "../components/FinancialSettingsForm";
import DebtForm from "../components/DebtForm";
import DebtList from "../components/DebtList";
import ReserveForm from "../components/ReserveForm";
import ReserveList from "../components/ReserveList";
import FinanceChart from "../components/FinanceChart";
import ExportButton from "../components/ExportButton";
import GoalProgress from "../components/GoalProgress";
import LoadingSpinner from "../components/LoadingSpinner";
import ToastNotification from "../components/ToastNotification";
import useInactivityTimer from '../hooks/useInactivityTimer';
import InactivityWarningModal from '../components/InactivityWarningModal';
import { 
  generateChartData, 
  normalizeDate,
  filterDebts,
  filterReserves 
} from "../services/financeUtils";
import * as XLSX from "xlsx";
import api from "../services/api";
import 'react-datepicker/dist/react-datepicker.css';
import '../css/FinanceSimulator.css';

function FinanceSimulatorTeste() {
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

  const handleLogout = () => {
    api.logout();
    window.location.href = '/login';
  };

  // Ativa o timer de inatividade
  const { showWarning, countdown } = useInactivityTimer();

  // Adicione a função para continuar a sessão
  const handleContinueSession = () => {
    // Apenas dispara um evento que será capturado pelo hook
    window.dispatchEvent(new Event('mousedown'));
  };

  // Estados para informações financeiras
  const [financialInfo, setFinancialInfo] = useState({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsGoal: 300000
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Adicionar no início dos estados
  const [notifications, setNotifications] = useState([]);

  // Função para adicionar notificação
  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
    // Remove automaticamente após 3 segundos
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 3000);
  };

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
        
        if (error.name !== 'CanceledError') {
          console.error("Erro ao verificar saúde da API:", error);
          setApiHealth('unreachable');
        }
      }
    };
    
    checkApiHealth();
    
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);


  useEffect(() => {
    const verifyAuth = async () => {
      const isAuthenticated = await api.checkSession();
      if (!isAuthenticated) {
        handleLogout();
      }
    };

    verifyAuth();
  }, []);

  // Carregar dados iniciais
  useEffect(() => {
    let isMounted = true;
    
    const loadInitialData = async () => {
      try {
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

        if (isMounted) setLoading(prev => ({ ...prev, reserves: true }));
        const reservesResponse = await api.get('/reservas');
        
        if (!isMounted) return;
        setReserves(reservesResponse.data);

        const totalReservesResponse = await api.get('/reservas/total');
        if (!isMounted) return;
        setTotalReserves(Number(totalReservesResponse.data?.total) || 0);

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

    if (!newDebt.fixed && newDebt.startDate > newDebt.endDate) {
      setError("Data de início não pode ser maior que data de término");
      return;
    }

    if (newDebt.fixed && !newDebt.startDate) {
      setError("Dívidas fixas precisam ter uma data de início");
      return;
    }

    const debtToSend = {
      nome: newDebt.name.trim(),
      valor: Number(newDebt.value),
      data_inicio: newDebt.startDate.toISOString().split('T')[0],
      data_fim: newDebt.fixed ? null : newDebt.endDate.toISOString().split('T')[0],
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
      addNotification("Dívida adicionada com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar dívida:", err);
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Erro ao adicionar dívida: ${errorMsg}`);
      addNotification(`Erro ao adicionar dívida: ${errorMsg}`);
    } finally {
      setLoading(prev => ({ ...prev, addDebt: false }));
    }
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta dívida?")) {
      try {
        await api.delete(`/dividas/${id}`);
        setDebts(prev => prev.filter(debt => debt.id !== id));
        addNotification("Dívida excluida com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir dívida:", err);
        const errorMsg = err.response?.data?.message || err.message;
        setError(`Erro ao excluir dívida: ${errorMsg}`);
        addNotification(`Erro ao excluir dívida: ${errorMsg}`);
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
      
      const totalResponse = await api.get('/reservas/total');
      setTotalReserves(Number(totalResponse.data?.total) || 0);
      addNotification("Reserva adicionada com sucesso!");
      setNewReserve({
        name: "",
        value: 0,
        tipo: "poupança",
        descricao: ""
      });
    } catch (err) {
      console.error("Erro ao adicionar reserva:", err);
      const errorMsg = err.response?.data?.message || err.message;
      setError(`Erro ao adicionar reserva: ${errorMsg}`);
      addNotification(`Erro ao adicionar reserva: ${errorMsg}`);
    } finally {
      setLoading(prev => ({ ...prev, addReserve: false }));
    }
  };

  const handleDeleteReserve = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta reserva?")) {
      try {
        await api.delete(`/reservas/${id}`);
        setReserves(prev => prev.filter(reserve => reserve.id !== id));
        
        const totalResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalResponse.data?.total) || 0);
        addNotification("Reserva excluida com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir reserva:", err);
        const errorMsg = err.response?.data?.message || err.message;
        setError(`Erro ao excluir reserva: ${errorMsg}`);
        addNotification(`Erro ao excluir reserva: ${errorMsg}`);
      }
    }
  };

  // Atualizar informações financeiras
  const handleUpdateFinancialInfo = async () => {
    const infoToSend = {
      monthlyIncome: Number(monthlyIncome),
      monthlyExpenses: Number(financialInfo.monthlyExpenses),
      savingsGoal: Number(financialInfo.savingsGoal)
    };

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
  const chartData = generateChartData(monthlyIncome, months, debts, totalReserves);

  const filteredDebts = filterDebts(debts, debtFilters);
  const filteredReserves = filterReserves(reserves, reserveFilters);

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

  return (
    <ErrorBoundary>
      <div className="finance-simulator-container">
        {/* <ApiStatusIndicator status={apiHealth} /> */}
       <div>
          <h1 className="simulator-title">
            📊 Simulador Financeiro para Comprar sua Casa
          </h1>
          <button 
            onClick={handleLogout} 
            className="logout-button"
            title="Sair do sistema"
          >
            Sair
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {(loading.debts || loading.addDebt || loading.reserves || loading.addReserve) && (
          <LoadingSpinner />
        )}

        <FinancialSettingsForm 
          monthlyIncome={monthlyIncome}
          setMonthlyIncome={setMonthlyIncome}
          months={months}
          setMonths={setMonths}
          financialInfo={financialInfo}
          setFinancialInfo={setFinancialInfo}
          loading={loading}
          handleUpdateFinancialInfo={handleUpdateFinancialInfo}
        />

        <DebtForm 
          newDebt={newDebt}
          setNewDebt={setNewDebt}
          error={error}
          loading={loading}
          handleAddDebt={handleAddDebt}
        />

        {debts.length > 0 && (
          <DebtList 
            debts={debts}
            filteredDebts={filteredDebts}
            debtFilters={debtFilters}
            setDebtFilters={setDebtFilters}
            clearDebtFilters={clearDebtFilters}
            page={page}
            setPage={setPage}
            itemsPerPage={itemsPerPage}
            handleDeleteDebt={handleDeleteDebt}
          />
        )}

        <ReserveForm 
          newReserve={newReserve}
          setNewReserve={setNewReserve}
          loading={loading}
          handleAddReserve={handleAddReserve}
        />

        {reserves.length > 0 && (
          <ReserveList 
            reserves={reserves}
            filteredReserves={filteredReserves}
            reserveFilters={reserveFilters}
            setReserveFilters={setReserveFilters}
            clearReserveFilters={clearReserveFilters}
            handleDeleteReserve={handleDeleteReserve}
          />
        )}

        <div className="total-reserves-section">
          <h2>💰 Total em Reservas: R$ {typeof totalReserves === 'number' ? totalReserves.toFixed(2) : '0.00'}</h2>
        </div>

        <FinanceChart 
          chartData={chartData}
          highlightedSeries={highlightedSeries}
          setHighlightedSeries={setHighlightedSeries}
        />

        <ExportButton exportToExcel={exportToExcel} />

        <GoalProgress 
          financialInfo={financialInfo}
          chartData={chartData}
        />
        <div>
          {notifications.map(notification => (
            <ToastNotification
              key={notification.id}
              message={notification.message}
              type={notification.type}
            />
          ))}
        </div>
        <InactivityWarningModal 
          show={showWarning}
          countdown={countdown}
          onContinue={handleContinueSession}
          onLogout={handleLogout}
        />
      </div>
    </ErrorBoundary>
  );
}

export default FinanceSimulatorTeste;