import React, { useEffect, useState, useCallback } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useAuthState } from '../contexts/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import {
    Box,
    CircularProgress,
    Container, // Added Container
    Alert,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    Button,
    Icon, 
    ListItem, 
    ListItemText, 
    List,
    ListItemIcon,
    Divider,
    colors // For chart colors
} from '@mui/material';
import Inventory2Icon from '@mui/icons-material/Inventory2'; // Products
import ReceiptIcon from '@mui/icons-material/Receipt'; // Invoices
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'; // Purchase Orders
import SpeedIcon from '@mui/icons-material/Speed'; // For Dashboard title
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'; // For list items
import WarningAmberIcon from '@mui/icons-material/WarningAmber'; // For low stock
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'; // For currency values
import TrendingUpIcon from '@mui/icons-material/TrendingUp'; // For sales
import { Chart as ChartJS, ArcElement, Tooltip, Legend, Title } from 'chart.js';
import { Pie } from 'react-chartjs-2'; // Import Pie component
import { format } from 'date-fns'; // For formatting dates
const StatCard = ({ title, value, icon, iconColor, linkTo, subValue, valuePrefix = '', subValuePrefix = '' }) => (
    <Card sx={{ display: 'flex', alignItems: 'center', p: 2, height: '100%', minHeight: 140, width: '100%' }}> {/* Added width: '100%' and minHeight for equal size */}
        <Icon component={icon} sx={{ fontSize: 40, mr: 2, color: iconColor || 'primary.main' }} />
        <Box sx={{ flexGrow: 1 }}> {/* Allow this box to grow and take available space */}
            <Typography variant="h6" component="div">
                {valuePrefix}{value}
            </Typography>
            <Typography variant="subtitle2" component="div" color="text.secondary">
                {title}
            </Typography>
            {subValue !== undefined && (
                 <Typography variant="body2" component="div" color="text.secondary" sx={{mt: 0.5}}>
                    {subValuePrefix}{subValue}
                </Typography>
            )}
            {linkTo && (
                <Button 
                    size="small" 
                    component={RouterLink} to={linkTo} 
                    sx={{ mt: 1, p:0, justifyContent: 'flex-start' }}
                    endIcon={<ArrowForwardIcon />}
                >                    View
                </Button>
            )}
        </Box>
    </Card>
);

const generateChartData = (labels, dataCounts, chartLabel, backgroundColors) => {
    return {
        labels: labels,
        datasets: [ // Keep datasets structure
            {
                label: chartLabel,
                data: dataCounts,
                backgroundColor: backgroundColors || [
                    colors.blue[500],
                    colors.red[500],
                    colors.orange[500],
                    colors.green[500],
                    colors.purple[500],
                    colors.grey[500],
                ],
                borderColor: colors.common.white,
                borderWidth: 1,
            },
        ],
    }; // Keep return object
};

const chartOptions = (titleText) => ({
    responsive: true,
    plugins: {
        legend: { position: 'top' },
        title: { display: true, text: titleText },
    },
});


