const mongoose = require('mongoose');
const Order = require('../models/Order');
const { notifyOrderStatus } = require('../utils/whatsappNotifications');

// @desc    Get all available orders ready for pickup
// @route   GET /api/delivery/available-orders
// @access  Private (Delivery)
const getAvailableOrders = async (req, res) => {
    try {
        // Find orders that are ready but do not have a delivery runner assigned yet
        const orders = await Order.find({ 
            status: 'READY_FOR_PICKUP',
            deliveryId: null 
        })
        .populate('restaurantId', 'name location')
        .populate('studentId', 'name')
        .sort({ createdAt: 1 }); // Sort oldest first (FIFO) so older orders get picked up

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get orders assigned to the logged-in delivery person
// @route   GET /api/delivery/my-orders
// @access  Private (Delivery)
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ deliveryId: req.user._id })
            .populate('restaurantId', 'name location')
            .populate('studentId', 'name phone hostel roomNumber')
            .sort({ updatedAt: -1 });

        res.json(orders);
    } catch (error) {
        console.error(`Could not load delivery person's orders: ${error.message}`);
        res.status(500).json({ message: 'Could not load your orders right now.' });
    }
};

// @desc    Accept an order for delivery
// @route   PUT /api/delivery/orders/:orderId/accept
// @access  Private (Delivery)
const acceptOrder = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.orderId)) {
        return res.status(400).json({ message: 'A valid order is required' });
    }

    try {
        const order = await Order.findOneAndUpdate(
            {
                _id: req.params.orderId,
                status: 'READY_FOR_PICKUP',
                deliveryId: null
            },
            { $set: { deliveryId: req.user._id } },
            { new: true }
        )
            .populate('restaurantId', 'name location')
            .populate('studentId', 'name phone hostel roomNumber whatsappOptIn');

        if (!order) {
            const existingOrder = await Order.findById(req.params.orderId).select('_id');
            if (!existingOrder) {
                return res.status(404).json({ message: 'Order not found' });
            }
            return res.status(409).json({ message: 'Order is no longer available for pickup' });
        }

        res.json(order);
    } catch (error) {
        console.error(`Could not accept delivery order: ${error.message}`);
        res.status(500).json({ message: 'Could not accept this order right now.' });
    }
};

// @desc    Update delivery status
// @route   PUT /api/delivery/orders/:orderId/status
// @access  Private (Delivery)
const updateDeliveryStatus = async (req, res) => {
    try {
        if (!mongoose.isValidObjectId(req.params.orderId)) {
            return res.status(400).json({ message: 'A valid order is required' });
        }

        const { status } = req.body;
        if (!['OUT_FOR_DELIVERY', 'DELIVERED'].includes(status)) {
            return res.status(400).json({ message: 'Invalid delivery status' });
        }

        const order = await Order.findOne({
            _id: req.params.orderId,
            deliveryId: req.user._id
        });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const isPickingUp = order.status === 'READY_FOR_PICKUP' && status === 'OUT_FOR_DELIVERY';
        const isDelivering = order.status === 'OUT_FOR_DELIVERY' && status === 'DELIVERED';
        if (!isPickingUp && !isDelivering) {
            return res.status(409).json({ message: 'This order cannot move to that delivery status.' });
        }

        const updatedOrder = await Order.findOneAndUpdate(
            {
                _id: order._id,
                deliveryId: req.user._id,
                status: order.status
            },
            {
                $set: {
                    status,
                    ...(status === 'DELIVERED' && ['COD', 'CASH'].includes(order.paymentMethod)
                        ? { paymentStatus: 'COMPLETED' }
                        : {})
                }
            },
            { new: true }
        )
            .populate('restaurantId', 'name location')
            .populate('studentId', 'name phone hostel roomNumber whatsappOptIn');

        if (!updatedOrder) {
            return res.status(409).json({ message: 'Order status changed. Refresh and try again.' });
        }

        void notifyOrderStatus(updatedOrder);
        res.json(updatedOrder);
    } catch (error) {
        console.error(`Could not update delivery status: ${error.message}`);
        res.status(500).json({ message: 'Could not update this order right now.' });
    }
};

module.exports = {
    getAvailableOrders,
    getMyOrders,
    acceptOrder,
    updateDeliveryStatus
};