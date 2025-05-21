const Invoice = require('../models/Invoice');
const Payment = require('../models/Payment');
const JournalEntry = require('../models/JournalEntry'); // Added
const PurchaseOrder = require('../models/PurchaseOrder'); // Added
const ChartOfAccount = require('../models/ChartOfAccount'); // Added
const { Parser } = require('json2csv'); // For CSV export
const CompanyProfile = require('../models/CompanyProfile'); // Added for PDF company details
const PdfPrinter = require('pdfmake'); // For PDF export
const path = require('path'); // For PDF fonts
const asyncHandler = require('express-async-handler');
// @desc    Get Sales Summary Report
// @route   GET /api/reports/sales-summary
// @access  Private (e.g., Admin/Manager)
exports.getSalesSummary = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query; // For date range filtering

    let dateFilter = {};
    if (startDate && endDate) {
        dateFilter.invoiceDate = { // Assuming you want to filter invoices by their creation/issue date
            $gte: new Date(startDate),
            $lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) // Include the whole end day
        };
    } else if (startDate) {
        dateFilter.invoiceDate = { $gte: new Date(startDate) };
    } else if (endDate) {
        dateFilter.invoiceDate = { $lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) };
    }

    // Calculate number of non-void invoices
    const numberOfInvoicesResult = await Invoice.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'void' } } },
        { $count: 'count' }
    ]);
    const numberOfInvoices = numberOfInvoicesResult.length > 0 ? numberOfInvoicesResult[0].count : 0;

    // Calculate total invoiced amount (sum of grandTotal for non-void invoices)
    const totalInvoicedResult = await Invoice.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'void' } } }, // Exclude void invoices
        { $group: { _id: null, totalInvoiced: { $sum: '$grandTotal' } } }
    ]);
    
    const totalInvoiced = totalInvoicedResult.length > 0 ? totalInvoicedResult[0].totalInvoiced : 0;

    // Calculate total paid amount (sum of totalPaid for non-void invoices)
    // This relies on invoice.totalPaid being accurately updated.
    // Alternatively, sum all payments within the date range linked to non-void invoices.
    const totalPaidResult = await Invoice.aggregate([
        { $match: { ...dateFilter, status: { $ne: 'void' } } },
        { $group: { _id: null, totalPaid: { $sum: '$totalPaid' } } }
    ]);
    const totalPaid = totalPaidResult.length > 0 ? totalPaidResult[0].totalPaid : 0;

    // More accurate way to sum payments if invoice.totalPaid might not be the sole source of truth
    // or if payments need to be filtered by paymentDate:
    // let paymentDateFilter = {};
    // if (startDate && endDate) {
    //     paymentDateFilter.paymentDate = { $gte: new Date(startDate), $lte: new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)) };
    // }
    // const totalPaidFromPayments = await Payment.aggregate([
    //     { $match: paymentDateFilter }, // Filter payments by their date
    //     { $group: { _id: null, totalAmount: { $sum: '$amountPaid' } } }
    // ]);
    // const totalPaid = totalPaidFromPayments.length > 0 ? totalPaidFromPayments[0].totalAmount : 0;


    const balanceDue = totalInvoiced - totalPaid;
    const averageInvoiceValue = numberOfInvoices > 0 ? totalInvoiced / numberOfInvoices : 0;

    res.status(200).json({
        success: true,
        data: {
            totalInvoiced,
            totalPaid,
            balanceDue,
            numberOfInvoices,
            averageInvoiceValue
        }
    });
});

