const express = require('express');
const router = express.Router();
const {
    recordPayment,
    getPaymentsForInvoice,
    getPaymentById,
    updatePayment,
    deletePayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/authMiddleware');

// All payment routes are protected.
// Recording, updating, deleting payments might be restricted to admin/manager.

router.route('/')
    .post(protect, authorize(['admin']), recordPayment); // Only admin can record

router.route('/invoice/:invoiceId').get(protect, authorize(['admin', 'manager']), getPaymentsForInvoice); // Admin/Manager can view
router.route('/:id')
    .get(protect, authorize(['admin', 'manager']), getPaymentById) // Admin/Manager can view
    .put(protect, authorize(['admin']), updatePayment)    // Only admin can update
    .delete(protect, authorize(['admin']), deletePayment); // Only admin can delete

module.exports = router;