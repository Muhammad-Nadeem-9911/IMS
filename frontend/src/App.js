import './App.css';
import React, { useState, Suspense } from 'react'; // Removed useEffect
import { BrowserRouter as Router, Route, Routes, Link as RouterLink, useNavigate } from 'react-router-dom'; // Updated imports
import LoginPage from './pages/LoginPage';
// import RegisterPage from './pages/RegisterPage'; // Removed as per previous decision
import { useAuthState, useAuthDispatch } from './contexts/AuthContext';
import ProductsPage from './pages/ProductsPage'; // Import ProductsPage
import ProductForm from './components/ProductForm'; // Import ProductForm
import PrivateRoute from './components/PrivateRoute'; // Import PrivateRoute
import InvoicesPage from './pages/InvoicesPage';
import InvoiceForm from './components/InvoiceForm'; // Import InvoiceForm
import CompanyProfilePage from './pages/CompanyProfilePage'; // Import CompanyProfilePage
import ViewInvoicePage from './pages/ViewInvoicePage';
import CustomersPage from './pages/CustomersPage'; // Import CustomersPage
import SalesSummaryReportPage from './pages/SalesSummaryReportPage'; // Import Sales Summary Report Page
import CustomerForm from './components/customers/CustomerForm'; // Import CustomerForm
import { logout } from './services/authService';
import { getCompanyProfile } from './services/companyProfileService'; // Import service to get company profile
import { ThemeProvider } from '@mui/material/styles'; // Import ThemeProvider
import { // Removed Paper, Grid
    AppBar, Toolbar, Typography, Button, Box, CssBaseline, Drawer,
    List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton, Divider, CircularProgress
} from '@mui/material'; // Added CssBaseline, Drawer, List components
import HomeIcon from '@mui/icons-material/Home';
import LoginIcon from '@mui/icons-material/Login';
// import AppRegistrationIcon from '@mui/icons-material/AppRegistration'; // Removed as RegisterPage is removed
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt'; // Icon for Invoices
import BusinessIcon from '@mui/icons-material/Business'; // Icon for Company Profile
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People'; // Icon for Customers
import SummarizeIcon from '@mui/icons-material/Summarize'; // Icon for Reports
// import { Bar } from 'react-chartjs-2'; // Removed unused Bar import
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Icon for Purchase Orders
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks'; // Icon for General Journal
import AssessmentIcon from '@mui/icons-material/Assessment'; // Icon for Income Statement
import BalanceIcon from '@mui/icons-material/Balance'; // Icon for Balance Sheet
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // Icon for Trial Balance
import MenuIcon from '@mui/icons-material/Menu'; // For Drawer toggle
import MenuBookIcon from '@mui/icons-material/MenuBook'; // Icon for Ledger/Accounting
import SupervisorAccountIcon from '@mui/icons-material/SupervisorAccount';
import FilterListIcon from '@mui/icons-material/FilterList'; // Icon for Transaction Report
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import theme from './theme'; // Import your custom theme

