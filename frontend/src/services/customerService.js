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

export const getCustomers = async () => {
    try {
        const res = await axiosAuth().get('/');
        return res.data; // { success: true, count: N, data: [...] }
    } catch (err) {
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