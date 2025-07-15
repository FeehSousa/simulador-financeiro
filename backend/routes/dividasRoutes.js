const express = require('express');
const router = express.Router();
const dividasController = require('../controllers/dividasController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rotas para dívidas
router.get('/', dividasController.listDividas);
router.post('/', dividasController.createDivida);
router.get('/metodos-pagamento', dividasController.getPaymentMethods);
router.post('/:id/pagar', dividasController.payDebt);
router.delete('/:id', dividasController.deleteDivida);

module.exports = router;