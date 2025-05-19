import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, Box, Button, CircularProgress, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
// import VisibilityIcon from '@mui/icons-material/Visibility'; // Removed unused import
import { getJournalEntries } from '../services/journalEntryService';
import { useSnackbar } from '../contexts/SnackbarContext';
import { useAuthState } from '../contexts/AuthContext'; // Import useAuthState
import { format } from 'date-fns';

const GeneralJournalPage = () => {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0); // MUI TablePagination is 0-indexed
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalEntries, setTotalEntries] = useState(0);
    const { user } = useAuthState(); // Get user for role check

    const handleAddNewEntry = () => {
        navigate('/general-journal/new');
    };

    const fetchEntries = async (currentPage, currentRowsPerPage) => {
        setLoading(true);
        setError('');
        try {
            // API is 1-indexed for page, MUI TablePagination is 0-indexed
            const response = await getJournalEntries(currentPage + 1, currentRowsPerPage);
            if (response.success) {
                setEntries(response.data || []);
                setTotalEntries(response.pagination?.totalEntries || 0);
            } else {
                const errMsg = response.message || 'Failed to fetch journal entries.';
                setError(errMsg);
                showSnackbar(errMsg, 'error');
                setEntries([]);
                setTotalEntries(0);
            }
        } catch (err) {
            const errMsg = err.message || 'An error occurred while fetching journal entries.';
            setError(errMsg);
            showSnackbar(errMsg, 'error');
            setEntries([]);
            setTotalEntries(0);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries(page, rowsPerPage);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, rowsPerPage]); // Refetch when page or rowsPerPage changes

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0); // Reset to first page
    };

    // Helper to display account entries concisely
    const renderEntryLines = (entryLines, type) => {
        if (!entryLines || entryLines.length === 0) return '-';
        return entryLines
            .filter(line => (type === 'debit' ? line.debit > 0 : line.credit > 0))
            .map(line => (
                <Box key={line.account?._id || Math.random()} sx={{ mb: 0.5 }}>
                    <Typography variant="caption" display="block">
                        {line.account?.accountCode} - {line.account?.accountName}: ₹{type === 'debit' ? line.debit.toFixed(2) : line.credit.toFixed(2)}
                    </Typography>
                </Box>
            ));
    };

    // const handleViewDetails = (id) => {
    //     // Future: Navigate to a detailed view page for a single journal entry
    //     showSnackbar(`View details for entry ID: ${id} (Not implemented yet)`, 'info');
    // };

    return (
        <Container component="main" maxWidth="lg" sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography component="h1" variant="h4" gutterBottom sx={{ mb: 0 }}>
                        General Journal
                    </Typography>
                    {user && user.role === 'admin' && (
                    <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddNewEntry}>
                        Add New Entry
                    </Button>
                    )}
                </Box>

                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                {error && !loading && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                {!loading && !error && entries.length === 0 && (
                    <Typography variant="body1" sx={{ my: 2, textAlign: 'center' }}>
                        No journal entries found. Start by adding a new entry.
                    </Typography>
                )}

                {!loading && !error && entries.length > 0 && (
                    <>
                        <TableContainer component={Paper} sx={{ mt: 2,  maxHeight: '60vh', overflowY: 'auto' }}>
                            <Table stickyHeader sx={{ minWidth: 900 }} aria-label="journal entries table" >
                                <TableHead sx={{ backgroundColor: (theme) => theme.palette.grey[100] }}>
                                    <TableRow>
                                        <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Date</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Description</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '10%' }}>Reference #</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Debited Accounts</TableCell>
                                        <TableCell sx={{ fontWeight: 'bold', width: '25%' }}>Credited Accounts</TableCell>
                                        {/* <TableCell sx={{ fontWeight: 'bold', width: '5%' }} align="center">Actions</TableCell> */}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {entries.map((entry) => (
                                        <TableRow
                                            key={entry._id}
                                            hover
                                            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                                        >
                                            <TableCell>{format(new Date(entry.date), 'dd MMM yyyy')}</TableCell>
                                            <TableCell>{entry.description}</TableCell>
                                            <TableCell>{entry.referenceNumber || '-'}</TableCell>
                                            <TableCell>{renderEntryLines(entry.entries, 'debit')}</TableCell>
                                            <TableCell>{renderEntryLines(entry.entries, 'credit')}</TableCell>
                                            {/* <TableCell align="center">
                                                <Tooltip title="View Details">
                                                    <IconButton onClick={() => handleViewDetails(entry._id)} size="small">
                                                        <VisibilityIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell> */}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <TablePagination
                            rowsPerPageOptions={[5, 10, 25]}
                            component="div"
                            count={totalEntries}
                            rowsPerPage={rowsPerPage}
                            page={page}
                            onPageChange={handleChangePage}
                            onRowsPerPageChange={handleChangeRowsPerPage}
                        />
                    </>
                )}
            </Paper>
        </Container>
    );
};

export default GeneralJournalPage;