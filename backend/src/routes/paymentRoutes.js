const express = require('express');
const { createPaymentOrder, verifyPayment } = require('../controllers/paymentController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.use(protect, authorize('STUDENT'));
router.post('/order', createPaymentOrder);
router.post('/verify', verifyPayment);

module.exports = router;
