import React, { useEffect, useState } from 'react';
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
    Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility'; // For View button
import { format } from 'date-fns'; // For formatting dates

const PurchaseOrdersPage = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [poToDelete, setPoToDelete] = useState(null);
    // const navigate = useNavigate(); // Removed unused variable
    const { showSnackbar } = useSnackbar();
    const { user } = useAuthState(); // Get user to check roles

    // Determine if the current user can manage POs (create, edit, delete)
    const canManagePOs = user && user.role === 'admin'; // Only admin can manage

    const fetchPurchaseOrders = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await getPurchaseOrders();
            if (response.success) {
                setPurchaseOrders(response.data || []);
            } else {
                setError(response.message || 'Failed to fetch purchase orders.');
                showSnackbar(response.message || 'Failed to fetch purchase orders.', 'error');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching purchase orders.');
            showSnackbar(err.message || 'An error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPurchaseOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
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
                        >
                            New Purchase Order
                        </Button>
                    )}
                </Box>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <TableContainer sx={{ flexGrow: 1 }}>
                    <Table stickyHeader aria-label="purchase orders table">
                        <TableHead>
                            <TableRow>
                                <TableCell>PO Number</TableCell>
                                <TableCell>Supplier</TableCell>
                                <TableCell>Order Date</TableCell>
                                <TableCell align="right">Grand Total</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="center">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {purchaseOrders.length === 0 && !loading && (
                                <TableRow><TableCell colSpan={6} align="center">No purchase orders found.</TableCell></TableRow>
                            )}
                            {purchaseOrders.map((po) => (
                                <TableRow hover key={po._id}>
                                    <TableCell>{po.poNumber}</TableCell>
                                    <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                                    <TableCell>{format(new Date(po.orderDate), 'dd MMM yyyy')}</TableCell>
                                    <TableCell align="right">${po.grandTotal?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell><Chip label={po.status} size="small" color={po.status === 'Received' ? 'success' : po.status === 'Ordered' ? 'info' : 'default'} /></TableCell>
                                    <TableCell align="center">
                                        <IconButton component={RouterLink} to={`/purchase-orders/${po._id}`} color="default" aria-label="view purchase order" size="small">
                                            <VisibilityIcon />
                                        </IconButton>
                                        {canManagePOs && po.status === 'Draft' && ( /* Allow edit only for Draft POs for example */
                                            <IconButton component={RouterLink} to={`/purchase-orders/edit/${po._id}`} color="primary" aria-label="edit purchase order" size="small">
                                                <EditIcon />
                                            </IconButton>
                                        )}
                                        {canManagePOs && (po.status === 'Draft' || po.status === 'Cancelled') && ( /* Allow delete for Draft or Cancelled POs */
                                            <IconButton onClick={() => handleDeleteClick(po)} color="error" aria-label="delete purchase order" size="small">
                                                <DeleteIcon />
                                            </IconButton>
                                        )}
                                    </TableCell>
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
        </Container>
    );
};

export default PurchaseOrdersPage;