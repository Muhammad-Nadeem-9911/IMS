const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const journalLineSchema = new Schema({
    account: {
        type: Schema.Types.ObjectId,
        ref: 'ChartOfAccount', // Reference to our ChartOfAccount model
        required: [true, 'Account is required for each journal line.'],
    },
    debit: {
        type: Number,
        default: 0,
        min: [0, 'Debit amount cannot be negative.'],
    },
    credit: {
        type: Number,
        default: 0,
        min: [0, 'Credit amount cannot be negative.'],
    },
    // You could add a description per line item if needed:
    // lineDescription: { type: String, trim: true }
}, { _id: false }); // _id: false because these are subdocuments within a JournalEntry

const journalEntrySchema = new Schema({
    date: {
        type: Date,
        required: [true, 'Transaction date is required.'],
        default: Date.now,
    },
    description: {
        type: String,
        required: [true, 'Transaction description is required.'],
        trim: true,
    },
    referenceNumber: { // Optional, e.g., invoice #, check #
        type: String,
        trim: true,
    },
    entries: [journalLineSchema], // Array of debit/credit lines
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User', // Assuming you have a User model
        required: true,
    },
}, { timestamps: true }); // Adds createdAt and updatedAt automatically

module.exports = mongoose.model('JournalEntry', journalEntrySchema);