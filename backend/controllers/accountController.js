const ChartOfAccount = require('../models/ChartOfAccount');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Private (Admin/Manager)
exports.getAccounts = async (req, res) => {
    try {
        const accounts = await ChartOfAccount.find().sort({ accountCode: 1 }); // Sort by account code
        res.status(200).json({ success: true, count: accounts.length, data: accounts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Get single account by ID
// @route   GET /api/accounts/:id
// @access  Private (Admin/Manager)
exports.getAccountById = async (req, res) => {
    try {
        const account = await ChartOfAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }
        res.status(200).json({ success: true, data: account });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Account not found (invalid ID format)' });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Create a new account
// @route   POST /api/accounts
// @access  Private (Admin/Manager)
exports.createAccount = async (req, res) => {
    // Destructure, but explicitly ignore isSystemAccount from user input for creation
    const { accountName, accountCode, accountType, description, isActive, isSystemAccount: userAttemptSetSystem } = req.body;

    if (userAttemptSetSystem === true) {
        return res.status(403).json({ success: false, message: 'Cannot manually set an account as a system account. This is managed internally.' });
    }


    try {
        // Basic validation
        if (!accountName || !accountCode || !accountType) {
            return res.status(400).json({ success: false, message: 'Please provide account name, code, and type.' });
        }

        // Check for duplicate account code or name
        let existingAccount = await ChartOfAccount.findOne({ $or: [{ accountCode }, { accountName }] });
        if (existingAccount) {
            const field = existingAccount.accountCode === accountCode ? 'code' : 'name';
            return res.status(400).json({ success: false, message: `An account with this ${field} already exists.` });
        }

        const newAccount = new ChartOfAccount({
            accountName,
            accountCode,
            accountType,
            description,
            isActive,
            isSystemAccount: false // Ensure user-created accounts are NOT system accounts
        });

        const account = await newAccount.save();
        res.status(201).json({ success: true, data: account, message: 'Account created successfully.' });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Update an account
// @route   PUT /api/accounts/:id
// @access  Private (Admin/Manager)
exports.updateAccount = async (req, res) => {
    // Destructure, explicitly handling isSystemAccount
    const { accountName, accountCode, accountType, description, isActive, isSystemAccount: userAttemptChangeSystemFlag } = req.body;

    try {
        let account = await ChartOfAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        // Prevent changing the isSystemAccount flag directly by users
        if (userAttemptChangeSystemFlag !== undefined && userAttemptChangeSystemFlag !== account.isSystemAccount) {
            return res.status(403).json({ success: false, message: 'The isSystemAccount flag cannot be changed manually.' });
        }

        if (account.isSystemAccount) {
            // For system accounts, only allow description and isActive to be updated.
            // Prevent changes to accountName, accountCode, accountType.
            if (accountName !== undefined && accountName !== account.accountName) {
                return res.status(403).json({ success: false, message: `System account '${account.accountName}' name cannot be changed.` });
            }
            if (accountCode !== undefined && accountCode !== account.accountCode) {
                return res.status(403).json({ success: false, message: `System account '${account.accountName}' code cannot be changed.` });
            }
            if (accountType !== undefined && accountType !== account.accountType) {
                return res.status(403).json({ success: false, message: `System account '${account.accountName}' type cannot be changed.` });
            }
            account.description = description !== undefined ? description : account.description;
            account.isActive = isActive !== undefined ? isActive : account.isActive;
        } else {
            // For non-system accounts, proceed with updates but check for duplicates

        // Check for duplicate account code or name, excluding the current account
        if (accountCode && accountCode !== account.accountCode) {
            const existingByCode = await ChartOfAccount.findOne({ accountCode, _id: { $ne: req.params.id } });
            if (existingByCode) {
                return res.status(400).json({ success: false, message: 'Another account with this code already exists.' });
            }
        }
        if (accountName && accountName !== account.accountName) {
            const existingByName = await ChartOfAccount.findOne({ accountName, _id: { $ne: req.params.id } });
            if (existingByName) {
                return res.status(400).json({ success: false, message: 'Another account with this name already exists.' });
            }
        }
            // Apply updates for non-system accounts
            account.accountName = accountName !== undefined ? accountName : account.accountName;
            account.accountCode = accountCode !== undefined ? accountCode : account.accountCode;
            account.accountType = accountType !== undefined ? accountType : account.accountType;
            account.description = description !== undefined ? description : account.description;
            account.isActive = isActive !== undefined ? isActive : account.isActive;
        }

        await account.validate(); // Manually trigger validation
        await account.save();

        res.status(200).json({ success: true, data: account, message: 'Account updated successfully.' });
    } catch (error) {
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Account not found (invalid ID format)' });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};

// @desc    Delete an account
// @route   DELETE /api/accounts/:id
// @access  Private (Admin/Manager)
exports.deleteAccount = async (req, res) => {
    try {
        const account = await ChartOfAccount.findById(req.params.id);
        if (!account) {
            return res.status(404).json({ success: false, message: 'Account not found' });
        }

        if (account.isSystemAccount) {
            return res.status(403).json({ success: false, message: `System account '${account.accountName}' cannot be deleted.` });
        }

        // Note: Consider implications of deleting accounts if they are linked to transactions.
        // You might want to prevent deletion if linked, or implement a soft delete (isActive: false).
        await ChartOfAccount.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: 'Account deleted successfully.' });
    } catch (error) {
        if (error.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Account not found (invalid ID format)' });
        }
        res.status(500).json({ success: false, message: 'Server Error: ' + error.message });
    }
};