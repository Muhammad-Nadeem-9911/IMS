import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/reports`;

// Helper to get the auth token from localStorage
const getAuthToken = () => localStorage.getItem('token');

// Helper to create an Axios instance with Authorization header
const axiosAuth = () => {
    const token = getAuthToken();
    return axios.create({
        baseURL: API_URL,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    });
};

export const getSalesSummaryReport = async (params = {}) => {
    try {
        const res = await axiosAuth().get('/sales-summary', { params }); // Pass date range params if any
        return res.data; // { success: true, data: { totalInvoiced, totalPaid, balanceDue } }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getTrialBalanceReport = async (params = {}) => {
    try {
        const res = await axiosAuth().get('/trial-balance', { params }); // Pass date range params if any in future
        return res.data; // { success: true, data: { accounts: [], grandTotalDebit, grandTotalCredit } }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getIncomeStatementReport = async (startDate, endDate) => {
    try {
        const params = { startDate, endDate };
        const res = await axiosAuth().get('/income-statement', { params });
        // Expected: { success: true, data: { startDate, endDate, revenues: [], totalRevenue, expenses: [], totalExpenses, netIncome } }
        return res.data;
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

export const getBalanceSheetReport = async (asOfDate) => {
    try {
        const params = { asOfDate };
        const res = await axiosAuth().get('/balance-sheet', { params });
        // Expected: { success: true, data: { asOfDate, assets: [], totalAssets, liabilities: [], totalLiabilities, equity: [], totalEquity } }
        return res.data;
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

/**
 * Fetches a comprehensive transaction report based on filters.
 * @param {object} filters - Object containing filter parameters.
 * e.g., { startDate, endDate, customerId, transactionType, paymentMethod }
 * @returns {Promise<object>} The API response.
 */
export const getTransactionsReport = async (filters = {}) => {
    try {
        // Convert filters object to query string params
        const res = await axiosAuth().get('/transactions', { params: filters });
        return res.data; // { success: true, count: N, data: [...] }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

/**
 * Exports transaction report to CSV.
 * @param {object} filters - Object containing filter parameters.
 * @returns {Promise<Blob>} The CSV data as a Blob.
 */
export const exportTransactionsToCsv = async (filters = {}) => {
    try {
        const queryParams = { ...filters, exportFormat: 'csv' };
        // Remove pagination params for export, as we want all data
        delete queryParams.page;
        delete queryParams.limit;

        const res = await axiosAuth().get('/transactions', {
            params: queryParams,
            responseType: 'blob', // Important for file download
        });
        return res.data; // This will be a Blob
    } catch (err) {
        // Try to parse error message if the response was a blob containing JSON error
        // This can happen if the backend sends a JSON error instead of CSV for some reason (e.g., auth failure)
        const errorText = err.response && err.response.data instanceof Blob ? await err.response.data.text() : null;
        const message = errorText ? (JSON.parse(errorText).message || 'Failed to export CSV.') : ((err.response && err.response.data && err.response.data.message) || err.message || 'Failed to export CSV.');
        throw new Error(message);
    }
};

/**
 * Exports transaction report to PDF.
 * @param {object} filters - Object containing filter parameters.
 * @returns {Promise<Blob>} The PDF data as a Blob.
 */
export const exportTransactionsToPdf = async (filters = {}) => {
    try {
        const queryParams = { ...filters, exportFormat: 'pdf' };
        delete queryParams.page;
        delete queryParams.limit;
        const res = await axiosAuth().get('/transactions', { params: queryParams, responseType: 'blob' });
        return res.data;
    } catch (err) {
        const errorText = err.response && err.response.data instanceof Blob ? await err.response.data.text() : null;
        const message = errorText ? (JSON.parse(errorText).message || 'Failed to export PDF.') : ((err.response && err.response.data && err.response.data.message) || err.message || 'Failed to export PDF.');
        throw new Error(message);
    }
};


/**
 * Fetches a purchase order report based on filters.
 * @param {object} filters - Object containing filter parameters.
 * e.g., { startDate, endDate, supplierId, status }
 * @returns {Promise<object>} The API response.
 */
export const getPurchaseOrdersReport = async (filters = {}) => {
    try {
        const res = await axiosAuth().get('/purchase-orders', { params: filters });
        return res.data;
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};

/**
 * Exports purchase order report to PDF.
 * @param {object} filters - Object containing filter parameters.
 * @returns {Promise<Blob>} The PDF data as a Blob.
 */
export const exportPurchaseOrdersToPdf = async (filters = {}) => {
    try {
        const queryParams = { ...filters, exportFormat: 'pdf' };
        delete queryParams.page;
        delete queryParams.limit;
        const res = await axiosAuth().get('/purchase-orders', { params: queryParams, responseType: 'blob' });
        return res.data;
    } catch (err) {
        const errorText = err.response && err.response.data instanceof Blob ? await err.response.data.text() : null;
        const message = errorText ? (JSON.parse(errorText).message || 'Failed to export PO PDF.') : ((err.response && err.response.data && err.response.data.message) || err.message || 'Failed to export PO PDF.');
        throw new Error(message);
    }
};

/**
 * Exports purchase order report to CSV.
 * @param {object} filters - Object containing filter parameters.
 * @returns {Promise<Blob>} The CSV data as a Blob.
 */
export const exportPurchaseOrdersToCsv = async (filters = {}) => {
    try {
        const queryParams = { ...filters, exportFormat: 'csv' };
        delete queryParams.page;
        delete queryParams.limit;
        const res = await axiosAuth().get('/purchase-orders', { params: queryParams, responseType: 'blob' });
        return res.data;
    } catch (err) {
        const errorText = err.response && err.response.data instanceof Blob ? await err.response.data.text() : null;
        const message = errorText ? (JSON.parse(errorText).message || 'Failed to export PO CSV.') : ((err.response && err.response.data && err.response.data.message) || err.message || 'Failed to export PO CSV.');
        throw new Error(message);
    }
};