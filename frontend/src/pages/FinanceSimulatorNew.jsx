import React, { useState, useEffect } from "react";
import ErrorBoundary from "../components/ErrorBoundary";
import ApiStatusIndicator from "../components/ApiStatusIndicator";
import FinancialSettingsForm from "../components/FinancialSettingsForm";
import DebtForm from "../components/DebtForm";
import DebtList from "../components/DebtList";
import ReserveForm from "../components/ReserveForm";
import ReserveList from "../components/ReserveList";
import CardsForm from "../components/CardsForm";
import CardsList from "../components/CardsList";
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
  filterReserves,
  filterCards 
} from "../services/financeUtils";
import * as XLSX from "xlsx";
import api from "../services/api";
import 'react-datepicker/dist/react-datepicker.css';
import '../css/FinanceSimulator.css';

function FinanceSimulatorNew() {
  const [highlightedSeries, setHighlightedSeries] = useState(null);
  const [loading, setLoading] = useState({
    debts: false,
    addDebt: false,
    reserves: false,
    addReserve: false,
    cards: false,
    addCard: false,
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
    paymentMethod: 'debito',
    cardId: null,
    reserveId: null
  });
  const [debtFilters, setDebtFilters] = useState({
    name: '',
    type: 'all',
    startDate: null,
    endDate: null,
  });

  // Estados para cartões
  const [cards, setCards] = useState([]);
  const [newCard, setNewCard] = useState({
    name: "",
    type: "credito",
    bank: "Nubank",
    limit: 0,
    closingDay: 1,
    dueDay: 10
  });
  const [cardFilters, setCardFilters] = useState({
    name: '',
    type: 'all',
    bank: 'all'
  });

  // Estados para reservas
  const [reserves, setReserves] = useState([]);
  const [newReserve, setNewReserve] = useState({
    name: "",
    value: 0,
    tipo: "poupança",
    descricao: ""
  });
  const [totalReserves, setTotalReserves] = useState(0);
  const [reserveFilters, setReserveFilters] = useState({
    name: '',
    type: 'all',
    minValue: '',
    maxValue: ''
  });

  const [paymentMethods, setPaymentMethods] = useState({
    methods: [],
    cards: []
  });

  const handleLogout = () => {
    api.logout();
    window.location.href = '/login';
  };

  // Ativa o timer de inatividade
  const { showWarning, countdown } = useInactivityTimer();

  const handleContinueSession = () => {
    window.dispatchEvent(new Event('mousedown'));
  };

  // Estados para informações financeiras
  const [financialInfo, setFinancialInfo] = useState({
    monthlyIncome: 0,
    monthlyExpenses: 0,
    savingsGoal: 300000
  });
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(2);

  // Notificações
  const [notifications, setNotifications] = useState([]);

  const addNotification = (message, type = 'success') => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);
    
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
        setLoading(prev => ({ ...prev, 
          debts: true, 
          reserves: true, 
          cards: true,
          financialInfo: true 
        }));

        // Carregar dívidas
        const debtsResponse = await api.get('/dividas');
        const parsedDebts = debtsResponse.data.map(d => ({
          ...d,
          name: d.nome,
          value: Number(d.valor),
          startDate: new Date(d.mes_inicio),
          endDate: d.mes_fim ? new Date(d.mes_fim) : null,
          fixed: Boolean(d.fixa),
          paid: Boolean(d.pago),
          paymentMethod: d.metodo_pagamento,
          card: d.cartao_id ? {
            id: d.cartao_id,
            name: d.cartao_nome,
            bank: d.cartao_banco
          } : null
        }));
        setDebts(parsedDebts);

        // Carregar reservas
        const reservesResponse = await api.get('/reservas');
        setReserves(reservesResponse.data);

        const totalReservesResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalReservesResponse.data?.total) || 0);

        // Carregar cartões
        const cardsResponse = await api.get('/cartoes');
        setCards(cardsResponse.data);

        // Carregar métodos de pagamento
        const paymentMethodsResponse = await api.get('/dividas/metodos-pagamento');
        setPaymentMethods(paymentMethodsResponse.data);

        // Carregar informações financeiras
        const financialResponse = await api.get('/financeiro');
        setFinancialInfo({
          monthlyIncome: Number(financialResponse.data?.salario_mensal) || 0,
          monthlyExpenses: Number(financialResponse.data?.meses_simulacao) || 0,
          savingsGoal: Number(financialResponse.data?.meta_economias) || 300000
        });

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
            cards: false,
            addCard: false,
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
      metodo_pagamento: newDebt.paymentMethod,
      cartao_id: newDebt.cardId,
      reserva_id: newDebt.reserveId
    };

    setLoading(prev => ({ ...prev, addDebt: true }));
    setError(null);
    
    try {
      const response = await api.post("/dividas", debtToSend);
      
      // ✅ CORREÇÃO: Usar os dados reais do backend em vez de calcular no frontend
      const debtData = response.data.debt || {};
      
      const newItem = { 
        ...newDebt,
        value: Number(newDebt.value),
        id: response.data.id,
        endDate: newDebt.fixed ? null : newDebt.endDate,
        paymentMethod: newDebt.paymentMethod,
        card: newDebt.cardId ? cards.find(c => c.id === newDebt.cardId) : null,
        // ✅ Usar dados reais do backend
        pago: Boolean(debtData.pago),
        valor_pago: Number(debtData.valor_pago) || 0,
        // ✅ Manter compatibilidade com outros campos que podem vir do backend
        nome: debtData.nome || newDebt.name,
        mes_inicio: debtData.mes_inicio || newDebt.startDate,
        mes_fim: debtData.mes_fim || newDebt.endDate
      };
      
      setDebts((prev) => [...prev, newItem]);
      setNewDebt({ 
        name: "", 
        value: 0, 
        startDate: new Date(),
        endDate: new Date(),
        fixed: false,
        paymentMethod: 'debito',
        cardId: null,
        reserveId: null
      });
      
      // ✅ Recarregar reservas se foi usada uma
      if (newDebt.reserveId) {
        const reservesResponse = await api.get('/reservas');
        setReserves(reservesResponse.data);
        
        const totalResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalResponse.data?.total) || 0);
      }
      
      // ✅ Usar a mensagem do backend
      addNotification(response.data.message || "Dívida adicionada com sucesso!");
      
    } catch (err) {
      console.error("Erro ao adicionar dívida:", err);
      const errorMsg = err.response?.data?.error || err.message;
      
      // ✅ CORREÇÃO: Tratar erro de saldo insuficiente de forma específica
      if (err.response?.data?.error?.includes('Saldo insuficiente')) {
        setError(`Saldo insuficiente na reserva: ${err.response.data.details}`);
        addNotification(`❌ ${err.response.data.details}`, 'error');
      } else {
        setError(`Erro ao adicionar dívida: ${errorMsg}`);
        addNotification(`Erro ao adicionar dívida: ${errorMsg}`, 'error');
      }
    } finally {
      setLoading(prev => ({ ...prev, addDebt: false }));
    }
  };

  const handlePayDebt = async (id, amount, reserveId = null) => {
    // CORREÇÃO: Garantir precisão decimal
    const numericAmount = Number(parseFloat(amount).toFixed(2));
    
    if (numericAmount <= 0) {
      setError("O valor do pagamento deve ser maior que zero");
      return;
    }

    try {
      const response = await api.post(`/dividas/${id}/pagar`, {
        valor_pago: numericAmount,
        metodo_pagamento: 'debito',
        reserva_id: reserveId
      });

      // CORREÇÃO: Usar os dados retornados do backend em vez de calcular no frontend
      const updatedDebt = response.data.debt;
      
      // Atualizar a lista de dívidas com os dados do backend
      const updatedDebts = debts.map(debt => 
        debt.id === id ? {
          ...debt,
          valor_pago: Number(updatedDebt.valor_pago) || 0,
          pago: Boolean(updatedDebt.pago),
          metodo_pagamento: updatedDebt.metodo_pagamento
        } : debt
      );

      setDebts(updatedDebts);
      
      // CORREÇÃO: Recarregar reservas se foi usado uma reserva
      if (reserveId) {
        const reservesResponse = await api.get('/reservas');
        setReserves(reservesResponse.data);
        
        const totalResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalResponse.data?.total) || 0);
      }
      
      addNotification(`Pagamento de R$ ${numericAmount.toFixed(2)} registrado com sucesso!`);
    } catch (err) {
      console.error("Erro ao registrar pagamento:", err);
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Erro ao registrar pagamento: ${errorMsg}`);
      addNotification(`Erro ao registrar pagamento: ${errorMsg}`, 'error');
    }
  };

  const handleDeleteDebt = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta dívida?")) {
      try {
        await api.delete(`/dividas/${id}`);
        setDebts(prev => prev.filter(debt => debt.id !== id));
        addNotification("Dívida excluída com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir dívida:", err);
        const errorMsg = err.response?.data?.error || err.message;
        setError(`Erro ao excluir dívida: ${errorMsg}`);
        addNotification(`Erro ao excluir dívida: ${errorMsg}`, 'error');
      }
    }
  };

  // Manipulação de cartões
  const handleAddCard = async () => {
    if (!newCard.name.trim()) {
      setError("Informe o nome do cartão");
      return;
    }

    if (!newCard.bank) {
      setError("Selecione o banco do cartão");
      return;
    }

    if ((newCard.type === 'credito' || newCard.type === 'credito_debito') && newCard.limit <= 0) {
      setError("O limite do cartão deve ser maior que zero");
      return;
    }

    setLoading(prev => ({ ...prev, addCard: true }));
    setError(null);
    
    try {
      const response = await api.post("/cartoes", newCard);
      
      setCards(prev => [...prev, {
        ...newCard,
        id: response.data.id,
        created_at: new Date().toISOString()
      }]);
      
      setNewCard({
        name: "",
        type: "credito",
        bank: "Nubank",
        limit: 0,
        closingDay: 1,
        dueDay: 10
      });
      
      // Atualizar métodos de pagamento
      const paymentMethodsResponse = await api.get('/dividas/metodos-pagamento');
      setPaymentMethods(paymentMethodsResponse.data);
      
      addNotification("Cartão adicionado com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar cartão:", err);
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Erro ao adicionar cartão: ${errorMsg}`);
      addNotification(`Erro ao adicionar cartão: ${errorMsg}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, addCard: false }));
    }
  };

  const handleDeleteCard = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este cartão?")) {
      try {
        await api.delete(`/cartoes/${id}`);
        setCards(prev => prev.filter(card => card.id !== id));
        
        // Atualizar métodos de pagamento
        const paymentMethodsResponse = await api.get('/dividas/metodos-pagamento');
        setPaymentMethods(paymentMethodsResponse.data);
        
        addNotification("Cartão excluído com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir cartão:", err);
        const errorMsg = err.response?.data?.error || err.message;
        setError(`Erro ao excluir cartão: ${errorMsg}`);
        addNotification(`Erro ao excluir cartão: ${errorMsg}`, 'error');
      }
    }
  };

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
      addNotification(`Erro ao adicionar reserva: ${errorMsg}`, 'error');
    } finally {
      setLoading(prev => ({ ...prev, addReserve: false }));
    }
  };

  const handleAddToReserve = async (reserveId, amount) => {
    if (amount <= 0) {
      setError("O valor deve ser maior que zero");
      return;
    }

    try {
      await api.post(`/reservas/${reserveId}/adicionar`, {
        valor: amount,
        descricao: "Depósito manual"
      });

      // Atualizar a lista de reservas
      const updatedReserves = reserves.map(reserve => {
        if (reserve.id === reserveId) {
          return {
            ...reserve,
            saldo_atual: (reserve.saldo_atual || 0) + amount
          };
        }
        return reserve;
      });

      setReserves(updatedReserves);
      
      const totalResponse = await api.get('/reservas/total');
      setTotalReserves(Number(totalResponse.data?.total) || 0);
      
      addNotification("Valor adicionado à reserva com sucesso!");
    } catch (err) {
      console.error("Erro ao adicionar valor à reserva:", err);
      const errorMsg = err.response?.data?.error || err.message;
      setError(`Erro ao adicionar valor: ${errorMsg}`);
      addNotification(`Erro ao adicionar valor: ${errorMsg}`, 'error');
    }
  };

  const handleDeleteReserve = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta reserva?")) {
      try {
        await api.delete(`/reservas/${id}`);
        setReserves(prev => prev.filter(reserve => reserve.id !== id));
        
        const totalResponse = await api.get('/reservas/total');
        setTotalReserves(Number(totalResponse.data?.total) || 0);
        addNotification("Reserva excluída com sucesso!");
      } catch (err) {
        console.error("Erro ao excluir reserva:", err);
        const errorMsg = err.response?.data?.message || err.message;
        setError(`Erro ao excluir reserva: ${errorMsg}`);
        addNotification(`Erro ao excluir reserva: ${errorMsg}`, 'error');
      }
    }
  };

  const handleUpdateFinancialInfo = async () => {
    const userData = localStorage.getItem('user');
    let userId = null;
    
    try {
      if (userData) {
        const user = JSON.parse(userData);
        userId = user.id;
      }
    } catch (error) {
      console.error('Erro ao parsear user data:', error);
    }

    const infoToSend = {
      monthlyIncome: Number(financialInfo.monthlyIncome),
      savingsGoal: Number(financialInfo.savingsGoal),
      simulationMonths: Number(financialInfo.monthlyExpenses),
      userId: userId
    };

    console.log("Enviando para backend:", infoToSend);
    setLoading(prev => ({ ...prev, financialInfo: true }));
    setError(null);
    
    try {
      await api.post("/financeiro", infoToSend);
      addNotification("Informações financeiras atualizadas com sucesso!");
    } catch (err) {
      console.error("Erro ao atualizar informações:", err);
      setError(`Erro ao atualizar: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(prev => ({ ...prev, financialInfo: false }));
    }
  };

  // Gerar dados do gráfico
  const chartData = generateChartData(financialInfo.monthlyIncome, financialInfo.monthlyExpenses, debts, totalReserves);

  const filteredDebts = filterDebts(debts, debtFilters);
  const filteredReserves = filterReserves(reserves, reserveFilters);
  const filteredCards = filterCards(cards, cardFilters);

  const clearDebtFilters = () => {
    setDebtFilters({
      name: '',
      type: 'all',
      startDate: null,
      endDate: null
    });
  };
  console.log("reserves", reserves)
  const clearReserveFilters = () => {
    setReserveFilters({
      name: '',
      type: 'all',
      minValue: '',
      maxValue: ''
    });
  };

  const clearCardFilters = () => {
    setCardFilters({
      name: '',
      type: 'all',
      bank: 'all'
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

        {(loading.debts || loading.addDebt || loading.reserves || loading.addReserve || loading.cards) && (
          <LoadingSpinner />
        )}

        <FinancialSettingsForm 
          financialInfo={financialInfo}
          setFinancialInfo={setFinancialInfo}
          loading={loading}
          handleUpdateFinancialInfo={handleUpdateFinancialInfo}
        />

        <CardsForm 
          newCard={newCard}
          setNewCard={setNewCard}
          loading={loading}
          handleAddCard={handleAddCard}
        />

        {cards.length > 0 && (
          <CardsList 
            cards={cards}
            filteredCards={filteredCards}
            cardFilters={cardFilters}
            setCardFilters={setCardFilters}
            clearCardFilters={clearCardFilters}
            handleDeleteCard={handleDeleteCard}
          />
        )}

        <DebtForm 
          newDebt={newDebt}
          setNewDebt={setNewDebt}
          error={error}
          loading={loading}
          paymentMethods={{
            ...paymentMethods,
            cards: cards
          }}
          reserves={reserves}
          handleAddDebt={handleAddDebt}
        />

        {debts.length > 0 && (
          // No seu FinanceSimulatorNew, passe a prop reserves:
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
            handlePayDebt={handlePayDebt}
            reserves={reserves} // ← Esta linha é essencial
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
            handleAddToReserve={handleAddToReserve}
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

export default FinanceSimulatorNew;