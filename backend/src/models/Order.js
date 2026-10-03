const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItemId: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    price: { type: Number, required: true }
});

const orderSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    restaurantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    deliveryId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Assigned later when a runner accepts
    
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    deliveryLocation: { type: String, required: true }, // e.g., "Hostel 12, Room 145"
    
    status: {
        type: String,
        enum: ['PLACED', 'PREPARING', 'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
        default: 'PLACED'
    }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);