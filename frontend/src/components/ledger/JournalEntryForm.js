import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Container, Typography, Paper, Box, Button, TextField, Grid, CircularProgress, Alert, MenuItem, IconButton,
    Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { getAccounts } from '../../services/accountService';
import { createJournalEntry } from '../../services/journalEntryService';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { format } from 'date-fns';

const JournalEntryForm = () => {
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();
    const [accounts, setAccounts] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const [entryDate, setEntryDate] = useState(new Date());
    const [description, setDescription] = useState('');
    const [referenceNumber, setReferenceNumber] = useState('');
    const [entryLines, setEntryLines] = useState([
        { account: '', debit: '', credit: '' },
        { account: '', debit: '', credit: '' }, // Start with two lines
    ]);

    useEffect(() => {
        const fetchAccountsData = async () => {
            try {
                const response = await getAccounts();
                if (response.success && Array.isArray(response.data)) {
                    // Filter for active accounts only
                    setAccounts(response.data.filter(acc => acc.isActive));
                } else {
                    showSnackbar(response.message || 'Failed to fetch accounts.', 'error');
                }
            } catch (error) {
                showSnackbar(error.message || 'Error fetching accounts.', 'error');
            } finally {
                setLoadingAccounts(false);
            }
        };
        fetchAccountsData();
    }, [showSnackbar]);

    const handleAddLine = () => {
        setEntryLines([...entryLines, { account: '', debit: '', credit: '' }]);
    };

    const handleRemoveLine = (index) => {
        const newLines = entryLines.filter((_, i) => i !== index);
        setEntryLines(newLines);
    };

    const handleLineChange = (index, field, value) => {
        const newLines = [...entryLines];
        newLines[index][field] = value;

        // If debit is entered, clear credit, and vice-versa for that line
        if (field === 'debit' && parseFloat(value) > 0) {
            newLines[index]['credit'] = '';
        } else if (field === 'credit' && parseFloat(value) > 0) {
            newLines[index]['debit'] = '';
        }
        setEntryLines(newLines);
    };

    const calculateTotals = () => {
        let totalDebit = 0;
        let totalCredit = 0;
        entryLines.forEach(line => {
            totalDebit += parseFloat(line.debit) || 0;
            totalCredit += parseFloat(line.credit) || 0;
        });
        return { totalDebit: totalDebit.toFixed(2), totalCredit: totalCredit.toFixed(2) };
    };

    const { totalDebit, totalCredit } = calculateTotals();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError('');
        setIsSubmitting(true);

        // Basic client-side validation (more can be added)
        if (!description.trim()) {
            setFormError('Description is required.');
            setIsSubmitting(false);
            return;
        }
        if (entryLines.length < 2) {
            setFormError('At least two entry lines are required.');
            setIsSubmitting(false);
            return;
        }
        if (parseFloat(totalDebit) !== parseFloat(totalCredit)) {
            setFormError('Total debits must equal total credits.');
            setIsSubmitting(false);
            return;
        }
        if (parseFloat(totalDebit) === 0) {
            setFormError('Total debits and credits cannot be zero.');
            setIsSubmitting(false);
            return;
        }

        const formattedEntryLines = entryLines
            .filter(line => line.account && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0))
            .map(line => ({
                account: line.account,
                debit: parseFloat(line.debit) || 0,
                credit: parseFloat(line.credit) || 0,
            }));

        if (formattedEntryLines.length < 2) {
            setFormError('Valid entries require at least two lines with accounts and amounts.');
            setIsSubmitting(false);
            return;
        }

        const entryData = {
            date: format(entryDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx"), // ISO 8601 format
            description,
            referenceNumber,
            entries: formattedEntryLines,
        };

        try {
            const response = await createJournalEntry(entryData);
            if (response.success) {
                showSnackbar(response.message || 'Journal entry created successfully!', 'success');
                navigate('/general-journal');
            } else {
                setFormError(response.message || 'Failed to create journal entry.');
                showSnackbar(response.message || 'Failed to create journal entry.', 'error');
            }
        } catch (err) {
            const errMsg = err.message || 'An error occurred while creating the journal entry.';
            setFormError(errMsg);
            showSnackbar(errMsg, 'error');
            // Log the full error for more details if needed
            console.error("Submission error details:", err.response?.data || err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxWidth={false} sx={{ width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
            <Paper elevation={0} sx={{ p: 3, width: '100%', flexGrow: 1, display: 'flex', flexDirection: 'column', borderRadius: 2 }}>
                <Typography component="h1" variant="h5" gutterBottom sx={{ mb: 2.5 }}>
                    Create New Journal Entry
                </Typography>
                {formError && <Alert severity="error" sx={{ mb: 2 }}>{formError}</Alert>}
                <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    <Grid container spacing={3} sx={{ flexGrow: 1, width: '100%' }}>

                        {/* Section 1: Journal Entry Details */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%' }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Journal Entry Details</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            {/* Parent Box for Date, Description, Reference # fields */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, width: '100%' }}>
                                <Box className="form-field-date" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                                        <DatePicker
                                            label="Date"
                                            value={entryDate}
                                            onChange={(newValue) => setEntryDate(newValue)}
                                            slotProps={{ textField: { fullWidth: true, required: true, variant: 'outlined', size: 'small' } }}
                                        />
                                    </LocalizationProvider>
                                </Box>
                                <Box className="form-field-description" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                    <TextField
                                        label="Description"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        fullWidth
                                        required
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                                <Box className="form-field-referenceNumber" sx={{ flex: 1, minWidth: { xs: '100%', sm: 'calc(33.33% - 16px)' } }}>
                                    <TextField
                                        label="Reference #"
                                        value={referenceNumber}
                                        onChange={(e) => setReferenceNumber(e.target.value)}
                                        fullWidth
                                        variant="outlined"
                                        size="small"
                                    />
                                </Box>
                            </Box>
                        </Grid>
                        {/* Section 2: Entries */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Entries</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            {entryLines.map((line, index) => (
                                // Replaced Grid container with Box using Flexbox for each entry line
                                <Box key={index} className="form-entry-line" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, width: '100%', mb: 1.5, alignItems: 'center' }}>
                                    <Box className="form-field-entry-account" sx={{ flex: { xs: '100%', sm: 5 }, minWidth: 0 }}> {/* Account takes ~5/12 width on sm+ */}
                                        <TextField
                                            select
                                            label="Account"
                                            value={line.account}
                                            onChange={(e) => handleLineChange(index, 'account', e.target.value)}
                                            fullWidth
                                            required
                                            disabled={loadingAccounts}
                                            variant="outlined"
                                            size="small"
                                        >
                                            <MenuItem value=""><em>Select Account</em></MenuItem>
                                            {accounts.map((acc) => (
                                                <MenuItem key={acc._id} value={acc._id}>
                                                    {acc.accountCode} - {acc.accountName} ({acc.accountType})
                                                </MenuItem>
                                            ))}
                                        </TextField>
                                    </Box>
                                    <Box className="form-field-entry-debit" sx={{ flex: { xs: '100%', sm: 3 }, minWidth: 0 }}> {/* Debit takes ~3/12 width on sm+ */}
                                        <TextField
                                            label="Debit"
                                            type="number"
                                            value={line.debit}
                                            onChange={(e) => handleLineChange(index, 'debit', e.target.value)}
                                            fullWidth
                                            inputProps={{ min: "0", step: "0.01" }}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Box>
                                    <Box className="form-field-entry-credit" sx={{ flex: { xs: '100%', sm: 3 }, minWidth: 0 }}> {/* Credit takes ~3/12 width on sm+ */}
                                        <TextField
                                            label="Credit"
                                            type="number"
                                            value={line.credit}
                                            onChange={(e) => handleLineChange(index, 'credit', e.target.value)}
                                            fullWidth
                                            inputProps={{ min: "0", step: "0.01" }}
                                            variant="outlined"
                                            size="small"
                                        />
                                    </Box>
                                    <Box sx={{ flex: { xs: '100%', sm: 1 }, minWidth: 0, textAlign: 'center' }}> {/* Remove Button takes ~1/12 width on sm+ */}
                                        {entryLines.length > 2 && (
                                            <IconButton onClick={() => handleRemoveLine(index)} color="error" aria-label="remove line" size="small">
                                                <RemoveCircleOutlineIcon />
                                            </IconButton>
                                        )}
                                    </Box>
                                </Box>
                            ))}
                            <Button startIcon={<AddCircleOutlineIcon />} onClick={handleAddLine} sx={{ mt: 1 }} variant="outlined" size="medium">
                                Add Line
                            </Button>
                        </Grid>
                        {/* Section 3: Summary */}
                        <Grid item xs={12} className="form-section-title" sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>Summary</Typography>
                            <Divider sx={{ mb: 2 }} />
                        </Grid>
                        <Grid item xs={12} className="form-section-fields" sx={{ width: '100%' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderTop: '1px solid', borderColor: 'divider' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Totals:</Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Debit: ₹{totalDebit}</Typography>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Credit: ₹{totalCredit}</Typography>
                            </Box>
                        </Grid>
                        {/* Action Buttons */}
                        <Grid item xs={12} sx={{ mt: 'auto', pt: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                                <Button onClick={() => navigate('/general-journal')} disabled={isSubmitting} variant="outlined" size="medium">
                                    Cancel
                                </Button>
                                <Button type="submit" variant="contained" disabled={isSubmitting || loadingAccounts} size="medium">
                                    {isSubmitting ? <CircularProgress size={24} /> : 'Create Entry'}
                                </Button>
                            </Box>
                        </Grid>
                    </Grid> {/* This is the correct closing tag for the main Grid container */}
                </Box>
            </Paper>
        </Container>
    );
};

export default JournalEntryForm;