const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PurchaseOrderItemSchema = new Schema({
    product: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    productName: { // Store name at time of PO in case product name changes
        type: String,
        required: true,
    },
    quantityOrdered: {
        type: Number,
        required: true,
        min: [1, 'Quantity ordered must be at least 1']
    },
    unitPrice: { // Price per unit at the time of PO
        type: Number,
        required: true,
        min: [0, 'Unit price cannot be negative']
    },
    totalPrice: { // quantityOrdered * unitPrice
        type: Number,
        required: true
    },
    quantityReceived: {
        type: Number,
        default: 0,
        min: [0, 'Quantity received cannot be negative']
    }
}, { _id: true }); // Or simply remove `, { _id: false }` as _id is true by default for subdocuments

const PurchaseOrderSchema = new Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    supplier: {
        type: Schema.Types.ObjectId,
        ref: 'Supplier',
        required: [true, 'Please select a supplier']
    },
    orderDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    expectedDeliveryDate: {
        type: Date
    },
    items: [PurchaseOrderItemSchema],
    subTotal: { // Sum of all item.totalPrice
        type: Number,
        required: true,
        default: 0
    },
    // You can add tax, shipping, discounts later if needed
    grandTotal: {
        type: Number,
        required: true,
        default: 0
    },
    status: {
        type: String,
        enum: ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'],
        default: 'Draft'
    },
    notes: String,
    // createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true }); // Adds createdAt and updatedAt

module.exports = mongoose.model('PurchaseOrder', PurchaseOrderSchema);