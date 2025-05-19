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
    Tooltip,
    Box,
    CircularProgress,
    Alert,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    TablePagination, // Added for pagination
    TextField, // For search
    InputAdornment // For search icon
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

const SuppliersPage = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    const { showSnackbar } = useSnackbar();
    const { user, isAuthenticated } = useAuthState(); // Get user for role check

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalSuppliers, setTotalSuppliers] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchSuppliers = useCallback(async () => {
        if (!isAuthenticated) {
            setError("Please log in to view suppliers.");
            setLoading(false);
            return;
        }
            try {
                setLoading(true);
                setError('');
                const response = await getSuppliers(page + 1, rowsPerPage, searchTerm);
                if (response.success) {
                    setSuppliers(response.data || []);
                    setTotalSuppliers(response.count || 0);
                    if ((response.data || []).length === 0 && searchTerm) {
                        // Optionally show a snackbar or rely on the Alert in render
                        // showSnackbar('No suppliers found matching your search criteria.', 'info');
                    }
                } else {
                    setError(response.message || 'Failed to fetch suppliers.');
                    showSnackbar(response.message || 'Failed to fetch suppliers.', 'error');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while fetching suppliers.');
                showSnackbar(err.message || 'An error occurred while fetching suppliers.', 'error');
            } finally {
                setLoading(false);
            }
        }, [isAuthenticated, page, rowsPerPage, searchTerm, showSnackbar]);

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

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0); // Reset to first page on new search
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const canManageSuppliers = user && user.role === 'admin';

    if (!isAuthenticated && !loading) {
        return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see suppliers. <RouterLink to="/login">Login here</RouterLink>.</Alert>;
    }
    if (loading && suppliers.length === 0 && totalSuppliers === 0 && !error && !searchTerm) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (error && suppliers.length === 0 && !loading) {
        return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
    }

    return (
        <>
        <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Suppliers
                    </Typography>
                    {canManageSuppliers && (
                        <Button variant="contained" color="primary" startIcon={<AddIcon />} component={RouterLink} to="/suppliers/new" size="medium">
                            Add New Supplier
                        </Button>
                    )}
                </Box>

                {/* Search Input */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Search suppliers (Name, Contact, Email...)"
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

                {error && suppliers.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                        Could not refresh supplier data: {error}
                    </Alert>
                )}

                {(!loading && totalSuppliers === 0 && !error) ? (
                    <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                        {searchTerm
                            ? "No suppliers found matching your search criteria."
                            : `No suppliers found. ${canManageSuppliers ? <RouterLink to="/suppliers/new">Add one now!</RouterLink> : ''}`
                        }
                    </Alert>
                ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Table sx={{ minWidth: 650 }} aria-label="suppliers table" size="medium">
                        <TableHead sx={{ backgroundColor: theme => theme.palette.primary.main }}>
                            <TableRow>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Contact Person</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Email</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Phone</TableCell>
                                {canManageSuppliers && <TableCell align="center" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold', width: '120px' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManageSuppliers ? 5 : 4} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                suppliers.map((supplier) => (
                                    <TableRow
                                        hover
                                        key={supplier._id}
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover },
                                            '&:last-child td, &:last-child th': { border: 0 }
                                        }}
                                    >
                                        <TableCell>{supplier.name}</TableCell>
                                        <TableCell>{supplier.contactPerson || 'N/A'}</TableCell>
                                        <TableCell>{supplier.email}</TableCell>
                                        <TableCell>{supplier.phone || 'N/A'}</TableCell>
                                        {canManageSuppliers && (
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title="Edit Supplier">
                                                    <IconButton component={RouterLink} to={`/suppliers/edit/${supplier._id}`} color="primary" aria-label="edit supplier" size="small">
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Supplier">
                                                    <IconButton onClick={() => handleDeleteClick(supplier)} color="error" aria-label="delete supplier" size="small">
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
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalSuppliers}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }}
                    />
                </TableContainer>
                )}
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
        </>
    );
};

export default SuppliersPage;