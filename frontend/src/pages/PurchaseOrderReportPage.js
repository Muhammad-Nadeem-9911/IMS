import React, { useState, useEffect } from 'react';
import { getPurchaseOrdersReport, exportPurchaseOrdersToCsv, exportPurchaseOrdersToPdf } from '../services/reportService'; // Added exportPurchaseOrdersToPdf
import { getSuppliers } from '../services/supplierService'; // To populate supplier filter
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container, Typography, Paper, Box, Grid, Button, CircularProgress, Alert, Divider,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField,
    MenuItem, Autocomplete, TablePagination, Chip
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Icon for POs
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf'; // For PDF export button

const PurchaseOrderReportPage = () => {
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
        supplierId: null,
        status: 'all',
    });
    const [suppliers, setSuppliers] = useState([]);

    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        const fetchSuppliersForFilter = async () => {
            try {
                const response = await getSuppliers();
                if (response.success) {
                    setSuppliers(response.data || []);
                }
            } catch (err) {
                showSnackbar('Could not load suppliers for filter.', 'warning');
            }
        };
        fetchSuppliersForFilter();
    }, [showSnackbar]);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name, newValue) => {
        setFilters(prev => ({ ...prev, [name]: newValue }));
    };

    const handleSupplierChange = (event, newValue) => {
        setFilters(prev => ({ ...prev, supplierId: newValue ? newValue._id : null }));
    };

    const handleFetchReport = async (currentPage = 0, currentRowsPerPage = rowsPerPage) => {
        setLoading(true);
        setError('');
        setPage(currentPage);
        setRowsPerPage(currentRowsPerPage);

        const queryParams = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            supplierId: filters.supplierId || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
            page: currentPage + 1,
            limit: currentRowsPerPage,
        };
        Object.keys(queryParams).forEach(key => queryParams[key] === undefined && delete queryParams[key]);

        try {
            const response = await getPurchaseOrdersReport(queryParams);
            if (response.success) {
                setReportData(response.data || []);
                setTotalCount(response.count || 0);
                if ((response.data || []).length === 0) {
                    showSnackbar('No purchase orders found matching your criteria.', 'info');
                }
            } else {
                setError(response.message || 'Failed to fetch PO report.');
                showSnackbar(response.message || 'Failed to fetch PO report.', 'error');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching the PO report.');
            showSnackbar(err.message || 'An error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
    };

    const handleClearFilters = () => {
        setFilters({ startDate: null, endDate: null, supplierId: null, status: 'all' });
        setPage(0);
        setReportData([]);
        setTotalCount(0);
    };

    const handleChangePage = (event, newPage) => {
        handleFetchReport(newPage, rowsPerPage);
    };

    const handleExportCsvClick = async () => {
        setExportingCsv(true);
        showSnackbar('Generating PO CSV export...', 'info');
        const exportFilters = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            supplierId: filters.supplierId || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
        };
        Object.keys(exportFilters).forEach(key => exportFilters[key] === undefined && delete exportFilters[key]);

        try {
            const blob = await exportPurchaseOrdersToCsv(exportFilters);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `purchase_orders_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSnackbar('PO CSV export downloaded successfully!', 'success');
        } catch (err) {
            showSnackbar(err.message || 'Failed to export PO CSV.', 'error');
        } finally {
            setExportingCsv(false);
        }
    };
    const handleExportPdfClick = async () => {
        setExportingPdf(true);
        showSnackbar('Generating PO PDF export...', 'info');
        const exportFilters = {
            startDate: filters.startDate ? format(new Date(filters.startDate), 'yyyy-MM-dd') : undefined,
            endDate: filters.endDate ? format(new Date(filters.endDate), 'yyyy-MM-dd') : undefined,
            supplierId: filters.supplierId || undefined,
            status: filters.status === 'all' ? undefined : filters.status,
        };
        Object.keys(exportFilters).forEach(key => exportFilters[key] === undefined && delete exportFilters[key]);

        try {
            const blob = await exportPurchaseOrdersToPdf(exportFilters);
            const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const filename = `purchase_orders_report_${format(new Date(), 'yyyyMMdd_HHmmss')}.pdf`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
            showSnackbar('PO PDF export downloaded successfully!', 'success');
        } catch (err) {
            showSnackbar(err.message || 'Failed to export PO PDF.', 'error');
        } finally {
            setExportingPdf(false);
        }
    };

    const poStatusOptions = ['all', 'Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'];
    const poStatusColors = { Draft: 'default', Ordered: 'info', 'Partially Received': 'warning', Received: 'success', Cancelled: 'error' };

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, borderBottom: `1px solid ${theme => theme.palette.divider}`, pb: 1.5 }}>
                    <ShoppingCartIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">Purchase Order Report</Typography>
                </Box>

                {/* Filter Section */}
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 1 }}> {/* Added mt for spacing from header */}
                    Filter Options
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    {/* Parent div for filter fields */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 2.5 }}>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}> {/* 8px for 2 items, 12px for 4 items with gap 2 (16px) */}
                            <DatePicker
                                label="Start Date (Order Date)"
                                value={filters.startDate}
                                onChange={(nv) => handleDateChange('startDate', nv)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'outlined' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
                            <DatePicker
                                label="End Date (Order Date)"
                                value={filters.endDate}
                                onChange={(nv) => handleDateChange('endDate', nv)}
                                slotProps={{ textField: { fullWidth: true, size: 'small', variant: 'outlined' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
                            <Autocomplete
                                options={suppliers}
                                getOptionLabel={(option) => option.name || ""}
                                value={suppliers.find(s => s._id === filters.supplierId) || null}
                                onChange={handleSupplierChange}
                                isOptionEqualToValue={(option, value) => option._id === value?._id}
                                renderInput={(params) => (<TextField {...params} label="Supplier" placeholder="All Suppliers" variant="outlined" size="small" />)}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}>
                            <TextField
                                select
                                label="PO Status"
                                name="status"
                                value={filters.status}
                                onChange={handleFilterChange}
                                fullWidth
                                size="small"
                                variant="outlined"
                            >
                                {poStatusOptions.map(opt => <MenuItem key={opt} value={opt}>{opt === 'all' ? 'All Statuses' : opt}</MenuItem>)}
                            </TextField>
                        </Box>
                    </Box>

                    {/* Parent div for filter action buttons */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 2.5 }}>
                        <Button variant="outlined" color="secondary" onClick={handleClearFilters} disabled={loading} size="medium" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}> {/* Adjusted minWidth for 4 items */}
                            Clear Filters
                        </Button>
                        <Button variant="outlined" onClick={handleExportCsvClick} disabled={loading || exportingCsv || exportingPdf || reportData.length === 0} size="medium" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}> {/* Adjusted minWidth for 4 items */}
                            {exportingCsv ? <CircularProgress size={24} color="inherit"/> : 'Export CSV'}
                        </Button>
                        <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportPdfClick} disabled={loading || exportingCsv || exportingPdf || reportData.length === 0} size="medium" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}> {/* Adjusted minWidth for 4 items */}
                            {exportingPdf ? <CircularProgress size={24} color="inherit"/> : 'Export PDF'}
                        </Button>
                        {/* This Box is a spacer to push Generate Report to the right, only effective on larger screens if other buttons don't fill space */}
                        {/* Removed the spacer Box */}
                        <Button variant="contained" color="primary" onClick={() => handleFetchReport(0, rowsPerPage)} disabled={loading} size="medium" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)', md: 'calc(25% - 12px)' } }}> {/* Adjusted minWidth for 4 items */}
                            {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Report'}
                        </Button>
                    </Box>
                </LocalizationProvider>

                {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}
                {loading && reportData.length === 0 && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>} {/* Only show loading spinner if no data yet */}

                {!loading && !error && reportData.length > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', my: 1.5, px:1 }}>
                        <Typography variant="body2">Showing {reportData.length} of {totalCount} purchase orders.</Typography>
                    </Box>
                )}
                {!loading && !error && reportData.length > 0 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 0, borderRadius: 1.5, flexGrow: 1 }}> {/* Added flexGrow */}
                        <Table sx={{ minWidth: 900 }} aria-label="po report table" size="medium"> {/* Changed size to medium for better readability */}
                            <TableHead sx={{ backgroundColor: theme => theme.palette.mode === 'light' ? theme.palette.grey[50] : theme.palette.grey[800] }}> {/* Subtle header bg */}
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>PO Number</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>Order Date</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>Supplier</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>Expected Delivery</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>Grand Total (₹)</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', color: theme => theme.palette.text.primary }}>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.map((po, index) => (
                                    <TableRow key={po._id} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover } }}> {/* Zebra striping */}
                                        <TableCell>{po.poNumber}</TableCell>
                                        <TableCell>{format(new Date(po.orderDate), 'dd MMM yyyy')}</TableCell>
                                        <TableCell>{po.supplier?.name || 'N/A'}</TableCell>
                                        <TableCell>{po.expectedDeliveryDate ? format(new Date(po.expectedDeliveryDate), 'dd MMM yyyy') : '—'}</TableCell> {/* Using em-dash for N/A */}
                                        <TableCell align="right" sx={{ fontWeight: 'medium' }}>{formatCurrency(po.grandTotal)}</TableCell>
                                        <TableCell><Chip label={po.status} size="small" color={poStatusColors[po.status] || 'default'} /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <TablePagination rowsPerPageOptions={[5, 10, 25, 50]} component="div" count={totalCount} rowsPerPage={rowsPerPage} page={page} onPageChange={handleChangePage} onRowsPerPageChange={(event) => handleFetchReport(0, parseInt(event.target.value, 10))} />
                    </TableContainer>
                )} {/* Moved closing tag */}
                {!loading && reportData.length === 0 && !error && totalCount === 0 && (
                    <Typography sx={{ mt: 2, textAlign: 'center' }}>No purchase orders found. Please adjust your filters.</Typography>
                )}
            </Paper>
        </Container>
    );
};

export default PurchaseOrderReportPage;
                        {/* Filter Action Buttons */}