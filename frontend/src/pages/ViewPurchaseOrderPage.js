import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import { getPurchaseOrderById, receivePurchaseOrderItems } from '../services/purchaseOrderService'; // Import receivePurchaseOrderItems
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuthState } from '../contexts/AuthContext';
import {
    Container, Typography, Paper, Box, CircularProgress, Alert, Grid, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField, // For Modal
    List, ListItem, ListItemText // For modal item list
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'; // For Receive Items button
import { format } from 'date-fns';


const ViewPurchaseOrderPage = () => {
    const { id: poId } = useParams();
    const [purchaseOrder, setPurchaseOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const { user } = useAuthState();

    // State for Receive Items Modal
    const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
    const [itemsToReceiveState, setItemsToReceiveState] = useState([]);
    const [receiveLoading, setReceiveLoading] = useState(false);

    // Determine if the current user can edit POs (e.g., if it's in Draft status)
    const canEditPO = user && user.role === 'admin' &&
        purchaseOrder && purchaseOrder.status === 'Draft';

    // Determine if the current user can receive items against this PO
    const canReceiveItems = user && user.role === 'admin' &&
        purchaseOrder && (purchaseOrder.status === 'Ordered' || purchaseOrder.status === 'Partially Received');

    const fetchPO = useCallback(async (showSuccessSnackbar = false) => {
            try {
                setLoading(true);
                setError('');
                const response = await getPurchaseOrderById(poId);
                if (response.success && response.data) {
                    setPurchaseOrder(response.data);
                    if (showSuccessSnackbar) showSnackbar('Purchase Order details refreshed!', 'success');
                } else {
                    setError(response.message || 'Failed to fetch purchase order details.');
                    showSnackbar(response.message || 'Purchase Order not found.', 'error');
                }
            } catch (err) {
                setError(err.message || 'An error occurred.');
                showSnackbar(err.message || 'Error fetching PO.', 'error');
            } finally {
                setLoading(false);
            }
        }, [poId, showSnackbar]); // Dependencies for useCallback


    useEffect(() => {
        if (poId) {
            fetchPO();
        } else {
            navigate('/purchase-orders'); // Should not happen if route is correct
        }
    }, [poId, navigate, fetchPO]); // Removed showSnackbar as it's a dependency of fetchPO now

    const handleOpenReceiveModal = () => {
        // Initialize itemsToReceiveState based on current PO items
        const initialItems = purchaseOrder.items.map(item => ({
            itemId: item._id,
            productName: item.productName,
            quantityOrdered: item.quantityOrdered,
            quantityAlreadyReceived: item.quantityReceived,
            quantityOutstanding: item.quantityOrdered - item.quantityReceived,
            quantityNewlyReceived: '', // User input, default to 0 or empty
        })).filter(item => item.quantityOutstanding > 0); // Only show items that still need receiving
        setItemsToReceiveState(initialItems);
        setIsReceiveModalOpen(true);
    };

    const handleReceiveItemChange = (index, value) => {
        const newItems = [...itemsToReceiveState];
        const maxReceivable = newItems[index].quantityOutstanding;
        let receivedValue = parseInt(value, 10);

        if (isNaN(receivedValue) || receivedValue < 0) {
            receivedValue = 0;
        } else if (receivedValue > maxReceivable) {
            receivedValue = maxReceivable;
            showSnackbar(`Cannot receive more than ${maxReceivable} for ${newItems[index].productName}`, 'warning');
        }

        newItems[index].quantityNewlyReceived = receivedValue.toString(); // Keep as string for TextField
        setItemsToReceiveState(newItems);
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Container sx={{ mt: 2 }}><Alert severity="error">{error}</Alert></Container>;
    }

    if (!purchaseOrder) {
        return <Container sx={{ mt: 2 }}><Alert severity="info">No purchase order data found.</Alert></Container>;
    }

    const { poNumber, supplier, orderDate, expectedDeliveryDate, items, subTotal, grandTotal, status, notes, createdAt, updatedAt } = purchaseOrder;

    return (
        <Container maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Purchase Order: {poNumber}
                    </Typography>
                    <Box>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBackIcon />}
                            component={RouterLink}
                            to="/purchase-orders"
                            sx={{ mr: 1 }}
                        >
                            Back to List
                        </Button>
                        {canEditPO && (
                            <Button
                                variant="contained"
                                startIcon={<EditIcon />}
                                component={RouterLink}
                                sx={{ mr: 1 }}
                                to={`/purchase-orders/edit/${poId}`}
                            >
                                Edit
                            </Button>
                        )}
                        {canReceiveItems && (
                            <Button
                                variant="contained"
                                color="success"
                                startIcon={<CheckCircleOutlineIcon />}
                                onClick={handleOpenReceiveModal}
                            >
                                Receive Items
                            </Button>
                        )}
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle1" gutterBottom><strong>Supplier:</strong></Typography>
                        <Typography>{supplier?.name || 'N/A'}</Typography>
                        <Typography variant="body2">{supplier?.email}</Typography>
                        <Typography variant="body2">{supplier?.phone}</Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle1" gutterBottom><strong>Order Date:</strong></Typography>
                        <Typography>{format(new Date(orderDate), 'dd MMM yyyy, HH:mm')}</Typography>
                        {expectedDeliveryDate && (
                            <>
                                <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}><strong>Expected Delivery:</strong></Typography>
                                <Typography>{format(new Date(expectedDeliveryDate), 'dd MMM yyyy')}</Typography>
                            </>
                        )}
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="subtitle1" gutterBottom><strong>Status:</strong></Typography>
                        <Chip label={status} color={status === 'Received' ? 'success' : status === 'Ordered' ? 'info' : 'default'} />
                    </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Items Ordered</Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Product Name</TableCell>
                                <TableCell align="right">Qty Ordered</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">Total Price</TableCell>
                                <TableCell align="right">Qty Received</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {items?.map((item, index) => (
                                <TableRow key={item._id || index}>
                                    <TableCell>{item.productName || item.product?.name || 'N/A'}</TableCell>
                                    <TableCell align="right">{item.quantityOrdered}</TableCell>
                                    <TableCell align="right">${item.unitPrice?.toFixed(2)}</TableCell>
                                    <TableCell align="right">${item.totalPrice?.toFixed(2)}</TableCell>
                                    <TableCell align="right">{item.quantityReceived || 0}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Grid item xs={12} md={4}>
                        <Typography align="right">Subtotal: ${subTotal?.toFixed(2)}</Typography>
                        <Typography align="right" variant="h6"><strong>Grand Total: ${grandTotal?.toFixed(2)}</strong></Typography>
                    </Grid>
                </Grid>

                {notes && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="subtitle1" gutterBottom><strong>Notes:</strong></Typography>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{notes}</Typography>
                    </Box>
                )}

                <Typography variant="caption" display="block" sx={{ mt: 3, color: 'text.secondary' }}>
                    Created: {format(new Date(createdAt), 'dd MMM yyyy, HH:mm')} | Last Updated: {format(new Date(updatedAt), 'dd MMM yyyy, HH:mm')}
                </Typography>

                {/* Receive Items Modal */}
                <Dialog open={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} maxWidth="md" fullWidth>
                    <DialogTitle>Receive Items for PO: {poNumber}</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{mb: 2}}>
                            Enter the quantity received for each item. You cannot receive more than the outstanding quantity.
                        </DialogContentText>
                        {itemsToReceiveState.length === 0 && <Alert severity="info">All items on this PO have been fully received.</Alert>}
                        <List dense>
                            {itemsToReceiveState.map((item, index) => (
                                <ListItem key={item.itemId} divider>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} sm={5}>
                                            <ListItemText
                                                primary={item.productName}
                                                secondary={`Ordered: ${item.quantityOrdered} | Received: ${item.quantityAlreadyReceived} | Outstanding: ${item.quantityOutstanding}`}
                                            />
                                        </Grid>
                                        <Grid item xs={12} sm={4}>
                                            <TextField
                                                label="Quantity Received Now"
                                                type="number"
                                                size="small"
                                                value={item.quantityNewlyReceived}
                                                onChange={(e) => handleReceiveItemChange(index, e.target.value)}
                                                inputProps={{ min: 0, max: item.quantityOutstanding }}
                                                fullWidth
                                                disabled={receiveLoading}
                                            />
                                        </Grid>
                                    </Grid>
                                </ListItem>
                            ))}
                        </List>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setIsReceiveModalOpen(false)} disabled={receiveLoading}>Cancel</Button>
                        <Button
                            onClick={async () => {
                                setReceiveLoading(true);
                                const payload = itemsToReceiveState
                                    .filter(item => parseInt(item.quantityNewlyReceived, 10) > 0)
                                    .map(item => ({ itemId: item.itemId, quantityNewlyReceived: parseInt(item.quantityNewlyReceived, 10) }));
                                if (payload.length > 0) {
                                    try {
                                        await receivePurchaseOrderItems(poId, payload);
                                        showSnackbar('Items received successfully!', 'success');
                                        fetchPO(true); // Refresh PO details and show success
                                    } catch (err) {
                                        showSnackbar(err.message || 'Failed to receive items.', 'error');
                                    }
                                } else {
                                    showSnackbar('No quantities entered for receiving.', 'info');
                                }
                                setReceiveLoading(false);
                                setIsReceiveModalOpen(false);
                            }}
                            variant="contained"
                            color="primary"
                            disabled={receiveLoading || itemsToReceiveState.length === 0 || itemsToReceiveState.every(item => !item.quantityNewlyReceived || parseInt(item.quantityNewlyReceived, 10) === 0)}
                        >
                            {receiveLoading ? <CircularProgress size={24} /> : 'Confirm Receipt'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </Container>
    );
};

export default ViewPurchaseOrderPage;