const express = require('express');
const router = express.Router();
const {
    getAvailableOrders,
    getMyOrders,
    acceptOrder,
    updateDeliveryStatus
} = require('../controllers/deliveryController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// All routes require authentication and DELIVERY role
router.use(protect, authorize('DELIVERY'));

router.get('/available-orders', getAvailableOrders);
router.get('/my-orders', getMyOrders);
router.put('/orders/:orderId/accept', acceptOrder);
router.put('/orders/:orderId/status', updateDeliveryStatus);

module.exports = router;