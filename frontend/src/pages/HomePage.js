import React from 'react';
import { Box, Container, Typography, Paper, Grid, Button } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthState } from '../contexts/AuthContext'; // To tailor content

// Placeholder for your vector image - replace with your actual image import or URL
import YourVectorImage from '../assets/images/HomeImg.jpg';

const HomePage = () => {
    const { isAuthenticated } = useAuthState(); // Removed unused 'user' variable

    return (
        <Container
            disableGutters // This will remove the default left and right padding of this Container
            maxWidth={false}
            sx={{
                // mt: 4, // Removed top margin
                // mb: 4, // Removed bottom margin
            }}>
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 2, md: 3 }, // Reduced internal padding
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    textAlign: 'center',
                    borderRadius: '12px', // Softer corners
                    width: '100%', // Ensure paper takes full width of the container
                    // Add a subtle gradient or background if desired
                    // background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                }}
            >
                <Grid container spacing={4} alignItems="center" justifyContent="center">
                    <Grid item xs={12} md={6} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        {/* Placeholder for your vector image */}
                        {/* Using a Box wrapper for consistent styling with MUI sx prop */}
                        <Box
                            component="img" // Render as an <img> tag
                            src={YourVectorImage} // Use the imported image source
                            alt="IMS Illustration" // Provide an alt text for accessibility
                            sx={{
                                width: { xs: '80%', sm: '70%', md: '100%' }, // Responsive width
                                maxWidth: '400px', // Max width for the image
                                height: 'auto', // Maintain aspect ratio
                                borderRadius: '8px', // Apply border radius to the image
                            }}
                        /> {/* Ensured Box is self-closing for img component */}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography
                            variant="h3"
                            component="h1"
                            gutterBottom
                            sx={{ fontWeight: 'bold', color: 'primary.main' }}
                        >
                            Welcome to {process.env.REACT_APP_WEBSITE_NAME || "IMS"}!
                        </Typography>
                        <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 3 }}>
                            Your comprehensive solution for managing inventory, sales, purchases, and accounting with efficiency and ease.
                        </Typography>
                        {!isAuthenticated ? (
                            <Button component={RouterLink} to="/login" variant="contained" color="primary" size="large">
                                Get Started / Login
                            </Button>
                        ) : (
                            <Button component={RouterLink} to="/dashboard" variant="contained" color="secondary" size="large">
                                Go to Dashboard
                            </Button>
                        )}
                    </Grid>
                </Grid>
            </Paper>
        </Container>
    );
};

export default HomePage;