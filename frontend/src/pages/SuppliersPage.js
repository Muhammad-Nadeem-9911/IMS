import React, { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getSuppliers, deleteSupplier } from '../services/supplierService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuthState } from '../contexts/AuthContext'; // Corrected import path
import {
    Container,
    Typography,
    Button,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Box,
    CircularProgress,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    // const navigate = useNavigate(); // Removed unused variable
    const { showSnackbar } = useSnackbar();
    const { user } = useAuthState(); // Get user for role check

    const fetchSuppliers = useCallback(async () => {
            try {
                setLoading(true);
                const response = await getSuppliers();
                if (response.success) {
                    setSuppliers(response.data || []);
                } else {
                    setError(response.message || 'Failed to fetch suppliers.');
                    showSnackbar(response.message || 'Failed to fetch suppliers.', 'error');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while fetching suppliers.');
                showSnackbar(err.message || 'An error occurred.', 'error');
            } finally {
                setLoading(false);
            }
        }, [showSnackbar]); // Add showSnackbar as a dependency for useCallback


    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]); // Added fetchSuppliers to dependency array

    const handleDeleteClick = (supplier) => {
        setSupplierToDelete(supplier);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setSupplierToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!supplierToDelete) return;
        try {
            await deleteSupplier(supplierToDelete._id);
            showSnackbar('Supplier deleted successfully!', 'success');
            fetchSuppliers(); // Refresh the list
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete supplier.', 'error');
        } finally {
            handleCloseDeleteDialog();
        }
    };

    const canManageSuppliers = user && user.role === 'admin';

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Suppliers
                    </Typography>
                    {canManageSuppliers && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        component={RouterLink}
                        to="/suppliers/new"
                    >
                        Add Supplier
                    </Button>)}
                </Box>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader aria-label="suppliers table">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Contact Person</TableCell>
                                <TableCell>Email</TableCell>
                                <TableCell>Phone</TableCell>
                                {canManageSuppliers && <TableCell align="right">Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {suppliers.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={5} align="center">No suppliers found.</TableCell></TableRow>
                            )}
                            {suppliers.map((supplier) => (
                                <TableRow hover key={supplier._id}>
                                    <TableCell>{supplier.name}</TableCell>
                                    <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                                    <TableCell>{supplier.email}</TableCell>
                                    <TableCell>{supplier.phone || 'N/A'}</TableCell>
                                    {canManageSuppliers && (
                                        <> {/* React Fragment to wrap adjacent elements */}
                                            {/* This TableCell contains the action buttons */}
                                            <TableCell align="right">
                                                <IconButton component={RouterLink} to={`/suppliers/edit/${supplier._id}`} color="primary" aria-label="edit supplier">
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton onClick={() => handleDeleteClick(supplier)} color="error" aria-label="delete supplier">
                                                    <DeleteIcon />
                                                </IconButton>
                                            </TableCell>
                                        </>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
            <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the supplier "{supplierToDelete?.name}"? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error" autoFocus>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SuppliersPage;