const express = require('express');
const router = express.Router();
const {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require('../controllers/supplierController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have auth middleware

// Define roles that can manage suppliers
const manageRoles = ['admin'];
const viewRoles = ['admin', 'manager'];

// Public or general access routes (if any)
// router.route('/').get(getSuppliers); // Example if GET all is public or less restricted

// Protected routes
router.route('/')
    .get(protect, authorize(viewRoles), getSuppliers)
    .post(protect, authorize(manageRoles), createSupplier);

router.route('/:id')
    .get(protect, authorize(viewRoles), getSupplierById)
    .put(protect, authorize(manageRoles), updateSupplier)
    .delete(protect, authorize(manageRoles), deleteSupplier);

module.exports = router;