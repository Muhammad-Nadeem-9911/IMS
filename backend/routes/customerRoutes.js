const express = require('express');
const {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require('../controllers/customerController');

const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have this

const router = express.Router();

// Apply protect middleware to all customer routes
router.use(protect);

router.route('/')
    .get(getCustomers) // All authenticated users can get customers (for selection in invoice form)
    .post(authorize(['admin']), createCustomer); // Only admin can create

router.route('/:id')
    .get(getCustomerById) // All authenticated users can get a specific customer
    .put(authorize(['admin']), updateCustomer) // Only admin can update
    .delete(authorize(['admin']), deleteCustomer); // Only admin can delete

module.exports = router;