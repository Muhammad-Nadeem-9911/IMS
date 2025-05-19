import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/customers`;

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

export const getCustomers = async (page = 1, limit = 10, searchTerm = '') => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        // The backend should ideally return a structure like:
        // { success: true, count: TotalNumberOfMatchingCustomers, data: [CustomerForCurrentPage] }
        const res = await axiosAuth().get(`/?${params.toString()}`);
        return res.data;
    } catch (err) {
        // Keep existing error handling
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getCustomerById = async (id) => {
    try {
        const res = await axiosAuth().get(`/${id}`);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const createCustomer = async (customerData) => {
    try {
        const res = await axiosAuth().post('/', customerData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const updateCustomer = async (id, customerData) => {
    try {
        const res = await axiosAuth().put(`/${id}`, customerData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const deleteCustomer = async (id) => {
    try {
        const res = await axiosAuth().delete(`/${id}`);
        return res.data; // { success: true, message: 'Customer removed' } or similar
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};