const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
    invoice: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Invoice',
        required: [true, 'Invoice ID is required for a payment.']
    },
    amountPaid: {
        type: Number,
        required: [true, 'Payment amount is required.']
    },
    paymentDate: {
        type: Date,
        default: Date.now,
        required: [true, 'Payment date is required.']
    },
    paymentMethod: {
        type: String,
        required: [true, 'Payment method is required.'],
        enum: ['Cash', 'Credit Card', 'Bank Transfer', 'Online Payment', 'Other'] // Example methods
    },
    transactionId: { // Optional, for external references like Stripe ID, bank transaction ID, etc.
        type: String
    },
    notes: {
        type: String
    },
    recordedBy: { // User who recorded this payment
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, { timestamps: true }); // Adds createdAt and updatedAt timestamps

module.exports = mongoose.model('Payment', paymentSchema);