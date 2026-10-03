const Restaurant = require('../models/Restaurant');

const createRestaurant = async (req, res) => {
    try {
        const { name, location } = req.body;

        // 1. Prevent a vendor from creating multiple restaurants
        const existingRestaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({ message: 'You already have a restaurant profile' });
        }

        // 2. Create the new restaurant. req.user._id comes from our 'protect' middleware!
        const restaurant = await Restaurant.create({
            vendorId: req.user._id,
            name,
            location,
            menu: [] // Starts with an empty menu
        });

        res.status(201).json(restaurant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { createRestaurant };