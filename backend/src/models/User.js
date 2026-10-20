const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { 
        type: String, 
        required: [true, 'Name is required'] 
    },
    email: { 
        type: String, 
        required: [true, 'Email is required'], 
        unique: true,
        match: [/^[\w-\.]+@iitb\.ac\.in$/, 'Please use a valid @iitb.ac.in email address']
    },
    password: { 
        type: String, 
        required: [true, 'Password is required'] 
    },
    role: { 
        type: String, 
        enum: ['STUDENT', 'VENDOR', 'DELIVERY'], 
        default: 'STUDENT' 
    },
    phone: { 
        type: String,
        required: function() { return this.role === 'DELIVERY'; } // Enforce phone for delivery runners
    },
    hostel: { 
        type: String 
    },
    roomNumber: { 
        type: String 
    }
}, { timestamps: true });

// Pre-save hook to hash the password before saving to the database
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Instance method to verify passwords during login
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);