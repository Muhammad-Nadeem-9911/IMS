import React, { useState } from 'react';
import { getIncomeStatementReport } from '../services/reportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container,
    Typography,
    Paper,
    Box,
    Grid,
    Button,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableFooter, // Keep TableFooter if used, otherwise can be removed if renderSection doesn't use it
    Divider, // Import Divider
    TextField
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Report icon

const IncomeStatementPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();

    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);

    const handleFetchReport = async () => {
        if (!startDate || !endDate) {
            showSnackbar('Please select both a start and end date.', 'warning');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            showSnackbar('Start date cannot be after end date.', 'warning');
            return;
        }

        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const formattedStartDate = format(new Date(startDate), 'yyyy-MM-dd');
            const formattedEndDate = format(new Date(endDate), 'yyyy-MM-dd');

            const response = await getIncomeStatementReport(formattedStartDate, formattedEndDate);
            if (response.success) {
                setReportData(response.data);
            } else {
                setError(response.message || 'Failed to fetch Income Statement.');
                showSnackbar(response.message || 'Failed to fetch Income Statement.', 'error');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching the report.');
            showSnackbar(err.message || 'An error occurred while fetching the report.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    const renderSection = (title, items, totalAmount) => (
        <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>{title}</Typography>
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                            <TableCell>Account Code</TableCell>
                            <TableCell>Account Name</TableCell>
                            <TableCell align="right">Amount (₹)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.length > 0 ? items.map((item) => (
                            <TableRow key={item._id || item.accountCode}>
                                <TableCell>{item.accountCode}</TableCell>
                                <TableCell>{item.accountName}</TableCell>
                                <TableCell align="right">{formatCurrency(item.totalAmount)}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} align="center">No {title.toLowerCase()} for this period.</TableCell></TableRow>
                        )}
                    </TableBody>
                    <TableFooter sx={{ backgroundColor: 'grey.200' }}>
                        <TableRow>
                            <TableCell colSpan={2} align="right" sx={{ fontWeight: 'bold' }}>Total {title}:</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(totalAmount)}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}> {/* Changed maxWidth to false for consistency */}
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, borderBottom: `1px solid ${theme => theme.palette.divider}`, pb: 1.5 }}>
                    <AssessmentIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">
                        Income Statement
                    </Typography>
                </Box>

                {/* Filter Section Title */}
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 1 }}>
                    Report Period
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    {/* Parent Box for Date Pickers and Button */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 3, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 10.67px)' } }}> {/* Adjusted for 3 items */}
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 10.67px)' } }}>
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 10.67px)' } }}>
                            <Button
                                variant="contained"
                                onClick={handleFetchReport}
                                disabled={loading || !startDate || !endDate}
                                size="medium" // Consistent button size
                                fullWidth // Make button fill its Box container
                            >
                                {loading ? <CircularProgress size={24} /> : 'Generate Report'}
                            </Button>
                        </Box>
                    </Box>
                </LocalizationProvider>

                {error && <Alert severity="error" sx={{ mt: 2, mb: 2 }}>{error}</Alert>}

                {reportData && (
                    <Box sx={{ mt: 3 }}>
                        <Typography variant="h5" align="center" gutterBottom>
                            Income Statement for {format(new Date(reportData.startDate), 'dd MMM yyyy')} to {format(new Date(reportData.endDate), 'dd MMM yyyy')}
                        </Typography>

                        {renderSection('Revenues', reportData.revenues, reportData.totalRevenue)}
                        {renderSection('Expenses', reportData.expenses, reportData.totalExpenses)}

                        <Box sx={{ mt: 3, p: 2, backgroundColor: reportData.netIncome >= 0 ? 'success.light' : 'error.light', borderRadius: 1 }}>
                            <Typography variant="h5" sx={{ fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                                <span>Net {reportData.netIncome >= 0 ? 'Income' : 'Loss'}:</span>
                                <span>{formatCurrency(reportData.netIncome)}</span>
                            </Typography>
                        </Box>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default IncomeStatementPage;