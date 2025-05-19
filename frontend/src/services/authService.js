import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/auth`;

export const register = async (userData, dispatch) => {
    try {
        const res = await axios.post(`${API_URL}/register`, userData);
        dispatch({
            type: 'REGISTER_SUCCESS',
            payload: { token: res.data.token, user: res.data.data } // Assuming backend sends token on register too
                                                                  // If not, adjust payload accordingly
        });
        return res.data; // Or just success true/false
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        dispatch({
            type: 'AUTH_ERROR',
            payload: message,
        });
        throw new Error(message);
    }
};

export const login = async (userData, dispatch) => {
    try {
        const res = await axios.post(`${API_URL}/login`, userData);
        dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { token: res.data.token, user: { id: res.data.userId, name: res.data.name, email: res.data.email, role: res.data.role } },
        });
        return res.data;
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        dispatch({
            type: 'LOGIN_FAIL',
            payload: message,
        });
        throw new Error(message);
    }
};

export const logout = (dispatch) => {
    dispatch({ type: 'LOGOUT' });
    // Optionally call a backend /logout endpoint if you have one
};

export const loadUser = async (dispatch) => {
    const token = localStorage.getItem('token');
    if (token) {
        try {
            // Set token in a temporary axios instance for this request
            // Or you can set up a global axios instance to always include the token
            const res = await axios.get(`${API_URL}/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            // The /me route returns { success: true, data: { id: '...', role: '...' } }
            // We need to ensure the user object structure matches what LOGIN_SUCCESS expects
            // or create a new action type like USER_LOADED_FROM_TOKEN
            dispatch({ type: 'USER_LOADED', payload: res.data.data }); // res.data.data should be {id, name, email, role}
        } catch (err) {
            dispatch({ type: 'AUTH_ERROR' }); // Token is invalid or expired
        }
    } else {
        dispatch({ type: 'AUTH_ERROR' }); // No token found
    }
};