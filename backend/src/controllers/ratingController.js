const mongoose = require('mongoose');
const Order = require('../models/Order');
const Rating = require('../models/Rating');
const Restaurant = require('../models/Restaurant');

const average = (value) => Math.round(value * 10) / 10;

const getTopRated = async (_req, res) => {
    try {
        const groupedRatings = await Rating.aggregate([
            {
                $group: {
                    _id: { targetType: '$targetType', targetId: '$targetId' },
                    ratingAverage: { $avg: '$value' },
                    ratingCount: { $sum: 1 }
                }
            },
            { $sort: { ratingAverage: -1, ratingCount: -1, _id: 1 } }
        ]);

        const restaurantRatings = groupedRatings
            .filter((entry) => entry._id.targetType === 'RESTAURANT')
            .slice(0, 6);
        const itemRatings = groupedRatings
            .filter((entry) => entry._id.targetType === 'MENU_ITEM')
            .slice(0, 6);

        const restaurantIds = restaurantRatings.map((entry) => entry._id.targetId);
        const restaurants = await Restaurant.find({ _id: { $in: restaurantIds } })
            .select('name location isOpen');
        const restaurantById = new Map(restaurants.map((restaurant) => [String(restaurant._id), restaurant]));

        const restaurantsWithRatings = restaurantRatings.flatMap((entry) => {
            const restaurant = restaurantById.get(String(entry._id.targetId));
            if (!restaurant) return [];
            return [{
                _id: restaurant._id,
                name: restaurant.name,
                location: restaurant.location,
                isOpen: restaurant.isOpen,
                ratingAverage: average(entry.ratingAverage),
                ratingCount: entry.ratingCount
            }];
        });

        const itemIds = itemRatings.map((entry) => entry._id.targetId);
        const itemRestaurants = await Restaurant.find({ 'menu._id': { $in: itemIds } })
            .select('name menu');
        const itemById = new Map();
        for (const restaurant of itemRestaurants) {
            for (const item of restaurant.menu) {
                itemById.set(String(item._id), { item, restaurant });
            }
        }

        const itemsWithRatings = itemRatings.flatMap((entry) => {
            const result = itemById.get(String(entry._id.targetId));
            if (!result || !result.item.isAvailable) return [];
            return [{
                _id: result.item._id,
                name: result.item.name,
                description: result.item.description,
                imageUrl: result.item.imageUrl,
                price: result.item.price,
                isVeg: result.item.isVeg,
                restaurantId: { _id: result.restaurant._id, name: result.restaurant.name },
                ratingAverage: average(entry.ratingAverage),
                ratingCount: entry.ratingCount
            }];
        });

        res.json({ restaurants: restaurantsWithRatings, items: itemsWithRatings });
    } catch (error) {
        console.error(`Could not load highest-rated listings: ${error.message}`);
        res.status(500).json({ message: 'Could not load ratings right now.' });
    }
};

const getRatingEligibility = async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.restaurantId)) {
        return res.status(400).json({ message: 'A valid restaurant is required.' });
    }

    try {
        const [restaurant, deliveredOrderCount] = await Promise.all([
            Restaurant.findById(req.params.restaurantId).select('menu._id'),
            Order.countDocuments({
                studentId: req.user._id,
                restaurantId: req.params.restaurantId,
                status: 'DELIVERED'
            })
        ]);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found.' });
        }

        const ratings = await Rating.find({
            studentId: req.user._id,
            restaurantId: req.params.restaurantId
        }).select('targetType targetId value');

        res.json({
            eligibleForRestaurant: deliveredOrderCount > 0,
            eligibleMenuItemIds: restaurant.menu.map((item) => String(item._id)),
            ratings: ratings.map((rating) => ({
                targetType: rating.targetType,
                targetId: rating.targetId,
                value: rating.value
            }))
        });
    } catch (error) {
        console.error(`Could not load rating eligibility: ${error.message}`);
        res.status(500).json({ message: 'Could not load rating options right now.' });
    }
};

const submitRating = async (req, res) => {
    const { restaurantId, targetType, targetId, value } = req.body;

    if (
        !mongoose.isValidObjectId(restaurantId) ||
        !mongoose.isValidObjectId(targetId) ||
        !['RESTAURANT', 'MENU_ITEM'].includes(targetType) ||
        !Number.isInteger(value) ||
        value < 1 ||
        value > 5
    ) {
        return res.status(400).json({ message: 'Provide a restaurant, rating target, and a whole-star rating from 1 to 5.' });
    }

    try {
        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found.' });
        }
        if (targetType === 'RESTAURANT') {
            if (String(targetId) !== String(restaurant._id)) {
                return res.status(400).json({ message: 'The restaurant rating target does not match the restaurant.' });
            }
            const deliveredOrder = await Order.exists({
                studentId: req.user._id,
                restaurantId,
                status: 'DELIVERED'
            });
            if (!deliveredOrder) {
                return res.status(403).json({ message: 'You can rate a restaurant after a delivered order.' });
            }
        }
        if (targetType === 'MENU_ITEM' && !restaurant.menu.id(targetId)) {
            return res.status(404).json({ message: 'Menu item not found in this restaurant.' });
        }

        const rating = await Rating.findOneAndUpdate(
            { studentId: req.user._id, targetType, targetId },
            { $set: { restaurantId, value } },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.json({
            targetType: rating.targetType,
            targetId: rating.targetId,
            value: rating.value
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ message: 'A rating for this item is already being saved. Please try again.' });
        }
        console.error(`Could not save rating: ${error.message}`);
        res.status(500).json({ message: 'Could not save your rating right now.' });
    }
};

module.exports = { getTopRated, getRatingEligibility, submitRating };
