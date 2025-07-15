const express = require('express');
const router = express.Router();
const reservasController = require('../controllers/reservasController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router
  .route('/')
  .get(reservasController.listReservas)
  .post(reservasController.createReserva);

router
  .route('/:id')
  .put(reservasController.updateReserva)
  .delete(reservasController.deleteReserva);

router.get('/total', reservasController.getTotalReservas);

module.exports = router;