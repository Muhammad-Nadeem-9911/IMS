import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthDispatch, useAuthState } from '../contexts/AuthContext';
import { login } from '../services/authService';
import { useSnackbar } from '../contexts/SnackbarContext'; // Import useSnackbar
import { TextField, Button, Container, Typography, Box, Paper, Alert } from '@mui/material';

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    // const [message, setMessage] = useState(''); // We'll use snackbar for transient messages
    const dispatch = useAuthDispatch();
    const { isAuthenticated, error: authContextError } = useAuthState(); // Rename to avoid conflict
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar(); // Get showSnackbar from context

    const { email, password } = formData;

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard'); // Redirect if already logged in
        }
    }, [isAuthenticated, navigate]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        // setMessage('');
        try {
            await login({ email, password }, dispatch);
            showSnackbar('Login successful!', 'success'); // Show success snackbar
        } catch (err) {
            showSnackbar(err.message || 'Login failed. Please check your credentials.', 'error');
        }
    };

    return (
        <Container
            component="main"
            maxWidth="xs"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 64px - 48px)', // Full viewport height minus AppBar and potential footer/padding
            }}
        >
            <Paper elevation={3} sx={{ padding: {xs: 2, sm: 4}, mt: {xs: 2, sm: 0}, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', borderRadius: 2 }}>
                <Typography component="h1" variant="h5">
                    Sign In
                </Typography>
                {/* {message && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{message}</Alert>} */}
                {authContextError && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>Context Error: {typeof authContextError === 'object' ? JSON.stringify(authContextError) : authContextError}</Alert>}
                <Box component="form" onSubmit={onSubmit} sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={onChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={onChange}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Sign In
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;