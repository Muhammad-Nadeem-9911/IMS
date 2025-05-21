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
            maxWidth="lg"
            disableGutters // Remove default padding to allow Paper to control spacing
            sx={{
                height: '100%', // Set height to 100% of the viewport height
                display: 'flex', // Enable flexbox
                alignItems: 'center', // Vertically center the flex item (Paper)
                justifyContent: 'center', // Horizontally center the flex item (Paper)
                padding: 0, // We will now control padding more specifically
                // Add padding to the Container itself.
                // This padding will "push" the Paper component inwards,
                // effectively reducing the space it can occupy and ensuring space around it.
                paddingTop: '5.5vh',    // Applying paddingTop from your CSS snippet
                //paddingBottom: '0vh',   // Applying paddingBottom from your CSS snippet (can also be 0)
                boxSizing: 'border-box', // Crucial: ensures padding is within the 100vh height
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' }, // Stack on xs, row on sm+
                    borderRadius: 2, // Softer corners
                    overflow: 'hidden', // Crucial to prevent internal scrollbars from pushing content out
                    width: '100%', // Take full width up to maxWidth
                    maxWidth: '900px', // Limit the maximum width of the login box
                    // maxHeight should now be relative to the flex item space provided by the padded Container.
                    // Setting it to 100% means it will try to fill the available vertical space
                    maxHeight: '100%', // which is now 100vh - paddingTop (3vh) - paddingBottom (0vh) = 97vh.
                    // margin: 'auto', // Removed: Parent Container handles centering
                }}
            >
                    {/* Image Section - Now a direct child Box acting as a flex item */}
                    <Box
                        sx={{
                            display: { xs: 'none', sm: 'flex' }, // Hide on xs, show as flex on sm+
                            flex: { sm: 1, md: '0 0 50%' }, // Takes up space, or 50% basis on md+
                            alignItems: 'center', // Center content vertically within this Box
                            justifyContent: 'center',
                            // Use padding here instead of on the Grid item
                            // p: 3, // Padding inside the image section
                            p: 3, // Padding inside the image grid item
                            overflow: 'hidden', // Prevent image from overflowing its container
                        }}
                    >
                        {/* The image itself */}
                        {/* Placeholder for your vector image */}
                        <Box    
                            component="img" // Render as an <img> tag
                            src={LoginVectorImage} // Use the imported image source
                            alt="Login Illustration" // Provide an alt text for accessibility
                            sx={{ // Apply styles to the image itself
                                width: '100%', // Image takes full width of its container
                                height: 'auto', // Maintain aspect ratio
                                maxWidth: '100%', // Ensure image doesn't exceed the width of its container
                                maxHeight: '100%', // Ensure image does not exceed the height of its container (relative to the Paper's height)
                                objectFit: 'contain', // Scales image down to fit, maintaining aspect ratio
                            }}
                        /> {/* Ensure Box is self-closing for img component */}
                    </Box>

                    {/* Form Section */}
                    <Box 
                        // This Box contains the form elements
                        sx={{
                            flex: { sm: 1, md: '0 0 50%' }, // Takes up space, or 50% basis on md+
                            p: { xs: 3, md: 5 }, // Internal padding for the form section
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center', // Center form content vertically within this Box
                            overflowY: 'hidden', // Prevent vertical scrolling within this Box
                            // This is important if the Paper's height is constrained and form content is tall.
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