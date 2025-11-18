export function generateChartData(monthlyIncome, months, debts, totalReserves) {
  const today = new Date();
  const result = [];
  let accumulatedSavings = totalReserves || 0;

  // CORREÇÃO: Filtrar apenas dívidas não pagas OU parcialmente pagas
  const relevantDebts = debts.filter(debt => {
    // Se a dívida está totalmente paga, não considerar
    if (debt.pago) return false;
    
    // Se a dívida tem valor pago, considerar apenas o valor restante
    const valorPago = debt.valor_pago || 0;
    const valorRestante = debt.value - valorPago;
    
    // Se já foi paga totalmente, não considerar
    return valorRestante > 0;
  });

  const earliestDebtDate = relevantDebts.length > 0 
    ? new Date(Math.min(...relevantDebts.map(d => d.startDate))) 
    : today;
  
  let startDate = new Date(earliestDebtDate);
  startDate.setDate(1);

  for (let i = 0; i < months; i++) {
    const currentMonth = new Date(startDate);
    currentMonth.setMonth(startDate.getMonth() + i);
    
    const monthName = currentMonth.toLocaleString('default', { month: 'long' });
    const year = currentMonth.getFullYear();
    
    // Filtrar dívidas ativas para este mês
    const monthlyActiveDebts = relevantDebts.filter(debt => {
      const debtStart = new Date(debt.startDate);
      debtStart.setDate(1);
      
      if (debt.fixed) {
        return debtStart <= currentMonth;
      }
      
      const debtEnd = debt.endDate ? new Date(debt.endDate) : null;
      if (debtEnd) {
        debtEnd.setDate(1);
        return currentMonth >= debtStart && currentMonth <= debtEnd;
      }
      
      return currentMonth >= debtStart;
    });
    
    // CORREÇÃO: Considerar apenas o valor restante das dívidas
    const totalDebts = monthlyActiveDebts.reduce((sum, debt) => {
      const valorPago = debt.valor_pago || 0;
      const valorRestante = Math.max(0, debt.value - valorPago);
      return sum + valorRestante;
    }, 0);
    
    const surplus = monthlyIncome - totalDebts;
    accumulatedSavings += surplus;
    
    result.push({
      month: `${monthName} ${year}`,
      date: currentMonth.toISOString().split('T')[0],
      income: monthlyIncome,
      debts: totalDebts,
      surplus: surplus,
      totalSaved: accumulatedSavings
    });
  }

  return result;
}

export const normalizeDate = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

export const filterDebts = (debts, filters) => {
  return debts.filter(debt => {
    const debtStartDate = new Date(debt.startDate);
    const debtEndDate = debt.fixed ? null : new Date(debt.endDate);
    
    if (filters.name && !debt.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.type !== 'all') {
      if (filters.type === 'fixed' && !debt.fixed) return false;
      if (filters.type === 'temporary' && debt.fixed) return false;
    }
    
    if (!filters.startDate && !filters.endDate) {
      return true;
    }
    
    const filterStartDate = filters.startDate ? new Date(filters.startDate) : null;
    const filterEndDate = filters.endDate ? new Date(filters.endDate) : null;
    
    if (debt.fixed) {
      if (filterStartDate && debtStartDate > filterStartDate) {
        return false;
      }
      if (filterEndDate && debtStartDate > filterEndDate) {
        return false;
      }
      return true;
    }
    
    if (filterStartDate && debtEndDate < filterStartDate) {
      return false;
    }
    if (filterEndDate && debtStartDate > filterEndDate) {
      return false;
    }
    return true;
  });
};

export const filterReserves = (reserves, filters) => {
  return reserves.filter(reserve => {
    if (filters.name && !reserve.nome.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    if (filters.type !== 'all' && reserve.tipo !== filters.type) {
      return false;
    }
    
    if (filters.minValue && Number(reserve.valor) < Number(filters.minValue)) {
      return false;
    }
    
    if (filters.maxValue && Number(reserve.valor) > Number(filters.maxValue)) {
      return false;
    }
    
    return true;
  });
};

export const filterCards = (cards, filters) => {
  return cards.filter(card => {
    // Filtro por nome
    if (filters.name && !card.name.toLowerCase().includes(filters.name.toLowerCase())) {
      return false;
    }
    
    // Filtro por tipo
    if (filters.type !== 'all' && card.type !== filters.type) {
      return false;
    }
    
    // Filtro por banco
    if (filters.bank !== 'all' && card.bank !== filters.bank) {
      return false;
    }
    
    return true;
  });
};