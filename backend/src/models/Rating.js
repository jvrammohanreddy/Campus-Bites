const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
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
    targetType: {
        type: String,
        enum: ['RESTAURANT', 'MENU_ITEM'],
        required: true
    },
    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    value: {
        type: Number,
        min: 1,
        max: 5,
        required: true
    }
}, { timestamps: true });

ratingSchema.index({ studentId: 1, targetType: 1, targetId: 1 }, { unique: true });
ratingSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
