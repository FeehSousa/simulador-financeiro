const express = require('express');
const router = express.Router();
const financeiroController = require('../controllers/financeiroController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router
  .route('/')
  .get(financeiroController.getFinanceiro)
  .post(financeiroController.updateFinanceiro);

module.exports = router;