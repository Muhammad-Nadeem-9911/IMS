import { createTheme } from '@mui/material/styles';

// Light Ashwhite Theme with Black Contrast
const theme = createTheme({
  palette: {
    mode: 'light', // This enables Material UI's light mode styling logic
    primary: {
      main: '#212529', // Almost Black (same as text.primary for a monochrome primary action)
      light: '#495057', // Dark Grey (same as text.secondary)
      dark: '#000000',   // Pure Black
      contrastText: '#F8F9FA', // Ashwhite for text on black buttons/headers
    },
    secondary: {
      main: '#6C757D', // Medium Grey
      light: '#A8B0B6',
      dark: '#4A4E53',
      contrastText: '#FFFFFF',

    },
    background: {
      default: '#F8F9FA', // Ashwhite - Very light grey (almost white)
      paper: '#FFFFFF',   // White for surfaces like Paper, Card, Table
    },
    text: {
      primary: '#212529',   // Almost Black
      secondary: '#495057', // Dark Grey
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
    action: {
      active: 'rgba(0, 0, 0, 0.54)',
      hover: 'rgba(0, 0, 0, 0.04)', // Lighter hover for light theme
      selected: 'rgba(0, 0, 0, 0.08)',
      disabled: 'rgba(0, 0, 0, 0.26)',
      disabledBackground: 'rgba(0, 0, 0, 0.12)',
    },
    error: { // Optional: define error colors if needed
      main: '#D32F2F', // Standard MUI red
    },
    success: { // Optional: define success colors
      main: '#2E7D32', // Standard MUI green
    }
  },
  typography: {
    // You can customize font families, sizes, etc. here if needed
    // For example, to ensure all text uses a specific font:
    // fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: { color: '#212529' },
    h4: { color: '#212529' },
    // ... other typography variants
  },
});

export default theme;