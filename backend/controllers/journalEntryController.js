const JournalEntry = require('../models/JournalEntry');
const ChartOfAccount = require('../models/ChartOfAccount'); // To validate accounts
const mongoose = require('mongoose');

// @desc    Create a new journal entry
// @route   POST /api/journal-entries
// @access  Private (Admin/Manager)
exports.createJournalEntry = async (req, res) => {
    const { date, description, referenceNumber, entries } = req.body;

    // Basic validation
    if (!date || !description || !entries || entries.length < 2) {
        return res.status(400).json({ success: false, message: 'Please provide date, description, and at least two entry lines.' });
    }

    let totalDebits = 0;
    let totalCredits = 0;
    const accountIds = [];

    for (const entry of entries) {
        if (!entry.account || (entry.debit === 0 && entry.credit === 0) || (entry.debit > 0 && entry.credit > 0)) {
            return res.status(400).json({ success: false, message: 'Each entry line must have an account, and either a debit or a credit amount (not both, and not zero for both).' });
        }
        if (entry.debit < 0 || entry.credit < 0) {
            return res.status(400).json({ success: false, message: 'Debit and credit amounts cannot be negative.' });
        }
        totalDebits += entry.debit || 0;
        totalCredits += entry.credit || 0;
        if (!mongoose.Types.ObjectId.isValid(entry.account)) {
            return res.status(400).json({ success: false, message: `Invalid account ID format: ${entry.account}` });
        }
        accountIds.push(entry.account);
    }

    // Round to handle potential floating point inaccuracies (e.g., 2 decimal places for currency)
    totalDebits = Math.round(totalDebits * 100) / 100;
    totalCredits = Math.round(totalCredits * 100) / 100;

    if (totalDebits !== totalCredits) {
        return res.status(400).json({ success: false, message: `Debits (₹${totalDebits}) must equal Credits (₹${totalCredits}).` });
    }

    if (totalDebits === 0) { // Which also means totalCredits is 0
        return res.status(400).json({ success: false, message: 'Total debits and credits cannot both be zero.' });
    }

    try {
        // Verify all accounts exist and are active
        const foundAccounts = await ChartOfAccount.find({ _id: { $in: accountIds }, isActive: true });
        if (foundAccounts.length !== accountIds.length) {
            const foundAccountIds = foundAccounts.map(acc => acc._id.toString());
            const missingOrInactive = accountIds.filter(id => !foundAccountIds.includes(id));
            return res.status(400).json({ success: false, message: `One or more accounts are invalid, not found, or inactive: ${missingOrInactive.join(', ')}` });
        }

        const newJournalEntry = new JournalEntry({
            date,
            description,
            referenceNumber,
            entries,
            createdBy: req.user.id, // Assuming req.user is populated by auth middleware
        });

        const savedEntry = await newJournalEntry.save();
        res.status(201).json({ success: true, data: savedEntry, message: 'Journal entry created successfully.' });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        console.error("Error creating journal entry:", error);
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Get all journal entries
// @route   GET /api/journal-entries
// @access  Private (Admin/Manager)
exports.getJournalEntries = async (req, res) => {
    try {
        // Basic pagination (can be enhanced later)
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const skip = (page - 1) * limit;

        const entries = await JournalEntry.find()
            .populate('createdBy', 'name email') // Populate user details
            .populate('entries.account', 'accountName accountCode accountType') // Populate account details within entries
            .sort({ date: -1, createdAt: -1 }) // Sort by date descending, then by creation time
            .skip(skip)
            .limit(limit);

        const total = await JournalEntry.countDocuments();

        res.status(200).json({
            success: true,
            count: entries.length,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalEntries: total
            },
            data: entries
        });
    } catch (error) {
        console.error("Error fetching journal entries:", error);
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Get single journal entry by ID
// @route   GET /api/journal-entries/:id
// @access  Private (Admin/Manager)
exports.getJournalEntryById = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid Journal Entry ID format.' });
        }

        const entry = await JournalEntry.findById(req.params.id)
            .populate('createdBy', 'name email')
            .populate('entries.account', 'accountName accountCode accountType');

        if (!entry) {
            return res.status(404).json({ success: false, message: 'Journal entry not found' });
        }
        res.status(200).json({ success: true, data: entry });
    } catch (error) {
        console.error("Error fetching journal entry by ID:", error);
        if (error.kind === 'ObjectId') { // Should be caught by the isValid check above, but good fallback
            return res.status(404).json({ success: false, message: 'Journal entry not found (invalid ID format)' });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// Future: updateJournalEntry, deleteJournalEntry (or reverseJournalEntry)