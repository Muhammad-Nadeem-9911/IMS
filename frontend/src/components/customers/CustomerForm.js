import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createCustomer, getCustomerById, updateCustomer } from '../../services/customerService';
import {
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Box,
    Grid,
    CircularProgress,
    Alert,
    Divider // Import Divider
} from '@mui/material';

const CustomerForm = () => {
    const [customerData, setCustomerData] = useState({
        name: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            postalCode: '',
            country: ''
        },
        taxId: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const { id: customerId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const pageTitle = customerId ? 'Edit Customer' : 'Create New Customer';

    useEffect(() => {
        if (customerId) {
            setLoading(true);
            const fetchCustomer = async () => {
                try {
                    const response = await getCustomerById(customerId);
                    if (response.success) {
                        // Ensure address object exists even if some fields are null/undefined
                        const fetchedAddress = response.data.address || {};
                        setCustomerData({
                            ...response.data,
                            address: {
                                street: fetchedAddress.street || '',
                                city: fetchedAddress.city || '',
                                state: fetchedAddress.state || '',
                                postalCode: fetchedAddress.postalCode || '',
                                country: fetchedAddress.country || '',
                            }
                        });
                    } else {
                        showSnackbar(response.message || 'Failed to fetch customer details.', 'error');
                        setFormError(response.message || 'Failed to fetch customer details.');
                    }
                } catch (err) {
                    showSnackbar(err.message || 'Error fetching customer.', 'error');
                    setFormError(err.message || 'Error fetching customer.');
                } finally {
                    setLoading(false);
                }
            };
            fetchCustomer();
        }
    }, [customerId, showSnackbar]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCustomerData(prevData => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleAddressChange = (e) => {
        const { name, value } = e.target;
        setCustomerData(prevData => ({
            ...prevData,
            address: {
                ...prevData.address,
                [name]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        try {
            if (customerId) {
                await updateCustomer(customerId, customerData);
                showSnackbar('Customer updated successfully!', 'success');
            } else {
                await createCustomer(customerData);
                showSnackbar('Customer created successfully!', 'success');
            }
            navigate('/customers');
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'An error occurred.';
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && customerId && !customerData.name) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>{pageTitle}</Typography> {/* Changed variant and added margin */}
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}> {/* Ensure full width */}

                        {/* Section 1: Customer Information */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Customer Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            {/* Box to group Name, Email, Phone in a single row, equally sharing width */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box className="form-field-name" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}> {/* 16px = (2 * 24px gap) / 3 items approx */}
                                    <TextField
                                        name="name"
                                        label="Customer Name"
                                        value={customerData.name}
                                        onChange={handleChange}
                                        fullWidth
                                        required
                                        autoFocus
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box className="form-field-email" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                    <TextField
                                        name="email"
                                        label="Email"
                                        type="email"
                                        value={customerData.email}
                                        onChange={handleChange}
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box className="form-field-phone" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                    <TextField
                                        name="phone"
                                        label="Phone"
                                        value={customerData.phone}
                                        onChange={handleChange}
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 2: Address Details */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Address Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                                <Box className="form-field-street" sx={{ width: '100%' }}>
                                    <TextField name="street" label="Street" value={customerData.address.street} onChange={handleAddressChange} fullWidth variant="outlined" size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-city" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="city" label="City" value={customerData.address.city} onChange={handleAddressChange} fullWidth variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-state" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="state" label="State / Province" value={customerData.address.state} onChange={handleAddressChange} fullWidth variant="outlined" size="small" />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-postalCode" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="postalCode" label="Postal Code" value={customerData.address.postalCode} onChange={handleAddressChange} fullWidth variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-country" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="country" label="Country" value={customerData.address.country} onChange={handleAddressChange} fullWidth variant="outlined" size="small" />
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 3: Other Details */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Other Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                                <Box className="form-field-taxId" sx={{ width: '100%' }}> {/* Or make it half width if preferred */}
                                    <TextField name="taxId" label="Tax ID (e.g., GSTIN, VAT)" value={customerData.taxId} onChange={handleChange} fullWidth variant="outlined" size="small" />
                                </Box>
                                <Box className="form-field-notes" sx={{ width: '100%' }}>
                                    <TextField name="notes" label="Notes (Optional)" value={customerData.notes} onChange={handleChange} fullWidth multiline rows={3} variant="outlined" size="small" />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Action Buttons */}
                        <Grid item xs={12} sx={{ mt: 'auto', pt: 3 }}> {/* Pushed to bottom */}
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Added gap */}
                                <Button onClick={() => navigate('/customers')} disabled={loading} variant="outlined" size="medium"> {/* Changed size to medium for consistency */}
                                    Cancel
                                </Button>
                                <Button type="submit" variant="contained" disabled={loading} size="medium"> {/* Changed size to medium */}
                                    {loading ? <CircularProgress size={24} /> : (customerId ? 'Update Customer' : 'Create Customer')}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        </Container>
    );
};

export default CustomerForm;