import React, { useState, useEffect, useCallback } from 'react';
import { getProducts, deleteProduct } from '../services/productService';
import { useAuthState } from '../contexts/AuthContext';
import { Link } from 'react-router-dom'; // For Add Product button
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TablePagination, // Added for pagination
    TableHead,
    TableRow,
    Paper,
    Button,
    IconButton,
    Typography,
    Box,
    CircularProgress,
    Alert, // Keep Alert
    Container,
    Tooltip, // Added for better UX on icon buttons
    TextField, // For search
    InputAdornment, // For search icon
    Dialog, // For delete confirmation
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search'; // Import SearchIcon

const ProductsPage = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(''); // For errors fetching products
    const { user, isAuthenticated } = useAuthState(); // Get user role
    const { showSnackbar } = useSnackbar();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalProducts, setTotalProducts] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [productToDelete, setProductToDelete] = useState(null);

    const fetchProducts = useCallback(async () => {
        if (!isAuthenticated) {
            setPageError("Please log in to view products.");
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            setPageError('');
            const response = await getProducts(page + 1, rowsPerPage, searchTerm);
            if (response.success) {
                setProducts(response.data || []);
                setTotalProducts(response.count || 0);
                if ((response.data || []).length === 0 && searchTerm) {
                    showSnackbar('No products found matching your search criteria.', 'info');
                }
            } else {
                setPageError(response.message || 'Failed to fetch products');
                showSnackbar(response.message || 'Failed to fetch products.', 'error');
            }
        } catch (err) {
            setPageError(err.message || 'An error occurred while fetching products.');
            showSnackbar(err.message || 'An error occurred.', 'error');
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, page, rowsPerPage, searchTerm, showSnackbar]);

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0); // Reset to first page on new search
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleDeleteClick = (product) => {
        if (!canManageProducts) {
            showSnackbar("You don't have permission to delete products.", 'warning');
            return;
        }
        setProductToDelete(product);
        setOpenDeleteDialog(true);
    };

    const handleConfirmDelete = async () => {
        if (!productToDelete) return;
        const productId = productToDelete._id;
        try {
            await deleteProduct(productId);
            showSnackbar('Product deleted successfully!', 'success');
            // Instead of filtering, re-fetch to get the correct total count and pagination
            fetchProducts();
        } catch (err) {
            showSnackbar(`Failed to delete product: ${err.message}`, 'error');
        } finally {
            setOpenDeleteDialog(false);
            setProductToDelete(null);
        }
    };

    // Check if user has admin or manager role
    const canManageProducts = isAuthenticated && user && user.role === 'admin'; // Only admin can manage

    if (!isAuthenticated && !loading) {
        return <Alert severity="info" sx={{ mt: 2 }}>You must be logged in to see products. <Link to="/login">Login here</Link>.</Alert>;
    }
    if (loading && products.length === 0 && totalProducts === 0 && !pageError && !searchTerm) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    if (pageError && products.length === 0 && !loading) {
        return <Alert severity="error" sx={{ mt: 2 }}>{pageError}</Alert>;
    }

    return (
        // Using Paper directly as the main container for consistency with CustomersPage
        <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, width: '100%' }}>
                <Typography variant="h4" component="h1">
                    Products
                </Typography>
                {canManageProducts && (
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        color="primary"
                        component={Link}
                        to="/products/add"
                        size="medium"
                    >
                        Add New Product
                    </Button>
                )}
            </Box>

            {/* Search Input */}
            <Box sx={{ mb: 2 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    size="small"
                    placeholder="Search products (Name, SKU, Category...)"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />
            </Box>

            {pageError && products.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2, width: '100%' }}>
                    Could not refresh product data: {pageError}
                </Alert>
            )}

            {(!loading && totalProducts === 0 && !pageError) ? (
                <Alert severity="info" sx={{ width: '100%', mt: 2 }}>
                    {searchTerm
                        ? "No products found matching your search criteria."
                        : `No products found. ${canManageProducts ? <Link to="/products/add">Add one now!</Link> : ''}`
                    }
                </Alert>
            ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <Table sx={{ minWidth: 650 }} aria-label="products table" size="medium">
                        <TableHead sx={{ backgroundColor: theme => theme.palette.primary.main }}>
                            <TableRow>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Name</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>SKU</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Category</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Purchase Price</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Selling Price</TableCell>
                                <TableCell sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Supplier</TableCell>
                                <TableCell align="right" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold' }}>Stock</TableCell>
                                {canManageProducts && <TableCell align="center" sx={{ color: theme => theme.palette.primary.contrastText, fontWeight: 'bold', width: '120px' }}>Actions</TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={canManageProducts ? 8 : 7} align="center">
                                        <CircularProgress size={24} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                products.map((product) => (
                                    <TableRow
                                        key={product._id}
                                        hover
                                        sx={{
                                            '&:nth-of-type(odd)': { backgroundColor: theme => theme.palette.action.hover },
                                            '&:last-child td, &:last-child th': { border: 0 }
                                        }}
                                    >
                                        <TableCell component="th" scope="row">
                                            {product.name}
                                        </TableCell>
                                        <TableCell>{product.sku}</TableCell>
                                        <TableCell>{product.category}</TableCell>
                                        <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>${product.purchasePrice?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>${product.sellingPrice?.toFixed(2) || '0.00'}</TableCell>
                                        <TableCell sx={{ color: theme => theme.palette.text.secondary }}>{product.supplier ? product.supplier.name : 'N/A'}</TableCell>
                                        <TableCell align="right" sx={{ color: theme => theme.palette.text.secondary }}>{product.quantityInStock}</TableCell>
                                        {canManageProducts && (
                                            <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                                                <Tooltip title="Edit Product">
                                                    <IconButton
                                                        aria-label="edit"
                                                        color="primary"
                                                        size="small"
                                                        component={Link}
                                                        to={`/products/edit/${product._id}`}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete Product">
                                                    <IconButton
                                                        aria-label="delete"
                         
                                                        color="error"
                                                        size="small"
                                                        onClick={() => handleDeleteClick(product)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <TablePagination
                        rowsPerPageOptions={[5, 10, 25, 50]}
                        component="div"
                        count={totalProducts}
                        rowsPerPage={rowsPerPage}
                        page={page}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        sx={{ borderTop: theme => `1px solid ${theme.palette.divider}` }}
                    />
                </TableContainer>
            )}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>Confirm Delete</DialogTitle>
                <DialogContent><DialogContentText>Are you sure you want to delete product "{productToDelete?.name}"? This action cannot be undone.</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button onClick={handleConfirmDelete} color="error">Delete</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default ProductsPage;
            