import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/payments`;

// Helper to get the auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper to create an Axios instance with Authorization header
const axiosAuth = () => {
    const token = getAuthToken();
    return axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
};

/**
 * Records a new payment for an invoice.
 * @param {object} paymentData - The payment details.
 * @param {string} paymentData.invoiceId - The ID of the invoice.
 * * @param {number} paymentData.amountPaid - The amount paid.
 * * @param {string} paymentData.paymentDate - The date of payment.
 * * @param {string} paymentData.paymentMethod - The method of payment.
 * * @param {string} [paymentData.transactionId] - Optional transaction ID.
 * * @param {string} [paymentData.notes] - Optional notes.
 * @returns {Promise<object>} The API response.
 */
export const recordPayment = async (paymentData) => {
    try {
        const res = await axiosAuth().post('/', paymentData);
        return res.data; // { success: true, data: payment, updatedInvoice: invoice }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getPaymentsForInvoice = async (invoiceId) => {
    try {
        const res = await axiosAuth().get(`/invoice/${invoiceId}`);
        return res.data; // { success: true, count: N, data: [...] }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getPaymentById = async (paymentId) => {
    try {
        const res = await axiosAuth().get(`/${paymentId}`);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const updatePayment = async (paymentId, paymentData) => {
    try {
        const res = await axiosAuth().put(`/${paymentId}`, paymentData);
        return res.data; // { success: true, data: payment, updatedInvoice: invoice }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const deletePayment = async (paymentId) => {
    try {
        const res = await axiosAuth().delete(`/${paymentId}`);
        return res.data; // { success: true, message: '...', updatedInvoice: invoice }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};