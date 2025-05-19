import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, Box, Button, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip // Added Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getAccounts, deleteAccount as apiDeleteAccount } from '../services/accountService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuthState } from '../contexts/AuthContext'; // Import useAuthState
const ChartOfAccountsPage = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const { user } = useAuthState(); // Get user from context

    const fetchAccounts = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getAccounts();
            if (response.success) {
                setAccounts(response.data || []);
            } else {
                setError(response.message || 'Failed to fetch accounts.');
                showSnackbar(response.message || 'Failed to fetch accounts.', 'error');
            }
        } catch (err) {
            const errMsg = err.message || 'An error occurred while fetching accounts. Ensure backend is running and API is available.';
            setError(errMsg);
            showSnackbar(errMsg, 'error');
            setAccounts([]); // Ensure accounts is an array even on error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddAccount = () => {
        navigate('/chart-of-accounts/new');
    };

    const handleEditAccount = (id) => {
        navigate(`/chart-of-accounts/edit/${id}`);
    };

    const handleDeleteAccount = async (id, accountName) => {
        if (window.confirm(`Are you sure you want to delete the account "${accountName}"? This action might affect existing records.`)) {
            try {
                const response = await apiDeleteAccount(id);
                if (response.success) {
                    showSnackbar('Account deleted successfully!', 'success');
                    fetchAccounts(); // Refresh the list
                } else {
                    showSnackbar(response.message || 'Failed to delete account.', 'error');
                }
            } catch (err) {
                showSnackbar(err.message || 'An error occurred while deleting the account.', 'error');
            }
        }
    };
    return (
        // Ensure user is loaded before trying to access user.role
        // This check might be better handled by PrivateRoute or a loading state in AuthContext
        // For now, we assume user object is available if on this page due to PrivateRoute
        <Container component="main" maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography component="h1" variant="h4" gutterBottom sx={{ mb: 0 }}>
                        Chart of Accounts
                    </Typography>
                    {user && user.role === 'admin' && ( // Show Add button only for admin
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleAddAccount}
                    >
                        Add New Account
                    </Button>)}
                </Box>
                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                {error && !loading && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                {!loading && !error && accounts.length === 0 && (
                    <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
                        No accounts found. Start by adding a new account.
                    </Typography>
                )}

                {!loading && !error && accounts.length > 0 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, flexGrow: 1 }}>
                        <Table sx={{ minWidth: 650 }} aria-label="chart of accounts table">
                            <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Code</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Active</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow
                                        key={account._id}
                                        hover
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell>{account.accountCode}</TableCell>
                                        <TableCell>
                                            {account.accountName}
                                            {account.isSystemAccount && <Chip label="System" size="small" sx={{ ml: 1 }} color="info" variant="outlined" />}
                                        </TableCell>
                                        <TableCell>{account.accountType}</TableCell>
                                        <TableCell>{account.description || '-'}</TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={account.isActive ? 'Active' : 'Inactive'} 
                                                color={account.isActive ? 'success' : 'default'} 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            {user && user.role === 'admin' && ( // Show action buttons only for admin
                                            <>
                                            <IconButton
                                                aria-label="edit"
                                                color="primary"
                                                onClick={(e) => { e.stopPropagation(); handleEditAccount(account._id); }}
                                                size="small"
                                                disabled={account.isSystemAccount} // Disable edit for system accounts
                                            >
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton
                                                aria-label="delete"
                                                color="error"
                                                onClick={(e) => { e.stopPropagation(); handleDeleteAccount(account._id, account.accountName); }}
                                                size="small"
                                                disabled={account.isSystemAccount} // Disable delete for system accounts
                                            >
                                                <DeleteIcon fontSize="small" />
                                            </IconButton></>)}
                                        </TableCell>
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

export default ChartOfAccountsPage;