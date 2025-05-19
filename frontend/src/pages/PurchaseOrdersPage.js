import React, { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getPurchaseOrders, deletePurchaseOrder } from '../services/purchaseOrderService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuthState } from '../contexts/AuthContext'; // To check user roles for actions
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
    DialogTitle,
    Chip,
    TablePagination, // Added for pagination
    TextField, // For search
    InputAdornment // For search icon
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility'; // For View button
import SearchIcon from '@mui/icons-material/Search'; // Import SearchIcon
import { format } from 'date-fns'; // For formatting dates


const PurchaseOrdersPage = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [poToDelete, setPoToDelete] = useState(null);
    const { showSnackbar } = useSnackbar();
    const { user, isAuthenticated } = useAuthState(); // Get user to check roles

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalPurchaseOrders, setTotalPurchaseOrders] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');

    // Determine if the current user can manage POs (create, edit, delete)
    const canManagePOs = user && user.role === 'admin'; // Only admin can manage

    const fetchPurchaseOrders = useCallback(async () => {
        if (!isAuthenticated) {
            setError("Please log in to view purchase orders.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError('');
            const response = await getPurchaseOrders(page + 1, rowsPerPage, searchTerm);
            if (response.success) {
                setPurchaseOrders(response.data || []);
                setTotalPurchaseOrders(response.count || 0);
                if ((response.data || []).length === 0 && searchTerm) {
                    // showSnackbar('No purchase orders found matching your search criteria.', 'info');
                }
            } else {
                setError(response.message || 'Failed to fetch purchase orders.');
                showSnackbar(response.message || 'Failed to fetch purchase orders.', 'error');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching purchase orders.');
            showSnackbar(err.message || 'An error occurred while fetching purchase orders.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, page, rowsPerPage, searchTerm, showSnackbar]);

    useEffect(() => {
        fetchPurchaseOrders();
    }, [fetchPurchaseOrders]);

    const handleDeleteClick = (po) => {
        setPoToDelete(po);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
        setPoToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!poToDelete) return;
        try {
            await deletePurchaseOrder(poToDelete._id);
            showSnackbar('Purchase Order deleted successfully!', 'success');
            fetchPurchaseOrders(); // Refresh the list
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete purchase order.', 'error');
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

    if (!isAuthenticated && !loading) {
        return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see purchase orders. <RouterLink to="/login">Login here</RouterLink>.</Alert>;
    }
    if (loading && purchaseOrders.length === 0 && totalPurchaseOrders === 0 && !error && !searchTerm) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (error && purchaseOrders.length === 0 && !loading) {
        return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;
    }

    return (
        <>
            {/* Using Paper directly as the main container for consistency */}
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Purchase Orders
                    </Typography>
                    {canManagePOs && (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AddIcon />}
                            component={RouterLink}
                            to="/purchase-orders/new"
                            size="medium"
                        >
                            New Purchase Order
                        </Button>
                    )}
                </Box>

                {/* Search Input */}
                <Box sx={{ mb: 2 }}>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        placeholder="Search POs (Number, Supplier, Status...)"
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

                {error && purchaseOrders.length > 0 && (
                    <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                        Could not refresh purchase order data: {error}
                    </Alert>
                )}

                {(!loading && totalPurchaseOrders === 0 && !error) ? (
                    <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                        {searchTerm
                            ? "No purchase orders found matching your search criteria."
                            : `No purchase orders found. ${canManagePOs ? <RouterLink to="/purchase-orders/new">Create one now!</RouterLink> : ''}`
                        }
                    </Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                        <Table sx={{ minWidth: 750 }} aria-label="purchase orders table" size="medium">
                            <TableHead sx={{ backgroundColor: theme => theme.palette.primary.main }}>
                                <TableRow>
                                    <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>PO Number</TableCell>
                                    <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Supplier</TableCell>
                                    <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Order Date</TableCell>
                                    <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Grand Total</TableCell>
                                    <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Status</TableCell>
                                    <TableCell align="center" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold', width: '150px' }}>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center">
                                            <CircularProgress size={24} />
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    purchaseOrders.map((po) => (
                                        <TableRow
                                            hover
                                            key={po._id}
                                            sx={{
                                                '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover },
                                                '&:last-child td, &:last-child th': { border: 0 }
                                            }}
                                        >
                                            <TableCell>{po.poNumber}</TableCell>
                                            <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                                            <TableCell>{format(new Date(po.orderDate), 'dd MMM yyyy')}</TableCell>
                                            <TableCell align="right">${po.grandTotal?.toFixed(2) || '0.00'}</TableCell>
                                            <TableCell><Chip label={po.status} size="small" color={po.status === 'Received' ? 'success' : po.status === 'Ordered' ? 'info' : po.status === 'Partially Received' ? 'warning' : 'default'} /></TableCell>
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <IconButton component={RouterLink} to={`/purchase-orders/${po._id}`} color="default" aria-label="view purchase order" size="small" sx={{ mr: 0.5 }}>
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                                {canManagePOs && po.status === 'Draft' && ( /* Allow edit only for Draft POs for example */
                                                    <IconButton component={RouterLink} to={`/purchase-orders/edit/${po._id}`} color="primary" aria-label="edit purchase order" size="small" sx={{ mr: 0.5 }}>
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                                {canManagePOs && (po.status === 'Draft' || po.status === 'Cancelled') && ( /* Allow delete for Draft or Cancelled POs */
                                                    <IconButton onClick={() => handleDeleteClick(po)} color="error" aria-label="delete purchase order" size="small">
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                )}
                                            </TableCell></TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={totalPurchaseOrders}
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
                        Are you sure you want to delete Purchase Order "{poToDelete?.poNumber}"? This action cannot be undone.
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

export default PurchaseOrdersPage;