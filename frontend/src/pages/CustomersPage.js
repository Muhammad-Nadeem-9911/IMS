import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { getCustomers, deleteCustomer } from '../services/customerService';
import { useAuthState } from '../contexts/AuthContext';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination, // Import TablePagination
    Paper,
    TextField, // Import TextField for search
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert,
    IconButton,
    Dialog,
    InputAdornment, // Import InputAdornment for search icon
    DialogActions,
    Tooltip, // Import Tooltip for action buttons
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search'; // Import SearchIcon

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const { user, isAuthenticated } = useAuthState();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate(); // Now correctly defined

    const [page, setPage] = useState(0); // 0-indexed for TablePagination
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalCustomers, setTotalCustomers] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const fetchCustomers = useCallback(async () => {
            if (!isAuthenticated) {
                setPageError("Please log in to view customers.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setPageError(''); // Clear previous page-level errors before a new fetch

                // API expects 1-indexed page
                const response = await getCustomers(page + 1, rowsPerPage, searchTerm);
                if (response.success) {
                    setCustomers(response.data || []);
                    setTotalCustomers(response.count || 0); // Assuming backend returns total count
                    if ((response.data || []).length === 0 && searchTerm) {
                         // Only show info snackbar if search term is active and no results
                         showSnackbar('No customers found matching your search criteria.', 'info');
                    } else if ((response.data || []).length === 0 && !searchTerm && totalCustomers > 0) {
                    }
                } else {
                    setPageError(response.message || 'Failed to fetch customers');
                    showSnackbar(response.message || 'Failed to fetch customers.', 'error');
                }
            } catch (err) {
                setPageError(err.message || 'An error occurred while fetching customers.');
                showSnackbar(err.message || 'An error occurred.', 'error');
            } finally {
                setLoading(false);
            }
        }, [isAuthenticated, page, rowsPerPage, searchTerm, showSnackbar]); // Refined dependencies

    useEffect(() => {
        fetchCustomers();
    }, [fetchCustomers]); // isAuthenticated is a dep of fetchCustomers

    const handleDeleteClick = (customer) => {
        // Check if the user has permission before opening dialog
        if (!canManageCustomers) {
             showSnackbar("You don't have permission to delete customers.", 'warning');
             return;
        }
        setCustomerToDelete(customer);
        setOpenDeleteDialog(true);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        // No need to debounce here, fetchCustomers is called on searchTerm change via useEffect
        // Reset page to 0 when search term changes
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset to first page
    };

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await deleteCustomer(customerToDelete._id);
            showSnackbar('Customer deleted successfully!', 'success');
            // Re-fetch customers to update list and total count correctly
            fetchCustomers();
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete customer.', 'error');
        } finally {
            setOpenDeleteDialog(false);
            setCustomerToDelete(null);
        }
    };

    // Check if user is authenticated and has the 'admin' role
    const canManageCustomers = isAuthenticated && user && user.role === 'admin';

    // --- Conditional Rendering for Page States ---
    if (!isAuthenticated && !loading) { // Check !loading to avoid flash if auth state is also loading
        return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see customers. <Link to="/login">Login here</Link>.</Alert>;
    }
    // Initial loading state for the entire page (no customers, no total, no error, and no active search term)
    if (loading && customers.length === 0 && totalCustomers === 0 && !pageError && !searchTerm) {
         return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    // Persistent page error when no customers can be shown
    if (pageError && customers.length === 0 && !loading) {
        return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>;
    }
    // --- End Conditional Rendering ---

    return (
        <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
                <Typography variant="h4" component="h1">Customers</Typography>
                {canManageCustomers && (
                    <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/customers/new">
                        Add New Customer
                    </Button>
                )}
            </Box>

            {/* Search Input */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Search customers (Name, Email, Phone...)"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {/* Display non-critical page error (e.g., refresh failed but showing stale data) */}
            {pageError && customers.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    Could not refresh customer data: {pageError}
                </Alert>
            )}

            {/* Table Area or "No Customers" message */}
            {(!loading && totalCustomers === 0 && !pageError) ? ( // No customers at all, or search returned nothing
                <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                    {searchTerm
                        ? "No customers found matching your search criteria."
                        : `No customers found. ${canManageCustomers ? <Link to="/customers/new">Add one now!</Link> : ''}`
                    }
                </Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Table sx={{ minWidth: 650 }} aria-label="customers table">
                        <TableHead sx={{ backgroundColor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Phone</TableCell>
                                {canManageCustomers && <TableCell align="center" sx={{ color: 'common.white', fontWeight: 'bold', width: '120px' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManageCustomers ? 4 : 3} align="center"> {/* Corrected colSpan */}
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((customer) => (
                                    <TableRow key={customer._id} hover>
                                        <TableCell>{customer.name}</TableCell>
                                        <TableCell>{customer.email || 'N/A'}</TableCell>
                                        <TableCell>{customer.phone || 'N/A'}</TableCell>
                                        {canManageCustomers && (
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title="Edit Customer">
                                                    <IconButton component={Link} to={`/customers/edit/${customer._id}`} size="small" color="primary" aria-label="edit customer">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Customer">
                                                    <IconButton onClick={() => handleDeleteClick(customer)} size="small" color="error" aria-label="delete customer">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {/* Table Pagination */}
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalCustomers}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }}
                    />
                </TableContainer>
            )}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent><DialogContentText>Are you sure you want to delete customer "{customerToDelete?.name}"? This action cannot be undone.</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default CustomersPage;