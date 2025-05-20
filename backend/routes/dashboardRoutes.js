const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/dashboardController');
const { protect } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// @route   GET /api/dashboard/stats
// @desc    Get overall dashboard statistics
// @access  Private
router.get('/stats', protect, getDashboardStats);

module.exports = router;