import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, Box, Button, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, Chip, Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import ToggleOnIcon from '@mui/icons-material/ToggleOn';
import ToggleOffIcon from '@mui/icons-material/ToggleOff';
import { getUsers, updateUser } from '../services/userService'; // We'll use updateUser for activation/deactivation
import { useSnackbar } from '../contexts/SnackbarContext';

const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const fetchUsers = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getUsers();
            if (response.success) {
                setUsers(response.data || []);
            } else {
                setError(response.message || 'Failed to fetch users.');
                showSnackbar(response.message || 'Failed to fetch users.', 'error');
            }
        } catch (err) {
            const errMsg = err.message || 'An error occurred while fetching users.';
            setError(errMsg);
            showSnackbar(errMsg, 'error');
            setUsers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddUser = () => {
        navigate('/admin/users/new'); // Or your preferred route for adding users
    };

    const handleEditUser = (id) => {
        navigate(`/admin/users/edit/${id}`); // Or your preferred route for editing users
    };

    const handleToggleActive = async (user) => {
        const action = user.isActive ? 'deactivate' : 'activate';
        if (window.confirm(`Are you sure you want to ${action} user "${user.name}"?`)) {
            try {
                // For toggling isActive, we only need to send the isActive field
                const response = await updateUser(user._id, { isActive: !user.isActive });
                if (response.success) {
                    showSnackbar(`User ${user.name} ${action}d successfully!`, 'success');
                    fetchUsers(); // Refresh the list
                } else {
                    showSnackbar(response.message || `Failed to ${action} user.`, 'error');
                }
            } catch (err) {
                showSnackbar(err.message || `An error occurred while ${action}ing the user.`, 'error');
            }
        }
    };

    const roleColors = {
        admin: 'error',
        manager: 'warning',
        user: 'info',
    };

    return (
        <Container component="main" maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography component="h1" variant="h4" gutterBottom sx={{ mb: 0 }}>
                        User Management
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={handleAddUser}
                    >
                        Add New User
                    </Button>
                </Box>
                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                {error && !loading && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                {!loading && !error && users.length === 0 && (
                    <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
                        No users found. Start by adding a new user.
                    </Typography>
                )}

                {!loading && !error && users.length > 0 && (
                    <TableContainer component={Paper} variant="outlined" sx={{ mt: 2, flexGrow: 1 }}>
                        <Table sx={{ minWidth: 650 }} aria-label="users table">
                            <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Status</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((userItem) => (
                                    <TableRow
                                        key={userItem._id}
                                        hover
                                        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                    >
                                        <TableCell>{userItem.name}</TableCell>
                                        <TableCell>{userItem.email}</TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)} 
                                                size="small" 
                                                color={roleColors[userItem.role] || 'default'} 
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Chip 
                                                label={userItem.isActive ? 'Active' : 'Inactive'} 
                                                color={userItem.isActive ? 'success' : 'default'} 
                                                size="small" 
                                            />
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title="Edit User">
                                                <IconButton
                                                    aria-label="edit"
                                                    color="primary"
                                                    onClick={() => handleEditUser(userItem._id)}
                                                    size="small"
                                                >
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title={userItem.isActive ? 'Deactivate User' : 'Activate User'}>
                                                <IconButton
                                                    aria-label={userItem.isActive ? 'deactivate' : 'activate'}
                                                    color={userItem.isActive ? 'warning' : 'success'}
                                                    onClick={() => handleToggleActive(userItem)}
                                                    size="small"
                                                >
                                                    {userItem.isActive ? <ToggleOffIcon fontSize="small" /> : <ToggleOnIcon fontSize="small" />}
                                                </IconButton>
                                            </Tooltip>
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

export default UsersPage;