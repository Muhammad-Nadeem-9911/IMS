const express = require('express');
const router = express.Router();
const {
    getUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getUserProfile
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have this

// All routes below are protected and require admin access unless specified otherwise
router.use(protect); // Apply protect middleware to all user routes

router.route('/profile').get(getUserProfile); // Get logged-in user's profile (any authenticated user)

router.route('/')
    .get(authorize(['admin']), getUsers) // Only admin can get all users
    .post(authorize(['admin']), createUser); // Only admin can create users

router.route('/:id')
    .get(authorize(['admin']), getUserById)    // Only admin
    .put(authorize(['admin']), updateUser)     // Only admin
    .delete(authorize(['admin']), deleteUser); // Only admin

module.exports = router;