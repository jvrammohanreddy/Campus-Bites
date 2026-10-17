const Order = require('../models/Order');

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
        .populate('studentId', 'name phone hostel roomNumber')
        .sort({ createdAt: 1 }); // Sort oldest first (FIFO) so older orders get picked up

        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Accept an order for delivery
// @route   PUT /api/delivery/orders/:orderId/accept
// @access  Private (Delivery)
const acceptOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Prevent multiple runners from accepting the same order
        if (order.deliveryId) {
            return res.status(400).json({ message: 'Order has already been accepted by another runner' });
        }

        // Assign the logged-in runner to the order
        order.deliveryId = req.user._id;
        await order.save();

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update delivery status
// @route   PUT /api/delivery/orders/:orderId/status
// @access  Private (Delivery)
const updateDeliveryStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['OUT_FOR_DELIVERY', 'DELIVERED'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid delivery status' });
        }

        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Security check: Only the assigned runner can update this order's status
        if (order.deliveryId?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this order' });
        }

        order.status = status;

        // Auto-complete payment if it was a cash order and is now delivered
        if (status === 'DELIVERED' && order.paymentMethod === 'CASH') {
            order.paymentStatus = 'COMPLETED';
        }

        await order.save();

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = {
    getAvailableOrders,
    acceptOrder,
    updateDeliveryStatus
};