const DashboardPage = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated } = useAuthState();

    const fetchDashboardData = useCallback(async () => {
        if (!isAuthenticated) {
            setError("Please log in to view the dashboard.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setError('');
            const response = await getDashboardStats();
            if (response.success) {
                setStats(response.data);
            } else {
                setError(response.message || 'Failed to fetch dashboard statistics.');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while fetching dashboard data.');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    if (!isAuthenticated && !loading) {
        return <Alert severity="info" sx={{ m: 2 }}>You must be logged in to view the dashboard. <RouterLink to="/login">Login here</RouterLink>.</Alert>;
    }

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    const invoiceStatusChartData = stats?.invoiceStatusCounts 
        ? generateChartData(
            stats.invoiceStatusCounts.map(s => s._id), 
            stats.invoiceStatusCounts.map(s => s.count), 
            'Invoice Statuses'
          ) 
        : null;

    const purchaseOrderStatusChartData = stats?.purchaseOrderStatusCounts
        ? generateChartData(
            stats.purchaseOrderStatusCounts.map(s => s._id),
            stats.purchaseOrderStatusCounts.map(s => s.count),
            'Purchase Order Statuses'
          )
        : null;

    return (
        // Adopt similar structure to CompanyProfilePage
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}> 
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Icon component={SpeedIcon} sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
                <Typography variant="h4" component="h1">
                    Dashboard Overview
                </Typography>
            </Box>

            {/* KPI Stats Cards */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>Key Metrics</Typography>
            {/* Parent Box for the two rows of cards */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mb: 4 }}>
                {/* Top Row of 3 Cards using Flexbox */}
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                    <Box sx={{ 
                        display: 'flex', 
                        width: { xs: '100%' }, // Full width on mobile
                        flex: { sm: 1 }        // Grow equally on sm screens and up
                    }}>
                        <StatCard title="Active Products" value={stats?.totalProducts ?? 'N/A'} icon={Inventory2Icon} iconColor={colors.blue[600]} linkTo="/products" />
                    </Box>
                    <Box sx={{ 
                        display: 'flex', 
                        width: { xs: '100%' },
                        flex: { sm: 1 } 
                    }}>
                        <StatCard title="Low Stock Items" value={stats?.lowStockItemsCount ?? 'N/A'} icon={WarningAmberIcon} iconColor={colors.orange[700]} linkTo="/products?filter=lowstock" />
                    </Box>
                    <Box sx={{ 
                        display: 'flex', 
                        width: { xs: '100%' },
                        flex: { sm: 1 } 
                    }}>
                        <StatCard title="Total Inventory Value" value={stats?.totalInventoryValue?.toFixed(2) ?? '0.00'} valuePrefix="$" icon={MonetizationOnIcon} iconColor={colors.green[600]} />
                    </Box>
                </Box>

                {/* Bottom Row of 3 Cards using Flexbox */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' }, 
                        gap: 3
                    }}
                >
                    <Box sx={{ 
                            display: 'flex', 
                            width: { xs: '100%' },
                            flex: { sm: 1 } 
                        }}>
                            <StatCard 
                                title="Overdue Invoices" 
                                value={stats?.overdueInvoicesCount ?? 'N/A'} 
                                subValue={stats?.overdueInvoicesAmount?.toFixed(2) ?? '0.00'}
                                subValuePrefix="Total: $"
                                icon={ReceiptIcon} 
                                iconColor={colors.red[600]} 
                                linkTo="/invoices?status=overdue" 
                            />
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            width: { xs: '100%' },
                            flex: { sm: 1 } 
                        }}>
                            <StatCard title="Sales This Month" value={stats?.salesThisMonth?.toFixed(2) ?? '0.00'} valuePrefix="$" icon={TrendingUpIcon} iconColor={colors.teal[500]} />
                        </Box>
                        <Box sx={{ 
                            display: 'flex', 
                            width: { xs: '100%' }, // Full width on mobile
                            flex: { sm: 1 } 
                        }}>
                            <StatCard 
                                title="Open Purchase Orders" 
                                value={stats?.openPurchaseOrdersCount ?? 'N/A'} 
                                subValue={stats?.openPurchaseOrdersAmount?.toFixed(2) ?? '0.00'}
                                subValuePrefix="Total: $"
                                icon={ShoppingCartIcon} 
                                iconColor={colors.cyan[600]} 
                                linkTo="/purchase-orders?status=open" 
                            />
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ my: 4 }} />

            {/* Charts Section */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
                Visualizations
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6} sx={{ minWidth: { md: '48.5%' } }}>
                    <Paper sx={{ p: 2, height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        {invoiceStatusChartData ? (
                            <Pie data={invoiceStatusChartData} options={chartOptions('Invoice Status Distribution')} />
                        ) : <Typography>Loading chart data...</Typography>}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6} sx={{ minWidth: { md: '48.5%' } }}>
                    <Paper sx={{ p: 2, height: 350, display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                        {purchaseOrderStatusChartData ? (
                            <Pie data={purchaseOrderStatusChartData} options={chartOptions('Purchase Order Status Distribution')} />
                        ) : <Typography>Loading chart data...</Typography>}
                    </Paper>
                </Grid>
            </Grid>

            <Divider sx={{ my: 4 }} />

            {/* Actionable Lists */}
            <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
                Actionable Insights
            </Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6} sx={{ minWidth: { md: '48.5%' } }}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Low Stock Items</Typography>
                        <Divider sx={{ mb: 1 }}/>
                        {stats?.lowStockItemsList && stats.lowStockItemsList.length > 0 ? (
                            <List dense>
                                {stats.lowStockItemsList.map(product => (
                                    <ListItem 
                                        key={product._id} 
                                        secondaryAction={
                                            <Button size="small" variant="outlined" component={RouterLink} to={`/purchase-orders/new?productId=${product._id}`}>Order</Button>
                                        }
                                    >
                                        <ListItemText 
                                            primary={product.name} 
                                            secondary={`In Stock: ${product.quantityInStock} (Reorder at: ${typeof product.reorderPoint === 'number' ? product.reorderPoint : 'Not set'})`} 
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No items currently low on stock.</Typography>
                        )}
                    </Paper>
                </Grid>
                <Grid item xs={12} md={6} sx={{ minWidth: { md: '48.5%' } }}>
                    <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="h6" gutterBottom>Overdue Invoices</Typography>
                         <Divider sx={{ mb: 1 }}/>
                        {stats?.overdueInvoicesList && stats.overdueInvoicesList.length > 0 ? (
                            <List dense>
                                {stats.overdueInvoicesList.map(invoice => (
                                    <ListItem 
                                        key={invoice._id} 
                                        component={RouterLink} 
                                        to={`/invoices/${invoice._id}`}
                                        sx={{ textDecoration: 'none', color: 'inherit', '&:hover': { backgroundColor: 'action.hover' } }}
                                    >
                                        <ListItemText 
                                            primary={`${invoice.invoiceNumber} - ${invoice.customer?.name || 'N/A'}`}
                                            secondary={`Due: ${format(new Date(invoice.dueDate), 'dd MMM yyyy')} - Amount: $${invoice.grandTotal.toFixed(2)}`}
                                        />
                                        <ListItemIcon><ArrowForwardIcon /></ListItemIcon>
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body2" color="text.secondary">No overdue invoices.</Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
            </Paper>
        </Container>
    );
};

export default DashboardPage;