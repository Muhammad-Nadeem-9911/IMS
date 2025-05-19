const Payment = require('../models/Payment'); // Assuming Payment model is created
const Invoice = require('../models/Invoice');
const asyncHandler = require('express-async-handler'); // Or your preferred async error handler

const ChartOfAccount = require('../models/ChartOfAccount'); // Import ChartOfAccount model
// @desc    Record a new payment for an invoice
// @route   POST /api/payments
// @access  Private (e.g., Admin/Manager)
const recordPayment = asyncHandler(async (req, res) => {
    const { invoiceId, amountPaid, paymentDate, paymentMethod, transactionId, notes } = req.body;

    // Basic validation (add more as needed)
    if (!invoiceId || !amountPaid || !paymentDate || !paymentMethod) {
        res.status(400);
        throw new Error('Please provide all required payment fields');
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    // Find required accounts for the journal entry
    const accountsReceivableAcc = await ChartOfAccount.findOne({ accountName: 'Accounts Receivable' }); // Assuming this name exists
    const cashOrBankAcc = await ChartOfAccount.findOne({ accountName: 'Cash' }); // Assuming 'Cash' or 'Bank' exists

    if (!accountsReceivableAcc || !cashOrBankAcc) {
        res.status(500);
        throw new Error('Required accounting accounts (Accounts Receivable, Cash/Bank) not found in Chart of Accounts.');
    }

    // Prevent overpayment or payment on already fully paid invoices (optional, based on business logic)
    // if (invoice.status === 'paid' || (invoice.totalPaid + parseFloat(amountPaid)) > invoice.totalAmount) {
    //     res.status(400);
    //     throw new Error('Payment exceeds balance due or invoice is already paid.');
    // }

    const payment = await Payment.create({
        invoice: invoiceId,
        amountPaid,
        paymentDate,
        paymentMethod,
        transactionId,
        notes,
        recordedBy: req.user.id // Assuming req.user is populated by auth middleware
    });

    // --- Start: Automated Journal Entry Creation for Payment Received ---
    try {
        const jeDescription = `Payment received for Invoice #${invoice.invoiceNumber}`;
        const journalEntryData = {
            date: payment.paymentDate, // Use payment date for JE
            description: jeDescription,
            referenceNumber: invoice.invoiceNumber, // Link JE to invoice number
            entries: [
                { account: cashOrBankAcc._id, debit: payment.amountPaid, credit: 0 }, // Debit Cash/Bank
                { account: accountsReceivableAcc._id, debit: 0, credit: payment.amountPaid }, // Credit Accounts Receivable
            ],
            createdBy: req.user.id,
        };
        await JournalEntry.create(journalEntryData);
        console.log(`Journal Entry created successfully for payment on Invoice ${invoice.invoiceNumber}.`);
    } catch (jeError) {
        console.error(`Error creating Journal Entry for payment on Invoice ${invoice.invoiceNumber}:`, jeError.message);
    }
    // --- End: Automated Journal Entry Creation ---

    // Update invoice
    invoice.totalPaid += parseFloat(amountPaid);
    // invoice.balanceDue = invoice.totalAmount - invoice.totalPaid; // Can be calculated on the fly or stored
    
    if (invoice.totalPaid >= invoice.grandTotal) {
        invoice.status = 'paid';
    } else if (invoice.totalPaid > 0) {
        invoice.status = 'partially_paid';
    }
    // Add logic for 'overdue' status if needed, perhaps in a separate cron job or when fetching invoices
    await invoice.save();
    res.status(201).json({ success: true, data: payment, updatedInvoice: invoice });
});

// @desc    Get all payments for a specific invoice
// @route   GET /api/payments/invoice/:invoiceId
// @access  Private
const getPaymentsForInvoice = asyncHandler(async (req, res) => {
    const invoiceId = req.params.invoiceId;

    // Check if the invoice exists (optional, but good practice)
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
        res.status(404);
        throw new Error('Invoice not found');
    }

    const payments = await Payment.find({ invoice: invoiceId }).populate('recordedBy', 'name email'); // Populate user details
    res.status(200).json({ success: true, count: payments.length, data: payments });
});

// @desc    Get a single payment by ID
// @route   GET /api/payments/:id
// @access  Private
const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id).populate('invoice', 'invoiceNumber totalAmount').populate('recordedBy', 'name email');

    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }
    res.status(200).json({ success: true, data: payment });
});

