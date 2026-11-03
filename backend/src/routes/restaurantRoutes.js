const express = require('express');
const router = express.Router();
const { 
    createRestaurant, 
    getRestaurants, 
    getRestaurantById 
} = require('../controllers/restaurantController');
const { protect, authorize } = require('../middlewares/authMiddleware');

// Public routes (Students fetching data)
router.get('/', getRestaurants);
router.get('/:id', getRestaurantById);

// Protected routes (Vendor specific)
router.post('/', protect, authorize('VENDOR'), createRestaurant);

module.exports = router;