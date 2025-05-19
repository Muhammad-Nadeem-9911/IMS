import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthDispatch, useAuthState } from '../contexts/AuthContext';
import { register } from '../services/authService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { TextField, Button, Container, Typography, Box, Paper, Alert } from '@mui/material';

const RegisterPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    // const [message, setMessage] = useState('');
    const dispatch = useAuthDispatch();
    const { error: authContextError, isAuthenticated } = useAuthState();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const { name, email, password, confirmPassword } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        // setMessage('');
        if (password !== confirmPassword) {
            showSnackbar('Passwords do not match!', 'error');
            return;
        }
        try {
            await register({ name, email, password }, dispatch);
            showSnackbar('Registration successful! Welcome!', 'success');
            // If register service dispatches LOGIN_SUCCESS or REGISTER_SUCCESS
            // isAuthenticated should become true from context
            navigate('/dashboard'); // Or wherever you want to go after registration
        } catch (err) {
            showSnackbar(err.message || 'Registration failed. Please try again.', 'error');
        }
    };

    if (isAuthenticated) {
        // Optional: Redirect if already logged in, though usually not needed on register page
        // navigate('/dashboard');
    }

    return (
        <Container component="main" maxWidth="xs">
            <Paper elevation={3} sx={{ padding: 4, marginTop: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Sign Up
                </Typography>
                {/* {message && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{message}</Alert>} */}
                {authContextError && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>Context Error: {typeof authContextError === 'object' ? JSON.stringify(authContextError) : authContextError}</Alert>}
                <Box component="form" onSubmit={onSubmit} sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="name"
                        label="Full Name"
                        name="name"
                        autoComplete="name"
                        autoFocus
                        value={name}
                        onChange={onChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
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
                        inputProps={{ minLength: 6 }}
                        value={password}
                        onChange={onChange}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        id="confirmPassword"
                        inputProps={{ minLength: 6 }}
                        value={confirmPassword}
                        onChange={onChange}
                    />
                    <Button type="submit" fullWidth variant="contained" sx={{ mt: 3, mb: 2 }}>
                        Sign Up
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default RegisterPage;