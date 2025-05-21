const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const moment = require('moment'); // For date calculations

// @desc    Get dashboard statistics
// @route   GET /api/dashboard/stats
// @access  Private
exports.getDashboardStats = async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments({ 
            // Consider adding { isActive: true } if you have such a field
        });

        // Inventory Health
        const lowStockProducts = await Product.find({
            $or: [
                { quantityInStock: { $lte: 0 } }, // Item stock is zero or less
                { quantityInStock: { $lt: 5 } },  // Item stock is less than 5
                { $expr: { $and: [ { $ne: ["$reorderPoint", undefined] }, { $ne: ["$reorderPoint", null] }, { $lte: ["$quantityInStock", "$reorderPoint"] } ] } } // Item stock is at or below reorder point (if reorder point is set)
            ]
        })
        .sort({ quantityInStock: 1 }) // Show items with less stock first
        .limit(5); // Get a few examples for an actionable list
        const lowStockItemsCount = await Product.countDocuments({
            $or: [
                { quantityInStock: { $lte: 0 } },
                { quantityInStock: { $lt: 5 } },
                { $expr: { $and: [ { $ne: ["$reorderPoint", undefined] }, { $ne: ["$reorderPoint", null] }, { $lte: ["$quantityInStock", "$reorderPoint"] } ] } }            ]
        });

        const inventoryValueAggregation = await Product.aggregate([
            {
                $match: { quantityInStock: { $gt: 0 }, purchasePrice: { $gt: 0 } } // Only include items with stock and purchase price
            },
            {
                $group: {
                    _id: null,
                    totalValue: { $sum: { $multiply: ["$quantityInStock", "$purchasePrice"] } }
                }
            }
        ]);
        const totalInventoryValue = inventoryValueAggregation.length > 0 ? inventoryValueAggregation[0].totalValue : 0;

        // Sales & Invoicing
        const unpaidInvoicesCount = await Invoice.countDocuments({
            status: { $in: ['Unpaid', 'Overdue'] }
        });
        const unpaidInvoicesAmountAggregation = await Invoice.aggregate([
            { $match: { status: { $in: ['Unpaid', 'Overdue'] } } },
            { $group: { _id: null, totalAmount: { $sum: "$grandTotal" } } }
        ]);
        const unpaidInvoicesAmount = unpaidInvoicesAmountAggregation.length > 0 ? unpaidInvoicesAmountAggregation[0].totalAmount : 0;

        // const today = moment().startOf('day').toDate(); // No longer strictly needed for the modified overdue logic below
        const overdueInvoicesCount = await Invoice.countDocuments({
            status: /^Overdue$/i // Match 'Overdue' case-insensitively
        });
        const overdueInvoicesAmountAggregation = await Invoice.aggregate([
            // Match invoices specifically marked as 'Overdue' for amount calculation
            { $match: { status: /^Overdue$/i } }, // Match 'Overdue' case-insensitively
            { $group: { _id: null, totalAmount: { $sum: "$grandTotal" } } }
        ]);
        const overdueInvoicesAmount = overdueInvoicesAmountAggregation.length > 0 ? overdueInvoicesAmountAggregation[0].totalAmount : 0;
        const overdueInvoicesList = await Invoice.find({
            status: /^Overdue$/i // Match 'Overdue' case-insensitively
        }).populate('customer', 'name').sort({ dueDate: 1 }).limit(5);


        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();

        const salesThisMonthAggregation = await Invoice.aggregate([
            { 
                $match: { 
                    invoiceDate: { $gte: startOfMonth, $lte: endOfMonth },
                    status: { $ne: 'void' } // Consider all non-voided invoices for sales
                    // If you specifically want only 'Paid' sales, revert to: status: 'Paid'
                } 
            },
            { $group: { _id: null, totalSales: { $sum: "$grandTotal" } } }
        ]);
        const salesThisMonth = salesThisMonthAggregation.length > 0 ? salesThisMonthAggregation[0].totalSales : 0;

        // Purchasing
        const openPOStatuses = ['Received', 'Cancelled']; // Define for clarity
        const openPurchaseOrdersCount = await PurchaseOrder.countDocuments({
            status: { $nin: openPOStatuses } 
        });
        const openPurchaseOrdersAmountAggregation = await PurchaseOrder.aggregate([
            { $match: { status: { $nin: openPOStatuses } } },
            { $group: { _id: null, totalAmount: { $sum: "$grandTotal" } } }
        ]);
        const openPurchaseOrdersAmount = openPurchaseOrdersAmountAggregation.length > 0 ? openPurchaseOrdersAmountAggregation[0].totalAmount : 0;

        // Data for Charts
        const invoiceStatusCounts = await Invoice.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        const purchaseOrderStatusCounts = await PurchaseOrder.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: {
                // Overall
                totalProducts,
                // Inventory Health
                lowStockItemsCount,
                lowStockItemsList: lowStockProducts, // Send a few examples
                totalInventoryValue,
                // Sales & Invoicing
                unpaidInvoicesCount,
                unpaidInvoicesAmount,
                overdueInvoicesCount,
                overdueInvoicesAmount,
                overdueInvoicesList, // Send a few examples
                salesThisMonth,
                // Purchasing
                openPurchaseOrdersCount,
                openPurchaseOrdersAmount,
                // Chart Data
                invoiceStatusCounts,
                purchaseOrderStatusCounts, // Added purchase order status counts
            }
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error.message);
        res.status(500).json({ success: false, message: 'Server Error fetching dashboard statistics' });
    }
};