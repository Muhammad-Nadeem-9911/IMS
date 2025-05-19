const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
exports.registerUser = async (req, res, next) => {
    const { name, email, password, role } = req.body;

    try {
        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Create new user instance
        user = new User({
            name,
            email,
            password,
            role // Optional: if you want to allow role setting during registration
                 // Otherwise, remove it and rely on the default 'user' role
        });

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Create JWT for immediate login after registration
        const payload = {
            user: {
                id: user.id,
                role: user.role
            }
        };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token, // Send token
            data: { userId: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        console.error('Registration Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error', error: error.message });
    }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res, next) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    try {
        // Check for user
        const user = await User.findOne({ email }).select('+password'); // Explicitly select password

        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        // User matched, create JWT
        const payload = {
            user: {
                id: user.id,
                role: user.role // Include role in JWT payload for authorization
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }); // Token expires in 1 hour

        res.status(200).json({ success: true, token, userId: user.id, name: user.name, email: user.email, role: user.role });
    } catch (error) {
        console.error('Login Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};