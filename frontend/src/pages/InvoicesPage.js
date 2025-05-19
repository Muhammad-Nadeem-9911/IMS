import React, { useState, useEffect, useCallback } from 'react';
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
    Chip,
    TablePagination, // Added for pagination
    TextField, // For search
    InputAdornment // For search icon

} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search'; // Was missing from previous fix, adding it here
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [page, setPage] = useState(0); // Current page (0-indexed)
    const [rowsPerPage, setRowsPerPage] = useState(10); // Rows per page
    const [totalInvoices, setTotalInvoices] = useState(0); // Total number of invoices
    const [searchTerm, setSearchTerm] = useState(''); // Search term
    const { user, isAuthenticated } = useAuthState();

    const fetchInvoices = useCallback(async () => {
        // Renamed original fetchInvoices to _fetchInvoices and wrapped in useCallback
            if (!isAuthenticated) {
                setPageError("Please log in to view invoices.");
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                setPageError('');
                // Pass pagination and search parameters to the service
                const response = await getInvoices(page + 1, rowsPerPage, searchTerm); // response is scoped here
                if (response.success) {
                    setInvoices(response.data || []);
                    setTotalInvoices(response.count || 0); // Set total count
                } else {
                    setPageError(response.message || 'Failed to fetch invoices');
                }
            } catch (err) {
                setPageError(err.message || 'An error occurred while fetching invoices.');
            } finally {
                setLoading(false);
            }
        }, // Added comma here
        [isAuthenticated, page, rowsPerPage, searchTerm]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);
    
    const canManageInvoices = user && user.role === 'admin'; // Only admin can manage

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0); // Reset to first page on new search
    };

    const handleChangePage = (event, newPage) => setPage(newPage);

    const handleChangeRowsPerPage = (event) => { setRowsPerPage(parseInt(event.target.value, 10)); setPage(0); };

    // More specific initial loading, similar to ProductsPage
    if (loading && invoices.length === 0 && totalInvoices === 0 && !pageError && !searchTerm) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (!isAuthenticated && !loading) { // Check after loading attempt if not authenticated
        return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see invoices. <Link to="/login">Login here</Link>.</Alert>;
    }
    if (pageError && invoices.length === 0 && !loading) { // Show page error if no data and not loading
        return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>;
    }

    return (
        <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
                <Typography variant="h4" component="h1">Invoices</Typography>
                {canManageInvoices && (
                    <Button variant="contained" startIcon={<AddIcon />} component={Link} to="/invoices/new">
                        Create New Invoice
                    </Button>
                )}
            </Box>
            {/* Search Input */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Search invoices (Invoice #, Customer Name...)"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>), // SearchIcon was missing import
                    }}
                />
            </Box>
            {pageError && invoices.length > 0 && <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>Could not refresh all invoice data: {pageError}</Alert>}
            {(!loading && totalInvoices === 0 && !pageError) ? (
                <Alert severity="info" sx={{ width: '100%' }}>{searchTerm ? "No invoices found matching your search criteria." : "No invoices found."}</Alert>
            ) : (
                <TableContainer component={Paper} elevation={0} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}> {/* Use remaining space */}
                    <Table sx={{ minWidth: 650 }} aria-label="invoices table" size="medium">
                        <TableHead sx={{ backgroundColor: theme => theme.palette.primary.main }}>
                            <TableRow>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Invoice #</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Customer</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Date</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Total</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Status</TableCell>
                                <TableCell align="center" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Actions</TableCell>
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
                                invoices.map((invoice) => (
                                    <TableRow 
                                        key={invoice._id} 
                                        hover
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover },
                                            '&:last-child td, &:last-child th': { border: 0 }
                                        }}>
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
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {/* Table Pagination */}
                    <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={totalInvoices} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={handleChangeRowsPerPage} sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }} />
                </TableContainer>
            )}
        </Paper>
    );
};

export default InvoicesPage;