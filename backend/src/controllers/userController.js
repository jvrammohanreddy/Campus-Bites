const User = require('../models/User');

const PROFILE_FIELD_LIMITS = {
    name: 100,
    phone: 30,
    hostel: 80,
    roomNumber: 30
};

// @desc    Get logged in user profile
// @route   GET /api/users/me
const getMe = async (req, res) => {
    try {
        // req.user is set by your protect middleware
        const user = await User.findById(req.user._id).select('-password');
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Update user profile details
// @route   PUT /api/users/profile
const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const editableFields = user.role === 'STUDENT'
            ? Object.keys(PROFILE_FIELD_LIMITS)
            : ['name', 'phone'];
        for (const field of editableFields) {
            if (!Object.prototype.hasOwnProperty.call(req.body, field)) continue;
            if (typeof req.body[field] !== 'string') {
                return res.status(400).json({ message: `${field} must be text` });
            }

            const value = req.body[field].trim();
            if (value.length > PROFILE_FIELD_LIMITS[field]) {
                return res.status(400).json({
                    message: `${field} must be ${PROFILE_FIELD_LIMITS[field]} characters or fewer`
                });
            }
            if (field === 'name' && !value) {
                return res.status(400).json({ message: 'Name cannot be empty' });
            }

            user[field] = value;
        }

        if (user.role === 'STUDENT' && Object.prototype.hasOwnProperty.call(req.body, 'whatsappOptIn')) {
            if (typeof req.body.whatsappOptIn !== 'boolean') {
                return res.status(400).json({ message: 'whatsappOptIn must be true or false' });
            }
            if (req.body.whatsappOptIn && !user.phone?.trim()) {
                return res.status(400).json({ message: 'Add a phone number before enabling WhatsApp order updates.' });
            }
            user.whatsappOptIn = req.body.whatsappOptIn;
        }

        const updatedUser = await user.save();
        res.json({
            _id: updatedUser._id,
            name: updatedUser.name,
            email: updatedUser.email,
            role: updatedUser.role,
            phone: updatedUser.phone,
            whatsappOptIn: updatedUser.whatsappOptIn,
            hostel: updatedUser.hostel,
            roomNumber: updatedUser.roomNumber,
            createdAt: updatedUser.createdAt
        });
    } catch (error) {
        console.error(`Could not update user profile: ${error.message}`);
        res.status(500).json({ message: 'Could not update your profile right now.' });
    }
};

// @desc    Change logged-in user's password
// @route   PUT /api/users/password
const updatePassword = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
        return res.status(400).json({ message: 'Enter your current password and a new password.' });
    }
    if (newPassword.length < 8) {
        return res.status(400).json({ message: 'Your new password must be at least 8 characters.' });
    }
    if (newPassword.length > 128) {
        return res.status(400).json({ message: 'Your new password must be 128 characters or fewer.' });
    }

    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }
        if (!(await user.matchPassword(currentPassword))) {
            return res.status(400).json({ message: 'Your current password is incorrect.' });
        }

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully.' });
    } catch (error) {
        console.error(`Could not update user password: ${error.message}`);
        res.status(500).json({ message: 'Could not update your password right now.' });
    }
};

module.exports = { getMe, updateProfile, updatePassword };