const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler'); // Or your preferred async handler

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getUsers = asyncHandler(async (req, res) => {
    const users = await User.find().select('-password').sort({ name: 1 }); // Exclude password
    res.status(200).json({ success: true, count: users.length, data: users });
});

// @desc    Get single user by ID
// @route   GET /api/users/:id
// @access  Private (Admin)
exports.getUserById = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }
    res.status(200).json({ success: true, data: user });
});

// @desc    Create a new user (by Admin)
// @route   POST /api/users
// @access  Private (Admin)
exports.createUser = asyncHandler(async (req, res) => {
    const { name, email, password, role, isActive } = req.body;

    if (!name || !email || !password || !role) {
        res.status(400);
        throw new Error('Please provide name, email, password, and role.');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
        res.status(400);
        throw new Error('User with this email already exists.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
        name,
        email,
        password: hashedPassword,
        role,
        isActive: isActive !== undefined ? isActive : true,
    });

    if (user) {
        const { password, ...userData } = user._doc; // Exclude password from response
        res.status(201).json({ success: true, data: userData, message: 'User created successfully.' });
    } else {
        res.status(400);
        throw new Error('Invalid user data.');
    }
});

// @desc    Update user details (by Admin)
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    const { name, email, role, isActive, password } = req.body;

    // Check if email is being changed and if it's already taken by another user
    if (email && email !== user.email) {
        const emailExists = await User.findOne({ email: email, _id: { $ne: user._id } });
        if (emailExists) {
            res.status(400);
            throw new Error('Email already in use by another account.');
        }
        user.email = email;
    }

    user.name = name || user.name;
    user.role = role || user.role;
    if (isActive !== undefined) {
        user.isActive = isActive;
    }

    // Handle password update
    if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
    }

    const updatedUser = await user.save();
    const { password: _, ...userData } = updatedUser._doc; // Exclude password

    res.status(200).json({ success: true, data: userData, message: 'User updated successfully.' });
});

// @desc    Delete a user (or deactivate)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Prevent admin from deleting themselves (or the last admin account) - add more robust logic if needed
    if (user.role === 'admin' && req.user.id === user._id.toString()) {
        res.status(400);
        throw new Error('Cannot delete your own admin account.');
    }

    // Option 1: Hard delete (not recommended for users)
    // await user.deleteOne();
    // res.status(200).json({ success: true, message: 'User deleted successfully.' });

    // Option 2: Soft delete (deactivate) - Recommended
    user.isActive = false;
    await user.save();
    const { password, ...userData } = user._doc;
    res.status(200).json({ success: true, message: 'User deactivated successfully.', data: userData });
});

// @desc    Get current logged-in user profile
// @route   GET /api/users/profile
// @access  Private
exports.getUserProfile = asyncHandler(async (req, res) => {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id).select('-password');
    if (user) {
        res.json({ success: true, data: user });
    } else {
        res.status(404);
        throw new Error('User not found');
    }
});