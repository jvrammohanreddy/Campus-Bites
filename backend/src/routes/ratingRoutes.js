const express = require('express');
const {
    getTopRated,
    getRatingEligibility,
    submitRating
} = require('../controllers/ratingController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/top', getTopRated);
router.get('/eligibility/:restaurantId', protect, authorize('STUDENT'), getRatingEligibility);
router.post('/', protect, authorize('STUDENT'), submitRating);

module.exports = router;
