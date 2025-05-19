const express = require('express');
const router = express.Router();
const {
    getAccounts,
    getAccountById,
    createAccount,
    updateAccount,
    deleteAccount
} = require('../controllers/accountController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have this

// Define roles that can access these routes
const viewRoles = ['admin', 'manager'];
const manageRoles = ['admin'];

router.route('/')
    .get(protect, authorize(viewRoles), getAccounts)
    .post(protect, authorize(manageRoles), createAccount);

router.route('/:id')
    .get(protect, authorize(viewRoles), getAccountById)
    .put(protect, authorize(manageRoles), updateAccount)
    .delete(protect, authorize(manageRoles), deleteAccount);

module.exports = router;