// @desc    Get Trial Balance Report
// @route   GET /api/reports/trial-balance
// @access  Private (e.g., Admin/Manager)
exports.getTrialBalance = asyncHandler(async (req, res, next) => {
    // Optional: Add date range filtering for the trial balance if needed in the future
    // const { startDate, endDate } = req.query;
    // let dateFilter = {};
    // if (startDate && endDate) { ... }

    const accountBalances = await JournalEntry.aggregate([
        // { $match: dateFilter }, // Apply date filter if implemented
        {
            $unwind: '$entries' // Deconstruct the entries array
        },
        {
            $group: {
                _id: '$entries.account', // Group by account ID
                totalDebit: { $sum: '$entries.debit' },
                totalCredit: { $sum: '$entries.credit' }
            }
        },
        {
            $lookup: {
                from: 'chartofaccounts', // The collection name for ChartOfAccount model
                localField: '_id',
                foreignField: '_id',
                as: 'accountDetails'
            }
        },
        {
            $unwind: '$accountDetails' // Deconstruct the accountDetails array
        },
        {
            $project: {
                _id: 0, // Exclude the default _id from this stage
                accountId: '$_id',
                accountCode: '$accountDetails.accountCode',
                accountName: '$accountDetails.accountName',
                accountType: '$accountDetails.accountType', // Good to have for context
                totalDebit: 1,
                totalCredit: 1,
                debitBalance: {
                    $cond: [{ $gt: ['$totalDebit', '$totalCredit'] }, { $subtract: ['$totalDebit', '$totalCredit'] }, 0]
                },
                creditBalance: {
                    $cond: [{ $gt: ['$totalCredit', '$totalDebit'] }, { $subtract: ['$totalCredit', '$totalDebit'] }, 0]
                }
            }
        },
        {
            $sort: { 'accountCode': 1 } // Sort by account code
        }
    ]);

    // Calculate grand totals
    let grandTotalDebit = 0;
    let grandTotalCredit = 0;
    accountBalances.forEach(acc => {
        grandTotalDebit += acc.debitBalance;
        grandTotalCredit += acc.creditBalance;
    });

    // Round totals to 2 decimal places to avoid floating point issues in display
    grandTotalDebit = Math.round(grandTotalDebit * 100) / 100;
    grandTotalCredit = Math.round(grandTotalCredit * 100) / 100;

    res.status(200).json({
        success: true,
        data: {
            accounts: accountBalances,
            grandTotalDebit,
            grandTotalCredit
        }
    });
});

// @desc    Get Income Statement Report
// @route   GET /api/reports/income-statement
// @access  Private (e.g., Admin/Manager)
exports.getIncomeStatement = asyncHandler(async (req, res, next) => {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
        res.status(400);
        throw new Error('Please provide both start date and end date for the report.');
    }

    const parsedStartDate = new Date(startDate);
    // Add 1 day to endDate to include the entire day, then set to beginning of that next day
    const parsedEndDate = new Date(endDate);
    parsedEndDate.setDate(parsedEndDate.getDate() + 1);

    const dateFilter = {
        date: {
            $gte: parsedStartDate,
            $lt: parsedEndDate // Use $lt to exclude the start of the next day
        }
    };

    // Aggregate revenues
    const revenueAccounts = await JournalEntry.aggregate([
        { $match: dateFilter },
        { $unwind: '$entries' },
        {
            $lookup: {
                from: 'chartofaccounts',
                localField: 'entries.account',
                foreignField: '_id',
                as: 'accountDetail'
            }
        },
        { $unwind: '$accountDetail' },
        { $match: { 'accountDetail.accountType': 'Revenue' } },
        {
            $group: {
                _id: '$entries.account',
                accountName: { $first: '$accountDetail.accountName' },
                accountCode: { $first: '$accountDetail.accountCode' },
                // For revenue, credits increase the balance, debits decrease it.
                // So, revenue amount = sum of credits - sum of debits
                totalAmount: { $sum: { $subtract: ['$entries.credit', '$entries.debit'] } }
            }
        },
        { $sort: { accountCode: 1 } }
    ]);

    // Aggregate expenses
    const expenseAccounts = await JournalEntry.aggregate([
        { $match: dateFilter },
        { $unwind: '$entries' },
        {
            $lookup: {
                from: 'chartofaccounts',
                localField: 'entries.account',
                foreignField: '_id',
                as: 'accountDetail'
            }
        },
        { $unwind: '$accountDetail' },
        { $match: { 'accountDetail.accountType': 'Expense' } },
        {
            $group: {
                _id: '$entries.account',
                accountName: { $first: '$accountDetail.accountName' },
                accountCode: { $first: '$accountDetail.accountCode' },
                // For expenses, debits increase the balance, credits decrease it.
                // So, expense amount = sum of debits - sum of credits
                totalAmount: { $sum: { $subtract: ['$entries.debit', '$entries.credit'] } }
            }
        },
        { $sort: { accountCode: 1 } }
    ]);

    const totalRevenue = revenueAccounts.reduce((sum, acc) => sum + acc.totalAmount, 0);
    const totalExpenses = expenseAccounts.reduce((sum, acc) => sum + acc.totalAmount, 0);
    const netIncome = totalRevenue - totalExpenses;

    res.status(200).json({
        success: true,
        data: {
            startDate,
            endDate,
            revenues: revenueAccounts,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            expenses: expenseAccounts,
            totalExpenses: Math.round(totalExpenses * 100) / 100,
            netIncome: Math.round(netIncome * 100) / 100,
        }
    });
});

