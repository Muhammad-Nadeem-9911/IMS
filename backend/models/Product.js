const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    sku: { // Stock Keeping Unit
        type: String,
        required: [true, 'Please add a SKU'],
        unique: true,
        trim: true,
        maxlength: [50, 'SKU can not be more than 50 characters']
    },
    description: {
        type: String,
        required: [true, 'Please add a description'],
        maxlength: [1000, 'Description can not be more than 1000 characters']
    },
    category: {
        type: String,
        required: [true, 'Please add a category'],
        trim: true
    },
    purchasePrice: {
        type: Number,
        required: [true, 'Please add a purchase price'],
        min: [0, 'Purchase price cannot be negative']
    },
    sellingPrice: {
        type: Number,
        required: [true, 'Please add a selling price'],
        min: [0, 'Selling price cannot be negative']
    },
    quantityInStock: {
        type: Number,
        required: true,
        default: 0,
        min: [0, 'Stock quantity cannot be negative']
    },
    supplier: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Supplier', // Reference to the Supplier model
        // required: false // Make it optional for now, or true if every product MUST have a supplier
    },
    user: { // The user who added/manages this product (optional, for tracking)
        type: mongoose.Schema.ObjectId,
        ref: 'User',
        // required: true // Make it required if every product must be linked to a user
    },
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('Product', ProductSchema);