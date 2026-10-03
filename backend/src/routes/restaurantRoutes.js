const express = require('express');
const { createRestaurant } = require('../controllers/restaurantController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

// POST /api/restaurants -> Create a new restaurant
router.post('/', protect, authorize('VENDOR'), createRestaurant);

module.exports = router;