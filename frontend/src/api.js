import axios from 'axios';

// Define the base URL for your API.
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api'; // Updated port to 5001


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to add the JWT token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // Or however you store your token
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export { api }; // Changed to named export
