const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a customer name'],
        trim: true,
        maxlength: [100, 'Name can not be more than 100 characters']
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        // unique: true, // Consider if email must be unique across all customers
        // sparse: true, // Allows multiple null/undefined emails if not unique
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    phone: {
        type: String,
        trim: true,
        maxlength: [20, 'Phone number can not be more than 20 characters']
    },
    address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String,
    },
    // billingAddress: { // Optional: if different from main address
    //     street: String,
    //     city: String,
    //     state: String,
    //     postalCode: String,
    //     country: String,
    // },
    taxId: { // e.g., GSTIN, VAT number
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    },
    // user: { // User who created/manages this customer (optional)
    //     type: mongoose.Schema.ObjectId,
    //     ref: 'User',
    // },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Customer', CustomerSchema);