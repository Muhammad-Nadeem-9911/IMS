const express = require('express');
const {
    createInvoice,
    getInvoices,
    getInvoiceById,
    updateInvoice,
    deleteInvoice,
    generateInvoicePdfController // Import the new controller
} = require('../controllers/invoiceController');
const { protect, authorize } = require('../middleware/authMiddleware');

const router = express.Router();

// All invoice routes are protected.
// Specific CUD operations might be restricted to admin/manager.
router.route('/')
    .post(protect, authorize(['admin']), createInvoice) // Only admin can create
    .get(protect, getInvoices);

// PDF generation route - place before generic /:id if it could conflict, though /pdf suffix makes it distinct
router.get('/:id/pdf', protect, generateInvoicePdfController);

router.route('/:id')
    .get(protect, getInvoiceById) // Admin and Manager can view
    .put(protect, authorize(['admin']), updateInvoice)   // Only admin can update
    .delete(protect, authorize(['admin']), deleteInvoice); // Only admin can delete

module.exports = router;