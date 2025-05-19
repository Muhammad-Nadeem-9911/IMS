const mongoose = require('mongoose');

const CompanyProfileSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: [true, 'Please add your company name'],
        trim: true,
        unique: true // Assuming only one company profile for the system
    },
    address: {
        type: String,
        required: [true, 'Please add your company address']
    },
    phone: {
        type: String,
    },
    email: {
        type: String,
        match: [
            /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
            'Please add a valid email',
        ],
    },
    website: {
        type: String,
    },
    logoUrl: { // URL to the company logo image
        type: String,
        // We'll handle image uploads separately if needed, for now, just a URL
    },
    taxId: { // e.g., GSTIN, VAT number
        type: String,
    },
    // Add any other company-specific details you need on invoices
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('CompanyProfile', CompanyProfileSchema);