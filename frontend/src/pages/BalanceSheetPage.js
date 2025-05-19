import React, { useState } from 'react';
import { getBalanceSheetReport } from '../services/reportService';
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
    TableFooter,
    TextField,
    Divider
} from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import BalanceIcon from '@mui/icons-material/Balance'; // Report icon

const BalanceSheetPage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();

    const [asOfDate, setAsOfDate] = useState(new Date()); // Default to today

    const handleFetchReport = async () => {
        if (!asOfDate) {
            showSnackbar('Please select an "As of Date".', 'warning');
            return;
        }

        setLoading(true);
        setError('');
        setReportData(null);
        try {
            const formattedAsOfDate = format(new Date(asOfDate), 'yyyy-MM-dd');
            const response = await getBalanceSheetReport(formattedAsOfDate);

            if (response.success) {
                setReportData(response.data);
            } else {
                setError(response.message || 'Failed to fetch Balance Sheet.');
                showSnackbar(response.message || 'Failed to fetch Balance Sheet.', 'error');
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
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', borderBottom: '1px solid #ccc', pb: 1, mb: 2 }}>{title}</Typography>
            {items.length > 0 ? items.map((item) => (
                <Box key={item.accountCode || item.accountName} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, pl: 2 }}>
                    <Typography variant="body1">{item.accountName} ({item.accountCode})</Typography>
                    <Typography variant="body1">{formatCurrency(item.balance)}</Typography>
                </Box>
            )) : (
                <Typography sx={{ pl: 2, fontStyle: 'italic' }}>No {title.toLowerCase()} to display.</Typography>
            )}
            <Divider sx={{ my: 1 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', pl: 2 }}>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>Total {title}:</Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>{formatCurrency(totalAmount)}</Typography>
            </Box>
        </Box>
    );

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5, borderBottom: `1px solid ${theme => theme.palette.divider}`, pb: 1.5 }}>
                    <BalanceIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">
                        Balance Sheet
                    </Typography>
                </Box>

                {/* Filter Section Title */}
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mt: 1 }}>
                    Report Date
                </Typography>
                <Divider sx={{ mb: 2.5 }} />

                <LocalizationProvider dateAdapter={AdapterDateFns}>
                    {/* Parent Box for Date Picker and Button */}
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%', mb: 3, alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)' } }}> {/* Each takes 50% on sm+, 8px is half of gap 2 (16px) */}
                            <DatePicker
                                label="As of Date"
                                value={asOfDate}
                                onChange={(newValue) => setAsOfDate(newValue)}
                                slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
                            />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 8px)' } }}> {/* Each takes 50% on sm+ */}
                            <Button
                                variant="contained"
                                onClick={handleFetchReport}
                                disabled={loading || !asOfDate}
                                size="medium" 
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
                            Balance Sheet as of {format(new Date(reportData.asOfDate), 'dd MMM yyyy')}
                        </Typography>

                        {/* Parent Box for Assets, Liabilities, and Equity sections */}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: { xs: 2, md: 3 }, width: '100%', mt: 2 }}>
                            {/* Assets Section */}
                            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' }, border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}> {/* 16px for 3 items with gap 3 (24px) */}
                                {renderSection('Assets', reportData.assets, reportData.totalAssets)}
                            </Box>

                            {/* Liabilities and Equity Section (side-by-side or stacked) */}
                            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' }, border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                                {renderSection('Liabilities', reportData.liabilities, reportData.totalLiabilities)}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 'calc(33.33% - 16px)' }, border: '1px solid', borderColor: 'divider', p: 2, borderRadius: 1 }}>
                                {renderSection('Equity', reportData.equity, reportData.totalEquity)}
                            </Box>
                        </Box>

                        <Divider sx={{ my: 3, borderStyle: 'dashed' }} />

                        {/* Verification Section */}
                        <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Assets:</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formatCurrency(reportData.totalAssets)}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Total Liabilities & Equity:</Typography>
                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{formatCurrency(reportData.totalLiabilities + reportData.totalEquity)}</Typography>
                            </Box>
                            {Math.abs(reportData.totalAssets - (reportData.totalLiabilities + reportData.totalEquity)) > 0.01 && ( // Check for imbalance
                                <Alert severity="error" sx={{ mt: 2, justifyContent: 'center' }}>
                                    Balance Sheet is out of balance! Difference: {formatCurrency(reportData.totalAssets - (reportData.totalLiabilities + reportData.totalEquity))}
                                </Alert>
                            )}
                        </Box>
                    </Box>
                )}
            </Paper>
        </Container>
    );
};

export default BalanceSheetPage;