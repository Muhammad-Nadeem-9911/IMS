import { api } from '../api'; // Corrected import for named export and path

const API_URL = '/users'; // Base URL for user endpoints

// Get all users (Admin)
export const getUsers = async () => {
    try {
        const response = await api.get(API_URL);
        return response.data; // { success: true, count: Number, data: [User] }
    } catch (error) {
        console.error('Error fetching users:', error.response?.data || error.message);
        throw error.response?.data || { success: false, message: error.message };
    }
};

// Get a single user by ID (Admin)
export const getUserById = async (userId) => {
    try {
        const response = await api.get(`${API_URL}/${userId}`);
        return response.data; // { success: true, data: User }
    } catch (error) {
        console.error(`Error fetching user ${userId}:`, error.response?.data || error.message);
        throw error.response?.data || { success: false, message: error.message };
    }
};

// Create a new user (Admin)
export const createUser = async (userData) => {
    try {
        const response = await api.post(API_URL, userData);
        return response.data; // { success: true, data: User, message: String }
    } catch (error) {
        console.error('Error creating user:', error.response?.data || error.message);
        throw error.response?.data || { success: false, message: error.message };
    }
};

// Update user details (Admin)
export const updateUser = async (userId, userData) => {
    try {
        const response = await api.put(`${API_URL}/${userId}`, userData);
        return response.data; // { success: true, data: User, message: String }
    } catch (error) {
        console.error(`Error updating user ${userId}:`, error.response?.data || error.message);
        throw error.response?.data || { success: false, message: error.message };
    }
};

// Deactivate/Delete a user (Admin) - Backend handles soft delete (isActive=false)
export const deleteUser = async (userId) => {
    try {
        const response = await api.delete(`${API_URL}/${userId}`);
        return response.data; // { success: true, message: String, data: User (deactivated) }
    } catch (error) {
        console.error(`Error deleting/deactivating user ${userId}:`, error.response?.data || error.message);
        throw error.response?.data || { success: false, message: error.message };
    }
};

// Get current logged-in user's profile
export const getUserProfile = async () => {
    try {
        const response = await api.get(`${API_URL}/profile`);
        return response.data; // { success: true, data: User }
    } catch (error) {
        console.error('Error fetching user profile:', error.response?.data || error.message);
        // If profile fetch fails (e.g., token expired), it might indicate an issue with auth state
        // Consider dispatching a logout action here if appropriate for your app's logic
        throw error.response?.data || { success: false, message: error.message };
    }
};

// You might also want a function to update the current user's own profile
// export const updateUserProfile = async (profileData) => { ... }