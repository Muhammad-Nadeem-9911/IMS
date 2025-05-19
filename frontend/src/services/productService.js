import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/products`;

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

export const getProducts = async (page = 1, limit = 10, searchTerm = '') => {
    try {
        const params = new URLSearchParams();
        params.append('page', page.toString());
        params.append('limit', limit.toString());
        if (searchTerm) {
            params.append('search', searchTerm);
        }
        const res = await axiosAuth().get(`/?${params.toString()}`);
        return res.data; // { success: true, count: N, data: [...] }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getProductById = async (id) => {
    try {
        const res = await axiosAuth().get(`/${id}`);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const createProduct = async (productData) => {
    try {
        const res = await axiosAuth().post('/', productData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const updateProduct = async (id, productData) => {
    try {
        const res = await axiosAuth().put(`/${id}`, productData);
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const deleteProduct = async (id) => {
    try {
        const res = await axiosAuth().delete(`/${id}`);
        return res.data; // { success: true, data: {} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getProductStatsByCategory = async () => {
    try {
        const res = await axiosAuth().get('/stats/category-count'); // Uses the same baseURL as other product routes
        return res.data; // { success: true, data: [{ _id: "CategoryName", count: X }, ...] }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};