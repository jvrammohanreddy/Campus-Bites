const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

// ADD THIS LINE: Import the middleware functions
const { protect, authorize } = require('../middlewares/authMiddleware'); 

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);

// TEMPORARY TEST ROUTES
// Any logged-in user can access this
router.get('/me', protect, (req, res) => {
    res.json({ message: `Hello ${req.user.name}, your role is ${req.user.role}` });
});

// Only VENDORS can access this
router.get('/vendor-only', protect, authorize('VENDOR'), (req, res) => {
    res.json({ message: 'Welcome to the restaurant dashboard!' });
});

module.exports = router;