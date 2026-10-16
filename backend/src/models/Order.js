const mongoose = require('mongoose');

// Embedded Order Item Schema
const orderItemSchema = new mongoose.Schema({
    menuItemId: { 
        type: mongoose.Schema.Types.ObjectId, 
        required: [true, 'Menu item ID is required'] 
    },
    name: { 
        type: String, 
        required: [true, 'Item name is required'] 
    },
    quantity: { 
        type: Number, 
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'] 
    }
}, { _id: false }); // Prevents Mongoose from generating redundant ObjectIds for items inside the order array

// Main Order Schema
const orderSchema = new mongoose.Schema({
    studentId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Student ID is required'] 
    },
    restaurantId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Restaurant', 
        required: [true, 'Restaurant ID is required'] 
    },
    deliveryId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }, // Optional, assigned when a delivery runner accepts the order
    items: [orderItemSchema],
    totalAmount: { 
        type: Number, 
        required: [true, 'Total amount is required'] 
    },
    deliveryLocation: { 
        type: String, 
        required: [true, 'Delivery location is required'] 
    },
    status: { 
        type: String, 
        enum: ['PLACED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'], 
        default: 'PLACED' 
    },
    paymentMethod: {
        type: String,
        enum: ['CASH', 'UPI'],
        required: [true, 'Payment method is required']
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'COMPLETED'],
        default: 'PENDING'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);