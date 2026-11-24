const Restaurant = require('../models/Restaurant');
const Rating = require('../models/Rating');

const addRatingSummaries = async (restaurants, includeMenu = true) => {
    if (restaurants.length === 0) return [];

    const targetIds = restaurants.flatMap((restaurant) => [
        restaurant._id,
        ...(includeMenu ? restaurant.menu.map((item) => item._id) : [])
    ]);
    const summaries = await Rating.aggregate([
        { $match: { targetId: { $in: targetIds } } },
        {
            $group: {
                _id: { targetType: '$targetType', targetId: '$targetId' },
                ratingAverage: { $avg: '$value' },
                ratingCount: { $sum: 1 }
            }
        }
    ]);
    const summaryByTarget = new Map(
        summaries.map((summary) => [
            `${summary._id.targetType}:${summary._id.targetId}`,
            { ratingAverage: Math.round(summary.ratingAverage * 10) / 10, ratingCount: summary.ratingCount }
        ])
    );

    return restaurants.map((restaurant) => {
        const plainRestaurant = restaurant.toObject();
        return {
            ...plainRestaurant,
            ...(summaryByTarget.get(`RESTAURANT:${restaurant._id}`) || { ratingAverage: null, ratingCount: 0 }),
            ...(includeMenu ? {
                menu: plainRestaurant.menu.map((item) => ({
                    ...item,
                    ...(summaryByTarget.get(`MENU_ITEM:${item._id}`) || { ratingAverage: null, ratingCount: 0 })
                }))
            } : {})
        };
    });
};

// @desc    Create a new restaurant profile
// @route   POST /api/restaurants
// @access  Private (Vendor only)
const createRestaurant = async (req, res) => {
    try {
        const { name, location } = req.body;

        // 1. Prevent a vendor from creating multiple restaurants
        const existingRestaurant = await Restaurant.findOne({ vendorId: req.user._id });
        if (existingRestaurant) {
            return res.status(400).json({ message: 'You already have a restaurant profile' });
        }

        // 2. Create the new restaurant
        const restaurant = await Restaurant.create({
            vendorId: req.user._id,
            name,
            location,
            menu: [] 
        });

        res.status(201).json(restaurant);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
const getRestaurants = async (req, res) => {
    try {
        let query = {};
        
        // Filter by isOpen if the query parameter is provided
        if (req.query.isOpen === 'true') {
            query.isOpen = true;
        }

        // Exclude the menu array to keep the payload lightweight for the list view
        const restaurants = await Restaurant.find(query).select('-menu');
        const restaurantsWithRatings = await addRatingSummaries(restaurants, false);

        res.json(restaurantsWithRatings);
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get single restaurant by ID (includes full menu)
// @route   GET /api/restaurants/:id
// @access  Public
const getRestaurantById = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);

        if (restaurant) {
            const [restaurantWithRating] = await addRatingSummaries([restaurant]);
            res.json(restaurantWithRating);
        } else {
            res.status(404).json({ message: 'Restaurant not found' });
        }
    } catch (error) {
        // Handle invalid MongoDB ObjectIds gracefully
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ message: 'Restaurant not found' });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { 
    createRestaurant, 
    getRestaurants, 
    getRestaurantById 
};