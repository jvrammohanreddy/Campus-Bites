const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Order = require('../models/Order');
const PaymentAttempt = require('../models/PaymentAttempt');
const Restaurant = require('../models/Restaurant');
const getDeliveryFee = require('../utils/deliveryFee');
const { notifyOrderStatus } = require('../utils/whatsappNotifications');

const isRazorpayConfigured = () =>
    Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const getRazorpay = () => {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.');
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
    });
};

const createPaymentOrder = async (req, res) => {
    if (!isRazorpayConfigured()) {
        return res.status(503).json({
            message: 'Online payments are not configured. Add Razorpay test keys to backend/.env and restart the backend.'
        });
    }

    try {
        const { restaurantId, items, deliveryLocation } = req.body;

        if (!mongoose.isValidObjectId(restaurantId)) {
            return res.status(400).json({ message: 'A valid restaurant is required' });
        }
        if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
            return res.status(400).json({ message: 'Provide between 1 and 50 order items' });
        }
        if (typeof deliveryLocation !== 'string' || !deliveryLocation.trim() || deliveryLocation.length > 160) {
            return res.status(400).json({ message: 'A valid delivery location is required' });
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant || !restaurant.isOpen) {
            return res.status(400).json({ message: 'Restaurant is closed or not found' });
        }

        let subtotal = 0;
        const processedItems = [];

        for (const item of items) {
            if (!mongoose.isValidObjectId(item.menuItemId) ||
                !Number.isInteger(item.quantity) ||
                item.quantity < 1 ||
                item.quantity > 20) {
                return res.status(400).json({ message: 'Invalid menu item or quantity' });
            }

            const menuItem = restaurant.menu.id(item.menuItemId);
            if (!menuItem || !menuItem.isAvailable) {
                return res.status(400).json({ message: 'An item is unavailable' });
            }

            subtotal += menuItem.price * item.quantity;
            processedItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                price: menuItem.price
            });
        }

        const amountPaise = Math.round((subtotal + getDeliveryFee(subtotal)) * 100);
        if (!Number.isSafeInteger(amountPaise) || amountPaise < 100) {
            return res.status(400).json({ message: 'Order total is invalid' });
        }

        const razorpay = getRazorpay();
        const gatewayOrder = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt: `cb_${crypto.randomUUID().replaceAll('-', '').slice(0, 32)}`,
            notes: {
                studentId: req.user._id.toString(),
                restaurantId: restaurant._id.toString()
            }
        });

        await PaymentAttempt.create({
            studentId: req.user._id,
            restaurantId: restaurant._id,
            items: processedItems,
            deliveryLocation: deliveryLocation.trim(),
            amountPaise,
            razorpayOrderId: gatewayOrder.id
        });

        res.status(201).json({
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: gatewayOrder.id,
            amount: gatewayOrder.amount,
            currency: gatewayOrder.currency,
            restaurantName: restaurant.name,
            studentName: req.user.name,
            studentEmail: req.user.email
        });
    } catch (error) {
        console.error(`Razorpay order creation failed: ${error.message}`);
        res.status(500).json({ message: 'Unable to start payment. Please try again.' });
    }
};

const verifyPayment = async (req, res) => {
    if (!isRazorpayConfigured()) {
        return res.status(503).json({
            message: 'Online payment verification is unavailable. Configure Razorpay keys and retry verification.'
        });
    }

    const {
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: razorpayPaymentId,
        razorpay_signature: razorpaySignature
    } = req.body;

    if (![razorpayOrderId, razorpayPaymentId, razorpaySignature].every(
        (value) => typeof value === 'string' && value.length > 0
    )) {
        return res.status(400).json({ message: 'Payment verification details are incomplete' });
    }

    try {
        const attempt = await PaymentAttempt.findOne({
            razorpayOrderId,
            studentId: req.user._id
        });
        if (!attempt) {
            return res.status(404).json({ message: 'Payment order not found' });
        }
        if (attempt.status === 'COMPLETED' && attempt.orderId) {
            return res.json({ orderId: attempt.orderId, paymentStatus: 'COMPLETED' });
        }

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest();
        const receivedSignature = Buffer.from(razorpaySignature, 'hex');
        if (
            receivedSignature.length !== expectedSignature.length ||
            !crypto.timingSafeEqual(receivedSignature, expectedSignature)
        ) {
            return res.status(400).json({ message: 'Payment signature is invalid' });
        }

        const razorpay = getRazorpay();
        let payment = await razorpay.payments.fetch(razorpayPaymentId);
        if (
            payment.order_id !== razorpayOrderId ||
            !['authorized', 'captured'].includes(payment.status) ||
            payment.amount !== attempt.amountPaise ||
            payment.currency !== 'INR'
        ) {
            return res.status(400).json({ message: 'Payment could not be verified' });
        }

        if (payment.status === 'authorized') {
            payment = await razorpay.payments.capture(
                razorpayPaymentId,
                attempt.amountPaise,
                'INR'
            );
            if (payment.status !== 'captured') {
                return res.status(400).json({ message: 'Payment capture could not be confirmed' });
            }
        }

        const claimedAttempt = await PaymentAttempt.findOneAndUpdate(
            { _id: attempt._id, status: 'PENDING' },
            { $set: { status: 'PROCESSING', razorpayPaymentId } },
            { new: true }
        );
        if (!claimedAttempt) {
            const currentAttempt = await PaymentAttempt.findById(attempt._id);
            if (currentAttempt?.status === 'COMPLETED' && currentAttempt.orderId) {
                return res.json({ orderId: currentAttempt.orderId, paymentStatus: 'COMPLETED' });
            }
            return res.status(409).json({ message: 'Payment verification is already in progress' });
        }

        try {
            const order = await Order.create({
                studentId: claimedAttempt.studentId,
                restaurantId: claimedAttempt.restaurantId,
                items: claimedAttempt.items,
                totalAmount: claimedAttempt.amountPaise / 100,
                deliveryLocation: claimedAttempt.deliveryLocation,
                paymentMethod: 'ONLINE',
                paymentStatus: 'COMPLETED',
                razorpayOrderId,
                razorpayPaymentId
            });

            void notifyOrderStatus({ ...order.toObject(), studentId: req.user });

            await PaymentAttempt.updateOne(
                { _id: claimedAttempt._id, status: 'PROCESSING' },
                { $set: { status: 'COMPLETED', orderId: order._id } }
            );

            return res.status(201).json({
                orderId: order._id,
                paymentStatus: 'COMPLETED'
            });
        } catch (error) {
            const existingOrder = await Order.findOne({ razorpayOrderId });
            if (existingOrder) {
                await PaymentAttempt.updateOne(
                    { _id: claimedAttempt._id },
                    {
                        $set: {
                            status: 'COMPLETED',
                            orderId: existingOrder._id,
                            razorpayPaymentId
                        }
                    }
                );
                return res.json({
                    orderId: existingOrder._id,
                    paymentStatus: 'COMPLETED'
                });
            }

            await PaymentAttempt.updateOne(
                { _id: claimedAttempt._id, status: 'PROCESSING' },
                { $set: { status: 'PENDING' }, $unset: { razorpayPaymentId: 1 } }
            );
            throw error;
        }
    } catch (error) {
        console.error(`Razorpay payment verification failed: ${error.message}`);
        res.status(500).json({ message: 'Unable to verify payment. Contact support before retrying.' });
    }
};

module.exports = { createPaymentOrder, verifyPayment };
