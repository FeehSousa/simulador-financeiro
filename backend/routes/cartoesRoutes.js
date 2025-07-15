const express = require('express');
const router = express.Router();
const cartoesController = require('../controllers/cartoesController');
const authMiddleware = require('../middlewares/authMiddleware');

// Aplicar middleware de autenticação a todas as rotas
router.use(authMiddleware);

// Rotas para cartões
router.get('/', cartoesController.listCards);
router.post('/', cartoesController.createCard);
router.get('/tipos', cartoesController.getCardTypes);
router.put('/:id', cartoesController.updateCard);
router.delete('/:id', cartoesController.deleteCard);

module.exports = router;