// @desc    Update a payment
// @route   PUT /api/payments/:id
// @access  Private (e.g., Admin/Manager)
const updatePayment = asyncHandler(async (req, res) => {
    let payment = await Payment.findById(req.params.id);

    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }

    // Ensure the user attempting to update has the right (e.g., admin or manager)
    // This might be handled by the authorize middleware, but an additional check could be here if needed.

    // Store the original amount paid for recalculation
    const originalAmountPaid = payment.amountPaid;
    const invoiceId = payment.invoice;

    // Find required accounts for the journal entry update/reversal
    const accountsReceivableAcc = await ChartOfAccount.findOne({ accountName: 'Accounts Receivable' }); // Assuming this name exists
    const cashOrBankAcc = await ChartOfAccount.findOne({ accountName: 'Cash' }); // Assuming 'Cash' or 'Bank' exists

    if (!accountsReceivableAcc || !cashOrBankAcc) {
        console.error('Required accounting accounts (Accounts Receivable, Cash/Bank) not found for payment update JE.');
    }
    // const invoiceId = payment.invoice; // This was already declared above

    // Update payment details
    // Only update fields that are present in the request body
    const { amountPaid, paymentDate, paymentMethod, transactionId, notes } = req.body;
    if (amountPaid !== undefined) payment.amountPaid = amountPaid;
    if (paymentDate !== undefined) payment.paymentDate = paymentDate;
    if (paymentMethod !== undefined) payment.paymentMethod = paymentMethod;
    if (transactionId !== undefined) payment.transactionId = transactionId;
    if (notes !== undefined) payment.notes = notes;
    // payment.recordedBy = req.user.id; // Or perhaps an 'updatedBy' field

    // --- Start: Automated Journal Entry Update/Correction ---
    // This is more complex. A simple approach is to reverse the original JE and create a new one.
    // A more precise approach is to calculate the difference and create a JE for the difference.
    // Let's create a new JE for the *net change* in amount.
    const amountChange = parseFloat(amountPaid) - originalAmountPaid;

    if (amountChange !== 0 && accountsReceivableAcc && cashOrBankAcc) {
         try {
            const jeDescription = `Payment update for Invoice #${invoice.invoiceNumber}. Net change: ${amountChange >= 0 ? '+' : ''}${amountChange.toFixed(2)}`;
            const journalEntryData = {
                date: new Date(), // Use current date for correction JE
                description: jeDescription,
                referenceNumber: `PAY-EDIT-${payment._id}`, // Link JE to payment ID
                entries: amountChange > 0 ? [ // If amount increased, debit Cash, credit AR
                    { account: cashOrBankAcc._id, debit: amountChange, credit: 0 },
                    { account: accountsReceivableAcc._id, debit: 0, credit: amountChange },
                ] : [ // If amount decreased, debit AR, credit Cash
                    { account: accountsReceivableAcc._id, debit: Math.abs(amountChange), credit: 0 },
                    { account: cashOrBankAcc._id, debit: 0, credit: Math.abs(amountChange) },
                ],
                createdBy: req.user.id,
            };
            await JournalEntry.create(journalEntryData);
            console.log(`Journal Entry created for payment update on Invoice ${invoice.invoiceNumber}.`);
        } catch (jeError) { console.error(`Error creating JE for payment update:`, jeError.message); }
    }
    // --- End: Automated Journal Entry Update/Correction ---

    await payment.save();

    // Recalculate invoice totals
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
        const allPaymentsForInvoice = await Payment.find({ invoice: invoiceId });
        invoice.totalPaid = allPaymentsForInvoice.reduce((acc, p) => acc + p.amountPaid, 0);
        invoice.status = invoice.totalPaid >= invoice.grandTotal ? 'paid' : (invoice.totalPaid > 0 ? 'partially_paid' : (invoice.status === 'sent' ? 'sent' : 'draft')); // Simplified status logic
        await invoice.save();
    }

    res.status(200).json({ success: true, data: payment, updatedInvoice: invoice });
});

// @desc    Delete a payment
// @route   DELETE /api/payments/:id
// @access  Private (e.g., Admin/Manager)
const deletePayment = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
        res.status(404);
        throw new Error('Payment not found');
    }

    // Find required accounts for the journal entry reversal
    const accountsReceivableAcc = await ChartOfAccount.findOne({ accountName: 'Accounts Receivable' }); // Assuming this name exists
    const cashOrBankAcc = await ChartOfAccount.findOne({ accountName: 'Cash' }); // Assuming 'Cash' or 'Bank' exists

    if (!accountsReceivableAcc || !cashOrBankAcc) {
        console.error('Required accounting accounts (Accounts Receivable, Cash/Bank) not found for payment deletion JE.');
    }

    // Ensure the user attempting to delete has the right (e.g., admin or manager)
    // This is typically handled by the authorize middleware.

    const invoiceId = payment.invoice; // Get invoice ID before deleting payment

    await payment.deleteOne(); // or payment.remove() for older Mongoose versions

    // --- Start: Automated Journal Entry Reversal for Payment Deletion ---
    // Reverse the original JE effect
    if (accountsReceivableAcc && cashOrBankAcc && payment.amountPaid > 0) {
        try {
            const jeDescription = `Payment deletion reversal for Invoice #${invoice.invoiceNumber}. Amount: ${payment.amountPaid.toFixed(2)}`;
            const journalEntryData = {
                date: new Date(), // Use current date for reversal JE
                description: jeDescription,
                referenceNumber: `PAY-DEL-${payment._id}`, // Link JE to payment ID
                entries: [
                    { account: accountsReceivableAcc._id, debit: payment.amountPaid, credit: 0 }, // Debit AR (reversing the credit)
                    { account: cashOrBankAcc._id, debit: 0, credit: payment.amountPaid }, // Credit Cash/Bank (reversing the debit)
                ],
                createdBy: req.user.id,
            };
            await JournalEntry.create(journalEntryData);
            console.log(`Journal Entry created for payment deletion on Invoice ${invoice.invoiceNumber}.`);
        } catch (jeError) { console.error(`Error creating JE for payment deletion:`, jeError.message); }
    }
    // --- End: Automated Journal Entry Reversal ---

    // Recalculate invoice totals
    const invoice = await Invoice.findById(invoiceId);
    if (invoice) {
        const allPaymentsForInvoice = await Payment.find({ invoice: invoiceId });
        invoice.totalPaid = allPaymentsForInvoice.reduce((acc, p) => acc + p.amountPaid, 0);
        invoice.status = invoice.totalPaid >= invoice.grandTotal ? 'paid' : (invoice.totalPaid > 0 ? 'partially_paid' : (invoice.status === 'sent' ? 'sent' : 'draft')); // Simplified status logic
        await invoice.save();
    }

    res.status(200).json({ success: true, message: 'Payment removed successfully', updatedInvoice: invoice });
});

module.exports = {
    recordPayment,
    getPaymentsForInvoice,
    getPaymentById,
    updatePayment,
    deletePayment,

};