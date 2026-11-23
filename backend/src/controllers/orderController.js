const mongoose = require('mongoose');
const Order = require('../models/Order');
const Restaurant = require('../models/Restaurant');
const getDeliveryFee = require('../utils/deliveryFee');
const { notifyOrderStatus } = require('../utils/whatsappNotifications');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private (Student, cash on delivery)
const createOrder = async (req, res) => {
    try {
        const { restaurantId, items, deliveryLocation } = req.body;

        if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
            return res.status(400).json({ message: 'Provide between 1 and 50 order items' });
        }
        if (!mongoose.isValidObjectId(restaurantId)) {
            return res.status(400).json({ message: 'A valid restaurant is required' });
        }
        if (typeof deliveryLocation !== 'string' || !deliveryLocation.trim() || deliveryLocation.length > 160) {
            return res.status(400).json({ message: 'A valid delivery location is required' });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.isOpen) {
            return res.status(400).json({ message: 'Restaurant is closed or not found' });
        }

        // Calculate total amount securely on the backend to prevent frontend tampering
        let totalAmount = 0;
        const processedItems = [];

        for (const item of items) {
            if (
                !item ||
                !mongoose.isValidObjectId(item.menuItemId) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 20
            ) {
                return res.status(400).json({ message: 'Invalid menu item or quantity' });
            }

            const menuItem = restaurant.menu.id(item.menuItemId);
            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({ message: 'An item is unavailable' });
            }

            totalAmount += menuItem.price * item.quantity;
            processedItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                price: menuItem.price
            });
        }

        const order = await Order.create({
            studentId: req.user._id,
            restaurantId,
            items: processedItems,
            totalAmount: totalAmount + getDeliveryFee(totalAmount),
            deliveryLocation: deliveryLocation.trim(),
            paymentMethod: 'COD',
            paymentStatus: 'PENDING'
        });

        void notifyOrderStatus({ ...order.toObject(), studentId: req.user, restaurantId: restaurant });
        res.status(201).json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get logged in student's orders
// @route   GET /api/orders/my-orders
// @access  Private (Student)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ studentId: req.user._id })
            .populate('restaurantId', 'name location')
            .sort({ createdAt: -1 }); // Show newest orders first
            
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private (Student who placed it)
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('restaurantId', 'name location')
            .populate('studentId', 'name phone hostel roomNumber')
            .populate('deliveryId', 'name phone');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Security check: Only the student who ordered it should see it (for now)
        const isStudent = order.studentId._id.toString() === req.user._id.toString();
        if (!isStudent) {
             return res.status(403).json({ message: 'Not authorized to view this order' });
        }

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createOrder, getMyOrders, getOrderById };