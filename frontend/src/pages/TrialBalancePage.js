import React, { useState, useEffect } from 'react';
import { getTrialBalanceReport } from '../services/reportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container,
    Typography,
    Paper,
    Box,
    CircularProgress,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TableFooter
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'; // Report icon

const TrialBalancePage = () => {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchReport = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getTrialBalanceReport();
                if (response.success) {
                    setReportData(response.data);
                } else {
                    setError(response.message || 'Failed to fetch Trial Balance.');
                    showSnackbar(response.message || 'Failed to fetch Trial Balance.', 'error');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while fetching the report.');
                showSnackbar(err.message || 'An error occurred while fetching the report.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [showSnackbar]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Container maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AccountBalanceIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">
                        Trial Balance
                    </Typography>
                </Box>

                {/* Add Date Range Pickers here later if needed for filtering */}

                {reportData && reportData.accounts ? (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, flexGrow: 1 }}>
                        <Table sx={{ minWidth: 700 }} aria-label="trial balance table">
                            <TableHead sx={{ backgroundColor: 'grey.200' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Account Code</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Account Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Account Type</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Debit (₹)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Credit (₹)</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {reportData.accounts.map((account) => (
                                    <TableRow key={account.accountId || account.accountCode} hover>
                                        <TableCell>{account.accountCode}</TableCell>
                                        <TableCell>{account.accountName}</TableCell>
                                        <TableCell>{account.accountType}</TableCell>
                                        <TableCell align="right">{account.debitBalance > 0 ? formatCurrency(account.debitBalance) : '-'}</TableCell>
                                        <TableCell align="right">{account.creditBalance > 0 ? formatCurrency(account.creditBalance) : '-'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter sx={{ backgroundColor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell colSpan={3} align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>Totals:</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(reportData.grandTotalDebit)}</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{formatCurrency(reportData.grandTotalCredit)}</TableCell>
                                </TableRow>
                                {reportData.grandTotalDebit !== reportData.grandTotalCredit && (
                                    <TableRow>
                                        <TableCell colSpan={5} align="center">
                                            <Alert severity="error" sx={{ justifyContent: 'center' }}>Totals do not match! Debits: {formatCurrency(reportData.grandTotalDebit)}, Credits: {formatCurrency(reportData.grandTotalCredit)}</Alert>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableFooter>
                        </Table>
                    </TableContainer>
                ) : (
                    !loading && <Typography sx={{ mt: 2 }}>No trial balance data available.</Typography>
                )}
            </Paper>
        </Container>
    );
};

export default TrialBalancePage;