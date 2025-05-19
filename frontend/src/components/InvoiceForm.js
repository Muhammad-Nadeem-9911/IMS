import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../contexts/SnackbarContext';
import { createInvoice, getInvoiceById, updateInvoice } from '../services/invoiceService';
import { getProducts } from '../services/productService'; // To select products for invoice items
import { getCustomers } from '../services/customerService'; // To select customers

import {
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Box,
    Grid,
    IconButton,
    Divider,
    CircularProgress,
    MenuItem, // For Status Select
    Autocomplete, // For product selection
    Alert // Import Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import { DatePicker } from '@mui/x-date-pickers/DatePicker'; // For date fields
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'; // Or AdapterDayjs, AdapterMoment

const InvoiceForm = () => {
    const [invoiceData, setInvoiceData] = useState({
        customerId: null, // Will store the selected customer's ID
        invoiceDate: new Date(),
        dueDate: null,
        items: [{ // Start with one blank item
            productName: '',
            description: '',
            productId: null, // To store the selected product's ID
            quantity: 1,
            unitPrice: 0,
            totalPrice: 0, // Add totalPrice for each item
        }],
        taxRate: 0,
        notes: '',
        status: 'draft', // Match backend enum default
    });
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]); // State to store fetched products
    const [customers, setCustomers] = useState([]); // State to store fetched customers
    const [formError, setFormError] = useState(''); // For persistent form errors
    const { id: invoiceId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const pageTitle = invoiceId ? 'Edit Invoice' : 'Create New Invoice';

    // State for calculated totals
    const [subTotal, setSubTotal] = useState(0);
    const [taxAmount, setTaxAmount] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);

    // Fetch products and customers for selection
    useEffect(() => {
        const fetchProductsForSelection = async () => {
            try {
                const response = await getProducts();
                if (response.success) {
                    setProducts(response.data || []);
                } else {
                    showSnackbar('Could not load products for selection.', 'warning');
                }
            } catch (error) {
                showSnackbar('Error loading products: ' + error.message, 'error');
            }
        };
        fetchProductsForSelection();
        const fetchCustomersForSelection = async () => {
            try {
                const response = await getCustomers();
                if (response.success) {
                    setCustomers(response.data || []);
                } else {
                    showSnackbar('Could not load customers for selection.', 'warning');
                }
            } catch (error) {
                showSnackbar('Error loading customers: ' + error.message, 'error');
            }
        };
        fetchCustomersForSelection();

    }, [showSnackbar]);

    useEffect(() => {
        if (invoiceId) {
            setLoading(true);
            const fetchInvoice = async () => {
                try {
                    const response = await getInvoiceById(invoiceId);
                    if (response.success) {
                        const fetchedData = response.data;
                        // Ensure dates are Date objects for the DatePicker
                        setInvoiceData({
                            ...fetchedData,
                            customerId: fetchedData.customer?._id || null, // Assuming backend populates customer object
                            invoiceDate: new Date(fetchedData.invoiceDate),
                            dueDate: fetchedData.dueDate ? new Date(fetchedData.dueDate) : null,
                            // Ensure items have totalPrice, though backend should provide it
                            items: fetchedData.items.map(item => ({
                                ...item,
                                totalPrice: item.quantity * item.unitPrice
                            }))
                        });
                    } else {
                        showSnackbar(response.message || 'Failed to fetch invoice details.', 'error');
                        setFormError(response.message || 'Failed to fetch invoice details.');
                    }
                } catch (err) {
                    showSnackbar(err.message || 'Error fetching invoice.', 'error');
                    setFormError(err.message || 'Error fetching invoice.');
                } finally {
                    setLoading(false);
                }
            };
            fetchInvoice();
        }
    }, [invoiceId, showSnackbar]); // Add showSnackbar to dependencies if used inside
    const handleChange = (e) => {
        const { name, value } = e.target;
        setInvoiceData(prevData => ({
            ...prevData,
            [name]: value,
            }));
    };

    const handleCustomerSelect = (selectedCustomer) => {
        setInvoiceData(prevData => ({
            ...prevData,
            customerId: selectedCustomer ? selectedCustomer._id : null,
            // Customer details like name, address, email will be displayed based on selectedCustomer
            // but not directly stored in invoiceData anymore, only customerId is.
        }));
    };

    const handleDateChange = (name, newValue) => {
        setInvoiceData(prevData => ({ ...prevData, [name]: newValue }));
    };

    const handleItemChange = (index, e) => {
        const { name, value } = e.target;
        const items = [...invoiceData.items];

        if (name === "quantity" || name === "unitPrice") {
            // Update the specific field first
            items[index][name] = parseFloat(value) || 0;
            // Then recalculate totalPrice using the potentially updated quantity or unitPrice
            const currentQty = name === "quantity" ? (parseFloat(value) || 0) : (parseFloat(items[index].quantity) || 0);
            const currentPrice = name === "unitPrice" ? (parseFloat(value) || 0) : (parseFloat(items[index].unitPrice) || 0);
            items[index].totalPrice = currentQty * currentPrice;
        } else {
            items[index][name] = value; // For productName, description
        }
        setInvoiceData(prevData => ({ ...prevData, items }));
    };

    const addItem = () => {
        setInvoiceData(prevData => ({
            ...prevData,
            items: [
                ...prevData.items,
                { productName: '', description: '', productId: null, quantity: 1, unitPrice: 0, totalPrice: 0 }
            ]
        }));
    };

    const removeItem = (index) => {
        if (invoiceData.items.length <= 1) {
            showSnackbar('An invoice must have at least one item.', 'warning');
            return;
        }
        const items = [...invoiceData.items];
        items.splice(index, 1);
        setInvoiceData(prevData => ({ ...prevData, items }));
    };

    const handleProductSelect = (index, selectedProduct) => {
        const items = [...invoiceData.items];
        if (selectedProduct) {
            items[index].productId = selectedProduct._id;
            items[index].productName = selectedProduct.name;
            items[index].description = selectedProduct.description || ''; // Use product description
            items[index].unitPrice = parseFloat(selectedProduct.sellingPrice) || 0;
            // Recalculate total price for this item
            const qty = parseFloat(items[index].quantity) || 0;
            items[index].totalPrice = qty * items[index].unitPrice;
        } else { // Product deselected or cleared
            items[index].productId = null;
            items[index].productName = '';
            // Optionally clear description and unitPrice or leave them
        }
        setInvoiceData(prevData => ({ ...prevData, items }));
    };

    // Calculate totals whenever items or taxRate changes
    useEffect(() => {
        let currentSubTotal = 0;
        invoiceData.items.forEach(item => {
            // Ensure item.totalPrice is calculated if not already
            const qty = parseFloat(item.quantity) || 0;
            const price = parseFloat(item.unitPrice) || 0;
            item.totalPrice = qty * price; // Recalculate just in case
            currentSubTotal += item.totalPrice;
        });
        setSubTotal(currentSubTotal);
        const currentTaxAmount = currentSubTotal * (parseFloat(invoiceData.taxRate) / 100 || 0);
        setTaxAmount(currentTaxAmount);
        setGrandTotal(currentSubTotal + currentTaxAmount);
    }, [invoiceData.items, invoiceData.taxRate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        const finalInvoiceData = {
            ...invoiceData,
            customerId: invoiceData.customerId, // Ensure customerId is included
            items: invoiceData.items.map(item => ({ // Ensure only necessary fields are sent for items
                productName: item.productName,
                description: item.description,
                quantity: parseFloat(item.quantity) || 0,
                unitPrice: parseFloat(item.unitPrice) || 0,
                totalPrice: item.totalPrice, // Already calculated
                productId: item.productId || null // If we add product selection later
            })),
            subTotal,
            taxAmount,
            grandTotal,
            taxRate: parseFloat(invoiceData.taxRate) || 0,
        };
        // Remove old customer fields if they accidentally persist in invoiceData state
        delete finalInvoiceData.customerName;
        delete finalInvoiceData.customerAddress;
        delete finalInvoiceData.customerEmail;

        try {
            if (invoiceId) {
                await updateInvoice(invoiceId, finalInvoiceData);
                showSnackbar('Invoice updated successfully!', 'success');
            } else {
                await createInvoice(finalInvoiceData);
                showSnackbar('Invoice created successfully!', 'success');
            }
            navigate('/invoices');
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'An error occurred.';
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg); // Show persistent error if needed
        } finally {
            setLoading(false);
        }
    };

    const selectedCustomerForDisplay = customers.find(c => c._id === invoiceData.customerId);

    if (loading && invoiceId && !invoiceData.customerId && customers.length > 0) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }
    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
                <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                    <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>{pageTitle}</Typography>
                    {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                    <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}> {/* Form Box */}
                        <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}> {/* Main Grid container for sections */}
                            {/* Section 1: Customer & Invoice Details */}
                            <Grid item xs={12} sx={{ minWidth: '100%' }}>
                                <Typography variant="h6" gutterBottom>Customer & Invoice Details</Typography>
                                <Divider sx={{ mb: 2 }} />
                            </Grid>
                            {selectedCustomerForDisplay && (
                                <Grid item xs={12} sx={{ mt: 1, pl: 1, borderLeft: '3px solid', borderColor: 'primary.main' }}>
                                    <Typography variant="body2"><strong>Email:</strong> {selectedCustomerForDisplay.email || 'N/A'}</Typography>
                                    <Typography variant="body2"><strong>Address:</strong> {`${selectedCustomerForDisplay.address?.street || ''} ${selectedCustomerForDisplay.address?.city || ''}`.trim() || 'N/A'}</Typography>
                                </Grid>
                            )}
                            {/* Invoice Date, Due Date, Customer, Status in a row - ensuring equal width and full utilization */}
                            <Grid item xs={12} sx={{ mt: 1, minWidth: '100%' }}> {/* Standardized top margin and ensure full width */}

                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, width: '100%' }}>
                                    <Box sx={{ width: { xs: '100%' }, flex: { sm: 1 }, minWidth: 0 }}>
                                        <DatePicker
                                            label="Invoice Date"
                                            value={invoiceData.invoiceDate}
                                            onChange={(newValue) => handleDateChange('invoiceDate', newValue)}
                                            slotProps={{ textField: { fullWidth: true, required: true, variant: 'outlined', size: 'small' } }}
                                        />
                                    </Box>
                                    <Box sx={{ width: { xs: '100%' }, flex: { sm: 1 }, minWidth: 0 }}>
                                        <DatePicker
                                            label="Due Date"
                                            value={invoiceData.dueDate}
                                            onChange={(newValue) => handleDateChange('dueDate', newValue)}
                                            slotProps={{ textField: { fullWidth: true, variant: 'outlined', size: 'small' } }}
                                        />
                                    </Box>
                                    <Box sx={{ width: { xs: '100%' }, flex: { sm: 1 }, minWidth: 0 }}>
                                        <Autocomplete
                                            options={customers}
                                            getOptionLabel={(option) => option.name || ""}
                                            value={customers.find(c => c._id === invoiceData.customerId) || null}
                                            onChange={(event, newValue) => handleCustomerSelect(newValue)}
                                            isOptionEqualToValue={(option, value) => option._id === value?._id}
                                            renderInput={(params) => <TextField {...params} label="Select Customer" variant="outlined" size="small" required />}
                                        />
                                    </Box>
                                    
                                    <Box sx={{ width: { xs: '100%' }, flex: { sm: 1 }, minWidth: 0 }}>
                                        <TextField
                                            select
                                            label="Status"
                                            name="status"
                                            value={invoiceData.status}
                                            onChange={handleChange}
                                            fullWidth
                                            variant="outlined"
                                            size="small"
                                            sx={{ width: '100%', minWidth: '100%' }} // Force select to expand
                                        >
                                            {['draft', 'sent', 'paid', 'overdue', 'void'].map((option) => (
                                                <MenuItem key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Box>
                                </Box>
                            </Grid>
                            {/* Line Items Section */}
                            <Grid item xs={12} sx={{ mt: 1, minWidth: '100%' }}> {/* Standardized top margin */}
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="h6" gutterBottom sx={{ mb: 0 }}>Items</Typography>
                                    <Button startIcon={<AddCircleOutlineIcon />} onClick={addItem} variant="outlined" size="medium">
                                        Add Item
                                    </Button>
                                </Box>                                <Divider sx={{ mb: 2 }} />
                            </Grid>

                            {invoiceData.items.map((item, index) => (
                                <Grid item xs={12} key={index} sx={{ width: '100%' }}>
                                    {index > 0 && <Divider sx={{ mt: 2, mb: 2 }} />} {/* Divider between items */}
                                    <Box sx={{ display: 'flex', gap: { xs: 1, sm: 2 }, alignItems: 'center', width: '100%' }}>
                                        {/* Product Autocomplete */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Autocomplete
                                                options={products}
                                                getOptionLabel={(option) => option.name || ""}
                                                value={products.find(p => p._id === item.productId) || null}
                                                onChange={(event, newValue) => handleProductSelect(index, newValue)}
                                                isOptionEqualToValue={(option, value) => option._id === value?._id}
                                                renderInput={(params) => (
                                                    <TextField
                                                        {...params}
                                                        label="Product"
                                                        size="small"
                                                        variant="outlined"
                                                        required
                                                    />
                                                )}
                                                fullWidth
                                            />
                                        </Box>

                                        {/* Description TextField */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <TextField
                                                label="Description (Optional)"
                                                name="description"
                                                variant="outlined"
                                                size="small"
                                                value={item.description}
                                                onChange={(e) => handleItemChange(index, e)}
                                                fullWidth
                                            />
                                        </Box>

                                        {/* Quantity TextField */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <TextField
                                                label="Qty"
                                                name="quantity"
                                                type="number"
                                                variant="outlined"
                                                size="small"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, e)}
                                                fullWidth
                                                required
                                                inputProps={{ min: 1 }}
                                            />
                                        </Box>

                                        {/* Unit Price TextField */}
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <TextField
                                                label="Unit Price ($)"
                                                name="unitPrice"
                                                type="number"
                                                variant="outlined"
                                                size="small"
                                                value={item.unitPrice}
                                                onChange={(e) => handleItemChange(index, e)}
                                                fullWidth
                                                required
                                                inputProps={{ min: 0, step: "0.01" }}
                                            />
                                        </Box>

                                        {/* Delete Button */}
                                        <IconButton
                                            onClick={() => removeItem(index)}
                                            color="error"
                                            disabled={invoiceData.items.length <= 1}
                                            size="small"
                                        >
                                            <DeleteIcon />
                                        </IconButton>
                                    </Box>
                                </Grid>
                            ))}
                            {/* The "Add Item" button was moved up to the section title line */}
                            {/* Notes and Tax Rate */}
                            <Grid item xs={12} sx={{ mt: 3, minWidth: '100%' }}> {/* Added more top margin for separation */}
                                <Typography variant="h6" gutterBottom>Additional Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                            </Grid>
                            <Grid item xs={12} sx={{ width: '100%' }}> {/* Ensure this Grid item takes full width */}
                                {/* Flex container to split the content area into two halves */}
                                <Box sx={{ display: 'flex', width: '100%', gap: 3 }}> {/* Using theme.spacing(3) for gap, mimics Grid spacing={3} */}
                                    {/* Left Half: Notes & Buttons */}
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}> {/* Left column takes 50% of space */}
                                        {/* This Box will grow to take available vertical space.
                                            It's also a flex container to help the TextField fill its height. */}
                                        <Box sx={{ width: '100%', flexGrow: 1, display: 'flex' }}>
                                            <TextField
                                                label="Notes (Optional)"
                                                name="notes"
                                                value={invoiceData.notes}
                                                onChange={handleChange}
                                                multiline
                                                // rows={3} // Removed to allow dynamic height
                                                fullWidth // TextField takes full width of its container Box
                                                variant="outlined"
                                                size="small"
                                                // Make the TextField fill its parent Box and manage internal scrolling
                                                sx={{
                                                    height: '100%', // TextField component tries to fill its parent
                                                    display: 'flex', flexDirection: 'column', // Ensure internal parts can use flex properties
                                                    '& .MuiInputBase-root': {
                                                        flexGrow: 1, // The input area should grow
                                                        alignItems: 'flex-start', // Keep label at the top for multiline
                                                    },
                                                    '& .MuiInputBase-inputMultiline': { // The actual textarea
                                                        overflowY: 'auto', // Allow vertical scrolling
                                                        height: '100% !important', // Ensure textarea fills the InputBase
                                                    }
                                                }}
                                            />
                                        </Box>
                                        {/* Action Buttons - below Notes, with its own margin/gap */}
                                        <Box sx={{ display: 'flex', gap: 2, width: '100%', mt: 2 }}>
                                            <Button onClick={() => navigate('/invoices')} disabled={loading} variant="outlined" size="medium" sx={{ flex: 1 }}>
                                                Cancel
                                            </Button>
                                            <Button type="submit" variant="contained" disabled={loading} size="medium" sx={{ flex: 1 }}>
                                                {loading ? (
                                                    <CircularProgress size={24} />
                                                ) : (
                                                    invoiceId ? 'Update Invoice' : 'Create Invoice'
                                                )}
                                            </Button>
                                        </Box>
                                    </Box>
                                    {/* Right Half: Tax Rate and Totals */} {/* Changed sm={6} to xs={6} for 50% width on all screen sizes */}
                                    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}> {/* Right column takes 50% of space */}
                                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
                                            {/* Tax Rate Field */}
                                            <Box sx={{ width: '100%' }}> {/* Box to ensure full width within the right half */}
                                                <TextField
                                                    label="Tax Rate (%)"
                                                    name="taxRate"
                                                    type="number"
                                                    value={invoiceData.taxRate || ''} // Use || '' to handle null/undefined gracefully
                                                    onChange={handleChange}
                                                    fullWidth // TextField takes full width of its container Box
                                                    variant="outlined"
                                                    size="small"
                                                    inputProps={{ min: 0, step: "0.01" }}
                                                />
                                            </Box>
                                            {/* Totals Display - Moved here */}
                                            <Box sx={{ width: '100%' }}> {/* Box to ensure full width within the right half */}
                                                <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Subtotal:</span>
                                                    <span>${subTotal.toFixed(2)}</span>
                                                </Typography>
                                                <Typography variant="body1" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Tax ({invoiceData.taxRate || 0}%):</span>
                                                    <span>${taxAmount.toFixed(2)}</span>
                                                </Typography>
                                                <Divider sx={{ my: 1 }} />
                                                <Typography variant="h6" sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Grand Total:</span>
                                                    <span>${grandTotal.toFixed(2)}</span>
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                </Box> {/* Closes the Flex L/R split container */}
                            </Grid> {/* <-- Add the missing closing tag for the outer Grid item */}

                            {/* Actions */}
                        </Grid>
                    </Box>
                </Paper>
            </Container>
        </LocalizationProvider>
    );
};

export default InvoiceForm;