const mongoose = require('mongoose');

const chartOfAccountSchema = new mongoose.Schema({
    accountName: {
        type: String,
        required: [true, 'Account name is required.'],
        trim: true,
        unique: true, // Assuming account names should be unique
    },
    accountCode: {
        type: String,
        required: [true, 'Account code is required.'],
        trim: true,
        unique: true, // Assuming account codes should be unique
    },
    accountType: {
        type: String,
        required: [true, 'Account type is required.'],
        enum: ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'], // Core account types
    },
    description: {
        type: String,
        trim: true,
    },
    isActive: {
        type: Boolean,
        default: true,
    },
    isSystemAccount: { // Optional: To identify accounts created by the system
        type: Boolean,
        default: false,
    }
}, { timestamps: true });

module.exports = mongoose.model('ChartOfAccount', chartOfAccountSchema);