// Lazy load components for better performance and to potentially resolve initialization issues
const HomePage = React.lazy(() => import('./pages/HomePage')); // Import the new HomePage
const ChartOfAccountsPage = React.lazy(() => import('./pages/ChartOfAccountsPage'));
const AccountForm = React.lazy(() => import('./components/ledger/AccountForm'));
const GeneralJournalPage = React.lazy(() => import('./pages/GeneralJournalPage'));
const JournalEntryForm = React.lazy(() => import('./components/ledger/JournalEntryForm'));
const TrialBalancePage = React.lazy(() => import('./pages/TrialBalancePage')); // Added TrialBalancePage
const IncomeStatementPage = React.lazy(() => import('./pages/IncomeStatementPage')); // Added IncomeStatementPage
const DashboardPage = React.lazy(() => import('./pages/DashboardPage')); // Import the new DashboardPage
const BalanceSheetPage = React.lazy(() => import('./pages/BalanceSheetPage')); // Added BalanceSheetPage
const SuppliersPage = React.lazy(() => import('./pages/SuppliersPage')); // For Suppliers
const SupplierForm = React.lazy(() => import('./components/suppliers/SupplierForm')); // For Suppliers
const PurchaseOrdersPage = React.lazy(() => import('./pages/PurchaseOrdersPage')); // For Purchase Orders
const PurchaseOrderForm = React.lazy(() => import('./components/purchase-orders/PurchaseOrderForm')); // For Purchase Orders
const ViewPurchaseOrderPage = React.lazy(() => import('./pages/ViewPurchaseOrderPage')); // For viewing a single PO
const UsersPage = React.lazy(() => import('./pages/UsersPage')); // For User Management
const UserForm = React.lazy(() => import('./components/users/UserForm')); // For User Creation/Editing
const PurchaseOrderReportPage = React.lazy(() => import('./pages/PurchaseOrderReportPage')); // New PO Report Page
const TransactionReportPage = React.lazy(() => import('./pages/TransactionReportPage')); // New Report Page

const drawerWidth = 240;

// Custom Link component for react-router-dom with MUI Button styling
// const RouterLinkButton = ({ to, children, ...props }) => (
//   <Button component={RouterLink} to={to} {...props}>{children}</Button>
// );

// New helper for Drawer List Items
const RouterListItem = ({ to, primary, icon, onClick }) => (
  <ListItem disablePadding component={RouterLink} to={to} onClick={onClick} sx={{ color: 'inherit', textDecoration: 'none' }}>
    <ListItemButton>
      <ListItemIcon sx={{ color: 'inherit' }}>{icon}</ListItemIcon>
      <ListItemText primary={primary} />
    </ListItemButton>
  </ListItem>
);

// Placeholder for Dashboard
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

// Removed the old DashboardPage component definition from here

