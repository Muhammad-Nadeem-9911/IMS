import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/invoices`;

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

export const getInvoices = async (page = 1, limit = 10, searchTerm = '') => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (searchTerm) {
            // URLSearchParams handles encoding, so encodeURIComponent is not explicitly needed here
            params.append('search', searchTerm);
        }
        const res = await axiosAuth().get(`/?${params.toString()}`);
        return res.data; // { success: true, count: N, data: [...] }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getInvoiceById = async (id) => {
    try {
        const res = await axiosAuth().get(`/${id}`);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const createInvoice = async (invoiceData) => {
    try {
        const res = await axiosAuth().post('/', invoiceData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const updateInvoice = async (id, invoiceData) => {
    try {
        const res = await axiosAuth().put(`/${id}`, invoiceData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const deleteInvoice = async (id) => {
    try {
        const res = await axiosAuth().delete(`/${id}`);
        return res.data; // { success: true, message: 'Invoice removed' } or similar
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};