import { api } from '../api';

/**
 * Fetches all purchase orders.
 * @returns {Promise<Object>} The response from the API.
 */
export const getPurchaseOrders = async (page = 1, limit = 10, searchTerm = '') => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        const response = await api.get(`/purchase-orders?${params.toString()}`);
        return response.data; // Expects { success: true, count: N, data: [...] }
    } catch (error) {
        console.error('Error fetching purchase orders:', error.response || error.message);
        throw error.response?.data || { message: error.message || 'Failed to fetch purchase orders' };
    }
};

/**
 * Fetches a single purchase order by its ID.
 * @param {string} id The ID of the purchase order.
 * @returns {Promise<Object>} The response from the API.
 */
export const getPurchaseOrderById = async (id) => {
    try {
        const response = await api.get(`/purchase-orders/${id}`);
        return response.data; // Assuming backend returns { success: true, data: {...} }
    } catch (error) {
        console.error(`Error fetching purchase order with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to fetch purchase order ${id}` };
    }
};

/**
 * Creates a new purchase order.
 * @param {Object} poData The data for the new purchase order.
 * @returns {Promise<Object>} The response from the API.
 */
export const createPurchaseOrder = async (poData) => {
    try {
        const response = await api.post('/purchase-orders', poData);
        return response.data;
    } catch (error) {
        console.error('Error creating purchase order:', error.response || error.message);
        throw error.response?.data || { message: error.message || 'Failed to create purchase order' };
    }
};

/**
 * Updates an existing purchase order.
 * @param {string} id The ID of the purchase order to update.
 * @param {Object} poData The updated data for the purchase order.
 * @returns {Promise<Object>} The response from the API.
 */
export const updatePurchaseOrder = async (id, poData) => {
    try {
        const response = await api.put(`/purchase-orders/${id}`, poData);
        return response.data;
    } catch (error) {
        console.error(`Error updating purchase order with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to update purchase order ${id}` };
    }
};

/**
 * Deletes a purchase order by its ID.
 * @param {string} id The ID of the purchase order to delete.
 * @returns {Promise<Object>} The response from the API.
 */
export const deletePurchaseOrder = async (id) => {
    try {
        const response = await api.delete(`/purchase-orders/${id}`);
        return response.data;
    } catch (error) {
        console.error(`Error deleting purchase order with ID ${id}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to delete purchase order ${id}` };
    }
};

/**
 * Records received items against a purchase order.
 * @param {string} poId The ID of the purchase order.
 * @param {Array<Object>} itemsToReceive Array of items with quantities received. Example: [{ itemId: String, quantityNewlyReceived: Number }]
 * @returns {Promise<Object>} The response from the API.
 */
export const receivePurchaseOrderItems = async (poId, itemsToReceive) => {
    try {
        const response = await api.post(`/purchase-orders/${poId}/receive`, { itemsToReceive });
        return response.data;
    } catch (error) {
        console.error(`Error receiving items for PO ID ${poId}:`, error.response || error.message);
        throw error.response?.data || { message: error.message || `Failed to receive items for PO ${poId}` };
    }
};