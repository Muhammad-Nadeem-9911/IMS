import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createProduct, getProductById, updateProduct } from '../services/productService';
import {
    getSuppliers
} from '../services/supplierService'; // Import supplier service
import {
    useSnackbar
} from '../contexts/SnackbarContext'; // Import useSnackbar
import {
    TextField,
    Button,
    Container, // Keep Container, but we'll adjust its props
    Typography,
    Box,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    MenuItem, // For Select
    FormControl, InputLabel, Select, // For Select
    Divider // For section separation
} from '@mui/material';

const ProductForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        sku: '',
        description: '',
        category: '',
        purchasePrice: '',
        sellingPrice: '',
        quantityInStock: '',
        supplier: '' // Add supplier field, default to empty string (no supplier)
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState(''); // Keep local form error for persistent messages if needed
    const [suppliers, setSuppliers] = useState([]); // State for suppliers list
    const [pageTitle, setPageTitle] = useState('Add Product');

    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const { id: productId } = useParams(); // Get productId from URL if editing

    useEffect(() => {
        const fetchSuppliersList = async () => {
            try {
                const response = await getSuppliers();
                if (response.success) {
                    setSuppliers(response.data || []);
                } else {
                    showSnackbar(response.message || 'Could not load suppliers.', 'warning');
                }
            } catch (error) {
                showSnackbar('Error loading suppliers: ' + (error.message || 'Unknown error'), 'error');
            }
        };

        fetchSuppliersList();

        if (productId) {
            setPageTitle('Edit Product');
            setLoading(true);
            const fetchProduct = async () => {
                setLoading(true); // Ensure loading is true at the start of fetch
                try {
                    const response = await getProductById(productId);
                    if (response.success) {
                        // Ensure numbers are not undefined or null before calling toFixed or setting them
                        const { purchasePrice, sellingPrice, quantityInStock, ...rest } = response.data;
                        setFormData({
                            ...rest,
                            purchasePrice: purchasePrice !== undefined && purchasePrice !== null ? Number(purchasePrice) : '',
                            sellingPrice: sellingPrice !== undefined && sellingPrice !== null ? Number(sellingPrice) : '',
                            quantityInStock: quantityInStock !== undefined && quantityInStock !== null ? Number(quantityInStock) : '',
                            supplier: response.data.supplier?._id || '' // Set supplier ID or empty string
                        });
                    } else {
                        setFormError(response.message || 'Failed to fetch product details.');
                    }
                } catch (err) {
                    setFormError(err.message || 'Error fetching product.');
                } finally {
                    setLoading(false);
                }
            };
            fetchProduct();
        }
    }, [productId, showSnackbar]);

    const { name, sku, description, category, purchasePrice, sellingPrice, quantityInStock, supplier } = formData;

    const onChange = e => setFormData({ ...formData, [e.target.name]: e.target.value });

    const onSubmit = async e => {
        e.preventDefault();
        setFormError('');
        setLoading(true);

        // Convert prices and quantity to numbers
        const productData = {
            ...formData,
            purchasePrice: parseFloat(purchasePrice),
            sellingPrice: parseFloat(sellingPrice),
            quantityInStock: parseInt(quantityInStock, 10),
            supplier: supplier || null // Send null if supplier is empty string
        };

        try {
            if (productId) {
                await updateProduct(productId, productData);
                showSnackbar('Product updated successfully!', 'success');
            } else {
                await createProduct(productData);
                showSnackbar('Product created successfully!', 'success');
            }
            navigate('/products'); // Redirect to products list
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || (productId ? 'Failed to update product.' : 'Failed to create product.');
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && productId) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>
                    {pageTitle}
                </Typography>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <Box component="form" onSubmit={onSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}> {/* Form Box is full width */}
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}> {/* Main Grid container also full width */}
                        {/* Section 1: Product Information */}
                        <Grid item xs={12} sx={{ minWidth: '100%' }}> {/* Title and Divider for Section 1 */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Product Information</Typography>
                            <Divider sx={{ mb: 2 }} /> {/* Margin below the divider, before fields start */}
                        </Grid>
                        {/* Fields for Section 1 - arranged using Flexbox */}
                        <Grid item xs={12} sx={{ width: '100%' }}> {/* Ensure this Grid item is also full width */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}> {/* Flex container for fields */}
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="name"
                                        required
                                        fullWidth
                                        id="name"
                                        label="Product Name"
                                        value={name}
                                        onChange={onChange}
                                        autoFocus
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="sku"
                                        required
                                        fullWidth
                                        id="sku"
                                        label="SKU"
                                        value={sku}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="category"
                                        required
                                        fullWidth
                                        id="category"
                                        label="Category"
                                        value={category}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 2: Pricing & Inventory */}
                        <Grid item xs={12} sx={{ mt: 2, minWidth: '100%' }}> {/* Title and Divider for Section 2 */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Pricing & Inventory</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        {/* Fields for Section 2 - arranged using Flexbox */}
                        <Grid item xs={12} sx={{ width: '100%' }}> {/* Ensure this Grid item is also full width */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}> {/* Flex container for fields */}
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="purchasePrice"
                                        required
                                        fullWidth
                                        id="purchasePrice"
                                        label="Purchase Price ($)"
                                        type="number"
                                        inputProps={{ step: "0.01", min: "0" }}
                                        value={purchasePrice}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="sellingPrice"
                                        required
                                        fullWidth
                                        id="sellingPrice"
                                        label="Selling Price ($)"
                                        type="number"
                                        inputProps={{ step: "0.01", min: "0" }}
                                        value={sellingPrice}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }, flexGrow: 1 }}>
                                    <TextField
                                        name="quantityInStock"
                                        required
                                        fullWidth
                                        id="quantityInStock"
                                        label="Quantity in Stock"
                                        type="number"
                                        inputProps={{ step: "1", min: "0" }}
                                        value={quantityInStock}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(25% - 18px)' }, flexGrow: 1 }}>
                                    <FormControl fullWidth variant="outlined" size="small">
                                        <InputLabel id="supplier-select-label">Supplier</InputLabel>
                                        <Select
                                            labelId="supplier-select-label"
                                            id="supplier"
                                            name="supplier"
                                            value={supplier}
                                            label="Supplier"
                                            sx={{ width: '100%', minWidth: '100%' }} // Force width and override potential internal min-width
                                            onChange={onChange}
                                        >
                                            <MenuItem value="">
                                                <em>None</em>
                                            </MenuItem>
                                            {suppliers.map((sup) => (
                                                <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 3: Additional Details */}
                        <Grid item xs={12} sx={{ mt: 2, minWidth: '100%' }}> {/* Title and Divider for Section 3 */}
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Additional Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        {/* Field for Section 3 - arranged using Flexbox */}
                        <Grid item xs={12} sx={{ width: '100%' }}> {/* Ensure this Grid item is also full width */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}> {/* Flex container for fields */}
                                <Box sx={{ flexBasis: '100%', flexGrow: 1 }}>
                                    <TextField
                                        name="description"
                                        required
                                        fullWidth
                                        id="description"
                                        label="Product Description"
                                        multiline
                                        rows={4}
                                        value={description}
                                        onChange={onChange}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Increased pt for more space */}
                        <Button onClick={() => navigate('/products')} disabled={loading} variant="outlined" size="medium">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={loading} size="medium">
                            {loading ? <CircularProgress size={24} /> : (productId ? 'Update Product' : 'Add Product')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default ProductForm;