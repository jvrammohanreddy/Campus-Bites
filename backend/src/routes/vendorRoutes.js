const express = require('express');
const router = express.Router();
const {
    createRestaurant,
    toggleStatus,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    getVendorOrders,  
    updateOrderStatus
} = require('../controllers/vendorController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Require authentication and VENDOR role for all routes in this file
router.use(protect, authorize('VENDOR'));

// --- Existing Restaurant & Menu Routes ---
router.post('/restaurants', createRestaurant);
router.put('/restaurants/status', toggleStatus);
router.post('/restaurants/menu', addMenuItem);
router.put('/restaurants/menu/:menuItemId', updateMenuItem);
router.delete('/restaurants/menu/:menuItemId', deleteMenuItem);

// --- New Order Management Routes ---
router.get('/orders', getVendorOrders);
router.put('/orders/:orderId/status', updateOrderStatus);

module.exports = router;