import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    TextField, Button, Container, Typography, Box, Paper, Grid,
    CircularProgress, Alert, MenuItem, FormControlLabel, Switch, Divider
} from '@mui/material';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { createAccount, getAccountById, updateAccount } from '../../services/accountService';

const AccountForm = () => {
    const [formData, setFormData] = useState({
        accountName: '',
        accountCode: '',
        accountType: '', // Asset, Liability, Equity, Revenue, Expense
        description: '',
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const [pageTitle, setPageTitle] = useState('Add New Account');
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const { id: accountId } = useParams();

    const accountTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];

    useEffect(() => {
        if (accountId) {
            setPageTitle('Edit Account');
            setLoading(true);
            const fetchAccount = async () => {
                try {
                    const response = await getAccountById(accountId);
                    if (response.success) {
                        setFormData({
                            accountName: response.data.accountName || '',
                            accountCode: response.data.accountCode || '',
                            accountType: response.data.accountType || '',
                            description: response.data.description || '',
                            isActive: response.data.isActive !== undefined ? response.data.isActive : true,
                        });
                    } else {
                        const errMsg = response.message || 'Failed to fetch account details.';
                        setFormError(errMsg);
                        showSnackbar(errMsg, 'error');
                    }
                } catch (err) {
                    const errMsg = err.message || 'Error fetching account.';
                    setFormError(errMsg);
                    showSnackbar(errMsg, 'error');
                } finally {
                    setLoading(false);
                }
            };
            fetchAccount();
        }
    }, [accountId, showSnackbar]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        if (!formData.accountName.trim() || !formData.accountCode.trim() || !formData.accountType) {
            const errorMsg = 'Account Name, Code, and Type are required.';
            setFormError(errorMsg);
            showSnackbar(errorMsg, 'warning');
            setLoading(false);
            return;
        }

        try {
            let response;
            if (accountId) {
                response = await updateAccount(accountId, formData);
            } else {
                response = await createAccount(formData);
            }

            if (response.success) {
                showSnackbar(`Account ${accountId ? 'updated' : 'created'} successfully!`, 'success');
                navigate('/chart-of-accounts');
            } else {
                const errMsg = response.message || (accountId ? 'Failed to update account.' : 'Failed to create account.');
                setFormError(errMsg);
                showSnackbar(errMsg, 'error');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'An error occurred.';
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (loading && accountId && !formData.accountName) { // Show loader only if fetching for edit and form data not yet populated
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

                        {/* Section 1: Account Details */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Account Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, width: '100%' }}>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-accountName" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField
                                            name="accountName"
                                            required
                                            fullWidth
                                            label="Account Name"
                                            value={formData.accountName}
                                            onChange={handleChange}
                                            autoFocus
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Box>
                                    <Box className="form-field-accountCode" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField
                                            name="accountCode"
                                            required
                                            fullWidth
                                            label="Account Code"
                                            value={formData.accountCode}
                                            onChange={handleChange}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Box>
                                </Box>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                    <Box className="form-field-accountType" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                        <TextField
                                            name="accountType"
                                            required
                                            fullWidth
                                            select
                                            label="Account Type"
                                            value={formData.accountType}
                                            onChange={handleChange}
                                            variant="outlined"
                                            size="small"
                                        >
                                            <MenuItem value=""><em>Select Type</em></MenuItem>
                                            {accountTypes.map((type) => (
                                                <MenuItem key={type} value={type}>{type}</MenuItem>
                                            ))}
                                        </TextField>
                                    </Box>
                                    <Box className="form-field-isActive" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' }, display: 'flex', alignItems: 'center', pl:1 }}> {/* Added padding for alignment */}
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={formData.isActive}
                                                    onChange={handleChange}
                                                    name="isActive"
                                                    color="primary"
                                                />
                                            }
                                            label="Active"
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 2: Additional Information */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Additional Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box className="form-field-description" sx={{ width: '100%' }}>
                                <TextField
                                    name="description"
                                    fullWidth
                                    label="Description (Optional)"
                                    multiline
                                    rows={3}
                                    value={formData.description}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                />
                            </Box>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Consistent spacing and size */}
                        <Button onClick={() => navigate('/chart-of-accounts')} disabled={loading} variant="outlined" size="medium">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={loading} size="medium">
                            {loading ? <CircularProgress size={24} /> : (accountId ? 'Update Account' : 'Create Account')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default AccountForm;