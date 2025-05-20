import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthDispatch, useAuthState } from '../contexts/AuthContext';
import { login } from '../services/authService';
import { useSnackbar } from '../contexts/SnackbarContext'; // Import useSnackbar
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Paper,
    Alert,
    Grid, // Added for two-column layout
    Avatar, // For the lock icon
    CircularProgress // For loading state in button
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'; // Icon for Avatar

// Placeholder for your vector image - replace with your actual image import or URL
import LoginVectorImage from '../assets/images/loginImg.jpg'; // Example import

const LoginPage = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    // const [message, setMessage] = useState(''); // We'll use snackbar for transient messages
    const [loading, setLoading] = useState(false); // Added loading state for the button
    const dispatch = useAuthDispatch();
    const { isAuthenticated, error: authContextError } = useAuthState(); // Rename to avoid conflict
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar(); // Get showSnackbar from context

    const { email, password } = formData;

    useEffect(() => {
        if (isAuthenticated) {
        navigate('/'); // <--- Change this line to redirect to Home
        }
    }, [isAuthenticated, navigate]);

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        // setMessage('');
        setLoading(true); // Start loading
        try {
            await login({ email, password }, dispatch);
            showSnackbar('Login successful!', 'success'); // Show success snackbar
            // Navigation will be handled by the useEffect hook
        } catch (err) {
            showSnackbar(err.message || 'Login failed. Please check your credentials.', 'error');
        } finally {
            setLoading(false); // Stop loading
        }
    };

    return (
        <Container
            component="main"
            maxWidth="lg" // Changed from 'xs' to 'lg' to accommodate two columns
            sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <Paper 
                elevation={6} 
                sx={{ 
                    display: 'flex', // Make Paper a flex container
                    flexDirection: { xs: 'column', sm: 'row' }, // Stack on xs, row on sm+
                    borderRadius: 2, 
                    overflow: 'hidden', 
                    width: '100%', 
                    maxWidth: '900px', 
                    minHeight: '500px' 
                }}
            >
                    {/* Image Section - Now a direct child Box acting as a flex item */}
                    <Box
                        sx={{
                            display: { xs: 'none', sm: 'flex' }, // Hide on xs, show as flex on sm+
                            flex: { sm: 1, md: '0 0 50%' }, // Takes up space, or 50% basis on md+
                            // On sm, it will take 1 part of available space if form section also has flex:1 or similar
                            // Or more explicitly: flexBasis: { sm: '40%', md: '50%'},
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 3, // Padding inside the image grid item
                            overflow: 'hidden', // Prevent image from overflowing its container
                        }}
                    >
                        {/* Placeholder for your vector image */}
                        <Box    
                            component="img" // Render as an <img> tag
                            src={LoginVectorImage} // Use the imported image source
                            alt="Login Illustration" // Provide an alt text for accessibility
                            sx={{ // Apply styles to the image itself
                                width: '100%', // Image takes full width of its container
                                height: 'auto', // Maintain aspect ratio
                                maxWidth: '100%', // Ensure it doesn't overflow its container
                                maxHeight: '100%', // Ensure image does not exceed the height of its container
                                objectFit: 'contain', // Scales image down to fit, maintaining aspect ratio
                            }}
                        /> {/* Ensure Box is self-closing for img component */}
                    </Box>

                    {/* Form Section */}
                    <Box 
                        sx={{ 
                            flex: { sm: 1, md: '0 0 50%' }, // Takes up space, or 50% basis on md+
                            // On sm, it will take 1 part of available space if image section also has flex:1 or similar
                            // Or more explicitly: flexBasis: { sm: '60%', md: '50%'},
                            p: { xs: 3, md: 5 }, 
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            overflow: 'auto' // In case form content is too long
                        }}>
                        <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
                            <LockOutlinedIcon />
                        </Avatar>
                        <Typography component="h1" variant="h5">
                            Sign In
                        </Typography>
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
                                disabled={loading}
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
                                disabled={loading}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                sx={{ mt: 3, mb: 2 }}
                                disabled={loading}
                            >
                                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
                            </Button>
                        </Box>
                    </Box>
            </Paper>
        </Container>
    );
};

export default LoginPage;