function App() {
  const { isAuthenticated, user } = useAuthState(); // Get user from useAuthState here
  const dispatch = useAuthDispatch(); // For logout
  const navigate = useNavigate(); // For logout navigation
  const [mobileOpen, setMobileOpen] = useState(false);

  // Define roles that can manage products (add/edit/delete)
  const adminOnlyRoles = ['admin']; // Renamed for clarity and new purpose
  const viewAndReportRoles = ['manager', 'admin']; // For pages managers can view

  const handleLogout = async () => {
    try {
      await logout(dispatch); // Assuming logout service/context function
      navigate('/'); // Redirect to login page
    } catch (error) {
      console.error('Logout failed:', error);
      // Optionally show a snackbar error
    }
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const drawerContent = (
    <div>
      <Toolbar /> {/* For spacing, to align with AppBar content */}
      <Divider />
      <List>
        <RouterListItem to="/" primary="Home" icon={<HomeIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
        {isAuthenticated && (
          <>
            <RouterListItem to="/dashboard" primary="Dashboard" icon={<DashboardIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            <RouterListItem to="/products" primary="Products" icon={<InventoryIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            {user && user.role === 'admin' && ( // Company Profile only for Admin
              <RouterListItem to="/company-profile" primary="Company Profile" icon={<BusinessIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            )}
            <RouterListItem to="/invoices" primary="Invoices" icon={<ReceiptIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            <RouterListItem to="/customers" primary="Customers" icon={<PeopleIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            <RouterListItem to="/suppliers" primary="Suppliers" icon={<InventoryIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} /> {/* Using InventoryIcon for now, replace with StorefrontIcon if preferred */}
            <RouterListItem to="/purchase-orders" primary="Purchase Orders" icon={<ShoppingCartIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            {user && (user.role === 'admin' || user.role === 'manager') && ( // Reports for Admin & Manager
              <>
                <RouterListItem to="/reports/sales-summary" primary="Reports" icon={<SummarizeIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/reports/purchase-orders" primary="PO Report" icon={<ShoppingCartIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/reports/transactions" primary="Transaction Report" icon={<FilterListIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/chart-of-accounts" primary="Chart of Accounts" icon={<MenuBookIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/general-journal" primary="General Journal" icon={<LibraryBooksIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/reports/trial-balance" primary="Trial Balance" icon={<AccountBalanceIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/reports/income-statement" primary="Income Statement" icon={<AssessmentIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
                <RouterListItem to="/reports/balance-sheet" primary="Balance Sheet" icon={<BalanceIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
              </>
            )}
            {user && user.role === 'admin' && ( // User Management only for Admin
              <RouterListItem to="/admin/users" primary="User Management" icon={<SupervisorAccountIcon />} onClick={mobileOpen ? handleDrawerToggle : undefined} />
            )}
          </>
        )}
      </List>
      <Divider />
      {/* Logout button moved to AppBar */}
    </div>
  );

  return (
    // Router is usually at the top level in index.js or a Root component.
    // If App is the root component under Router, this structure is fine.
    // Otherwise, Router might need to be moved up. For now, assuming App is wrapped by Router.
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        {/* zIndex ensures AppBar is above the Drawer */}
        <Toolbar> {/* Ensure Toolbar is a direct child for proper AppBar layout */}
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: isAuthenticated ? { xs: 'block', sm: 'none' } : 'none' }} // Show only on mobile if authenticated
          >
            {isAuthenticated && <MenuIcon />} {/* Only show MenuIcon if authenticated */}
          </IconButton>
          {/* Static Logo (Icon + Text) */}
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}> {/* Container for logo icon and text */}
            {/* You can choose an appropriate icon here */}
            <InventoryIcon sx={{ mr: 1, fontSize: 28 }} /> {/* Example Icon */}
            <Typography variant="h6" component="div">
              {process.env.REACT_APP_WEBSITE_NAME || "IMS"}
            </Typography>
          </Box>

          {/* This Box with flexGrow will push subsequent items (login/logout buttons) to the right */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Conditional Buttons for Login/Logout */}
          {!isAuthenticated && (
            <>
              <Button component={RouterLink} to="/" color="inherit" startIcon={<HomeIcon />}>Home</Button>
              <Button component={RouterLink} to="/login" color="inherit" startIcon={<LoginIcon />}>Login</Button>
              {/* <Button component={RouterLink} to="/register" color="inherit" startIcon={<AppRegistrationIcon />}>Register</Button> */}
            </>
          )}
          {isAuthenticated && (
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Logout</Button>
          )}
        </Toolbar>
      </AppBar>
      {/* Conditionally render the entire navigation Box */}
      {isAuthenticated && (
        <Box
          component="nav"
          sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }} // Reserve space for permanent drawer on sm+
          aria-label="navigation drawer"
        >
          {/* The Drawers will now only be rendered if this parent Box is rendered */}
          <>
            <Drawer
              variant="temporary"
              open={mobileOpen}
              onClose={handleDrawerToggle}
              ModalProps={{ keepMounted: true }}
              sx={{
                display: { xs: 'block', sm: 'none' }, // Temporary drawer for mobile
                '& .MuiDrawer-paper': {
                  boxSizing: 'border-box',
                  width: drawerWidth,
                  backgroundColor: 'primary.main', 
                  color: 'primary.contrastText',   
                },
              }}
            >
              {drawerContent}
            </Drawer>
            <Drawer
              variant="permanent" // Back to permanent for desktop
              sx={{
                display: { xs: 'none', sm: 'block' }, // Permanent drawer for desktop
                '& .MuiDrawer-paper': { 
                  boxSizing: 'border-box',
                  width: drawerWidth,
                  backgroundColor: 'primary.main', 
                  color: 'primary.contrastText',   
                },
              }}
              open // Permanent drawer is always open
            >
              {drawerContent}
            </Drawer>
          </>
        </Box>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1, p: 3,
          mt: `64px`, // Standard AppBar height, adjust if your AppBar height is different
          // With the sidebar (Box component="nav") having a fixed width and flexShrink: 0,
          // and this main Box having flexGrow: 1, this Box will automatically take up the remaining space.
          // The explicit width and ml calculations for the authenticated 'sm' breakpoint are no longer needed.
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center', // This will center direct children like Paper components if they don't have width: 100%
        }}
      >
        <Suspense fallback={<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 64px - 48px)' }}><CircularProgress /></Box>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* <Route path="/register" element={<RegisterPage />} /> */}
          
          {/* Protected Routes - Accessible by Admin and Manager (mostly for viewing lists and details) */}
          <Route element={<PrivateRoute allowedRoles={viewAndReportRoles} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />            
            <Route path="/invoices/:id" element={<ViewInvoicePage />} /> {/* Use the new component */}
            <Route path="customers" element={<CustomersPage />} />
            <Route path="purchase-orders" element={<PurchaseOrdersPage />} /> {/* View list */}
            <Route path="purchase-orders/:id" element={<ViewPurchaseOrderPage />} /> {/* View single PO */}
            <Route path="suppliers" element={<SuppliersPage />} />
            {/* Reports and Accounting List/View pages */}
            <Route path="/reports/sales-summary" element={<SalesSummaryReportPage />} />
            <Route path="/reports/purchase-orders" element={<PurchaseOrderReportPage />} />
            <Route path="/reports/transactions" element={<TransactionReportPage />} />
            <Route path="/chart-of-accounts" element={<ChartOfAccountsPage />} />
            <Route path="/general-journal" element={<GeneralJournalPage />} />
            <Route path="/reports/trial-balance" element={<TrialBalancePage />} />
            <Route path="/reports/income-statement" element={<IncomeStatementPage />} />
            <Route path="/reports/balance-sheet" element={<BalanceSheetPage />} />
          </Route>

          {/* Protected Routes - Admin Only (for CUD operations and specific admin tasks) */}
          <Route element={<PrivateRoute allowedRoles={adminOnlyRoles} />}> {/* Only admin for CUD operations */}
            <Route path="/products/add" element={<ProductForm />} />
            <Route path="/products/edit/:id" element={<ProductForm />} />
            <Route path="/company-profile" element={<CompanyProfilePage />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/invoices/edit/:id" element={<InvoiceForm />} /> {/* For editing invoices */}
            <Route path="customers/new" element={<CustomerForm />} />
            <Route path="customers/edit/:id" element={<CustomerForm />} />
            <Route path="suppliers/new" element={<SupplierForm />} />
            <Route path="suppliers/edit/:id" element={<SupplierForm />} />
            <Route path="purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="purchase-orders/edit/:id" element={<PurchaseOrderForm />} /> {/* Or a specific edit page if needed */}
            <Route
              path="/chart-of-accounts/new"
              element={<AccountForm />}
            />
            <Route
              path="/chart-of-accounts/edit/:id"
              element={<AccountForm />}
            />
            <Route
              path="/general-journal/new"
              element={<JournalEntryForm />}
            />
            {/* Moved ViewPurchaseOrderPage to be accessible by manager as well, but edit/receive actions within it will be admin only */}
            {/* <Route
              path="/purchase-orders/:id" // For viewing a single PO
              element={<ViewPurchaseOrderPage />}
            /> */}
            {/* User Management Routes - Admin Only */}
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/users/new" element={<UserForm />} />
            <Route path="/admin/users/edit/:id" element={<UserForm />} />

          </Route>

          {/* Add other routes here */}
        </Routes>
        </Suspense>
      </Box>
    </Box>
  );
}

// We need to wrap App with Router if it's not already done in index.js
// For this example, I'll assume Router is in index.js or a higher component.
// If App is the absolute root, then the <Router> tags should be inside this file,
// and useNavigate needs to be used within a component rendered by that Router.
// For simplicity, I'll create a Root component here.

const Root = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline /> {/* CssBaseline helps normalize styles and applies background color */}
    <Router>
      <App />
    </Router>
  </ThemeProvider>
);

export default Root;
