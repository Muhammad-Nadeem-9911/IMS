import axios from 'axios';

const API_URL = `${process.env.REACT_APP_API_BASE_URL}/dashboard`;

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

export const getDashboardStats = async () => {
    try {
        const res = await axiosAuth().get('/stats'); // Endpoint will be /api/dashboard/stats
        return res.data;
        // Expects {
        //   success: true,
        //   data: {
        //     totalProducts: N,
        //     lowStockItemsCount: N,
        //     lowStockItemsList: [...], // Array of product objects
        //     totalInventoryValue: N,
        //     unpaidInvoicesCount: N,
        //     unpaidInvoicesAmount: N,
        //     overdueInvoicesCount: N,
        //     overdueInvoicesAmount: N,
        //     overdueInvoicesList: [...], // Array of invoice objects (populated with customer name)
        //     salesThisMonth: N,
        //     openPurchaseOrdersCount: N,
        //     openPurchaseOrdersAmount: N,
        //     invoiceStatusCounts: [{_id: 'Status', count: N}], // Array of status counts
        //     purchaseOrderStatusCounts: [{_id: 'Status', count: N}], // Array of PO status counts
        //   }
        // }
    } catch (err) {
        const message = (err.response && err.response.data && err.response.data.message) || err.message || err.toString();
        throw new Error(message);
    }
};