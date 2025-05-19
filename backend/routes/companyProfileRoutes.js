const express = require('express');
const {
    getCompanyProfile,
    upsertCompanyProfile
} = require('../controllers/companyProfileController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All routes are protected and require admin/manager role
router.route('/')
    .get(protect, authorize(['admin', 'manager']), getCompanyProfile) // Managers can view
    .post(protect, authorize(['admin']), upsertCompanyProfile) // Only admin can create
    .put(protect, authorize(['admin']), upsertCompanyProfile);  // Only admin can update

module.exports = router;