import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getInvoiceById } from '../services/invoiceService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { getPaymentsForInvoice, recordPayment, updatePayment, deletePayment } from '../services/paymentService'; // Import payment services
import { useAuthState } from '../contexts/AuthContext';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    Divider,
    CircularProgress,
    Alert,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TextField, // For Payment Form
    Dialog, // For Payment Modal
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    TableHead,
    TableRow,
    Chip
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import PrintIcon from '@mui/icons-material/Print';
import PaymentIcon from '@mui/icons-material/Payment'; // For Record Payment button
import CloseIcon from '@mui/icons-material/Close'; // For Modal close
import EditNoteIcon from '@mui/icons-material/EditNote'; // For Edit Payment
import DeleteForeverIcon from '@mui/icons-material/DeleteForever'; // For Delete Payment

const ViewInvoicePage = () => {
    const [invoice, setInvoice] = useState(null);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { id: invoiceId } = useParams();
    const { showSnackbar } = useSnackbar();
    const navigate = useNavigate();
    const { user } = useAuthState();
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null); // To store payment being edited
    const [paymentFormData, setPaymentFormData] = useState({
        // This state will now be used for both new and editing payments
        _id: null, // To store ID when editing
        amountPaid: '',
        paymentDate: new Date().toISOString().split('T')[0], // Default to today
        paymentMethod: 'Cash', // Default payment method
        transactionId: '',
        notes: ''
    });
    const [isConfirmDeleteDialogOpen, setIsConfirmDeleteDialogOpen] = useState(false);
    const [paymentToDelete, setPaymentToDelete] = useState(null);

    const resetPaymentForm = () => ({
        _id: null, amountPaid: '', paymentDate: new Date().toISOString().split('T')[0], paymentMethod: 'Cash', transactionId: '', notes: ''
    });


    useEffect(() => {
        const fetchInvoice = async () => {
            setLoading(true);
            try {
                const response = await getInvoiceById(invoiceId);
                if (response.success) {
                    setInvoice(response.data);
                } else {
                    showSnackbar(response.message || 'Failed to fetch invoice details.', 'error');
                    setError(response.message || 'Failed to fetch invoice details.');
                    setLoading(false);
                    return;
                }

                // Fetch payments only if invoice was fetched successfully
                const paymentsResponse = await getPaymentsForInvoice(invoiceId);
                if (paymentsResponse.success) {
                    setPayments(paymentsResponse.data);
                } else {
                    showSnackbar(paymentsResponse.message || 'Failed to fetch payments.', 'warning');
                    // Not setting main error for this, as invoice details might still be useful
                }

            } catch (err) {
                setError(err.message || 'Error fetching invoice.');
                showSnackbar(err.message || 'Error fetching invoice.', 'error');
            } finally {
                setLoading(false);
            }
        };
        if (invoiceId) {
            fetchInvoice();
        }
    }, [invoiceId, showSnackbar]);

    const handleDownloadPdf = async () => {
        setIsDownloadingPdf(true);
        try {
            const token = localStorage.getItem('token'); // Get token for the request
            const response = await fetch(`${process.env.REACT_APP_API_BASE_URL}/invoices/${invoiceId}/pdf`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                throw new Error(`PDF generation failed: ${response.statusText}`);
            }

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `invoice-${invoice.invoiceNumber}.pdf`); // or any other filename
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl); // Clean up
        } catch (err) {
            showSnackbar(err.message || 'Failed to download PDF.', 'error');
        } finally {
            setIsDownloadingPdf(false);
        }
    };

    const handlePaymentFormChange = (e) => {
        setPaymentFormData({ ...paymentFormData, [e.target.name]: e.target.value });
    };

    const handleRecordPaymentSubmit = async (e) => {
        e.preventDefault();
        if (!paymentFormData.amountPaid || isNaN(parseFloat(paymentFormData.amountPaid)) || parseFloat(paymentFormData.amountPaid) <= 0) {
            showSnackbar('Please enter a valid positive payment amount.', 'error');
            return;
        }
        try {
            let response;
            const { _id, ...dataToSubmit } = paymentFormData; // Exclude _id for new payment
            dataToSubmit.amountPaid = parseFloat(dataToSubmit.amountPaid);

            if (editingPayment) { // If we are editing
                response = await updatePayment(editingPayment._id, dataToSubmit);
                setInvoice(response.updatedInvoice);
                setPayments(payments.map(p => p._id === editingPayment._id ? response.data : p));
                showSnackbar('Payment updated successfully!', 'success');
            } else { // If we are recording a new payment
                dataToSubmit.invoiceId = invoice._id;
                response = await recordPayment(dataToSubmit);
                setInvoice(response.updatedInvoice);
                setPayments(prevPayments => [...prevPayments, response.data]);
                showSnackbar('Payment recorded successfully!', 'success');
            }

            setIsPaymentModalOpen(false);
            setPaymentFormData(resetPaymentForm());
            setEditingPayment(null); // Clear editing state
        } catch (err) {
            showSnackbar(err.message || `Failed to ${editingPayment ? 'update' : 'record'} payment.`, 'error');
        }
    };

    const handleOpenEditPaymentModal = (payment) => {
        setEditingPayment(payment);
        setPaymentFormData({
            _id: payment._id,
            amountPaid: payment.amountPaid.toString(), // Ensure it's a string for TextField
            paymentDate: new Date(payment.paymentDate).toISOString().split('T')[0],
            paymentMethod: payment.paymentMethod,
            transactionId: payment.transactionId || '',
            notes: payment.notes || ''
        });
        setIsPaymentModalOpen(true);
    };

    const handleOpenDeleteConfirmDialog = (payment) => {
        setPaymentToDelete(payment);
        setIsConfirmDeleteDialogOpen(true);
    };

    const handleDeletePayment = async () => {
        if (!paymentToDelete) return;
        try {
            const response = await deletePayment(paymentToDelete._id);
            setInvoice(response.updatedInvoice);
            setPayments(payments.filter(p => p._id !== paymentToDelete._id));
            showSnackbar('Payment deleted successfully!', 'success');
            setIsConfirmDeleteDialogOpen(false);
            setPaymentToDelete(null);
        } catch (err) {
            showSnackbar(err.message || 'Failed to delete payment.', 'error');
            setIsConfirmDeleteDialogOpen(false);
            setPaymentToDelete(null);
        }
    };

    const canManageInvoices = user && user.role === 'admin'; // Only admin can manage

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error} <Link to="/invoices">Go back to Invoices</Link></Alert>;
    if (!invoice) return <Alert severity="info" sx={{ mt: 2 }}>Invoice not found. <Link to="/invoices">Go back to Invoices</Link></Alert>;

    const balanceDue = invoice.grandTotal - (invoice.totalPaid || 0);
    const statusColors = {
        paid: 'success',
        partially_paid: 'warning',
        overdue: 'error',
        sent: 'info',
        draft: 'default', // Or 'secondary'
        void: 'default'   // Or 'secondary'
    };

    return (
        <Container maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h4" component="h1">
                        Invoice #{invoice.invoiceNumber}
                    </Typography>
                    <Box>
                        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/invoices')} sx={{ mr: 1 }}>
                            Back to Invoices
                        </Button>
                        {canManageInvoices && (
                            <Button component={Link} to={`/invoices/edit/${invoice._id}`} variant="contained" color="secondary" startIcon={<EditIcon />} sx={{ mr: 1 }}>
                                Edit
                            </Button>
                        )}
                        {invoice.status !== 'paid' && invoice.status !== 'void' && canManageInvoices && (
                            <Button
                                variant="contained"
                                startIcon={editingPayment ? <EditNoteIcon /> : <PaymentIcon />}
                                onClick={() => setIsPaymentModalOpen(true)}
                                sx={{ mr: 1 }}
                            >Record Payment</Button>
                        )}
                        <Button 
                            variant="contained" 
                            startIcon={isDownloadingPdf ? <CircularProgress size={20} color="inherit" /> : <PrintIcon />}
                            onClick={handleDownloadPdf}
                            disabled={isDownloadingPdf}
                        >
                            {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
                        </Button>
                    </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={2}>
                    <Grid xs={12} md={6}> {/* Removed item prop as xs/md are present */}
                        <Typography variant="h6">Billed To:</Typography>
                        <Typography>{invoice.customer?.name || 'N/A'}</Typography>
                        <Typography>{`${invoice.customer?.address?.street || ''} ${invoice.customer?.address?.city || ''} ${invoice.customer?.address?.state || ''} ${invoice.customer?.address?.postalCode || ''} ${invoice.customer?.address?.country || ''}`.trim() || 'N/A'}</Typography>
                        <Typography>{invoice.customer?.email || 'N/A'}</Typography>
                    </Grid>
                    <Grid xs={12} md={6} sx={{ textAlign: { md: 'right' } }}> {/* Removed item prop as xs/md are present */}
                        <Typography variant="h6">Invoice Details:</Typography>
                        <Typography component="div"><strong>Status:</strong> <Chip label={invoice.status.replace('_', ' ').toUpperCase()} size="small" color={statusColors[invoice.status] || 'default'} /></Typography>
                        <Typography><strong>Invoice Date:</strong> {new Date(invoice.invoiceDate).toLocaleDateString()}</Typography>
                        <Typography><strong>Due Date:</strong> {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'}</Typography>
                        <Typography><strong>Amount Paid:</strong> ${invoice.totalPaid ? invoice.totalPaid.toFixed(2) : '0.00'}</Typography>
                        <Typography><strong>Balance Due:</strong> ${balanceDue.toFixed(2)}</Typography>
                    </Grid>
                </Grid>

                <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Items:</Typography>
                <TableContainer component={Paper} variant="outlined">
                    <Table>
                        <TableHead sx={{ backgroundColor: 'grey.200' }}>
                            <TableRow>
                                <TableCell>Product/Service</TableCell>
                                <TableCell>Description</TableCell>
                                <TableCell align="right">Quantity</TableCell>
                                <TableCell align="right">Unit Price</TableCell>
                                <TableCell align="right">Total Price</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoice.items.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item.productName}</TableCell>
                                    <TableCell>{item.description || '-'}</TableCell>
                                    <TableCell align="right">{item.quantity}</TableCell>
                                    <TableCell align="right">${item.unitPrice.toFixed(2)}</TableCell>
                                    <TableCell align="right">${item.totalPrice.toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Grid container justifyContent="flex-end" sx={{ mt: 2 }}>
                    <Grid xs={12} md={4}> {/* Removed item prop as xs/md are present */}
                        <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal:</span> <span>${invoice.subTotal.toFixed(2)}</span></Typography>
                        <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax ({invoice.taxRate}%):</span> <span>${invoice.taxAmount.toFixed(2)}</span></Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}><span>Total Paid:</span> <span>${invoice.totalPaid ? invoice.totalPaid.toFixed(2) : '0.00'}</span></Typography>
                        <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}><span>Grand Total:</span> <span>${invoice.grandTotal.toFixed(2)}</span></Typography>
                    </Grid>
                </Grid>

                {invoice.notes && (
                    <Box sx={{ mt: 3, p: 2, border: '1px dashed grey' }}>
                        <Typography variant="subtitle1">Notes:</Typography>
                        <Typography variant="body2" style={{ whiteSpace: 'pre-wrap' }}>{invoice.notes}</Typography>
                    </Box>
                )}

                {/* Payments Section */}
                <Box sx={{ mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Payments Received:</Typography>
                    {payments.length > 0 ? (
                        <TableContainer component={Paper} variant="outlined">
                            <Table>
                                <TableHead sx={{ backgroundColor: 'grey.200' }}>
                                    <TableRow>
                                        <TableCell>Date</TableCell>
                                        <TableCell align="right">Amount</TableCell>
                                        <TableCell>Method</TableCell>
                                        <TableCell>Transaction ID</TableCell>
                                        <TableCell>Notes</TableCell>
                                        {canManageInvoices && <TableCell align="center">Actions</TableCell>}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {payments.map((payment) => (
                                        <TableRow key={payment._id}>
                                            <TableCell>{new Date(payment.paymentDate).toLocaleDateString()}</TableCell>
                                            <TableCell align="right">${payment.amountPaid.toFixed(2)}</TableCell>
                                            <TableCell>{payment.paymentMethod}</TableCell>
                                            <TableCell>{payment.transactionId || 'N/A'}</TableCell>
                                            <TableCell>{payment.notes || 'N/A'}</TableCell>
                                            {canManageInvoices && (
                                                <TableCell align="center">
                                                    <IconButton size="small" onClick={() => handleOpenEditPaymentModal(payment)} color="primary" aria-label="edit payment">
                                                        <EditNoteIcon />
                                                    </IconButton>
                                                    <IconButton size="small" onClick={() => handleOpenDeleteConfirmDialog(payment)} color="error" aria-label="delete payment">
                                                        <DeleteForeverIcon />
                                                    </IconButton>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    ) : (
                        <Typography>No payments recorded for this invoice yet.</Typography>
                    )}
                </Box>
            </Paper>

            {/* Payment Modal */}
            <Dialog open={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {editingPayment ? 'Edit Payment' : 'Record Payment'} for Invoice #{invoice?.invoiceNumber}
                    <IconButton onClick={() => setIsPaymentModalOpen(false)}><CloseIcon /></IconButton>
                </DialogTitle>
                <form onSubmit={handleRecordPaymentSubmit}>
                    <DialogContent>
                        <Grid container spacing={2} sx={{pt: 1}}>
                            <Grid item xs={12} sm={6}>
                                <TextField label="Amount Paid" type="number" name="amountPaid" value={paymentFormData.amountPaid} onChange={handlePaymentFormChange} fullWidth required inputProps={{ step: "0.01", min: "0.01" }} autoFocus={!editingPayment} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField label="Payment Date" type="date" name="paymentDate" value={paymentFormData.paymentDate} onChange={handlePaymentFormChange} fullWidth required InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField label="Payment Method" select name="paymentMethod" value={paymentFormData.paymentMethod} onChange={handlePaymentFormChange} fullWidth SelectProps={{ native: true }}>
                                    <option value="Cash">Cash</option>
                                    <option value="Credit Card">Credit Card</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Online Payment">Online Payment</option>
                                    <option value="Other">Other</option>
                                </TextField>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField label="Transaction ID (Optional)" name="transactionId" value={paymentFormData.transactionId} onChange={handlePaymentFormChange} fullWidth />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField label="Notes (Optional)" name="notes" value={paymentFormData.notes} onChange={handlePaymentFormChange} fullWidth multiline rows={3} />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}>
                        <Button onClick={() => setIsPaymentModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="contained">{editingPayment ? 'Update Payment' : 'Submit Payment'}</Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Confirm Delete Dialog */}
            <Dialog open={isConfirmDeleteDialogOpen} onClose={() => setIsConfirmDeleteDialogOpen(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete this payment of ${paymentToDelete?.amountPaid.toFixed(2)} made on {paymentToDelete && new Date(paymentToDelete.paymentDate).toLocaleDateString()}? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsConfirmDeleteDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleDeletePayment} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ViewInvoicePage;