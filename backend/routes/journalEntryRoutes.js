const express = require('express');
const router = express.Router();
const {
    createJournalEntry,
    getJournalEntries,
    getJournalEntryById
} = require('../controllers/journalEntryController');
const { protect, authorize } = require('../middleware/authMiddleware'); // Assuming you have this

// Define roles that can access these routes
const viewRoles = ['admin', 'manager'];
const manageRoles = ['admin'];

router.route('/')
    .post(protect, authorize(manageRoles), createJournalEntry)
    .get(protect, authorize(viewRoles), getJournalEntries);

router.route('/:id')
    .get(protect, authorize(viewRoles), getJournalEntryById);

// Future: Routes for updating/deleting (or reversing) journal entries

module.exports = router;