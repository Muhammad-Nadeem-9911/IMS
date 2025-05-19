import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createSupplier, getSupplierById, updateSupplier } from '../../services/supplierService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Paper,
    Grid,
    CircularProgress,
    Alert,
    Divider // Import Divider
} from '@mui/material';

const SupplierForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        contactPerson: '',
        email: '',
        phone: '',
        address: {
            street: '',
            city: '',
            state: '',
            zipCode: '',
            country: ''
        },
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [pageTitle, setPageTitle] = useState('Add New Supplier');

    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const { id: supplierId } = useParams();

    useEffect(() => {
        if (supplierId) {
            setPageTitle('Edit Supplier');
            setLoading(true);
            const fetchSupplier = async () => {
                try {
                    const response = await getSupplierById(supplierId);
                    if (response.success) {
                        // Ensure address is an object, even if it's null/undefined from backend
                        const supplierData = { ...response.data, address: response.data.address || {} };
                        setFormData(supplierData);
                    } else {
                        showSnackbar(response.message || 'Failed to fetch supplier details.', 'error');
                        setFormError(response.message || 'Failed to fetch supplier details.');
                    }
                } catch (err) {
                    showSnackbar(err.message || 'Error fetching supplier.', 'error');
                    setFormError(err.message || 'Error fetching supplier.');
                } finally {
                    setLoading(false);
                }
            };
            fetchSupplier();
        }
    }, [supplierId, showSnackbar]);

    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleAddressChange = e => {
        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            address: {
                ...prevData.address,
                [name]: value
            }
        }));
    };

    const handleSubmit = async e => {
        e.preventDefault();
        setFormError('');
        setLoading(true);

        try {
            if (supplierId) {
                await updateSupplier(supplierId, formData);
                showSnackbar('Supplier updated successfully!', 'success');
            } else {
                await createSupplier(formData);
                showSnackbar('Supplier created successfully!', 'success');
            }
            navigate('/suppliers');
        } catch (err) {
            const errMsg = err.message || (supplierId ? 'Failed to update supplier.' : 'Failed to create supplier.');
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && supplierId) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>
                    {pageTitle}
                </Typography>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}>

                        {/* Section 1: Supplier Information */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Supplier Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-name" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="name" required fullWidth label="Supplier Name" value={formData.name} onChange={handleChange} autoFocus variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-contactPerson" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="contactPerson" fullWidth label="Contact Person" value={formData.contactPerson} onChange={handleChange} variant="outlined" size="small" />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-email" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="email" required fullWidth label="Email Address" type="email" value={formData.email} onChange={handleChange} variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-phone" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="phone" fullWidth label="Phone Number" value={formData.phone} onChange={handleChange} variant="outlined" size="small" />
                                    </Box>
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
                                    <TextField name="street" fullWidth label="Street" value={formData.address.street || ''} onChange={handleAddressChange} variant="outlined" size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-city" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="city" fullWidth label="City" value={formData.address.city || ''} onChange={handleAddressChange} variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-state" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="state" fullWidth label="State / Province" value={formData.address.state || ''} onChange={handleAddressChange} variant="outlined" size="small" />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-zipCode" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="zipCode" fullWidth label="Zip / Postal Code" value={formData.address.zipCode || ''} onChange={handleAddressChange} variant="outlined" size="small" />
                                    </Box>
                                    <Box className="form-field-country" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField name="country" fullWidth label="Country" value={formData.address.country || ''} onChange={handleAddressChange} variant="outlined" size="small" />
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 3: Notes */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Notes</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box className="form-field-notes" sx={{ width: '100%' }}>
                                <TextField
                                    name="notes"
                                    fullWidth
                                    label="Notes (Optional)"
                                    multiline
                                    rows={3}
                                    value={formData.notes}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>
                        </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Pushed to bottom, consistent spacing */}
                        <Button onClick={() => navigate('/suppliers')} disabled={loading} variant="outlined" size="medium"> {/* Consistent size */}
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={loading} size="medium"> {/* Consistent size */}
                            {loading ? <CircularProgress size={24} /> : (supplierId ? 'Update Supplier' : 'Create Supplier')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default SupplierForm;