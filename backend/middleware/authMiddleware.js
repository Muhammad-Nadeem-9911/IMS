const jwt = require('jsonwebtoken');
const asyncHandler = require('express-async-handler'); // Or your preferred async handler
const User = require('../models/User');

// Protect routes - checks for valid token
const protect = asyncHandler(async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token (excluding password)
            req.user = await User.findById(decoded.user.id).select('-password');

            if (!req.user) {
                res.status(401);
                throw new Error('Not authorized, user not found');
            }
            if (!req.user.isActive) {
                res.status(401);
                throw new Error('Not authorized, user account is inactive');
            }

            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

// Grant access to specific roles
const authorize = (roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        res.status(403); // Forbidden
        throw new Error(`User role '${req.user?.role}' is not authorized to access this route. Allowed roles: ${roles.join(', ')}`);
    }
    next();
};

module.exports = { protect, authorize };