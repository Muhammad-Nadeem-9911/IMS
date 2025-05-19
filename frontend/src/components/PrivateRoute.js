import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthState } from '../contexts/AuthContext';

const PrivateRoute = ({ allowedRoles }) => {
    const { isAuthenticated, user, loading } = useAuthState();

    if (loading) {
        return <p>Loading authentication state...</p>; // Or a spinner
    }

    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />; // Or an "Unauthorized" page
    }
    return <Outlet />; // Render child routes/component
};
export default PrivateRoute;