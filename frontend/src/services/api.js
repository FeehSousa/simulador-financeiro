import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

api.checkSession = async () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const response = await api.get('/auth/me');
    return response.data?.user || false;
  } catch (error) {
    return false;
  }
};

// Adiciona o token JWT automaticamente nas requisições
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // console.log('Enviando requisição para:', config.url);
  config.metadata = { startTime: new Date() };
  return config;
}, error => {
  console.error('Erro na requisição:', error);
  return Promise.reject(error);
});

api.interceptors.response.use(response => {
  const endTime = new Date();
  const duration = endTime - response.config.metadata.startTime;
  return response;
}, error => {
  if (error.response) {
    if (error.response.status === 401) {
      console.warn('Sessão expirada ou inválida - redirecionando para login');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Use navigate em vez de window.location.href
      if (typeof window !== 'undefined') {
        // Vamos usar um evento customizado para notificar o componente
        window.dispatchEvent(new CustomEvent('auth:logout'));
      }
    }

    console.error('Erro na resposta:', {
      url: error.config.url,
      status: error.response.status,
      data: error.response.data,
      message: error.message,
      duration: new Date() - error.config.metadata.startTime
    });
  } else if (error.request) {
    console.error('Sem resposta do servidor:', {
      url: error.config.url,
      message: error.message
    });
  } else {
    console.error('Erro na configuração:', error.message);
  }
  
  return Promise.reject(error);
});

// Função wrapper melhorada com tratamento de token
api.safeRequest = async (method, url, data = null) => {
  try {
    const token = localStorage.getItem('token');
    if (!token && !['/auth/login', '/auth/register'].includes(url)) {
      throw new Error('Token de autenticação não encontrado');
    }

    const response = await api({
      method,
      url,
      data
    });
    
    return response.data;
  } catch (error) {
    console.error(`Erro na requisição ${method} ${url}:`, error);
    
    // Adiciona informações adicionais para o chamador
    const enhancedError = {
      ...error,
      isAuthError: error.response?.status === 401,
      userMessage: error.response?.data?.error || 'Erro na requisição'
    };
    
    throw enhancedError;
  }
};

// Métodos auxiliares para autenticação
api.login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    localStorage.setItem('token', response.data.token);
    localStorage.setItem('user', JSON.stringify(response.data.user));
    return response.data;
  } catch (error) {
    throw error;
  }
};

api.logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

api.getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export default api;