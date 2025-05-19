import React, { useState, useEffect } from 'react';
import { getInvoices } from '../services/invoiceService';
import { useAuthState } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
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
    Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const { user, isAuthenticated } = useAuthState();

    useEffect(() => {
        const fetchInvoices = async () => {
            if (!isAuthenticated) {
                setPageError("Please log in to view invoices.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setPageError('');
                const response = await getInvoices();
                if (response.success) {
                    setInvoices(response.data);
                } else {
                    setPageError(response.message || 'Failed to fetch invoices');
                }
            } catch (err) {
                setPageError(err.message || 'An error occurred while fetching invoices.');
            } finally {
                setLoading(false);
            }
        };
        fetchInvoices();
    }, [isAuthenticated]);

    const canManageInvoices = user && user.role === 'admin'; // Only admin can manage

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (pageError && !invoices.length) return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>;
    if (!isAuthenticated) return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see invoices. <Link to="/login">Login here</Link>.</Alert>;

    return (
        <Paper sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
                <Typography variant="h4" component="h1">Invoices</Typography>
                {canManageInvoices && (
                    <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/invoices/new">
                        Create New Invoice
                    </Button>
                )}
            </Box>
            {pageError && invoices.length > 0 && <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>Could not refresh all invoice data: {pageError}</Alert>}
            {invoices.length === 0 && !loading ? (
                <Alert severity="info" sx={{ width: '100%' }}>No invoices found.</Alert>
            ) : (
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ flexGrow: 1 }}> {/* Use remaining space */}
                    <Table sx={{ minWidth: 650 }} aria-label="invoices table">
                        <TableHead sx={{ backgroundColor: 'primary.main' }}>
                            <TableRow>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Invoice #</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Customer</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell align="right" sx={{ color: 'common.white', fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell sx={{ color: 'common.white', fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell align="center" sx={{ color: 'common.white', fontWeight: 'bold' }}>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoices.map((invoice) => (
                                <TableRow key={invoice._id} hover>
                                    <TableCell>{invoice.invoiceNumber}</TableCell>
                                    <TableCell>{invoice.customer?.name || 'N/A'}</TableCell> {/* Updated to use populated customer name */}
                                    <TableCell>{new Date(invoice.invoiceDate).toLocaleDateString()}</TableCell>
                                    <TableCell align="right">${invoice.grandTotal.toFixed(2)}</TableCell>
                                    <TableCell><Chip label={invoice.status} size="small" color={invoice.status === 'Paid' ? 'success' : invoice.status === 'Overdue' ? 'error' : 'default'} /></TableCell>
                                    <TableCell align="center">
                                        <Button component={Link} to={`/invoices/${invoice._id}`} startIcon={<VisibilityIcon />} size="small" sx={{ mr: 1 }}>View</Button>
                                        {canManageInvoices && (
                                            <Button component={Link} to={`/invoices/edit/${invoice._id}`} startIcon={<EditIcon />} size="small" color="secondary">Edit</Button>
                                        )}
                                        
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Paper>
    );
};

export default InvoicesPage;