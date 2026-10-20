const mongoose = require('mongoose');

// Embedded Menu Item Schema
const menuItemSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Menu item name is required'] 
    },
    price: { 
        type: Number, 
        required: [true, 'Price is required'] 
    },
    description: { 
        type: String 
    },
    isAvailable: { 
        type: Boolean, 
        default: true 
    },
    isVeg: { 
        type: Boolean, 
        default: true 
    }
}); 
// Note: Mongoose automatically creates an '_id' (ObjectId) for each item in this embedded array, which perfectly serves as your MenuItemId.

// Main Restaurant Schema
const restaurantSchema = new mongoose.Schema({
    vendorId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: [true, 'Vendor ID is required'] 
    },
    name: { 
        type: String, 
        required: [true, 'Restaurant name is required'] 
    },
    location: { 
        type: String, 
        required: [true, 'Location is required'] 
    },
    isOpen: { 
        type: Boolean, 
        default: true 
    },
    menu: [menuItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);