const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user
// @route   POST /api/auth/register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, phone, hostel, roomNumber } = req.body;
        const role = req.body.role || 'STUDENT';

        if (
            typeof name !== 'string' || !name.trim() ||
            typeof email !== 'string' || !email.trim() ||
            typeof password !== 'string' || !password
        ) {
            return res.status(400).json({ message: 'Please include name, email, and password' });
        }

        if (!['STUDENT', 'VENDOR', 'DELIVERY'].includes(role)) {
            return res.status(400).json({ message: 'Please choose a valid account type' });
        }

        if (
            role === 'DELIVERY' &&
            (typeof phone !== 'string' || !phone.trim() || phone.trim().length > 30)
        ) {
            return res.status(400).json({ message: 'Delivery accounts require a phone number of 30 characters or fewer' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const isValidEmail = role === 'STUDENT'
            ? /^[\w.-]+@iitb\.ac\.in$/i.test(normalizedEmail)
            : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
        if (!isValidEmail) {
            return res.status(400).json({
                message: role === 'STUDENT'
                    ? 'Customers must use a valid @iitb.ac.in email address'
                    : 'Please enter a valid email address'
            });
        }

        const userExists = await User.findOne({ email: normalizedEmail });
        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ 
            name: name.trim(),
            email: normalizedEmail,
            password,
            role,
            phone: typeof phone === 'string' ? phone.trim() : phone,
            hostel,
            roomNumber
        });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            phone: user.phone,
            hostel: user.hostel,
            roomNumber: user.roomNumber,
            token: generateToken(user._id)
        });
    } catch (error) {
        if (error.name === 'ValidationError' || error.code === 11000) {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const user = await User.findOne({ email: normalizedEmail });

        if (user && (await user.matchPassword(password))) {
            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id)
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

module.exports = { registerUser, loginUser };