import React, { useState, useEffect } from 'react';
import { getSalesSummaryReport } from '../services/reportService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Or AdapterDayjs
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import {
    Container,
    Typography,
    Paper,
    Box,
    Grid,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Button, // For applying filters
    TextField, // For DatePicker renderInput
    Tooltip as MuiTooltip // Renaming to avoid conflict with Chart.js Tooltip if used directly
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment'; // Report icon
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'; // Icon for no data message
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'; // Icon for error message
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import Papa from 'papaparse'; // Import papaparse

const SalesSummaryReportPage = () => {
    const [summaryData, setSummaryData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState(null); // Default to null or a sensible default
    const [endDate, setEndDate] = useState(null);   // Default to null or a sensible default
    const [lastUpdated, setLastUpdated] = useState(null); // State for last updated timestamp
    const { showSnackbar } = useSnackbar();

    ChartJS.register(
        CategoryScale,
        LinearScale,
        BarElement,
        Title,
        Tooltip,
        Legend
    );


    const fetchReportData = async (currentStartDate, currentEndDate) => {
        setLoading(true);
        setError('');
        try {
            // Modify getSalesSummaryReport to accept date parameters
            const response = await getSalesSummaryReport({ startDate: currentStartDate, endDate: currentEndDate });
            if (response.success) {
                setSummaryData(response.data);
                setLastUpdated(new Date()); // Set last updated time on successful fetch
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

    useEffect(() => {
        // Fetch initial report data (e.g., for all time or a default range)
        // For this example, let's assume it fetches all data if dates are null
        fetchReportData(startDate, endDate); // startDate and endDate are initially null
    }, []); // Runs once on component mount

    const handleFilterApply = () => {
        if (startDate && endDate && startDate > endDate) {
            showSnackbar('Start date cannot be after end date.', 'warning');
            return;
        }
        fetchReportData(startDate, endDate);
    };

    const handleClearFilters = () => {
        setStartDate(null);
        setEndDate(null);
        fetchReportData(null, null); // Fetch data for all time or default period
    };

    const handleExportCSV = () => {
        if (!summaryData) {
            showSnackbar('No data available to export.', 'warning');
            return;
        }

        const reportTitle = "Sales Summary Report";
        const dateRange = (startDate && endDate)
            ? `From: ${startDate.toLocaleDateString()} To: ${endDate.toLocaleDateString()}`
            : "For: All Time";

        const dataToExport = [
            // Header Row for Report Info
            [reportTitle],
            [dateRange],
            [], // Empty row for spacing
            // Data Headers
            ['Metric', 'Value'],
            // Data Rows
            ['Total Invoiced', summaryData.totalInvoiced !== undefined ? formatCurrency(summaryData.totalInvoiced) : 'N/A'],
            ['Total Paid', summaryData.totalPaid !== undefined ? formatCurrency(summaryData.totalPaid) : 'N/A'],
            ['Balance Due', summaryData.balanceDue !== undefined ? formatCurrency(summaryData.balanceDue) : 'N/A'],
            ['Number of Invoices', summaryData.numberOfInvoices !== undefined ? summaryData.numberOfInvoices : 'N/A'],
            ['Average Invoice Value', summaryData.averageInvoiceValue !== undefined ? formatCurrency(summaryData.averageInvoiceValue) : 'N/A'],
        ];

        const csv = Papa.unparse(dataToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `sales_summary_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showSnackbar('Report exported successfully as CSV.', 'success');
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    
    // Enhanced Error Display
    if (error) {
        return (
            <Container maxWidth="md" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <Card variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%', maxWidth: '500px' }}>
                    <ErrorOutlineIcon sx={{ fontSize: '3rem', mb: 1 }} color="error" />
                    <Typography variant="h6" gutterBottom color="error">
                        An Error Occurred
                    </Typography>
                    <Typography color="text.secondary">{error}</Typography>
                </Card>
            </Container>
        );
    }

    const chartData = summaryData ? {
        labels: ['Financial Summary'], // A single category for these overall metrics
        datasets: [
            {
                label: 'Total Invoiced',
                data: [summaryData.totalInvoiced || 0],
                backgroundColor: 'rgba(54, 162, 235, 0.6)', // Blue
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
            {
                label: 'Total Paid',
                data: [summaryData.totalPaid || 0],
                backgroundColor: 'rgba(75, 192, 192, 0.6)', // Green
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
            {
                label: 'Balance Due',
                data: [summaryData.balanceDue || 0],
                backgroundColor: 'rgba(255, 99, 132, 0.6)', // Red
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1,
            },
        ],
    } : null;

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
                <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <AssessmentIcon sx={{ mr: 1, fontSize: '2rem' }} color="primary" />
                        <Typography variant="h4" component="h1">
                            Sales Summary Report
                        </Typography>
                    </Box>
                    {lastUpdated && (
                        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                            Last updated: {lastUpdated.toLocaleString()}
                        </Typography>
                    )}

                    {/* Filter and Action Buttons Section using Flexbox */}
                    <Box 
                        sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', md: 'row' }, // Stack on xs, row on md+
                            gap: 2, // Spacing between items
                            mb: 3,
                            alignItems: { xs: 'stretch', md: 'flex-end' } // Stretch on xs for fullWidth, align to bottom on md
                        }}
                    >
                        <Box sx={{ flex: { md: 1 } }}> {/* Each item takes equal space on md+ */}
                            <DatePicker
                                label="Start Date"
                                value={startDate}
                                onChange={(newValue) => setStartDate(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Box>
                        <Box sx={{ flex: { md: 1 } }}> {/* Each item takes equal space on md+ */}
                            <DatePicker
                                label="End Date"
                                value={endDate}
                                onChange={(newValue) => setEndDate(newValue)}
                                slotProps={{ textField: { fullWidth: true } }}
                            />
                        </Box>
                        <Box sx={{ flex: { md: 1 } }}> {/* Each item takes equal space on md+ */}
                            <Button
                                variant="contained"
                                onClick={handleFilterApply}
                                disabled={loading}
                                fullWidth
                                sx={{ height: '100%' }} // Ensure button takes full height of DatePicker
                            >
                                Apply Filters
                            </Button>
                        </Box>
                        <Box sx={{ flex: { md: 1 } }}> {/* Each item takes equal space on md+ */}
                            <Button
                                variant="outlined"
                                onClick={handleClearFilters}
                                disabled={loading || (!startDate && !endDate)} // Disable if no filters to clear or loading
                                fullWidth
                                sx={{ height: '100%' }} // Ensure button takes full height of DatePicker
                            >
                                Clear Filters
                            </Button>
                        </Box>
                        <Box sx={{ flex: { md: 1 } }}> {/* Each item takes equal space on md+ */}
                            <Button
                                variant="contained"
                                color="secondary"
                                onClick={handleExportCSV}
                                disabled={loading || !summaryData}
                                fullWidth
                                sx={{ height: '100%' }} // Ensure button takes full height of DatePicker
                            >
                                Export to CSV
                            </Button>
                        </Box>
                    </Box>

                    {/* Summary Metrics Cards Section - Moved Before Chart */}
                    {summaryData && (
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', md: 'row' }, // Stack on xs, row on md+
                                gap: 2, // Spacing between card items
                                mb: 3, // Margin below this section
                            }}
                        >
                            <Box sx={{ flex: { md: 1 }, display: 'flex' }}> {/* Each item takes equal space on md+ and allows card to stretch */}
                                <MuiTooltip title="The total monetary value of all invoices issued within the selected period." arrow sx={{ width: '100%'}}>
                                    <Card variant="outlined" sx={{ width: '100%'}}>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Total Invoiced
                                            </Typography>
                                            <Typography variant="h5" component="div">
                                                {formatCurrency(summaryData.totalInvoiced)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </MuiTooltip>
                            </Box>
                            <Box sx={{ flex: { md: 1 }, display: 'flex' }}>
                                <MuiTooltip title="The total amount of payments received against invoices within the selected period." arrow sx={{ width: '100%'}}>
                                    <Card variant="outlined" sx={{ width: '100%'}}>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Total Paid
                                            </Typography>
                                            <Typography variant="h5" component="div">
                                                {formatCurrency(summaryData.totalPaid)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </MuiTooltip>
                            </Box>
                            <Box sx={{ flex: { md: 1 }, display: 'flex' }}>
                                <MuiTooltip title="The total outstanding amount yet to be paid from all invoices (Total Invoiced - Total Paid)." arrow sx={{ width: '100%'}}>
                                    <Card variant="outlined" sx={{ width: '100%'}}>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Balance Due
                                            </Typography>
                                            <Typography variant="h5" component="div" sx={{ color: summaryData.balanceDue > 0 ? 'error.main' : 'success.main' }}>
                                                {formatCurrency(summaryData.balanceDue)}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </MuiTooltip>
                            </Box>
                            <Box sx={{ flex: { md: 1 }, display: 'flex' }}>
                                <MuiTooltip title="The total count of individual invoices issued within the selected period." arrow sx={{ width: '100%'}}>
                                    <Card variant="outlined" sx={{ width: '100%'}}>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Number of Invoices
                                            </Typography>
                                            <Typography variant="h5" component="div">
                                                {summaryData.numberOfInvoices !== undefined ? summaryData.numberOfInvoices : 'N/A'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </MuiTooltip>
                            </Box>
                            <Box sx={{ flex: { md: 1 }, display: 'flex' }}>
                                <MuiTooltip title="The average monetary value per invoice (Total Invoiced / Number of Invoices)." arrow sx={{ width: '100%'}}>
                                    <Card variant="outlined" sx={{ width: '100%'}}>
                                        <CardContent>
                                            <Typography color="text.secondary" gutterBottom>
                                                Average Invoice Value
                                            </Typography>
                                            <Typography variant="h5" component="div">
                                                {summaryData.averageInvoiceValue !== undefined ? formatCurrency(summaryData.averageInvoiceValue) : 'N/A'}
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </MuiTooltip>
                            </Box>
                        </Box>
                    )}

                    {/* Chart Section */}
                    {summaryData && chartData && (
                        <Box sx={{ mt: 4, mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: '4px' }}>
                            <Typography variant="h6" gutterBottom align="center">
                                Financial Overview
                            </Typography>
                            <Box sx={{ height: '300px', position: 'relative' }}> {/* Ensure chart has dimensions */}
                                <Bar
                                    data={chartData}
                                    options={{
                                        responsive: true,
                                        maintainAspectRatio: false,
                                        plugins: { legend: { position: 'top' } },
                                    }} />
                            </Box>
                        </Box>
                    )}

                    {/* "No Data" message - shown if summaryData is null and not loading/erroring */}
                    {!summaryData && !loading && !error && (
                        // Enhanced "No Data" message
                        <Box sx={{ mt: 4, width: '100%' }}> {/* Ensure this Box takes width if it's the only thing shown */}
                            <Card variant="outlined" sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                                <InfoOutlinedIcon sx={{ fontSize: '3rem', mb: 1 }} color="action" />
                                <Typography variant="h6" gutterBottom>
                                    No Data Available
                                </Typography>
                                <Typography color="text.secondary">
                                    There is no sales summary data available for the selected period or filters.
                                </Typography>
                            </Card>
                        </Box>
                    )}
                </Paper>
            </Container>
        </LocalizationProvider>
    );
};

export default SalesSummaryReportPage;