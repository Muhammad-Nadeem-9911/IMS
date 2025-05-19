import { api } from '../api';

/**
 * Fetches all suppliers.
 * @returns {Promise<Object>} The response from the API.
 */
export const getSuppliers = async () => {
    try {
        const response = await api.get('/suppliers');
        return response.data; // Assuming the backend returns { success: true, data: [...] }
    } catch (error) {
        console.error('Error fetching suppliers:', error.response || error.message);
        throw error.response?.data || { message: error.message || 'Failed to fetch suppliers' };
    }
};

/**
 * Fetches a single supplier by its ID.
 * @param {string} id The ID of the supplier.
 * @returns {Promise<Object>} The response from the API.
 */
export const getSupplierById = async (id) => {
    try {
        const response = await api.get(`/suppliers/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error fetching supplier with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to fetch supplier ${id}` };
    }
};

/**
 * Creates a new supplier.
 * @param {Object} supplierData The data for the new supplier.
 * @returns {Promise<Object>} The response from the API.
 */
export const createSupplier = async (supplierData) => {
    try {
        const response = await api.post('/suppliers', supplierData);
        return response.data;
    } catch (error) {
        console.error('Error creating supplier:', error.response || error.message);
        throw error.response?.data || { message: error.message || 'Failed to create supplier' };
    }
};

/**
 * Updates an existing supplier.
 * @param {string} id The ID of the supplier to update.
 * @param {Object} supplierData The updated data for the supplier.
 * @returns {Promise<Object>} The response from the API.
 */
export const updateSupplier = async (id, supplierData) => {
    try {
        const response = await api.put(`/suppliers/${id}`, supplierData);
        return response.data;
    } catch (error) {
        console.error(`Error updating supplier with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to update supplier ${id}` };
    }
};

/**
 * Deletes a supplier by its ID.
 * @param {string} id The ID of the supplier to delete.
 * @returns {Promise<Object>} The response from the API.
 */
export const deleteSupplier = async (id) => {
    try {
        const response = await api.delete(`/suppliers/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting supplier with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to delete supplier ${id}` };
    }
};