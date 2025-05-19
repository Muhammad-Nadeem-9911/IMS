import React, { useState, useEffect } from 'react';
import { getTransactionsReport, exportTransactionsToCsv, exportTransactionsToPdf } from '../services/reportService'; // Added exportTransactionsToPdf
import { getCustomers } from '../services/customerService'; // To populate customer filter
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container, Typography, Paper, Box, Grid, Button, CircularProgress, Alert, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    MenuItem, Autocomplete, TablePagination // Added TablePagination
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import FilterListIcon from '@mui/icons-material/FilterList';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // For PDF export button

const TransactionReportPage = () => {
    const [reportData, setReportData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [exportingCsv, setExportingCsv] = useState(false);
    const [exportingPdf, setExportingPdf] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [filters, setFilters] = useState({
        startDate: null,
        endDate: null,
        customerId: null, // Store selected customer object or just ID
        transactionType: 'all', // 'all', 'invoice', 'payment', 'journal_entry'
        paymentMethod: '',
        status: 'all', // New status filter
    });
    const [customers, setCustomers] = useState([]);

    // Pagination state
    const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Fetch customers for the filter dropdown
    useEffect(() => {
        const fetchCustomersForFilter = async () => {
            try {
                const response = await getCustomers();
                if (response.success) {
                    setCustomers(response.data || []);
                }
            } catch (err) {
                showSnackbar('Could not load customers for filter.', 'warning');
            }
        };
        fetchCustomersForFilter();
    }, [showSnackbar]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name, newValue) => {
        setFilters(prev => ({ ...prev, [name]: newValue }));
    };

    const handleCustomerChange = (event, newValue) => {
        setFilters(prev => ({ ...prev, customerId: newValue ? newValue._id : null }));
    };

    const handleFetchReport = async (currentPage = 0, currentRowsPerPage = rowsPerPage) => {
        setLoading(true);
        setError('');
        // setReportData([]); // Don't clear data immediately, clear on successful fetch or error

        setPage(currentPage);
        setRowsPerPage(currentRowsPerPage);
        const queryParams = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            customerId: filters.customerId || undefined,
            transactionType: filters.transactionType === 'all' ? undefined : filters.transactionType,
            paymentMethod: filters.paymentMethod || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
            page: currentPage + 1, // API is 1-indexed
            limit: currentRowsPerPage,
        };

        // Remove undefined params
        Object.keys(queryParams).forEach(key => queryParams[key] === undefined && delete queryParams[key]);

        try {
            const response = await getTransactionsReport(queryParams);
            if (response.success) {
                setReportData(response.data || []);
                setTotalCount(response.count || 0);
                if ((response.data || []).length === 0) {
                    showSnackbar('No transactions found matching your criteria.', 'info');
                }
            } else {
                setError(response.message || 'Failed to fetch transaction report.');
                showSnackbar(response.message || 'Failed to fetch transaction report.', 'error');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching the report.');
            showSnackbar(err.message || 'An error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
    };

    const handleClearFilters = () => {
        setFilters({
            startDate: null,
            endDate: null,
            customerId: null,
            transactionType: 'all',
            paymentMethod: '',
            status: 'all',
        });
        setPage(0); // Reset to first page
        // Optionally, re-fetch with cleared filters immediately or wait for user to click "Generate Report"
        // handleFetchReport(0, rowsPerPage); // Example: re-fetch immediately
        setReportData([]);
        setTotalCount(0);
    };

    const handleChangePage = (event, newPage) => {
        handleFetchReport(newPage, rowsPerPage);
    };

    const handleExportCsvClick = async () => {
        setExportingCsv(true);
        showSnackbar('Generating CSV export...', 'info');

        const exportFilters = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            customerId: filters.customerId || undefined,
            transactionType: filters.transactionType === 'all' ? undefined : filters.transactionType,
            paymentMethod: filters.paymentMethod || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
        };
        Object.keys(exportFilters).forEach(key => exportFilters[key] === undefined && delete exportFilters[key]);

        try {
            const blob = await exportTransactionsToCsv(exportFilters);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `transactions_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSnackbar('CSV export downloaded successfully!', 'success');
        } catch (err) {
            showSnackbar(err.message || 'Failed to export CSV.', 'error');
        } finally {
            setExportingCsv(false);
        }
    };

    const handleExportPdfClick = async () => {
        setExportingPdf(true);
        showSnackbar('Generating PDF export...', 'info');

        const exportFilters = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            customerId: filters.customerId || undefined,
            transactionType: filters.transactionType === 'all' ? undefined : filters.transactionType,
            paymentMethod: filters.paymentMethod || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
        };
        Object.keys(exportFilters).forEach(key => exportFilters[key] === undefined && delete exportFilters[key]);

        try {
            const blob = await exportTransactionsToPdf(exportFilters);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `transactions_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSnackbar('PDF export downloaded successfully!', 'success');
        } catch (err) {
            showSnackbar(err.message || 'Failed to export PDF.', 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, borderBottom: `1px solid ${theme => theme.palette.divider}`, pb: 1.5 }}>
                    <FilterListIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">
                        Transaction Report
                    </Typography>
                </Box>

                {/* Filter Section Title */}
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 1 }}>
                    Filter Options
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    {/* Parent div for filter fields */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 2.5 }}>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}> {/* Adjusted for potentially 3-6 items */}
                            <DatePicker
                                label="Start Date"
                                value={filters.startDate}
                                onChange={(newValue) => handleDateChange('startDate', newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'outlined' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}>
                            <DatePicker
                                label="End Date"
                                value={filters.endDate}
                                onChange={(newValue) => handleDateChange('endDate', newValue)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'outlined' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}>
                            <Autocomplete
                                options={customers}
                                getOptionLabel={(option) => option.name || ""}
                                value={customers.find(c => c._id === filters.customerId) || null}
                                onChange={handleCustomerChange}
                                isOptionEqualToValue={(option, value) => option._id === value?._id}
                                renderInput={(params) => (<TextField {...params} label="Customer (Optional)" variant="outlined" size="small" />)}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}>
                            <TextField
                                select
                                label="Transaction Type"
                                name="transactionType"
                                value={filters.transactionType}
                                onChange={handleFilterChange}
                                fullWidth
                                size="small"
                                variant="outlined"
                            >
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="invoice">Invoice</MenuItem>
                                <MenuItem value="payment">Payment</MenuItem>
                                <MenuItem value="journal_entry">Journal Entry</MenuItem>
                            </TextField>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}>
                            <TextField
                                select
                                label="Status"
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                                fullWidth
                                size="small"
                                variant="outlined"
                                disabled={filters.transactionType === 'payment' || filters.transactionType === 'journal_entry'} // Status mainly for Invoices
                            >
                                <MenuItem value="all">All Statuses</MenuItem>
                                <MenuItem value="draft">Draft</MenuItem>
                                <MenuItem value="sent">Sent</MenuItem>
                                <MenuItem value="paid">Paid</MenuItem>
                                <MenuItem value="partially_paid">Partially Paid</MenuItem>
                                <MenuItem value="overdue">Overdue</MenuItem>
                                <MenuItem value="void">Void</MenuItem>
                            </TextField>
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(33.33% - 10.67px)' } }}>
                            <TextField
                                select
                                label="Payment Method"
                                name="paymentMethod"
                                value={filters.paymentMethod}
                                onChange={handleFilterChange}
                                fullWidth
                                size="small"
                                variant="outlined"
                                disabled={filters.transactionType === 'invoice' || filters.transactionType === 'journal_entry'}
                            >
                                <MenuItem value=""><em>All</em></MenuItem>
                                <MenuItem value="Cash">Cash</MenuItem>
                                <MenuItem value="Credit Card">Credit Card</MenuItem>
                                <MenuItem value="Bank Transfer">Bank Transfer</MenuItem>
                                <MenuItem value="Online Payment">Online Payment</MenuItem>
                                <MenuItem value="Other">Other</MenuItem>
                            </TextField>
                        </Box>
                    </Box>

                    {/* Parent div for filter action buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 2.5 }}>
                        <Button variant="outlined" color="secondary" onClick={handleClearFilters} disabled={loading} size="medium" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
                            Clear Filters
                        </Button>
                        <Button
                                variant="outlined"
                                color="secondary"
                                onClick={handleExportCsvClick}
                                disabled={loading || exportingCsv || exportingPdf || reportData.length === 0}
                                size="medium"
                                sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}
                            >
                                {exportingCsv ? <CircularProgress size={24} /> : 'Export to CSV'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="error" // Or another distinct color
                                startIcon={<PictureAsPdfIcon />}
                                onClick={handleExportPdfClick}
                                disabled={loading || exportingCsv || exportingPdf || reportData.length === 0}
                                size="medium"
                                sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}
                            >
                                {exportingPdf ? <CircularProgress size={24} /> : 'Export to PDF'}
                            </Button>
                        <Button
                            variant="contained"
                            onClick={() => handleFetchReport(0, rowsPerPage)} // Reset page to 0 on new filter
                            disabled={loading}
                            size="medium"
                            sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}
                        >
                            {loading ? <CircularProgress size={24} /> : 'Generate Report'}
                        </Button>
                    </Box>
                </LocalizationProvider>

                {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}

                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}

                {!loading && !error && reportData.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', my: 1 }}>
                        <Typography variant="body2">
                            Showing {reportData.length} of {totalCount} transactions.
                        </Typography>
                    </Box>
                )}

                {!loading && !error && reportData.length > 0 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 0, borderRadius: 1.5, flexGrow: 1 }}> {/* Consistent styling */}
                        <Table sx={{ minWidth: 900 }} aria-label="transactions report table" size="small">
                            <TableHead sx={{ backgroundColor: 'grey.200' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Reference</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Party</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Amount (₹)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Status/Method</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.map((transaction) => (
                                    <TableRow key={transaction._id} hover>
                                        <TableCell>{format(new Date(transaction.date), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{transaction.type}</TableCell>
                                        <TableCell>{transaction.reference}</TableCell>
                                        <TableCell>{transaction.party}</TableCell>
                                        <TableCell>{transaction.description}</TableCell>
                                        <TableCell align="right">{formatCurrency(transaction.amount)}</TableCell>
                                        <TableCell>{transaction.type === 'Invoice' ? transaction.status : transaction.paymentMethod}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            component="div"
                            count={totalCount}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={(event) => handleFetchReport(0, parseInt(event.target.value, 10))}
                        />
                    </TableContainer>
                )}
                {!loading && reportData.length === 0 && !error && totalCount === 0 && ( // Show only if no data was ever fetched or filters result in none
                    <Typography sx={{ mt: 2, textAlign: 'center' }}>
                        No transactions found. Please adjust your filters or record new transactions.
                    </Typography>
                )}
            </Paper>
        </Container>
    );
};

export default TransactionReportPage;