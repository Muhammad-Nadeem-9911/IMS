import React, { useState, useEffect } from 'react';
import { getProducts, deleteProduct } from '../services/productService';
import { useAuthState } from '../contexts/AuthContext';
import { Link } from 'react-router-dom'; // For Add Product button
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Button,
    IconButton,
    Typography,
    Box,
    CircularProgress,
    Alert, // Keep Alert
    Container, // Added Container import
    Tooltip // Added for better UX on icon buttons
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
// For simplicity, ProductForm will be a separate component/page later
// For now, we'll just list and allow delete.

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(''); // For errors fetching products
    const { user, isAuthenticated } = useAuthState(); // Get user role
    const { showSnackbar } = useSnackbar();

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setPageError(''); // Corrected from setError to setPageError
            const response = await getProducts();
            if (response.success) {
                setProducts(response.data);
            } else {
                setPageError(response.message || 'Failed to fetch products');
            }
        } catch (err) {
            setPageError(err.message || 'An error occurred while fetching products.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthenticated) { // Only fetch if authenticated
            fetchProducts();
        } else {
            setPageError("Please log in to view products.");
            setLoading(false);
        }
    }, [isAuthenticated]);

    const handleDelete = async (productId) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(productId);
                // Refresh products list
                setProducts(products.filter(p => p._id !== productId));
                showSnackbar('Product deleted successfully!', 'success');
            } catch (err) {
                showSnackbar(`Failed to delete product: ${err.message}`, 'error');
            }
        }
    };

    // Check if user has admin or manager role
    const canManageProducts = user && user.role === 'admin'; // Only admin can manage

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    if (pageError && !products.length) return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>; // Show pageError only if no products loaded
    if (!isAuthenticated) return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see products. <Link to="/login">Login here</Link>.</Alert>;

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 /* Container padding handled by App.js main Box */ }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}> {/* Consistent Paper styling */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, borderBottom: (theme) => `1px solid ${theme.palette.divider}`, pb: 1.5 }}>
                <Typography variant="h4" component="h1" sx={{ color: theme => theme.palette.text.primary }}> {/* Ensure title uses theme text color */}
                    Products
                </Typography>
                {canManageProducts && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        color="primary" // Ensure it uses theme's primary color
                        component={Link}
                        to="/products/add"
                        size="medium" // Let's ensure consistent button sizing
                    >
                        Add New Product
                    </Button>
                )}
            </Box>
            {pageError && <Alert severity="error" sx={{ mb: 2 }}>{pageError}</Alert>} {/* Show error more prominently */}
            {products.length === 0 && !loading ? (
                <Alert severity="info" sx={{ mt: 2 }}>No products found.</Alert>
            ) : products.length > 0 && (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 1.5, mt: 2, flexGrow: 1 }}> {/* Added flexGrow */}
                    <Table sx={{ minWidth: 650 }} aria-label="products table" size="medium"> {/* Consider 'medium' size for better padding */}
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme => theme.palette.primary.main }}>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>SKU</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Purchase Price</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Selling Price</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Supplier</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Stock</TableCell>
                                {canManageProducts && <TableCell align="center" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow
                                    key={product._id}
                                    hover
                                    sx={{
                                        '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover },
                                        '&:last-child td, &:last-child th': { border: 0 } }}
                                >
                                    <TableCell component="th" scope="row">
                                        {product.name}
                                    </TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell>{product.category}</TableCell>
                                    <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>${product.purchasePrice.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>${product.sellingPrice.toFixed(2)}</TableCell>
                                    <TableCell sx={{ color: theme => theme.palette.text.secondary }}>{product.supplier ? product.supplier.name : 'N/A'}</TableCell>
                                    <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>{product.quantityInStock}</TableCell>
                                    {canManageProducts && (
                                        <TableCell align="center">
                                            <Tooltip title="Edit Product">
                                                <IconButton
                                                    aria-label="edit"
                                                    color="secondary" // Changed to secondary for less emphasis
                                                    size="small"
                                                    component={Link}
                                                    to={`/products/edit/${product._id}`}
                                                >
                                                    <EditIcon fontSize="small"/>
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Delete Product">
                                                <IconButton
                                                    aria-label="delete"
                                                    color="error" // Use theme's error color
                                                    size="small"
                                                    onClick={() => handleDelete(product._id)}
                                                >
                                                    <DeleteIcon fontSize="small"/>
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
            </Paper>
        </Container>
    );
};

export default ProductsPage;