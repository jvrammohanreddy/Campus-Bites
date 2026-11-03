const mongoose = require('mongoose');

const paymentItemSchema = new mongoose.Schema({
    menuItemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    price: {
        type: Number,
        required: true
    }
}, { _id: false });

const paymentAttemptSchema = new mongoose.Schema({
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    items: {
        type: [paymentItemSchema],
        required: true
    },
    deliveryLocation: {
        type: String,
        required: true
    },
    amountPaise: {
        type: Number,
        required: true
    },
    razorpayOrderId: {
        type: String,
        required: true,
        unique: true
    },
    razorpayPaymentId: {
        type: String
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED'],
        default: 'PENDING'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
    }
}, { timestamps: true });

module.exports = mongoose.model('PaymentAttempt', paymentAttemptSchema);
