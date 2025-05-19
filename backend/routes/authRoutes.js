const express = require('express');
const router = express.Router();
const { registerUser, loginUser } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware'); // Import the protect middleware
const User = require('../models/User'); // Import User model

// @route   POST /api/auth/register
router.post('/register', registerUser);

// @route   POST /api/auth/login
router.post('/login', loginUser);

// @route   GET /api/auth/me (Example protected route)
// @desc    Get current logged-in user's details (requires token)
router.get('/me', protect, async (req, res) => {
    try {
        // req.user.id is populated by the 'protect' middleware from the token
        const user = await User.findById(req.user.id).select('-password'); // Exclude password
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error' });
    }
});

module.exports = router;