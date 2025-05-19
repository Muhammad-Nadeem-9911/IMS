import { api } from '../api'; // Assuming api.js is in src/ and uses named export

// Expected structure from backend for create:
// { success: boolean, data: JournalEntry, message?: string }
// Expected structure from backend for get all:
// { success: boolean, count: number, pagination: object, data: JournalEntry[], message?: string }
// Expected structure from backend for get by ID:
// { success: boolean, data: JournalEntry, message?: string }

export const createJournalEntry = async (entryData) => {
    try {
        const response = await api.post('/journal-entries', entryData);
        return response.data;
    } catch (error) {
        console.error('Error creating journal entry:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getJournalEntries = async (page = 1, limit = 10) => {
    try {
        const response = await api.get(`/journal-entries?page=${page}&limit=${limit}`);
        return response.data;
    } catch (error) {
        console.error('Error fetching journal entries:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getJournalEntryById = async (id) => {
    try {
        const response = await api.get(`/journal-entries/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching journal entry ${id}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// Future: updateJournalEntry, deleteJournalEntry (or reverseJournalEntry)