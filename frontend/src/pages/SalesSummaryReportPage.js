import React, { useState, useEffect } from 'react';
import { getSalesSummaryReport } from '../services/reportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container,
    Typography,
    Paper,
    Box,
    Grid,
    CircularProgress,
    Alert,
    Card,
    CardContent
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Report icon

const SalesSummaryReportPage = () => {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getSalesSummaryReport();
                if (response.success) {
                    setSummaryData(response.data);
                } else {
                    setError(response.message || 'Failed to fetch sales summary.');
                    showSnackbar(response.message || 'Failed to fetch sales summary.', 'error');
                }
            } catch (err) {
                setError(err.message || 'An error occurred while fetching the report.');
                showSnackbar(err.message || 'An error occurred while fetching the report.', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
    }, [showSnackbar]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>;

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <AssessmentIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                    <Typography variant="h4" component="h1">
                        Sales Summary Report
                    </Typography>
                </Box>

                {/* Add Date Range Pickers here later if needed */}

                {summaryData ? (
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Total Invoiced
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {formatCurrency(summaryData.totalInvoiced)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Total Paid
                                    </Typography>
                                    <Typography variant="h5" component="div">
                                        {formatCurrency(summaryData.totalPaid)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                            <Card variant="outlined">
                                <CardContent>
                                    <Typography color="text.secondary" gutterBottom>
                                        Balance Due
                                    </Typography>
                                    <Typography variant="h5" component="div" sx={{ color: summaryData.balanceDue > 0 ? 'error.main' : 'success.main' }}>
                                        {formatCurrency(summaryData.balanceDue)}
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                ) : (
                    !loading && <Typography sx={{ mt: 2 }}>No summary data available.</Typography>
                )}
            </Paper>
        </Container>
    );
};

export default SalesSummaryReportPage;