// @desc    Get Balance Sheet Report
// @route   GET /api/reports/balance-sheet
// @access  Private (e.g., Admin/Manager)
exports.getBalanceSheet = asyncHandler(async (req, res, next) => {
    const { asOfDate } = req.query;

    if (!asOfDate) {
        res.status(400);
        throw new Error('Please provide an "as of date" for the report.');
    }

    const parsedAsOfDate = new Date(asOfDate);
    // To include all transactions on the asOfDate, we set the time to the end of that day.
    parsedAsOfDate.setHours(23, 59, 59, 999);

    const dateFilter = { date: { $lte: parsedAsOfDate } };

    // 1. Calculate Net Income up to asOfDate (for Retained Earnings/Current Period Net Income)
    const revenueAggregation = await JournalEntry.aggregate([
        { $match: dateFilter },
        { $unwind: '$entries' },
        { $lookup: { from: 'chartofaccounts', localField: 'entries.account', foreignField: '_id', as: 'accountDetail' } },
        { $unwind: '$accountDetail' },
        { $match: { 'accountDetail.accountType': 'Revenue' } },
        { $group: { _id: null, totalRevenue: { $sum: { $subtract: ['$entries.credit', '$entries.debit'] } } } }
    ]);
    const totalRevenue = revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;

    const expenseAggregation = await JournalEntry.aggregate([
        { $match: dateFilter },
        { $unwind: '$entries' },
        { $lookup: { from: 'chartofaccounts', localField: 'entries.account', foreignField: '_id', as: 'accountDetail' } },
        { $unwind: '$accountDetail' },
        { $match: { 'accountDetail.accountType': 'Expense' } },
        { $group: { _id: null, totalExpenses: { $sum: { $subtract: ['$entries.debit', '$entries.credit'] } } } }
    ]);
    const totalExpenses = expenseAggregation.length > 0 ? expenseAggregation[0].totalExpenses : 0;
    const currentPeriodNetIncome = totalRevenue - totalExpenses;

    // 2. Calculate balances for Asset, Liability, and Equity accounts
    const accountBalances = await JournalEntry.aggregate([
        { $match: dateFilter },
        { $unwind: '$entries' },
        {
            $group: {
                _id: '$entries.account',
                totalDebit: { $sum: '$entries.debit' },
                totalCredit: { $sum: '$entries.credit' }
            }
        },
        {
            $lookup: {
                from: 'chartofaccounts',
                localField: '_id',
                foreignField: '_id',
                as: 'accountDetails'
            }
        },
        { $unwind: '$accountDetails' },
        {
            $match: {
                'accountDetails.accountType': { $in: ['Asset', 'Liability', 'Equity'] }
            }
        },
        {
            $project: {
                _id: 0,
                accountId: '$_id',
                accountCode: '$accountDetails.accountCode',
                accountName: '$accountDetails.accountName',
                accountType: '$accountDetails.accountType',
                balance: {
                    $cond: {
                        if: { $eq: ['$accountDetails.accountType', 'Asset'] },
                        then: { $subtract: ['$totalDebit', '$totalCredit'] },
                        else: { $subtract: ['$totalCredit', '$totalDebit'] } // For Liability & Equity
                    }
                }
            }
        },
        { $sort: { 'accountDetails.accountType': 1, accountCode: 1 } }
    ]);

    const assets = [];
    const liabilities = [];
    const equity = [];
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquityBase = 0; // Sum of explicit equity accounts

    accountBalances.forEach(acc => {
        if (acc.balance === 0 && acc.accountType !== 'Equity') return; // Optionally skip zero-balance non-equity accounts

        const accountData = {
            accountCode: acc.accountCode,
            accountName: acc.accountName,
            balance: Math.round(acc.balance * 100) / 100
        };

        if (acc.accountType === 'Asset') {
            assets.push(accountData);
            totalAssets += acc.balance;
        } else if (acc.accountType === 'Liability') {
            liabilities.push(accountData);
            totalLiabilities += acc.balance;
        } else if (acc.accountType === 'Equity') {
            equity.push(accountData);
            totalEquityBase += acc.balance;
        }
    });

    // Add current period net income to equity
    equity.push({
        accountCode: 'NI001', // Placeholder code for Net Income
        accountName: 'Net Income (Current Period)',
        balance: Math.round(currentPeriodNetIncome * 100) / 100
    });
    const totalEquity = totalEquityBase + currentPeriodNetIncome;

    res.status(200).json({
        success: true,
        data: {
            asOfDate: new Date(asOfDate).toISOString().split('T')[0], // Format for display
            assets,
            totalAssets: Math.round(totalAssets * 100) / 100,
            liabilities,
            totalLiabilities: Math.round(totalLiabilities * 100) / 100,
            equity,
            totalEquity: Math.round(totalEquity * 100) / 100,
        }
    });
});

