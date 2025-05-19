const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.ObjectId,
        ref: 'Product',
        // required: true // Make it required if every item must be linked to a product
    },
    productName: { // Store name at time of invoice in case product name changes later
        type: String,
        required: true,
    },
    description: String, // Optional: item-specific description
    quantity: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    },
    unitPrice: { // Price per unit at the time of invoice
        type: Number,
        required: true
    },
    totalPrice: { // quantity * unitPrice
        type: Number,
        required: true
    }
}, { _id: false }); // No separate _id for subdocuments unless needed

const InvoiceSchema = new mongoose.Schema({
    invoiceNumber: {
        type: String,
        required: true,
        unique: true,
        // You might want a custom function to generate sequential invoice numbers
    },
    customer: { // This will store the ObjectId of the selected customer
        type: mongoose.Schema.ObjectId,
        ref: 'Customer',
        required: [true, 'Please select a customer'],
    },
    invoiceDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    dueDate: {
        type: Date,
    },
    items: [InvoiceItemSchema],
    subTotal: { // Sum of all item.totalPrice
        type: Number,
        required: true
    },
    taxRate: { // Percentage, e.g., 18 for 18%
        type: Number,
        default: 0
    },
    taxAmount: {
        type: Number,
        default: 0
    },
    grandTotal: { // subTotal + taxAmount
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void'],
        default: 'draft'
    },
    totalPaid: {
        type: Number,
        default: 0
    },
    // balanceDue will often be calculated (totalAmount - totalPaid)
    // but storing it can be useful for querying.
    // We'll update it when a payment is made.
    notes: String, // Any additional notes for the invoice
    // user: { // User who created the invoice
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    //     required: true
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Invoice', InvoiceSchema);