import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, TextField, Button, Box, Grid,
    CircularProgress, MenuItem, FormControlLabel, Switch, Alert, Divider
} from '@mui/material';
import { getUserById, createUser, updateUser } from '../../services/userService';
import { useSnackbar } from '../../contexts/SnackbarContext';

const UserForm = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'manager', // Default role changed to manager
        isActive: true,
    });
    const [loading, setLoading] = useState(false);
    const [formError, setFormError] = useState('');
    const { id: userId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const isEditing = Boolean(userId);
    const pageTitle = isEditing ? 'Edit User' : 'Create New User';

    useEffect(() => {
        if (isEditing) {
            setLoading(true);
            const fetchUser = async () => {
                try {
                    const response = await getUserById(userId);
                    if (response.success) {
                        setFormData({
                            name: response.data.name,
                            email: response.data.email,
                            password: '', // Keep password fields blank for editing
                            confirmPassword: '',
                            role: response.data.role,
                            isActive: response.data.isActive,
                        });
                    } else {
                        showSnackbar(response.message || 'Failed to fetch user details.', 'error');
                        setFormError(response.message || 'Failed to fetch user details.');
                    }
                } catch (err) {
                    showSnackbar(err.message || 'Error fetching user.', 'error');
                    setFormError(err.message || 'Error fetching user.');
                } finally {
                    setLoading(false);
                }
            };
            fetchUser();
        }
    }, [userId, isEditing, showSnackbar]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (type === 'switch' ? checked : value)
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setFormError('');

        if (formData.password && formData.password !== formData.confirmPassword) {
            setFormError('Passwords do not match.');
            showSnackbar('Passwords do not match.', 'error');
            setLoading(false);
            return;
        }

        // Prepare payload, exclude confirmPassword and only include password if it's set
        const payload = {
            name: formData.name,
            email: formData.email,
            role: formData.role,
            isActive: formData.isActive,
        };

        if (formData.password) {
            payload.password = formData.password;
        }

        try {
            if (isEditing) {
                await updateUser(userId, payload);
                showSnackbar('User updated successfully!', 'success');
            } else {
                if (!payload.password) { // Password is required for new users
                    setFormError('Password is required for new users.');
                    showSnackbar('Password is required for new users.', 'error');
                    setLoading(false);
                    return;
                }
                await createUser(payload);
                showSnackbar('User created successfully!', 'success');
            }
            navigate('/admin/users'); // Navigate back to the users list
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'An error occurred.';
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
            setFormError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) { // Show loader only when fetching existing user data
        return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
    }

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>{pageTitle}</Typography>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}>

                        {/* Section 1: User Information */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>User Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box className="form-field-name" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                    <TextField
                                        name="name"
                                        label="Full Name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        autoFocus
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box className="form-field-email" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                    <TextField
                                        name="email"
                                        label="Email Address"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 2: Password Management */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Password Management</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box className="form-field-password" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                    <TextField
                                        name="password"
                                        label={isEditing ? "New Password (leave blank to keep current)" : "Password"}
                                        type="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        fullWidth
                                        required={!isEditing}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box className="form-field-confirmPassword" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                    <TextField
                                        name="confirmPassword"
                                        label={isEditing ? "Confirm New Password" : "Confirm Password"}
                                        type="password"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        fullWidth
                                        required={!isEditing && !!formData.password}
                                        disabled={!formData.password && isEditing}
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 3: Role & Status */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Role & Status</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box className="form-field-role" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}>
                                    <TextField
                                        name="role"
                                        label="Role"
                                        value={formData.role}
                                        onChange={handleChange}
                                        select
                                        required
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                    >
                                        {['manager', 'admin'].map(roleOption => (
                                            <MenuItem key={roleOption} value={roleOption}>
                                                {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                                            </MenuItem>
                                        ))}
                                    </TextField>
                                </Box>
                                <Box className="form-field-isActive" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' }, display: 'flex', alignItems: 'center', pl: 1 }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={formData.isActive}
                                                onChange={handleChange}
                                                name="isActive"
                                                color="primary"
                                            />
                                        }
                                        label="Active User"
                                    />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}> {/* Consistent spacing and size */}
                        <Button onClick={() => navigate('/admin/users')} disabled={loading} variant="outlined" size="medium">
                            Cancel
                        </Button>
                        <Button type="submit" variant="contained" disabled={loading} size="medium">
                            {loading ? <CircularProgress size={24} /> : (isEditing ? 'Update User' : 'Create User')}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default UserForm;