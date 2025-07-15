module.exports = (error, req, res, next) => {
  console.error('Erro não tratado:', error);
  res.status(500).json({
    error: true,
    message: 'Erro interno no servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      details: error.message,
      stack: error.stack 
    })
  });
};