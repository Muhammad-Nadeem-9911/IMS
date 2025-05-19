import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
    Paper,
    Button,
    Typography,
    Box,
    CircularProgress,
    Alert,
    IconButton,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const CustomersPage = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const { user, isAuthenticated } = useAuthState();
    const { showSnackbar } = useSnackbar();
    // const navigate = useNavigate(); // Removed unused variable

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
                setPageError('');
                const response = await getCustomers();
                if (response.success) {
                    setCustomers(response.data);
                } else {
                    setPageError(response.message || 'Failed to fetch customers');
                }
            } catch (err) {
                setPageError(err.message || 'An error occurred while fetching customers.');
            } finally {
                setLoading(false);
            }
        }, [isAuthenticated]); // Add isAuthenticated as a dependency for useCallback


    useEffect(() => {
        fetchCustomers();
    }, [isAuthenticated, fetchCustomers]); // Added fetchCustomers to dependency array

    const handleDeleteClick = (customer) => {
        setCustomerToDelete(customer);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!customerToDelete) return;
        try {
            await deleteCustomer(customerToDelete._id);
            showSnackbar('Customer deleted successfully!', 'success');
            setCustomers(customers.filter(c => c._id !== customerToDelete._id)); // Refresh list
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete customer.', 'error');
        } finally {
            setOpenDeleteDialog(false);
            setCustomerToDelete(null);
        }
    };

    const canManageCustomers = user && user.role === 'admin'; // Only admin can manage

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (pageError && !customers.length) return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>;
    if (!isAuthenticated) return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see customers. <Link to="/login">Login here</Link>.</Alert>;

    return (
        <Paper sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
                <Typography variant="h4" component="h1">Customers</Typography>
                {canManageCustomers && (
                    <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/customers/new">
                        Add New Customer
                    </Button>
                )}
            </Box>
            {pageError && customers.length > 0 && <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>Could not refresh all customer data: {pageError}</Alert>}
            {customers.length === 0 && !loading ? (
                <Alert severity="info" sx={{ width: '100%' }}>No customers found. {canManageCustomers && <Link to="/customers/new">Add one now!</Link>}</Alert>
            ) : (
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ flexGrow: 1 }}>
                    <Table sx={{ minWidth: 650 }} aria-label="customers table">
                        <TableHead sx={{ backgroundColor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Phone</TableCell>
                                {canManageCustomers && <TableCell align="center" sx={{ color: 'common.white', fontWeight: 'bold' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {customers.map((customer) => (
                                <TableRow key={customer._id} hover>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.email || 'N/A'}</TableCell>
                                    <TableCell>{customer.phone || 'N/A'}</TableCell>
                                    {canManageCustomers && (
                                        <TableCell align="center">
                                            <IconButton component={Link} to={`/customers/edit/${customer._id}`} size="small" color="secondary" aria-label="edit customer"><EditIcon /></IconButton>
                                            <IconButton onClick={() => handleDeleteClick(customer)} size="small" color="error" aria-label="delete customer"><DeleteIcon /></IconButton>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
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