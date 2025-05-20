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
            maxWidth={false} // Ensures the container can go full width
            sx={{
                height: '100%', // Occupy full height of parent (main content area in App.js)
                width: '100%',   // Occupy full width of parent
                display: 'flex', // Enable flex for child Paper
                flexDirection: 'column', // Stack Paper
                // Overall page padding is handled by App.js's main content Box
            }}>
            <Paper
                elevation={3}
                sx={{
                    p: { xs: 2, md: 3 }, // Internal padding of the Paper
                    display: 'flex',
                    flexDirection: 'column', // Stack its direct child (the Grid container)
                    // alignItems: 'center', // Removed: Grid container will be width 100%
                    // justifyContent: 'center', // Removed: Grid container will flexGrow
                    // textAlign: 'center', // Text alignment will be handled by children or Grid items
                    borderRadius: '12px', // Softer corners
                    width: '100%', // Ensure paper takes full width of the container
                    flexGrow: 1,   // Paper expands to fill the vertical space of its parent Container
                    overflow: 'hidden', // Prevent scrollbars within the Paper; content must fit
                }}
            >
                <Grid
                    container // This is the main grid container inside the Paper
                    sx={{
                        flexGrow: 1,      // Grid container expands vertically to fill Paper
                        display: 'flex',
                        flexDirection: 'column', // Stack Grid items (image, then text)
                        alignItems: 'center',    // Center items horizontally
                        // justifyContent: 'center', // Or 'space-around' if preferred, or let items grow
                    }}
                >
                    <Grid item xs={12} sx={{ // Image item always takes full width, stacking vertically
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        width: '100%', // Ensure full width for horizontal centering within the item
                        mb: { xs: 2, md: 3 } // Added margin below image for spacing
                    }}>
                        <Box
                            component="img" // Render as an <img> tag
                            src={YourVectorImage} // Use the imported image source
                            alt="IMS Illustration"
                            sx={{
                                // Responsive width, relative to its container (Grid item)
                                width: '100%', // Try to take full width of the grid item cell for scaling
                                // Max width for the image, responsive
                                maxWidth: { xs: '260px', sm: '300px', md: '340px', lg: '380px' }, // Slightly adjusted
                                height: 'auto', // Maintain aspect ratio
                                // Add maxHeight to prevent image from becoming too tall, especially on smaller/shorter viewports
                                // Further increased maxHeight values
                                // Reduced maxHeight slightly to prevent scrollbar
                                maxHeight: { xs: '33vh', sm: '38vh', md: '45vh', lg: '47vh' },
                                borderRadius: '8px', // Apply border radius to the image
                                objectFit: 'contain', // Ensure image scales down and fits, preserving aspect ratio
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sx={{ // Text item always takes full width, stacking
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',    // Center content (Typography, Button) horizontally
                        justifyContent: 'center',// Center content vertically within this item's grown space
                        textAlign: 'center',     // Ensure text itself is centered
                        flexGrow: 1,             // This item takes remaining vertical space
                        width: '100%',           // Ensure full width
                        overflow: 'hidden',      // Prevent text content from causing scroll if too long
                        minHeight: 0,            // Important for flex children in some scenarios
                    }}>
                        <Typography
                            variant="h3"
                            component="h1"
                            gutterBottom
                            sx={{
                                fontWeight: 'bold',
                                color: 'primary.main',
                                // Responsive font sizes
                                fontSize: { xs: '1.5rem', sm: '1.8rem', md: '2.2rem', lg: '2.5rem' }, // Adjusted slightly again for better fit
                            }}
                        >
                            Welcome to {process.env.REACT_APP_WEBSITE_NAME || "IMS"}!
                        </Typography>
                        <Typography
                            variant="h6"
                            color="text.secondary"
                            paragraph // Adds bottom margin
                            sx={{ mb: { xs: 2, md: 3 }, fontSize: { xs: '0.8rem', sm: '0.9rem', md: '1rem' } }}> {/* Adjusted font size */}
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