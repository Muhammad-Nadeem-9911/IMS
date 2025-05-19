import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/company-profile`;

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

export const getCompanyProfile = async () => {
    try {
        const res = await axiosAuth().get('/');
        return res.data; // { success: true, data: {...} or null }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const upsertCompanyProfile = async (profileData) => {
    try {
        const res = await axiosAuth().put('/', profileData); // Using PUT for upsert, backend handles create/update
        return res.data; // { success: true, data: {...} }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};