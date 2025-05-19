import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPurchaseOrder, getPurchaseOrderById, updatePurchaseOrder } from '../../services/purchaseOrderService';
import { getSuppliers } from '../../services/supplierService';
import { getProducts } from '../../services/productService'; // To select products
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
    TextField, Button, Container, Typography, Box, Paper, Grid, CircularProgress, Alert,
    FormControl, InputLabel, Select, MenuItem, IconButton, Table, TableBody, TableCell, Divider,
    TableContainer, TableHead, TableRow, Autocomplete
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const initialItemState = {
    product: null, // Will store the full product object initially, then just ID
    productName: '', // For display and in case product details change
    quantityOrdered: 1,
    unitPrice: 0,
    totalPrice: 0,
};

const PurchaseOrderForm = () => {
    const [formData, setFormData] = useState({
        supplier: '',
        orderDate: new Date(),
        expectedDeliveryDate: null,
        items: [initialItemState],
        notes: '',
        status: 'Draft', // Default status
    });
    const [suppliers, setSuppliers] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [pageTitle, setPageTitle] = useState('Create Purchase Order');
    const [isEditing, setIsEditing] = useState(false);

    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const { id: poId } = useParams();

    const calculateTotals = useCallback((items) => {
        let subTotal = 0;
        items.forEach(item => {
            subTotal += parseFloat(item.totalPrice) || 0;
        });
        // For now, grandTotal is same as subTotal. Can add tax/shipping later.
        return { subTotal, grandTotal: subTotal };
    }, []);

    useEffect(() => {
        const fetchRequiredData = async () => {
            setLoading(true);
            try {
                const [suppliersRes, productsRes] = await Promise.all([
                    getSuppliers(),
                    getProducts() // Fetch all products for selection
                ]);

                if (suppliersRes.success) setSuppliers(suppliersRes.data || []);
                else showSnackbar('Could not load suppliers.', 'warning');

                if (productsRes.success) setProducts(productsRes.data || []);
                else showSnackbar('Could not load products.', 'warning');

                if (poId) {
                    setIsEditing(true);
                    setPageTitle('Edit Purchase Order');
                    const poRes = await getPurchaseOrderById(poId);
                    if (poRes.success && poRes.data) {
                        const { supplier, items, ...restData } = poRes.data;
                        const populatedItems = items.map(item => ({
                            ...item,
                            product: productsRes.data.find(p => p._id === item.product._id) || null, // Populate with full product object for Autocomplete
                        }));
                        setFormData({
                            ...restData,
                            supplier: supplier?._id || '',
                            orderDate: new Date(restData.orderDate),
                            expectedDeliveryDate: restData.expectedDeliveryDate ? new Date(restData.expectedDeliveryDate) : null,
                            items: populatedItems,
                        });
                    } else {
                        showSnackbar(poRes.message || 'Failed to fetch PO details.', 'error');
                        navigate('/purchase-orders');
                    }
                }
            } catch (err) {
                showSnackbar('Error loading data: ' + (err.message || 'Unknown error'), 'error');
                setFormError('Error loading data.');
            } finally {
                setLoading(false);
            }
        };
        fetchRequiredData();
    }, [poId, navigate, showSnackbar]);


    const handleInputChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleDateChange = (name, date) => {
        setFormData(prev => ({ ...prev, [name]: date }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };

        if (field === 'product' && value) { // value is the selected product object from Autocomplete
            newItems[index].productName = value.name;
            newItems[index].unitPrice = value.purchasePrice || 0; // Default to product's purchase price
        }

        if (field === 'quantityOrdered' || field === 'unitPrice' || (field === 'product' && value)) {
            const qty = parseFloat(newItems[index].quantityOrdered) || 0;
            const price = parseFloat(newItems[index].unitPrice) || 0;
            newItems[index].totalPrice = (qty * price).toFixed(2);
        }
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { ...initialItemState }]
        }));
    };

    const removeItem = (index) => {
        const newItems = formData.items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, items: newItems }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setFormError('');
        setLoading(true);

        const { subTotal, grandTotal } = calculateTotals(formData.items);

        const submissionData = {
            ...formData,
            supplier: formData.supplier,
            items: formData.items.map(item => ({
                product: item.product?._id, // Send only product ID
                productName: item.product?.name || item.productName,
                quantityOrdered: parseInt(item.quantityOrdered, 10),
                unitPrice: parseFloat(item.unitPrice),
                totalPrice: parseFloat(item.totalPrice),
                // quantityReceived is handled by backend or later updates
            })).filter(item => item.product && item.quantityOrdered > 0), // Filter out invalid/empty items
            subTotal,
            grandTotal,
        };

        if (submissionData.items.length === 0) {
            setFormError('Please add at least one valid item to the purchase order.');
            showSnackbar('Cannot submit an empty purchase order.', 'error');
            setLoading(false);
            return;
        }

        try {
            if (isEditing) {
                await updatePurchaseOrder(poId, submissionData);
                showSnackbar('Purchase Order updated successfully!', 'success');
            } else {
                await createPurchaseOrder(submissionData);
                showSnackbar('Purchase Order created successfully!', 'success');
            }
            navigate('/purchase-orders');
        } catch (err) {
            const errMsg = err.message || (isEditing ? 'Failed to update PO.' : 'Failed to create PO.');
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && !formData.supplier && !isEditing) { // Initial load
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    // Filter status options based on whether it's a new PO or editing
    const availableStatuses = isEditing
        ? ['Draft', 'Ordered', 'Partially Received', 'Received', 'Cancelled'] // Show all when editing
        : ['Draft', 'Ordered', 'Cancelled']; // Only show these when creating

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
                <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                    <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>
                        {pageTitle} {formData.poNumber && `(${formData.poNumber})`}
                    </Typography>
                    {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                        <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}>

                            {/* Section 1: PO Details */}
                            <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Purchase Order Details</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-supplier" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                        <FormControl fullWidth required variant="outlined" size="small">
                                            <InputLabel id="supplier-select-label">Supplier</InputLabel>
                                            <Select
                                                labelId="supplier-select-label"
                                                name="supplier"
                                                value={formData.supplier}
                                                label="Supplier"
                                                onChange={handleInputChange}
                                                disabled={isEditing && formData.status !== 'Draft'}
                                            >
                                                {suppliers.map(sup => (
                                                    <MenuItem key={sup._id} value={sup._id}>{sup.name}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Box>
                                    <Box className="form-field-orderDate" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                        <DatePicker
                                            label="Order Date"
                                            value={formData.orderDate}
                                            onChange={(date) => handleDateChange('orderDate', date)}
                                            disabled={isEditing && formData.status !== 'Draft'}
                                            slotProps={{ textField: { fullWidth: true, required: true, variant: 'outlined', size: 'small' } }}
                                        />
                                    </Box>
                                    <Box className="form-field-expectedDeliveryDate" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                        <DatePicker
                                            label="Expected Delivery Date (Optional)"
                                            value={formData.expectedDeliveryDate}
                                            onChange={(date) => handleDateChange('expectedDeliveryDate', date)}
                                            slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            {/* Section 2: Items */}
                            <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Items</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                                {/* Typography for "Items" was here, moved to section title */}
                                <TableContainer component={Paper} variant="outlined" sx={{ mb: 1 }}> {/* Added mb for spacing before Add Item button */}
                                    <Table size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell sx={{width: '35%'}}>Product</TableCell> {/* Adjusted width slightly */}
                                                <TableCell align="right" sx={{width: '20%'}}>Qty Ordered</TableCell>
                                                <TableCell align="right" sx={{width: '20%'}}>Unit Price</TableCell>
                                                <TableCell align="right" sx={{width: '20%'}}>Total</TableCell>
                                                <TableCell align="center" sx={{width: '5%'}}>Action</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {formData.items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>
                                                        <Autocomplete
                                                            options={products}
                                                            getOptionLabel={(option) => option.name || ''}
                                                            value={item.product}
                                                            onChange={(event, newValue) => handleItemChange(index, 'product', newValue)}
                                                            isOptionEqualToValue={(option, value) => option._id === value?._id}
                                                            renderInput={(params) => <TextField {...params} label="Product" variant="standard" size="small"/>} // Kept variant standard for table compactness
                                                            disabled={isEditing && formData.status !== 'Draft'}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            name="quantityOrdered"
                                                            value={item.quantityOrdered}
                                                            onChange={(e) => handleItemChange(index, 'quantityOrdered', e.target.value)}
                                                            inputProps={{ min: 1, style: { textAlign: 'right' } }}
                                                            variant="standard" // Kept variant standard
                                                            size="small"
                                                            disabled={isEditing && formData.status !== 'Draft'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <TextField
                                                            type="number"
                                                            name="unitPrice"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                            inputProps={{ min: 0, step: "0.01", style: { textAlign: 'right' } }}
                                                            variant="standard" // Kept variant standard
                                                            size="small"
                                                            disabled={isEditing && formData.status !== 'Draft'}
                                                        />
                                                    </TableCell>
                                                    <TableCell align="right">${parseFloat(item.totalPrice).toFixed(2)}</TableCell>
                                                    <TableCell align="center">
                                                        <IconButton onClick={() => removeItem(index)} color="error" size="small" disabled={formData.items.length === 1 || (isEditing && formData.status !== 'Draft')}>
                                                            <DeleteIcon fontSize="small"/>
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                                {!(isEditing && formData.status !== 'Draft') && (
                                    <Button startIcon={<AddCircleOutlineIcon />} onClick={addItem} variant="outlined" size="medium"> {/* Added variant and size */}
                                        Add Item
                                    </Button>
                                )}
                            </Grid>

                            {/* Section 3: Summary & Status */}
                            <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Summary & Status</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                                {/* Flex container to split the content area into two halves, like InvoiceForm */}
                                <Box sx={{ display: 'flex', width: '100%', gap: 3 }}>
                                    {/* Left Side: Notes */}
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}> {/* Left column takes 50% */}
                                        {/* Wrapper for Notes TextField to allow it to grow */}
                                        <Box className="form-field-notes" sx={{ width: '100%', flexGrow: 1, display: 'flex' }}>
                                            <TextField
                                                name="notes"
                                                label="Notes (Optional)"
                                                multiline
                                                fullWidth
                                                value={formData.notes}
                                                onChange={handleInputChange}
                                                variant="outlined"
                                                size="small"
                                                sx={{
                                                    height: '100%', display: 'flex', flexDirection: 'column',
                                                    '& .MuiInputBase-root': { flexGrow: 1, alignItems: 'flex-start' },
                                                    '& .MuiInputBase-inputMultiline': { overflowY: 'auto', height: '100% !important' }
                                                }}
                                            />
                                        </Box>
                                        {/* Action Buttons - Moved here, below Notes */}
                                        <Box sx={{ display: 'flex', gap: 2, width: '100%', mt: 2 }}>
                                            <Button onClick={() => navigate('/purchase-orders')} disabled={loading} variant="outlined" size="medium" sx={{ flex: 1 }}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="contained" disabled={loading || (isEditing && formData.status !== 'Draft' && formData.status !== 'Ordered')} size="medium" sx={{ flex: 1 }}>
                                                {loading ? <CircularProgress size={24} /> : (isEditing ? 'Update PO' : 'Create PO')}
                                            </Button>
                                        </Box>
                                    </Box>
                                    {/* Right Side: Status and Totals stacked */}
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}> {/* Right column takes 50% */}
                                        <Box className="form-field-status">
                                            <FormControl fullWidth variant="outlined" size="small">
                                                <InputLabel id="status-select-label">Status</InputLabel>
                                                <Select
                                                    labelId="status-select-label"
                                                    name="status"
                                                    value={formData.status}
                                                    label="Status"
                                                    onChange={handleInputChange}
                                                    disabled={!isEditing && formData.status !== 'Draft'}
                                                >
                                                    {availableStatuses.map(stat => (
                                                        <MenuItem key={stat} value={stat}
                                                            disabled={isEditing && formData.status !== 'Draft' && stat !== formData.status && stat !== 'Cancelled'}
                                                        >
                                                            {stat}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Box>
                                        <Box className="form-field-totals" sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>Subtotal: ${calculateTotals(formData.items).subTotal.toFixed(2)}</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Grand Total: ${calculateTotals(formData.items).grandTotal.toFixed(2)}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>
                        {/* Action Buttons */}
                        {/* Action buttons have been moved into the left column of the "Summary & Status" section */}
                    </Box>
                </Paper>
            </Container>
        </LocalizationProvider>
    );
};

export default PurchaseOrderForm;