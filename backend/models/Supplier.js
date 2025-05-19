const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    zipCode: { type: String, trim: true },
    country: { type: String, trim: true }
}, { _id: false }); // _id: false for subdocuments if not needed as separate entities

const supplierSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Supplier name is required.'],
        trim: true,
        unique: true // Assuming supplier names should be unique
    },
    contactPerson: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Supplier email is required.'],
        trim: true,
        lowercase: true,
        unique: true, // Assuming supplier emails should be unique
        match: [/\S+@\S+\.\S+/, 'Please use a valid email address.']
    },
    phone: {
        type: String,
        trim: true
    },
    address: addressSchema,
    notes: {
        type: String,
        trim: true
    },
    // You could add fields like 'paymentTerms', 'website', etc. in the future
    // Timestamps
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: { type: Date }
});

module.exports = mongoose.model('Supplier', supplierSchema);