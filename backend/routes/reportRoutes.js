const express = require('express');
const { getSalesSummary, getTrialBalance, getIncomeStatement, getBalanceSheet, getTransactionsReport, getPurchaseOrdersReport } = require('../controllers/reportController'); // Added getPurchaseOrdersReport
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have this

const router = express.Router();

// Apply protect middleware to all report routes
router.use(protect);

// Only admin/manager can access reports
router.route('/sales-summary')
    .get(authorize(['admin', 'manager']), getSalesSummary);

router.route('/trial-balance')
    .get(authorize(['admin', 'manager']), getTrialBalance);

router.route('/income-statement')
    .get(authorize(['admin', 'manager']), getIncomeStatement);

router.route('/balance-sheet')
    .get(authorize(['admin', 'manager']), getBalanceSheet);

router.route('/transactions') // New route for comprehensive transactions
    .get(authorize(['admin', 'manager']), getTransactionsReport);

router.route('/purchase-orders') // New route for PO report
    .get(authorize(['admin', 'manager']), getPurchaseOrdersReport);

module.exports = router;