// --- PDF Generation Helper ---
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', 'fonts', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', 'fonts', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', 'fonts', 'Roboto-MediumItalic.ttf')
    }
};
const printer = new PdfPrinter(fonts);

// --- Enhanced PDF Generation Helper ---
async function generateStyledReportPdf(
    reportTitle,
    reportSubtitle, // e.g., filter criteria
    tableHeaders,    // Array of strings
    tableBodyData,   // Array of arrays for table rows
    companyProfile,  // CompanyProfile object
    logoImageBase64, // This will be companyProfile.logoUrl, but keeping for signature consistency if called elsewhere, or can be removed
    columnAlignments = [], // Optional: array of 'left', 'right', 'center' for each column
    columnWidthsParam = null, // Optional: array of column widths e.g. ['auto', '*', '20%']
    summaryDetails = [] // Optional: array of objects for summary, e.g., [{ label: 'Total:', value: '100.00', style: 'summaryTotal' }]
) {
    const actualColumnWidths = columnWidthsParam || tableHeaders.map(() => '*');
    // For A4 page (approx 595pt wide) with 40pt L/R margins, content width is ~515pt.
    // Ensure sum of fixed column widths + '*' distribution makes sense for your content.

    const documentDefinition = {
        pageSize: 'A4',
        // Margins: [left, top, right, bottom]
        // Adjusted top margin to accommodate the header stack.
        // Max height of logo (70) or company details stack. Let's estimate company details stack height:
        // Name (20) + Address (15) + Contact (15) + Website (15) = ~65. So, logo height (70) is dominant.
        // Header's own top margin (30) + logo height (70) + line (5) + spacing (~20) = ~125
        pageMargins: [40, 130, 40, 60],

        header: function(currentPage, pageCount, pageSize) {
            const companyDetailsStack = [
                { text: companyProfile?.companyName || 'Your Company Name', style: 'companyNameHeader', alignment: 'left', marginBottom: 3 },
                { text: companyProfile?.address || 'Company Address, City, Country', style: 'companyDetailsText', alignment: 'left', marginBottom: 3 },
                { text: `Phone: ${companyProfile?.phone || 'N/A'} | Email: ${companyProfile?.email || 'N/A'}`, style: 'companyDetailsText', alignment: 'left', marginBottom: 3 }
            ];

            if (companyProfile?.website) {
                companyDetailsStack.push({
                    text: companyProfile.website,
                    style: 'companyDetailsText',
                    alignment: 'left',
                    link: companyProfile.website, // Make website clickable
                    color: 'blue', decoration: 'underline', // Style for link
                    marginBottom: 0 // No margin if it's the last item in this stack
                });
            }

            const headerColumns = [
                // Column 1: Company Details (takes up available space)
                {
                    stack: companyDetailsStack,
                    width: '*' // Takes up remaining space
                }
            ];

            if (companyProfile?.logoUrl) { // Use logoUrl from the passed companyProfile object
                // Column 2: Logo (fixed width, aligned right)
                headerColumns.push({ image: companyProfile.logoUrl, width: 120, fit: [120, 70], alignment: 'right' });
            } else {
                // If no logo, add an empty object to maintain column structure or a placeholder text
                headerColumns.push({ text: '', width: 120 }); // Placeholder for the right column
            }

            return [
                {
                    columns: headerColumns,
                    margin: [40, 30, 40, 10] // Margins for the header block itself [L, T, R, B] - Top margin 30
                },
                // Horizontal line below header columns
                { canvas: [{ type: 'line', x1: 40, y1: 5, x2: pageSize.width - 40, y2: 5, lineWidth: 0.5, lineColor: '#AEAEAE' }], margin: [0, 0, 0, 10] }
            ];
        },

        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: `Report Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, alignment: 'left', style: 'footerText' },
                    { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', style: 'footerText' }
                ],
                margin: [40, 10, 40, 20]
            };
        },

        content: [
            { text: reportTitle, style: 'reportMainTitle', alignment: 'center', margin: [0, 10, 0, 5] }, // Added some top margin for title
            { text: reportSubtitle, style: 'reportSubTitle', alignment: 'center', margin: [0, 0, 0, 20] },
            {
                style: 'dataTable',
                table: {
                    headerRows: 1,
                    widths: actualColumnWidths, // Apply column widths
                    body: [
                        tableHeaders.map(header => ({ text: header, style: 'tableHeaderCell' })),
                        ...tableBodyData.map(row =>
                            row.map((cell, index) => ({
                                text: cell.text !== undefined ? cell.text : (cell !== null && cell !== undefined ? cell.toString() : ''),
                                style: cell.style || 'tableCell',
                                alignment: cell.alignment || columnAlignments[index] || (typeof cell === 'number' ? 'right' : 'left')
                            }))
                        )
                    ]
                },
                layout: {
                    fillColor: function (rowIndex, node, columnIndex) {
                        if (rowIndex === 0) return '#34495E'; // Header row color
                        return (rowIndex % 2 === 0) ? '#ECF0F1' : null; // Zebra striping for data rows
                    },
                    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0.25,
                    vLineWidth: (i, node) => 0.25,
                    hLineColor: (i, node) => '#BDC3C7',
                    vLineColor: (i, node) => '#BDC3C7',
                    paddingLeft: (i, node) => (i === 0 ? 8 : 5), // More padding for header
                    paddingRight: (i, node) => (i === 0 ? 8 : 5),
                    paddingTop: (i, node) => (i === 0 ? 5 : 3), // Comma is correct here
                    paddingBottom: (i, node) => (i === 0 ? 5 : 3)  // Removed trailing comma as it's the last property
                }
            }
        ],
        styles: {
            companyNameHeader: { fontSize: 16, bold: true, color: '#2C3E50' }, // Dark Blue/Grey
            companyDetailsText: { fontSize: 9, color: '#555555', lineHeight: 1.3 }, // Style for address, phone, email etc.
            reportMainTitle: { fontSize: 18, bold: true, color: '#2C3E50' },
            reportSubTitle: { fontSize: 9, italics: true, color: '#7F8C8D' },
            tableHeaderCell: { bold: true, fontSize: 10, color: '#FFFFFF', margin: [0, 2, 0, 2] }, // White text for dark header
            tableCell: { fontSize: 9, margin: [0, 1, 0, 1] },
            footerText: { fontSize: 8, italics: true, color: '#7F8C8D' }, // Kept for page footer
            summaryLabel: { fontSize: 10, bold: true, color: '#2C3E50' }, // Darker label
            summaryValue: { fontSize: 10, color: '#333333' }
        },
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            lineHeight: 1.3,
            color: '#333333'
        }
    };

    // Add summary section if summaryDetails are provided
    if (summaryDetails && summaryDetails.length > 0) {
        documentDefinition.content.push({
            canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 0.5, lineColor: '#AEAEAE' }], // Full width line (595 - 40 - 40 = 515)
            margin: [0, 15, 0, 5] // Margin above the line
        });

        summaryDetails.forEach(item => {
            documentDefinition.content.push({
                columns: [
                    { text: item.label, style: item.style?.label || 'summaryLabel', alignment: 'left', width: '50%' }, // Label takes about 50% of the width, left-aligned
                    // For the value, we want it to appear somewhat centered.
                    // We can achieve this by having it take the remaining space and aligning its text to the left.
                    { text: item.value, style: item.style?.value || 'summaryValue', alignment: 'left', width: '*' }    // Value takes remaining space, text is left-aligned within this space
                ],
                margin: [0, 3, 0, 3] // Small margin for each summary line [L, T, R, B]
            });
        });
    }


    return printer.createPdfKitDocument(documentDefinition);
}
// @desc    Get Comprehensive Transaction Report
// @route   GET /api/reports/transactions
// @access  Private (Admin/Manager)
exports.getTransactionsReport = asyncHandler(async (req, res, next) => {
    const {
        startDate,
        endDate,
        customerId,
        transactionType, // 'invoice', 'payment', 'journal_entry' or 'all'
        paymentMethod,
        status, // New filter for invoice/PO status
        page = 1, // For pagination
        limit = 10, // For pagination
        exportFormat // New parameter: 'csv' or 'pdf'
    } = req.query;

    let transactions = [];
    const queryPage = parseInt(page, 10);
    const queryLimit = parseInt(limit, 10);
    const skip = (queryPage - 1) * queryLimit;

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
        const parsedEndDate = new Date(endDate);
        parsedEndDate.setDate(parsedEndDate.getDate() + 1); // Include the whole end day
        dateFilter.$lt = parsedEndDate;
    }

    // Fetch Invoices
    if (transactionType === 'invoice' || transactionType === 'all' || !transactionType) {
        const invoiceQuery = {};
        if (Object.keys(dateFilter).length > 0) invoiceQuery.invoiceDate = dateFilter;
        if (customerId) invoiceQuery.customer = customerId;
        if (status && status !== 'all') invoiceQuery.status = status;
        // Add status filter later if needed: invoiceQuery.status = status;

        const invoices = await Invoice.find(invoiceQuery)
            .populate('customer', 'name')
            .sort({ invoiceDate: -1 });

        invoices.forEach(inv => {
            transactions.push({
                date: inv.invoiceDate,
                type: 'Invoice',
                reference: inv.invoiceNumber,
                party: inv.customer?.name || 'N/A',
                description: `Invoice to ${inv.customer?.name || 'N/A'}`,
                amount: inv.grandTotal,
                debit: inv.grandTotal, // For A/R
                credit: 0,
                status: inv.status,
                _id: `inv_${inv._id}` // Unique key for list rendering
            });
        });
    }

    // Fetch Payments
    if (transactionType === 'payment' || transactionType === 'all' || !transactionType) {
        const paymentQuery = {};
        if (Object.keys(dateFilter).length > 0) paymentQuery.paymentDate = dateFilter;
        if (paymentMethod) paymentQuery.paymentMethod = paymentMethod;

        let payments = await Payment.find(paymentQuery)
            .populate({
                path: 'invoice',
                select: 'invoiceNumber customer',
                populate: { path: 'customer', select: 'name' }
            })
            .sort({ paymentDate: -1 });

        // If customerId filter is applied, filter payments based on the invoice's customer
        if (customerId) {
            payments = payments.filter(p => p.invoice && p.invoice.customer && p.invoice.customer._id.toString() === customerId);
        }

        payments.forEach(pay => {
            transactions.push({
                date: pay.paymentDate,
                type: 'Payment',
                reference: pay.transactionId || `Payment for INV-${pay.invoice?.invoiceNumber || 'N/A'}`,
                party: pay.invoice?.customer?.name || 'N/A',
                description: `Payment received via ${pay.paymentMethod}`,
                amount: pay.amountPaid,
                debit: 0,
                credit: pay.amountPaid, // For A/R, or Debit Cash, Credit A/R
                status: 'Completed', // Payments are generally completed
                paymentMethod: pay.paymentMethod,
                _id: `pay_${pay._id}`
            });
        });
    }

    // Fetch Manual Journal Entries
    if (transactionType === 'journal_entry' || transactionType === 'all' || !transactionType) {
        const jeQuery = {};
        if (Object.keys(dateFilter).length > 0) jeQuery.date = dateFilter;
        // Manual JEs don't typically have a customer or payment method in the same way.
        // Status filter is not directly applicable here unless JEs have statuses.

        const journalEntries = await JournalEntry.find(jeQuery)
            .populate('createdBy', 'name')
            .sort({ date: -1 });

        journalEntries.forEach(je => {
            const totalDebits = je.entries.reduce((sum, entry) => sum + entry.debit, 0);
            transactions.push({
                date: je.date,
                type: 'Journal Entry',
                reference: je.referenceNumber || `JE-${je._id.toString().slice(-6)}`,
                party: je.createdBy?.name || 'System', // Or derive from description
                description: je.description,
                amount: totalDebits, // Total value of the JE
                status: 'Posted', // JEs are typically always posted
                _id: `je_${je._id}`
            });
        });
    }

    // Sort all transactions by date
    transactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (exportFormat === 'csv') {
        if (transactions.length === 0) {
            // It's better to send an empty CSV or a message than a 404 if filters result in no data.
            // For now, let's send a clear message if no data.
            // Or, you could send an empty CSV file.
            return res.status(200).send("No transactions found for the selected criteria.");
        }
        const fields = [
            { label: 'Date', value: row => new Date(row.date).toLocaleDateString() },
            { label: 'Type', value: 'type' },
            { label: 'Reference', value: 'reference' },
            { label: 'Party', value: 'party' },
            { label: 'Description', value: 'description' },
            { label: 'Amount', value: 'amount' },
            { label: 'Status/Method', value: row => row.type === 'Invoice' ? row.status : (row.paymentMethod || row.status || '') }
        ];
        const json2csvParser = new Parser({ fields, excelStrings: true }); // excelStrings: true helps with CSVs opened in Excel
        const csv = json2csvParser.parse(transactions);

        res.header('Content-Type', 'text/csv');
        res.attachment(`transactions_report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } else if (exportFormat === 'pdf') {
        if (transactions.length === 0) {
            return res.status(200).send("No transactions found for the selected criteria to generate PDF.");
        }
        const companyProfile = await CompanyProfile.findOne();

        const reportTitle = "Transaction Report";
        let reportSubtitle = "Filters: ";
        const filtersApplied = [];
        if (startDate) filtersApplied.push(`Start Date: ${new Date(startDate).toLocaleDateString()}`);
        if (endDate) filtersApplied.push(`End Date: ${new Date(endDate).toLocaleDateString()}`);
        if (customerId) filtersApplied.push(`Customer ID: ${customerId}`); // Consider fetching customer name
        if (transactionType && transactionType !== 'all') filtersApplied.push(`Type: ${transactionType}`);
        if (status && status !== 'all') filtersApplied.push(`Status: ${status}`);
        if (paymentMethod) filtersApplied.push(`Method: ${paymentMethod}`);
        reportSubtitle += filtersApplied.length > 0 ? filtersApplied.join(', ') : "None";

        const tableHeaders = ['Date', 'Type', 'Reference', 'Party', 'Description', 'Amount (INR)', 'Status/Method'];
        const tableBodyData = transactions.map(t => [
            new Date(t.date).toLocaleDateString(),
            t.type,
            t.reference,
            t.party,
            { text: t.description, style: 'tableCell', alignment: 'left' }, // Ensure description is left aligned
            { text: t.amount.toFixed(2), alignment: 'right' },
            t.type === 'Invoice' ? t.status : (t.paymentMethod || t.status || '')
        ]);

        // Calculate Summary Details for Transactions
        const totalTransactionAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
        const summaryDetails = [
            { label: 'Total Transactions:', value: transactions.length.toString() }
            // Removed: { label: 'Report Generated On:', value: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` }
        ];
        // You can add more specific summaries here if needed, e.g., total invoice amount, total payment amount
        const invoiceTotal = transactions.filter(t => t.type === 'Invoice').reduce((sum, t) => sum + t.amount, 0);
        if (invoiceTotal > 0 || transactions.some(t => t.type === 'Invoice')) {
            summaryDetails.push({ label: 'Total Invoice Amount:', value: `₹${invoiceTotal.toFixed(2)}` });
        }
        const paymentTotal = transactions.filter(t => t.type === 'Payment').reduce((sum, t) => sum + t.amount, 0);
         if (paymentTotal > 0 || transactions.some(t => t.type === 'Payment')) {
            summaryDetails.push({ label: 'Total Payment Amount:', value: `₹${paymentTotal.toFixed(2)}` });
        }
        // Add Total Transaction Amount last for better flow
        if (transactions.length > 0) {
            summaryDetails.push({ label: 'Total Transaction Amount:', value: `₹${totalTransactionAmount.toFixed(2)}` });
        }


        // Define column alignments and widths for better layout
        const columnAlignments = ['left', 'left', 'left', 'left', 'left', 'right', 'left']; // Date, Type, Ref, Party, Desc, Amount, Status/Method
        const columnWidths = ['auto', 'auto', 'auto', '15%', '*', 'auto', 'auto']; // Give 'Description' flexible width

        const pdfDoc = await generateStyledReportPdf(reportTitle, reportSubtitle, tableHeaders, tableBodyData, companyProfile, companyProfile.logoUrl, columnAlignments, columnWidths, summaryDetails); // Pass companyProfile.logoUrl as the logoImageBase64 argument
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=transactions_report_${new Date().toISOString().split('T')[0]}.pdf`);
        pdfDoc.pipe(res);
        return pdfDoc.end();
    } else {
        // Standard JSON response with pagination
        const paginatedTransactions = transactions.slice(skip, skip + queryLimit);
        return res.status(200).json({
            success: true,
            count: transactions.length,
            pagination: { currentPage: queryPage, totalPages: Math.ceil(transactions.length / queryLimit), limit: queryLimit }, // Added comma
            data: paginatedTransactions
        });
    } // Corrected: Removed comma after the else block's closing brace
});

// @desc    Get Purchase Order Report
// @route   GET /api/reports/purchase-orders
// @access  Private (Admin/Manager)
exports.getPurchaseOrdersReport = asyncHandler(async (req, res, next) => {
    const {
        startDate, // For orderDate
        endDate,   // For orderDate
        supplierId,
        status,    // PO status
        page = 1,
        limit = 10,
        exportFormat
    } = req.query;

    const queryPage = parseInt(page, 10);
    const queryLimit = parseInt(limit, 10);
    const skip = (queryPage - 1) * queryLimit;

    const poQuery = {};

    // Build date filter for orderDate
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) {
        const parsedEndDate = new Date(endDate);
        parsedEndDate.setDate(parsedEndDate.getDate() + 1);
        dateFilter.$lt = parsedEndDate;
    }
    if (Object.keys(dateFilter).length > 0) poQuery.orderDate = dateFilter;

    if (supplierId) poQuery.supplier = supplierId;
    if (status && status !== 'all') poQuery.status = status;

    const purchaseOrders = await PurchaseOrder.find(poQuery)
        .populate('supplier', 'name')
        .populate('items.product', 'name sku') // Optional: if you want to show product details in report
        .sort({ orderDate: -1 });

    if (exportFormat === 'csv') {
        if (purchaseOrders.length === 0) {
            return res.status(200).send("No purchase orders found for the selected criteria.");
        }
        const fields = [
            { label: 'PO Number', value: 'poNumber' },
            { label: 'Order Date', value: row => new Date(row.orderDate).toLocaleDateString() },
            { label: 'Supplier', value: row => row.supplier?.name || 'N/A' },
            { label: 'Expected Delivery', value: row => row.expectedDeliveryDate ? new Date(row.expectedDeliveryDate).toLocaleDateString() : 'N/A' },
            { label: 'Subtotal', value: 'subTotal' },
            { label: 'Grand Total', value: 'grandTotal' },
            { label: 'Status', value: 'status' },
            // Add more fields like item details if needed, but this makes CSV complex
        ];
        const json2csvParser = new Parser({ fields, excelStrings: true });
        const csv = json2csvParser.parse(purchaseOrders);

        res.header('Content-Type', 'text/csv');
        res.attachment(`purchase_orders_report_${new Date().toISOString().split('T')[0]}.csv`);
        return res.send(csv);
    } else if (exportFormat === 'pdf') {
        if (purchaseOrders.length === 0) {
            return res.status(200).send("No purchase orders found for the selected criteria to generate PDF.");
        }
        const companyProfile = await CompanyProfile.findOne();
        

        const reportTitle = "Purchase Order Report";
        let reportSubtitle = "Filters: ";
        const filtersApplied = [];
        if (startDate) filtersApplied.push(`Start Date: ${new Date(startDate).toLocaleDateString()}`);
        if (endDate) filtersApplied.push(`End Date: ${new Date(endDate).toLocaleDateString()}`);
        if (supplierId) filtersApplied.push(`Supplier ID: ${supplierId}`); // Consider fetching supplier name
        if (status && status !== 'all') filtersApplied.push(`Status: ${status}`);
        reportSubtitle += filtersApplied.length > 0 ? filtersApplied.join(', ') : "None";

        const tableHeaders = ['PO Number', 'Order Date', 'Supplier', 'Expected Delivery', 'Grand Total (INR)', 'Status'];
        const tableBodyData = purchaseOrders.map(po => [
            po.poNumber,
            new Date(po.orderDate).toLocaleDateString(),
            po.supplier?.name || 'N/A',
            po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A',
            { text: po.grandTotal ? po.grandTotal.toFixed(2) : '0.00', alignment: 'right' },
            po.status
        ]);

        // Calculate Summary Details for Purchase Orders
        const totalPOValue = purchaseOrders.reduce((sum, po) => sum + (po.grandTotal || 0), 0);
        const summaryDetails = [
            { label: 'Total Purchase Orders:', value: purchaseOrders.length.toString() }
            // Removed: { label: 'Report Generated On:', value: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}` }
        ];
        if (purchaseOrders.length > 0) { // Add total value only if there are POs
            summaryDetails.push({ label: 'Total Value of Orders:', value: `₹${totalPOValue.toFixed(2)}` });
        }

        // Define column alignments and widths
        const columnAlignments = ['left', 'left', 'left', 'left', 'right', 'left']; // PO No, Order Date, Supplier, Expected Delivery, Grand Total, Status
        const columnWidths = ['auto', 'auto', '*', 'auto', 'auto', 'auto']; // Give 'Supplier' flexible width
        const pdfDoc = await generateStyledReportPdf(reportTitle, reportSubtitle, tableHeaders, tableBodyData, companyProfile, companyProfile.logoUrl, columnAlignments, columnWidths, summaryDetails); // Pass companyProfile.logoUrl as the logoImageBase64 argument
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=purchase_orders_report_${new Date().toISOString().split('T')[0]}.pdf`);
        pdfDoc.pipe(res);
        return pdfDoc.end();
    } else {
        const paginatedPOs = purchaseOrders.slice(skip, skip + queryLimit);
        return res.status(200).json({
            success: true,
            count: purchaseOrders.length,
            pagination: {
                currentPage: queryPage,
                totalPages: Math.ceil(purchaseOrders.length / queryLimit),
                limit: queryLimit
            },
            data: paginatedPOs
        });
    }
});