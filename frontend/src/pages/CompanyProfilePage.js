import React, { useState, useEffect } from 'react';
import { getCompanyProfile, upsertCompanyProfile } from '../services/companyProfileService';
import { useSnackbar } from '../contexts/SnackbarContext';
import {
    Container,
    Paper,
    Typography,
    Box,
    Grid,
    TextField,
    Button,
    CircularProgress,
    Alert,
    Divider // For section separation
} from '@mui/material';

const CompanyProfilePage = () => {
    const [profileData, setProfileData] = useState({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        logoUrl: '',
        taxId: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true);
            try {
                const response = await getCompanyProfile();
                if (response.success && response.data) {
                    setProfileData(prev => ({ ...prev, ...response.data }));
                } else if (!response.data) {
                    // No profile exists yet, form will be blank which is fine
                    showSnackbar('No company profile found. Please create one.', 'info');
                }
            } catch (err) {
                setError(err.message || 'Failed to fetch company profile.');
                showSnackbar(err.message || 'Failed to fetch company profile.', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []); // <--- Change to empty dependency array

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            const response = await upsertCompanyProfile(profileData);
            if (response.success) {
                setProfileData(prev => ({ ...prev, ...response.data })); // Update with any backend transformations
                showSnackbar(response.message || 'Company profile saved successfully!', 'success');
            } else {
                setError(response.message || 'Failed to save company profile.');
                showSnackbar(response.message || 'Failed to save company profile.', 'error');
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || err.message || 'An error occurred.';
            setError(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg);
            showSnackbar(Array.isArray(errMsg) ? errMsg.join(', ') : errMsg, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography variant="h5" component="h1" gutterBottom sx={{ mb: 2.5 }}>
                    Company Profile
                </Typography>
                {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}>
                        {/* Section 1: Basic Information */}
                        <Grid item xs={12} sx={{ minWidth: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Basic Information</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        {/* This Box replaces the Grid item for the fields. It spans full width and uses padding to align with Grid spacing. */}
                        <Box sx={{ width: '100%', paddingLeft: theme => theme.spacing(1.5), paddingRight: theme => theme.spacing(1.5), boxSizing: 'border-box' }}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}> {/* Each takes 50% on sm+, 12px is half of gap 3 (24px) */}
                                    <TextField name="companyName" label="Company Name" value={profileData.companyName} onChange={handleChange} fullWidth required variant="outlined" size="small" autoFocus />
                                </Box>
                                <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(50% - 12px)' } }}> {/* Each takes 50% on sm+ */}
                                    <TextField name="taxId" label="Tax ID (e.g., GSTIN, VAT)" value={profileData.taxId} onChange={handleChange} fullWidth variant="outlined" size="small" />
                                </Box>
                            </Box>
                        </Box>

                        {/* Section 2: Contact Details */}
                        <Grid item xs={12} sx={{ mt: 2, minWidth: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Contact Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box sx={{ flexBasis: '100%', flexGrow: 1, mb: 1 }}> {/* Address takes full width in its row */}
                                    <TextField name="address" label="Address" value={profileData.address} onChange={handleChange} fullWidth required multiline rows={3} variant="outlined" size="small" />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}>
                                    <TextField name="phone" label="Phone" value={profileData.phone} onChange={handleChange} fullWidth variant="outlined" size="small" />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: 'calc(50% - 12px)', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}>
                                    <TextField name="email" label="Email" type="email" value={profileData.email} onChange={handleChange} fullWidth variant="outlined" size="small" />
                                </Box>
                                <Box sx={{ flexBasis: { xs: '100%', sm: '100%', md: 'calc(33.33% - 16px)' }, flexGrow: 1 }}> {/* Website can take more space if needed */}
                                    <TextField name="website" label="Website" value={profileData.website} onChange={handleChange} fullWidth variant="outlined" size="small" />
                                </Box>
                            </Box>
                        </Grid>

                        {/* Section 3: Branding */}
                        <Grid item xs={12} sx={{ mt: 2, minWidth: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Branding</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box sx={{ flexBasis: '100%', flexGrow: 1 }}>
                                    <TextField name="logoUrl" label="Logo URL" value={profileData.logoUrl} onChange={handleChange} fullWidth helperText="Enter the direct URL to your company logo image." variant="outlined" size="small" />
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                    <Box sx={{ mt: 'auto', pt: 3, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        {/* <Button onClick={() => navigate(-1)} disabled={saving} variant="outlined" size="medium">
                            Cancel 
                        </Button> */} {/* No explicit cancel, user can navigate away */}
                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={saving}
                            size="medium"
                            sx={{ minWidth: '150px' }} // Give save button a decent min width
                        >
                            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Profile'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Container>
    );
};

export default CompanyProfilePage;
/*
Key Changes and Structure:

1. Standard Page Wrapper:
   The Container maxWidth={false} and Paper elevation={0} with consistent padding and flex properties are used.

2. Sectioning:
   - Fields are grouped into "Basic Information," "Contact Details," and "Branding."
   - Each section starts with a Grid item xs={12} sx={{ minWidth: '100%' }} containing the Typography title and Divider.

3. Flexbox for Fields:
   - After each section header, a Grid item xs={12} wraps a Box with display: 'flex', flexWrap: 'wrap'.
   - Each TextField is in a Box with flexBasis and flexGrow to control responsiveness.

4. Uniform Field Styling:
   - All TextField components use variant="outlined" and size="small".

5. Button Area:
   - Save button is styled consistently and placed at the bottom with spacing and min width.
*/