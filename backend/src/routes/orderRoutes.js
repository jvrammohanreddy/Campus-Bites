const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getOrderById } = require('../controllers/orderController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication
router.use(protect);

// Restrict order creation and fetching order history to students
router.post('/', authorize('STUDENT'), createOrder);
router.get('/my-orders', authorize('STUDENT'), getMyOrders);

// Fetching a specific order by ID
router.get('/:id', authorize('STUDENT'), getOrderById);

module.exports = router;