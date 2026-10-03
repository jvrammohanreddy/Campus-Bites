const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    name: { type: String, required: true },
    price: { type: Number, required: true },
    description: { type: String },
    isAvailable: { type: Boolean, default: true }
});

const restaurantSchema = new mongoose.Schema({
    vendorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { type: String, required: true },
    location: { type: String, required: true }, // e.g., "Hostel 3 Canteen"
    menu: [menuItemSchema],
    isOpen: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);