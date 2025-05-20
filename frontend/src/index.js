import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { AuthProvider } from './contexts/AuthContext';
import { SnackbarProvider } from './contexts/SnackbarContext';

// Import and register Chart.js components globally
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  Title, // Title is used in chartOptions
  // Add other chart types/scales if you use them elsewhere (e.g., CategoryScale, LinearScale, BarElement for bar charts)
);

// Removed ThemeProvider, createTheme, CssBaseline imports and usage from here
// ThemeProvider and CssBaseline are now handled in App.js using the custom theme

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
      <AuthProvider>
        <SnackbarProvider> {/* Add SnackbarProvider here */}
          <App />
        </SnackbarProvider>
      </AuthProvider>
  </React.StrictMode>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
