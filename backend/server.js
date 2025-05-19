console.log('[DEBUG] server.js: Starting execution...');

const dotenv = require('dotenv');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Import route files
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const companyProfileRoutes = require('./routes/companyProfileRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const paymentRoutes = require('./routes/paymentRoutes'); // Import payment routes
const customerRoutes = require('./routes/customerRoutes'); // Import customer routes
const reportRoutes = require('./routes/reportRoutes'); // Import report routes
const accountRoutes = require('./routes/accountRoutes'); // Add this line
const journalEntryRoutes = require('./routes/journalEntryRoutes'); // Import journal entry routes
const supplierRoutes = require('./routes/supplierRoutes'); // Add this
const purchaseOrderRoutes = require('./routes/purchaseOrderRoutes'); // Add this
const userRoutes = require('./routes/userRoutes'); // Import user routes

const seedDefaultAccounts = require('./utils/seedAccounts'); // Import the seeder
console.log('[DEBUG] server.js: All route modules required.');

// Load environment variables from .env file
// Make sure this is at the top to ensure all environment variables are loaded before they are used.
dotenv.config();
console.log('[DEBUG] server.js: dotenv.config() called.');
console.log(`[DEBUG] server.js: MONGO_URI is ${process.env.MONGO_URI ? 'set' : 'NOT SET'}`);

const app = express();

// Middleware
// Enable CORS for requests from the client URL specified in .env
app.use(cors({
    origin: process.env.CLIENT_URL 
}));
console.log('[DEBUG] server.js: CORS middleware configured.');
// To parse JSON request bodies
app.use(express.json()); 

// Database Connection
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
.then(() => console.log('MongoDB Connected Successfully!'))
.then(() => seedDefaultAccounts()) // Call the seeder after successful connection
.catch(err => {
    console.error('MongoDB Connection Error:', err.message);
    console.error('[FATAL] Could not connect to MongoDB. Exiting...');
    process.exit(1); // Exit process with failure
});

// Basic Test Route
app.get('/api/health', (req, res) => {
    res.json({ status: 'API is up and running!', timestamp: new Date().toISOString() });
});

// Mount Routers
app.use('/api/auth', authRoutes); // All routes in authRoutes will be prefixed with /api/auth
app.use('/api/products', productRoutes); // All routes in productRoutes will be prefixed with /api/products
app.use('/api/company-profile', companyProfileRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes); // Mount payment routes
app.use('/api/customers', customerRoutes); // Mount customer routes
app.use('/api/reports', reportRoutes); // Mount report routes
app.use('/api/accounts', accountRoutes); // Add this line
app.use('/api/journal-entries', journalEntryRoutes); // Mount journal entry routes
app.use('/api/suppliers', supplierRoutes); // Add this line
app.use('/api/purchase-orders', purchaseOrderRoutes); // Add this line
app.use('/api/users', userRoutes); // Mount user routes

const PORT = process.env.PORT || 5000; // Use port from .env or default to 5000

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});