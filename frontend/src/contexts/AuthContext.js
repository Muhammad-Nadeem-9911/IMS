import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { loadUser as loadUserService } from '../services/authService'; // Import the service

const AuthStateContext = createContext();
const AuthDispatchContext = createContext();


const initialState = {
    token: localStorage.getItem('token'), // Load token from localStorage on initial load
    user: null,
    isAuthenticated: false,
    loading: true, // Start as true, loadUser will set it to false
    error: null,
};

const authReducer = (state, action) => {
    switch (action.type) {
        case 'LOGIN_SUCCESS':
        case 'REGISTER_SUCCESS':
            localStorage.setItem('token', action.payload.token);
            return {
                ...state,
                isAuthenticated: true,
                token: action.payload.token,
                user: action.payload.user,
                loading: false,
                error: null,
            };
        case 'AUTH_ERROR':
        case 'USER_LOAD_FAIL': // Add a specific case for load user failure if needed
        case 'LOGIN_FAIL':
        case 'LOGOUT':
            localStorage.removeItem('token');
            return {
                ...state,
                token: null,
                isAuthenticated: false,
                user: null,
                loading: false,
                error: action.payload,
            };
        case 'USER_LOADED':
             return {
                ...state,
                isAuthenticated: true,
                user: action.payload,
                loading: false,
                error: null,
            };
        case 'SET_LOADING':
            return { ...state, loading: true };
        case 'CLEAR_ERRORS':
            return { ...state, error: null };
        default:
            throw new Error(`Unhandled action type: ${action.type}`);
    }
};

export const AuthProvider = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    useEffect(() => {
        loadUserService(dispatch);
    }, []); // Empty dependency array means this runs once on mount
    
    return (
        <AuthStateContext.Provider value={state}>
            <AuthDispatchContext.Provider value={dispatch}>
                {children}
            </AuthDispatchContext.Provider>
        </AuthStateContext.Provider>
    );
};

export const useAuthState = () => {
    const context = useContext(AuthStateContext);
    if (context === undefined) throw new Error('useAuthState must be used within an AuthProvider');
    return context;
};

export const useAuthDispatch = () => {
    const context = useContext(AuthDispatchContext);
    if (context === undefined) throw new Error('useAuthDispatch must be used within an AuthProvider');
    return context;
};