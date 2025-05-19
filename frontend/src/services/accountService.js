import { api } from '../api'; // Changed to named import

// Expected structure from backend:
// { success: boolean, data: Account | Account[], message?: string }

export const getAccounts = async () => {
    try {
        const response = await api.get('/accounts');
        return response.data;
    } catch (error) {
        console.error('Error fetching accounts:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const getAccountById = async (id) => {
    try {
        const response = await api.get(`/accounts/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching account ${id}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const createAccount = async (accountData) => {
    try {
        const response = await api.post('/accounts', accountData);
        return response.data;
    } catch (error) {
        console.error('Error creating account:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const updateAccount = async (id, accountData) => {
    try {
        const response = await api.put(`/accounts/${id}`, accountData);
        return response.data;
    } catch (error) {
        console.error(`Error updating account ${id}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const deleteAccount = async (id) => {
    try {
        const response = await api.delete(`/accounts/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting account ${id}:`, error.response?.data || error.message);
        throw error.response?.data || error;
    }
};