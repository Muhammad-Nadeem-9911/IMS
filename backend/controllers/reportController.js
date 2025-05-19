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

    res.status(200).json({
        success: true,
        data: {
            totalInvoiced,
            totalPaid,
            balanceDue
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
    logoImageBase64, // Base64 string of the logo. IMPORTANT: This needs to be a valid base64 string for the logo to appear.
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

            // IMPORTANT: For logo to show, logoImageBase64 must be a valid base64 string.
            // This is currently passed as 'null' from the calling functions.
            // The TODO for fetching companyProfile.logoUrl and converting it to base64 needs to be implemented by you.
            if (logoImageBase64) {
                // Column 2: Logo (fixed width, aligned right)
                headerColumns.push({ image: logoImageBase64, width: 120, fit: [120, 70], alignment: 'right' });
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
        // TODO: Implement actual logo fetching and base64 conversion if companyProfile.logoUrl exists
        // const logoImageBase64 = companyProfile?.logoUrl ? await fetchImageAsBase64(companyProfile.logoUrl) : null;
        const logoImageBase64 = 'data:image/png;base64,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'

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

        const pdfDoc = await generateStyledReportPdf(reportTitle, reportSubtitle, tableHeaders, tableBodyData, companyProfile, logoImageBase64, columnAlignments, columnWidths, summaryDetails);
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
        // TODO: Implement actual logo fetching and base64 conversion
        const logoImageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAgAAAAIACAYAAAD0eNT6AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAACAASURBVHic7N15fJTV2T7w6z7PTDayL2yiBcUN1KpREUhCUHCp289aqLZq7VvFautWUXAf14K71VrBrS6tFaytpXVfQhJArGhdcMENRREI2ROyzMy5f3+EJYEZsk3mfmbm/n4+7+twMpnnmlByrjnPRlBKuRr7Sj2bsoIFHEBBwJohDiEbQA5bZIOQzWSzDSObLQ1i4jQiGkRMSQzOAuCAkd31BZEOwNvxcCs/GE3bbboOjACIGmC5HcTNINoEy80A6gimDoQ6a1EHRi0M1dpgcEOyF1Vpew7dQNMXBgfy56KU6h+SDqBUIqu/c3yuE/SMsMbZjcC7ssWuAEYA2AXAYACDwSjA9v9Weev/224MvRrjMOMRGGMwqhjYQMB6gNcSY40l863h4JoA6BsHgW+zfMtqQryaUioKtAAoNYCYQS13lowIgkYzMNoAoxm8B4NGgzEawKCu3xDqRcKNuboA9HSsiUBfWPDnAD4H+HOG87kFPs/zlX0b4hWUUhGiBUCpCGm+d+JwDnjHgO1YBo0BeCxABwDICDlX93sijYsCAHCI4Y6BNga+IGAlAx8RaGWQAx/lOks+Jh9siFdSSvWCFgCleol9pZ6mTNqbTLCQLRWCMAbAwQByQ05wQOi5WgvA1rEwBSDc9zcy8D4BK5nxEbNZkePF2+Qraw3zXUqpELQAKNWNhvuK9jJBZxyDxjHzOAL2B5Dc4wkuxLgWgK5jvSwAocbaAH6fwW8ZojfBtDzrpvLPwryKUgpaAJTqgucVpjW1DzoczEUMOpyAcWDkdnxxu38uWgAiNhaBAoAQb6wawHJivGkNVzQ1B5fveteyljCvrFTC0QKgEhrfdtSg5uRN45lQRMBEAEUMStk2l9C2eUULwICNDVAB2P55ARDeA9OrluwS8noqcnxldWG2pFTc0wKgEgr7Sj2Nea3jyJipBmYqMx8GwNN5oufOk74WgKiMRakAbC/AjOWG+RVyzCsZXvMW+coCYbasVNzRAqDiXuv9Rbv7ETwWhKnENBmMzI6vhJ7otQBEf0yoAGw/Vs9Er3OQXzFeejH7pvKvwqRQKi5oAVBxhxdMczZt/OZAS3QCAccDVNjxBSDcpK8FIBJ5+j7mkgKw/Y/1S4D+TbCLsmpaFtP8Ff4wqZSKSVoAVFzgxw8Y1LIp9VgQTmLGsQzK6/gCsPV/5loAdhjTAhDij6GftxGEFwh4blPKpheG+1ZsCpNQqZihBUDFLJ5XmLbJMUeSpWnMOBmg9I4vbJ7ENz/WAhB+TAtAiD92/7wWEF5DkBeySXkud+6r9WHSKuVqWgBUTKl6eGJGqvWfTGynAzQFoGQAO0z0WgB6NqYFIMQfe/G9BLQy0ytseEEg1fnnYF/Z9jdUUsq1tAAo1+MF05zmptWTjeUzGTgZvO2T/g6T++bHWgB6NqYFIMQf+/i9HWUArxL48axBtc+Rb2V7iO9SyjW0ACjXanm4sMgCZ4LwE1jK2foF3snkvvmxFoCejWkBCPHHyLy/GgYvZGMez5tbvjTEM5USpwVAuUrzvMJhlITpzPwrMO2/9QudJ18tAFoAQo65qgBsQ1gFS0+BA4/m3LH06xDPUEqEFgAljucVelu89iQi/JKZjgbgdPwiDjHpd36sBaAf3xviy1oABqYAbBsPgvECQI9mNzYv0tMKlTQtAEpM88MHDSePPQNsfgPGrgC2TrJaAHoypgWg65jrC8BWBKyzlh4jax7IubtsdZjvUmpAaQFQUcU+mLZRBx1hwTPAOBnbXYZXC0BvxrQAdB2LnQLQacwCeJ2Y52etGfYsLVwYDPMKSkWcFgAVFfzkuMwWbvklrLkA4D3CTsRaAHoxpgWg61hMFoDOPmemu1ubmh8dPl8vNKQGnhYANaBa/7L/7jZgZoB4BkA53U2+WgB6M6YFoOtYzBeALWP1FvQYs//W/LuWfRfmFZXqNy0AakC0PHFAMYN/B9CJYJiO0e4nXy0AvRnTAtB1LG4KwJb/tBHwRNDSnfl3l38c5pWV6jMtACpimEFtT409nq2ZDcaEjl9iPZj0tQD0/jW1AIQYi7sCsOUPTMBrDP5D7l2Vi8JsQale0wKg+o3nFXpb01tPA8zlYB67ZdLUAhB+XAtA1zEtAF3Hwv+90P+I7F3ZmZ6/kq8sEGZrSvWIFgDVZ7xgbFKbn37F4NkA7dYxCGgB6H5cC0DXMS0AXcd68PeyGkxzclqaH9HrCai+0gKgeo19MC17jjmFiH4PYI9wk6wWgPDjWgC6jmkB6DrWi7+Xb0B8c06W5xFdEVC9pQVA9Rj7YFr2GXMKMW4CY69wk68WgO7HtQB0HdMC0HWs138vhK8Q5Dk53w97WK8loHpKC4DqFjOobcE+x1uLGwnmhx2DgBYA7EgLQJ/GtAB0HevH38tHBJ6bnVP5JPlgw6RRCoAWANWN1qf3nQLGXAYO7nbS7/xYC8BOx7UAdB3TAtB1rP9/L/whAzfk3lP5DIVPpRKcFgAVUuuCvY9hphvAOLTHk37nx1oAdjquBaDrmBaArmOR+XthgLGc2V6bd+/Sl8MkUwlMC4Dqom3B6DEM53YwHQsA3JtJv/NjLQA7HdcC0HVMC0DXsQgWgI5HxK9T0Lk4977yD8IkVAlIC4ACAGz6++gRjjU3MdMZAMzWiVgLgJsKQBuAagAbwagGeCMTb4SlahBXA6YaQa52yLSzE/QHg9wEAIY9zZYC7ZtfoxYAWj1p7UMve7kZANbddtSglMCmpM1fz9n8PUmWAoPgBxwPpQeDjpdgk0CUB9g8WMoDcR7BFAA23zLlEZCHjv9L7tXPRwvADmORLgCbBQD+k+NYX9Zdy2rCJFUJRAtAguMFY9Nbqf1ygrkUjLRtX9ACEC7bthzYUd8LgB/AGjBWg7CaQF9Zxmpi+ipo6Ft/k60e7CtrCvPqrrLBV5ru9Zg8x/pHMDAKjFHMNNIQRjFjJIBdAXi2foMWgB3GBqgAbB6mahBfl5PrmaenDiY2LQAJihnU/uyep7Gl2wAM7xjccZLVAhDRAhAAsAqgDyzwCQGrieirgKXV2bvlfUvTE+P0LfaVeuqAEQBGOsSj2NqRTLQ3M/YnYC8AHi0Akdh2uAKw9dFKtnxJ3h+XvBLiWSoBaAFIQG3P7LUPM/8BhKndTbJaAPpYAAi1YP4IoBUgrOQgfZSR0fgOnau3ed0ZnlHorRmSspdDnjEMHgumQhAXEjCs4wmhvmmHB1oAtgz04HkEvGpBF+XdW/FRiGerOKYFIIHwv3fLaWtLvh6M87BlCVYLwA6P+1AAvgGhkiy/AzLvgZwP0i9+bT1UxDRdeeSQgCdwAFs+gAgHAyhGx64ELQBhx3pWADZrh+V72ARuyrt3eUPIZ6i4owUgQbQ8M/p0ItwBYHC3E2unx1oAdsgWAPA+GEtAvMQxZknahWXfQkVdta90hCcYLLKMCQQqAvgAAA4ALQBbBnqfcR0DF+bdV7kwzLNUHNECEOda/zF6D7C9H2yO2jqoBWCnGbYrAE2weI+ASmtpSZCoIueSsjoo11k386hBScmbDjKEicxURMBEbD6rAYAWgJ19747j/2Frzsu7v3xNmGerOKAFIE7xgrFJ7d7WWcy4EkBKbyb9zo8TsABYgN5mSy9Yti9kDh/2dqIcnBdveNo0p3H0hsOCjj2WLI4BUAjAdH0SdvyjFoAtGgCelXPfknkU/rtUDNMCEIf8/9xjgmU8BGBf3m5i7e3jBCkAVYB5Gda+wDAvZ1xYUQUVdxp9EwbbducoBh8L0FEA8rUAdP+azKhgE5yRf9+yT8J8p4pRWgDiCC8YkdqelHQdGDMBOABBC0DIbBbAu2C8CmteHVTjKdPzoRML+2DqW4sOAjAFRFMAlALwaAEI+xJ+Bu7MK6i9lnwr20M8U8UgLQBxwv/cqBLLeBig0Z0nVi0AW8eDYCwm0NNBJ+nZzHPLNkKpzRqvKC4IMk5h4ulgKsGWgwm30AKwxfscpHPyH6h4K8yrqBiiBSDG8UtDBvlb0+Yw43wAZvuJNcELgAVzJbNZQF77TPo5y/XUPNWtDZeVDvU4wZ8Q8FMAEwAYLQBdxoJgurctuOmq4fP1uhaxTAtADGt/bvdDGPZJgPYON7EmaAH4iEGPG6Yn085b9h2U6qONV43fxQl4fwLmaSBMQOffmYlbALb4xBL9vOCPFe+EeUXlcloAYhD7YNoLR14OixsAeHc2sSZOAeAPGOYxB4GFqeeu+AZKRVjtpRN+QF5nOjN+AWCsFgAAhHZiuiZncMXt5IMN88rKpbQAxJhN/9xjV48JPM6g0p5MrHFeAFpBtIiZ56fP+O+rUCpK6mYXFVprZhD4ZwDSt34h0QrAZsR4gz2eM/Pu1YtixRItADGk7V8/OAXAfAC5PZ1Y47IAWPqIQY8HjfNg1tl6W1Mlp/qCcZlOqvdUBs0AUJioBWDzWD0Rzsu9v/KpMFtQLqMFIAbwc3tntFHL7UQ0o1eTaXwVgAYQ/gZr5w86550VUMplqmdNHEtB5wwiPgdAbpcvJkYBAAAQ8ESAPOcPvj82bl+dyLQAuFz78yMPZ2ufBGOPXk+m8VAACCsY/MdBnsACOvP9ZijlcutmHjUomTb9FKDfADgYQEIVgM0+Y6bT9XRBd9MC4FK8AE4gbcRVDHMNb70/esIUAGbC8zZgbs845+0yKBWj6maWHAHiS5lxLLb/fRvfBQBg+JnIl7dx6FxaqJfTdiMtAC7Ez+6S5082T4ExFaDNn4aBBCgA7bD0dNAJzs04672VUCpO1F9SOto69gKAzwGQCiARCgAAgICydtifDn1g6YYwW1ZCtAC4TPvzww8CO88CGLllMo33AkCgerZ4DI69Ne0X7+l5+ypuNc6cMDgAz/kA/xaMvB2eEIcFYLM1DPqJ7hJwFy0ALtL+/C5ngukBgDp9QojrAvAlCH9IJfuQ7t9XieQrX2lKdkNgOhNdScDeW78QvwUAzGgjpt/mza94KEwCFWVaAFyAnx+d7EfrvQDOCTWZxmEBWAU2vtTV7z6tFw9RiYynTXNqd113GhGuBbBnPBeAre+N8ae82tqLaaHeVEiaFgBhm57fZYQHWAjQ4QBCTqZxVAC+Zku3pP0g+xGarHffU2oL9sHUNxSdwqBbAIyO5wIABoiwggL2lJyHl34dJo2KAi0Agvz/2bWEyS4AMGRnk2kcFIBvQbg9tXbTA3Th522hfhZKKYBnFHrrM1J/aS1dA8KIjsFQT+zJmHsLwGYbmejU/HkVr4VJpAaYFgAh7S8MmwGY+wB4u5tMY7gAVAG4IzXQeA/9cnVrqJ+DUmpH7BubVNuYcxaYfGAM2/EJob4pxIC7CwDACBBwdc6DlbdS+GRqgGgBiDJeNDzN78WjYEzv6WQacwWAqYrBt6ZuSr6fztXbhSrVV+tmHjUoKdDyGxAuBzqdNRA/BWDLf5/alBH81a53LWsJk04NAC0AUcQvDRnsZ+dfAMb15tN0DBWANrJ8d3J74Gb61aeNIX4ESqk+qL5gXCZ5kq4GcBGApDgsAABoWVIQJ2U8WlEVJqGKMC0AUdL64ojRhoLPg2lPAL1aTo+FAsCgfxsHF6ec+uEXIX8ASql+q7+kdLSFvYWZp+3wxZgvAACAL9kEj8ufv+yTMClVBGkBiAL/S8MnMPNzIOSHvpf9zh+7vAB8QsAlKT9b+WLod6+UirS6i0uOsOC7ABywdTA+CgDAqLWWTi54tGJxmKQqQox0gHgXeGXodIBfAyFfOkuE1RDTxSnDCvbXyV+p6Mq+u/z1nOyKg4j5FwzE2yV2c8jwSxt/WXy6dJB4pysAA6j95SEXEeguMNHWghv7KwB+AI/6OXBV5s9WbQzz1pVSUVJ3XlGOTTGzYPkSAEnbvhKzKwBbfucxAzcUPFLpCxVX9Z8WgAHAb8MbrBk6n4GzOgYIcVIAXiPH/iZl+qefhn7nSikpGy8u2dcw3w+gtGMk5gtAxx8tHs5PajmP5q/wh9iK6gctABHGlfkZgRbPAjCO2TYY2wWAQHUAz0r+6ScPEoX99aGUEsYA1V1UdAaD7gQ4Lx4KABgA4TXjSTkld/6r9SG2pPpIjwGIIH5p+K6BTc4ygI/p/tmxgUALA8bsm3LqJ/N18lfK3QjgnHsqHw8S9ifw36XzRAzjSOtvrdh45vhdpKPEE10BiJCWN4aO9Ab4VQb2ALDDp+kYXAH4noALkn/6Sfz8ElEqwdRcVHQ8LO4HYdetg7G4ArD1a7w6yDxlyGNL9XTjCNAVgAhoeylvH0/QVmyd/GMbE/BEMjn76eSvVGzLvafy32hL2Z8JfwDi4c6bNNIhU1H9i4ljpZPEA10B6Kf2NwoOJEsvg1Gws0/WMbIC8AUDM1Knf/r6Tt6yUioG1VxUVATGg2DsE/IJMbECsPW/G4IOjhrySOV7IbasekhXAPqh/fUh48ia18EokM7STxZEtyU3t+2nk79S8Sn3nsrK+gbPQQTcgfA7AmLFYCeI1zeeWXyYdJBYpisAfeR/raAEwCKAMtGDT9kuXgFYB+D/UqatemFn71cpFT/qfltyhIV9HIRtB9XF1grAFs0AnZT/mN5SuC90BaAP/G8UHAPgRQCZ0ln66dl2x+ynk79SiSX7vvLXyePZD4y/SWfpp0Fg/lf1GcVHSweJRboC0EuB1/JPYKIFYKR0jHT6xB07KwAtAK5I+cln93T7hpVSca32gqIzGfgjGOk7fNH9KwBbHreTtT/Le3KpHrjcC7oC0AuBN/JPZcLfgS2Tf+xh0H9hnAN18ldKAUDOvZWPGzYHgLFUOks/JDHR0xvPnPgL6SCxRAtADwXeyP85M/4CwCudpY+CTHRzysbMiSk//mSVdBillHtk31f+VY6/pRTAHMTu6YIOGI9UnVn0M+kgsUJ3AfRAoCzvZGZaAIanYyTMkrt7dwF8y0HnZ6nTVlX07B0rpRJV7W+LShn4C4DhMbQLANv2dyIANtPyn6z4Z4hUqhNdAeiGvyx3KhhPAVsm/5hTEQgED9XJXynVEzn3VZZ5iQ5kcKyeEuwB7NMbzpj4I+kgbqcFYCf8r+dMJKZ/AEiWztIXDMxPrso+Mn366nXSWZRSsSPj3oqq3Hzv0QDmSmfpoyTDeKbq9KJS6SBuprsAwmh/PW+cMXgFjAwA4J4subtnF0ATiM5O/n9fPN2Lt6yUUjuoOb/oNCY8CGAQgFjYBdD5eQ1gOzX/r8veCpEw4ekKQAht5TkHGMPPAx2Tf0xhfAbCBJ38lVKRkHt/5VNMwUMAfCKdpQ8yQealqtOLD5YO4kZaALbDFfl7OZZeApArnaUP/pMEe1jy//vyA+kgSqn4kX/fsk9g/OMA/EM6Sx9kE+yLG396+L7SQdxGdwF0wpU5uwWDVAHGbh0j25bWXb4LgMF0a9L/vrySfDF7Co9SyuUYoNrzii5nwi3o/AHSvbsAtrH4zuNxirOfKP8qRNqEpAVgM16cu2sQXA7QyFCTrHsLADcxnFNTTvryP714u0op1WdV50080RD9Fb05LkC6ADBAwJfstyX5C5d9FyJxwtFdAAD4zdxMS/xvACOls/TS92S5VCd/pVQ0Ffxpyb+IaQKAb6Wz9AYDu8NjXqo9qzRbOosbJHwB4LfhDfrtMwwcIJ2ld/hDa8zhSSd/s0I6iVIq8eT+qeJ9tsHDAfxPOksvjQ22+Z/laWOTpINIS/gCENyUPR9MU6Vz9AYRXk1qdYpST/jyG+ksSqnElf/Asu9sK5cAiLU7ik6udrL+JB1CWkIXgGB59rUAzpLO0UuPetfm/4imf1kvHUQppQoeWdKYO8RzIgjzpLP0Dv3fxtMmXiGdQlLCHgQYKM85FcR/7Ti6b7sD8Nx5ECAD5obkE1b7evtelVIqGqrPL7oIjLuw9RdXJy44CHD7/zLARHxm/lNLnwz5huJcQhYA/+LsEjJ4GUByyMnXfQWgDUy/Sj7h67/09r0qpVQ0VZ9XNA3A4+DtbpvuzgIAAO2wOKZgwZI3QryduJZwBYCXZuwTDJqlAOV0DAAuLwCNQTYnpp6wuqxXb1QppYRs/HXJEQT7HID0rYPuLQBgoJqYJhQ8XZlQt0pPqGMA+I2M/KA1iwDkSGfpoTpiOlonf6VULMl/oPx1NvYIgKqls/QEMfIAfmHdyRMGS2eJpoQpALwUqUGv+ReA0dJZeoY3gOxk7wlfL5NOopRSvZV//9L/GtBUBqqks/TQ7o6X/r32hMI06SDRkhAFgBlkbeafAYyXztITBHzH1jMp6bjvYu38WqWU2irngfJ3iakUwFrpLD10qDc1+SHpENGSEAXALsmYCWC6dI4e+jrocGnyCatj8c5bSinVRd68io8MPBMZ+EI6S8/QaVU/nXixdIpoiPuDAP2V2ZMN2ZfB8HAPj7oXPAjw0wB4StqPvoupy2sqpVR3qmYUDzPEr4AxduugSw4CDPH8ANhMKVhYsTjc+4kHcb0CwItTdzVknwbgkc7SAx/5PXSETv5KqXhUML/i+0DQfySA96Sz9IAHsE9X/3jcCOkgAyluCwA/j+Sgx/MMgALpLN3jt70GxYOOWhMr+8mUUqrXhjy0fL3X234kEWLhHiZDgo5nQTzfMyBuC4DNyriPgMOkc/TAB94kOoaO+bZGOohSSg20zD++VU1tnikMflc6S3cIGF/FWXdJ5xgocVkAAkszzwThbOkc3WJ85rXeo2jKdzFxrqxSSkVCzp/L6gKGjwHwsXSW7hDo/A2nFP2fdI6BEHcHAfLStIMsnCUAUrc/0M5VBwFafBNkLkk97vuv+/I+lVIq1lWfXToCFCgHY9TWQXccBLj9WCuIigoWVsbCrosei6sVAF6amWuJ/g4gVTrLzhDhO2uDk3XyV0olsryHyr51yE6F+68TkALmv689rTRfOkgkxU0B4AVwmOwCgEZ1/2xRGywwJeX49V9KB1FKKWnZ85d+gWBMXDHwB0ntgSfZFz/zZty8Ebtr+tUMHCmdY+eoHsCxyUev1Yv8KKXUZnmPVnzkWEwF4OqDoRl8dPX7E2dJ54iUuDgGgJekHWqNWQLA2zEQev++8DEAzWToGO/UtZV9fJtKKRXXqs+eeDiYXmYgw2XHAHR+HCBQUf7fK5fv7L3EgphfAeDK/AxrzFPYMvm7UxtZPl4nf6WUCi/voSVvMuhkAO3SWXbCw8yPrzvjqEHSQfor5guAddruBbCHdI6dYGKc4z12XZl0EKWUcrv8hyteY9Av0PWzt9vs5TQ33y0dor9iugAE3kw/BYRfSOfYOb7ac8z3T0inUEqpWFHwcMXfCLheOkc3zt7w/ybGyk3mQorZYwD4zdQRFp73AOR22fcDuOYYACI84pm67ld9e4dKKZW4GKDq/5v4CJjO6jzY5b9dxqJ2DEDn/9Y6Hjowd2HlNzt5K64VkysAzDAMz2MAcqWzhEV4w6nNO086hlJKxSICOM/TOgPAK9JZdiInGLCPx+qpgTEZ2i7PmMXAEdI5wmKs9HhSfkzTV7r5QBallHI1mr/CT+3+nzDhfeks4dGkje9N/J10ir6IuV0AvCzrYEt2GYBtd2hy1y6A7z1wDqepa2NySUgppdxm45njd4HjvAlGx+153bMLYAs/EU/Mf3bpf3f+TtwlplYA+L0hgyzxU+g8+btLE8Mep5O/UkpFTv7jy75j4pMBNEtnCcPL1jy29oTCNOkgvRFTBcC2tswBsJd0jjAsgU5Nmlrl+ltcKqVUrCl4ZMnbzPwzAFY6S2i8r9dJvVE6RW/ETAHgtzImADhfOkdYRNd6pq77j3QMpZSKVwWPLfkXAy6eZPni6pMnjJdO0VMxUQD47eFplunPcG1eXuQ5Yv0t0imUUire5Y+svIEAt37YMmzNPJ5R6OYr027l0gm1K2ubbgawp3SOMD7zcOAMIldftUoppeIC+WANeU4H6HPpLKEweP+q9SmXSefoCdefBcDLM8ZbmAqAnY6Brf+v05PEzgJossaMT568/sO+vTullFJ9UXNWyf6W7TIwOq7JL3sWwPZjbWSCB+X/482Pu38ncly9AsArkWRhHgbgSGcJhRhn6+SvlFLRl/vn8g8YfK50jjCS2ToPsMs/ZLu6ANjGzNkA9pXOERrd4ZlS9bR0CqWUSlQFjy35C8D3SucIo2TjSRNnSIfYGdcWAF6aORpEV0jnCGOJJ2uDW7MppVTCyEtpvZTA5dI5QmLcWv3jcSOkY4Tj3gJg6E8AUqRzhPC9x8PT6BD4pYMopVSio/kr/AF/YDqA76SzhJBpA94HpEOE48oCEHgr53QmTJHOEUIQln5KJRu/lw6ilFKqw5Cnlq9nwhlw5UWC+LgNx0/4iXSKUFxXALgiK4fAd0jnCIl5jndKVYV0DKWUUl0VPL7kDRDfJp0jJKJ7a6YVZknH2J7rCoBNohsADJbOEcIKT1b19dIhlFJKhZaX0nYNQG9J5whhqL8t9VrpENtz1SkK/FbuWAv7PwCeHc7t33ZCPhD96wA0B4J0cMqUjat6/aaUUkpFzYbTx482MO8CSBe8DkCXx5unqIA19uChzy37oCfvIxpctQLAsPcB8Ejn2AHzhTr5K6WU+w1+ctnnDMyUzhGCh6y5WzpEZ64pAIG3cn7OQKl0jhD+4Tmi5hHpEEoppXqm4Mkl8wAslM6xPQKOcNMBga4oALyyIJ0It0rnCOE7p81/tnQIpZRSvZMU9J4PYK10ju0x6I61JxSmSecAXFIAbEtwFoDh0jm2Y9niF3RMQ410EKWUUr2T+VTZRiKcBZedGkjAbl6bcql0DsAFBYDfyx0B4HfSObbHwB3eI6pfk86hlFKqb/KeXPIKE+6RzrE9Jly+4UelQ6VziBcA66ebAbhiOWQLBlZ5ONN1p2wopZTqnbrqzCsAfCKdYzvpMP4bpUOIngbI7xYcaK1dAWYD5u1u5yh2GqBl5lJvaa1e8EcppeJA1WnFk4jsGwBI8DTA7Z9nyZhDuqEPaAAAIABJREFUCxZVvNPDtxFxoisAbO1t0hl2QDRPJ3+llIofBU9VLGbgYekc2zGWreiVC8UmX/+KgmMYrrve/3dOm9W7/CmlVJzxJHkvA+Cq+7gQ44j1J0w4Smr7YgWAiN13WV3i39LU2nrpGEoppSIr589ldcR8gXSO7ZGlW1hod7xIAQi8O+QkAg6T2HZYhAWekrp/SsdQSik1MPKeWvp3AP+QzrGdwqpjJ5wiseGoFwBmEMH6or3dbtQ75FwiHUIppdTAYsf8BkCtdI4uiG7m0tKoXwY/+isA7xVMA3Bg1Le7M8SXUNFG110xSimlVGQVPFnxPQNuO9Zrr6rUwJnR3mhU9zvwAji81+D3mXlMl9P+tjyWOQ3wNae4birR9i+qlFIqHjFA1adOeINBk7YMdPlvT8f6dxpglzEGvmngzL32fOGFth6+jX6L7grAXoNPAzAmqtvcOb9jgr/RyV8ppRIHAQy25wHwS2fZgoDdMqnhl9HcZtQKAC+Aw8DV0dpeTzBwLxU1fiqdQymlVHTlP/3mxwzMk87RGTGu5Gljk6K1veitAOw95CwAe0dte92r8Tj2ZukQSimlZCQZupaBaukcney6sTE7aqsAUSkA/Da8DFwVjW31FBFfSRP0Tn9KKZWosv9aWQuXXZPGUvRWAaKzAuAdejaAUVHZVg8QeKXx17vtspBKKaWirCCwy/0E+kA6xxYE7LaxKeusaGxrwAsAvw0vk7tOubCWLqTJCEjnUEopJYsWLgwS7EzpHJ0x8+xoXBdg4FcAUob+DMCuA76dnvuHd1L969IhlDts+GNpet39RTnsc9lNqZRSUZP39NKXASySzrENjdqY3DZ9wLcykC/ODOIPh32I7c775+3P+4/edQDaHMYYKq7/sn/vTMUKZlDzn8btz8YpMpbHMMzesLwXCJkAZW/7nxIBDD+A7xm0hpm+APhDY8z/WpoDbxbMWtIo+DaUUgNsw89K9qRA8EMAHfvfo3wdgK7/ZQB4r+DFpQfRDhNe5AxsAXh/+ElM/M/tJ3ipAmCJ5non1s/u37tSbsfzCr2bkHQcM58KxmSABnd8Adg80W8W+jHvOB4g4B1metEY/uegC8vfjdJbUUpFUdX0CbcDdCkANxQAAHTc4BeXPN+z9L03oAXAfjBsCYAJLikAVQZJe1DRRv0kF6c2PThuBCwuZsYZvP2k3/lx7wvA5i9s/efyJYDHnCA/mnZp+ZoBeTNKqairmVaYFaSULwHkuqMAYPHgF5eW9ix97w1YAeCVw4rZorzjD24oAHyZU9R4ez/eknKp5nmFwxie2QTMAJCyk8s+I0IFYMsTLcCL2JjbMy8qq4zsu1JKSdg4rWg2E//eJQUADEwY8uLSZT2M3ysDduATW/rdQL12H3xvUjLulw6hIosZ1PzguN+AnFUEvhBASpQjGIBOIssVjXdOWtJ4x6TJUd6+UirCAilp9wLYIJ1jCwIGbC4dkBUAfn+33dkJrIJlp2NAfAXgQmdiw739elPKVVoePGxUEPxnYioBsMMn/SitAOyI8aohO2vQJRXv9OmNKaXEVU2feAkYdwIQXwEAIxBwMHr480u/7mn+nhqQFQDrBC8EwxmI1+6DtYYaHpIOoSKnZV5hkQW/SYwS6SwhTLFs3m68a9KC2rtKR0qHUUr1XlOa908AfSudYzOP19JvB+KFI74CwJ+NzuT21jVgmxnuE35UVwDI/NqZUO+qGz6ovmt+8NAZAO4D4A356X7zY8EVgM42geiuliTMGfybsqYevUGllCtsnF70G2a+zwUrAABQh7akXQeXRfb3SORXAPwtvwI4M+Kv2zerTVb9o9IhVGQ0P3zoOSB+AIBXOksPpYH5qtQ2/qrp9pKL2DfwV/ZSSkVGHtc+COAr6RybZSOpPeI3CYpoAWCGYdBvIvma/cHA9TQW7dI5VP81P3joDDDPwwCfujpA8pno7qYMfrfp9slHS4dRSnWPFq5sB+MW6RydXMAR/v0X2RWAVT84GsAeEX3NvvvMaW98UjqE6r+mBw+ZCuL7EZuTf2f7MdkXG2+f9ErTHZN/KB1GKbVz+TT8UTBWSefYbM8NR02cEskXjPAKAP86kq/XHwy6Tm/4E/taHzp4NDn8NOCag0r7jzDFwq5ouGPS/KZbS4dKx1FKhUYLFwbJ0E3SObYg4LxIvl7ECgB/sftuAI6L1Ov10+fOtw0LpEOo/uE/jE4OEj0LRo50lgHggHGONfxZ4+2lV6/1FaZJB1JK7SgPw/4K1xwLwCdUHztuRKReLWIFwAaC58Itn9KY76LpCErHUP2zaVDWVQD2l84xwNIZfGN6evqqxtsnzeAF09zxb0gpBaBjFYCJ7pHOsZknEHTOjtSLRaQA8NuFXgLOisRrRUCNSR/0mHQI1T+NDx2yH4BZ0jmiaBcG5jV9veGtxrl6RUGl3MSmpD3EQLV0DgAgYAYXFkbkTKjIrABk1ZwEYHhEXqv/7qcfrm+WDqH6h4y9D1tuy5lAGDiYDV5vuHXScw1zJ+8tnUcpBQx94uVmAPOlc2w2bENeUkR2t0dmBQD8f5F4nQhoMw7/UTqE6p/WRw+ZSsAk6RyiCCfC2A8bbp00r+nmI4dIx1Eq0bE3cA+AVukcAACmiFwToN8FgD/daxcwjopEmAh4nA5rXicdQvWPZXuDdAaX8IAwwyYFPq+fW+pjX2m0b3aklNpsyFPL1xPTU9I5AICAH1UdXTysv6/T/xUAEzgD7jj4jw1wl3QI1T8tDxdOBnC4dA5XYaQT8XWNafxx422lpzLH/PUQlIpJhu2dCH0R8Gjz2GDg5/19kf6vAAC/6O9rRAKB/03jmz6WzqH6h8EzpDO42EhmfqrxtknLG26dVCwdRqlEk/uPpR8CeFE6BwAQqN9nA/SrAPAXuxcB2Ke/ISKBmO6QzqD6p+Gxw/JAOFk6Rww4FIzyhrmTFtXdeoRbrrypVEIgMu6Yawh7rzuqaFx/XqJfBcASndGf748cWkETmhZLp1D942H/zwEkS+eIHXy84cBHDXNLbq/7fVE8XixJKdfJf6biNQDvSucAAGPtmf36/r5+I68cm0TAKf3ZeKQwQY/8jweME6UjxKAkAJcaYz5v+H3JLP7DsVqglBp490sH2Gx6f64J0PcVgLS2Y8HI6/P3R06j05KyUDqE6h9+clwmAN2v3Xe5IMxp3NT8QePvJ03TAwWVGjjseP8GRoN0DgD5VbkpU/v6zX0uAJbxs75+b0Qx/YUmVzVJx1D909LefhQS8MI/A2BPJl7QOLekrG5u6SHSYZSKR4MXljWB+G/SOQCAGX0+G6BPBYA/2TuDgOP7utFIMqAHpTOoCCCeKB0hzpQYtm81/L5kQd2NJaOkwygVbwh4SDoDABDsSRtKS9P78r19WwFI5h8DcMPdy1bQ+Pp3pEOoCCDop9XIIwDTjAefNP6+5J6aOVOypAMpFS/yn136X7AbDgakQeRp69PxU31bAQCm9+X7Io5YP/3HAV4wzQHTQdI54lgSAxd6uP2L+jklF7Gv1CMdSKl4QEQPS2foQH2ak3tdAPiL3bMAHNmXjUVYs+EkV1yWUfVPW8uqPQAMks6RAPKIcXdjkn2v/paSH0mHUSrWOez5C4BN0jkYOLovuwF6vwLg8Z4AN5yrzfgbHV7jhqMwVX8xRkpHSDBjCPhP/S0lr9beXHqgdBilYlXOP8vqGHhGOgeAFOv4e32HwN6vALA7zv3Xg//iR5BoN+kMiYiAIw3ZFQ23lCyomVOkfwdK9Yk75iKi3s/NvSoAvLYwDXDFnf8+oPENy6VDqEjRAiDIMDDNsebjhptL5lTNnZghHUipWDL4H5WVAD6SzgHm49YddVSvdqX2bgXA3/QjuOPo/8elA6jIMYx80QCMOdZyCRPmwS33+46+NAZmeQPOxw23TPol+yJwp1ClEgSBnpDOACCNAo29+oDeq3/kFuak3uUZEGw8ngXSIVTkWJYtlWzwXeaFSyoyflv5awT9I4lwGxK0CBCwCzM/0uAtWVF3c7EbDvZVyvWCBgvghtsEE3o1R/e4ADDDIeJje58ospiwjA6p/UY6h4ocMiRaAMhy3ZbH6RcvX5/+24rLHTh7gmg+ACsYTdKBBHq1/qbiV5puKNlfOoxSbjbk75VfAnhbOgeYfsTTpjk9fXrPVwDWjJkAyF/7nxj66T/esE2V3DyBdjibJO3Csm8zLig/14LHA1wpkcsdaErQ4J36m4vvb7yluEA6jVLuRU9LJwChYEPNd4f19Ok9LgCW6IS+JYooa6zfDadcqAgikOiFadhQe7ivZV1Y8VbGRRXFTHQigM+jGMtNPGA6z1r6sv7GEh/fOV60sCnlRoaNK3YDEKPHpwP2uAAQsfi1/xlUQRNavpPOoRJP5oWLF6WnNo0B4VwAVdJ5hKSDcF1js3dV3Q2TZuiBgkptk/dc+RoCLZPOwej5h/Ue/QPmr/ffHYx9+x4pMohYl/+VGDp3hT/josXzg0nBvQk0F0CbdCYJDIwg4nkNTsnyxptKSqTzKOUWFm7YRc0HfF96+MiePLNnDd5j3XDZ0KCxwb9Lh1Aq+/zK2vSLy2Z7THAvBp6AC5b9hBxiGYvrb5y0qN5XOlo6jFLSyNACAEHpHIZMj04H7NkKAGNq/+L0HwFldHjzeukcSm2RelHlN5mXLD7TkhkP8BLpPHL4eBj7UcMNJfP0QEGVyAqerfgegPzvAurZnN1tAWAu9QCY1O9A/WTJBUdYKhVC1sVvLE+/uLwYhOkEfCWdR4iXgRk2QJ/W3Vgyi/9wrPz9QpQSQG44GwA4sienA3a/ArC2ahwA6fuIBx1P8J/CGZQKiwiccfHihYMaaAyDrgCQqDeqyiHGnIa65g/rri92xX1DlIom6/c8C/nrh+Ss3/j9Id09qdsCYF1w7X8G/ksHNyXqkdcqhpCvrDXzd2VzOMmzOxHNBRD2FMM4N5pAz9RfX/Jmww3FE6XDKBUtg58vWwfgXekcINvtboBuCwCB5Pf/M78gnUGp3sj87WvV6ZeUzWZjDgBhoXQeQeOYqaLh+pIFdb6i3aXDKBUNRPJzFvXg2L2dFgCu2jsDwKERS9RHxsGL0hmU6ovMi9/4NOOSxdMJZgoY/5POI4QYmEZkVjb4SuZU+8ZlSgdSaiAF3fGh9fC1JxTu9DLrO18B8CdPBCB6lTYAG3FIg/w1lpXqh/RL33gtvWlxIYDpDHwtnUdICgOzPEj+su76klnsG5skHUipgTA4acRyBqqFYySZ5uTDd/aEnRYAC8hf5IPpRSLxAyqU6jfywWZcunhhRnrTGIBnI3EPFMwjxpwG5L9fd/2kadJhlIo0WrgwSMCr4jm6mcN3WgAIJH76H5N1w1KKUhFD567YlHlp+VwnGNgXwHy44MIhMnhvYl7QcF3Ja7XXlBwknUapSCKG+NxFzDudw8MWAF4zPhXE3Z5GMMCsE7DiLUqpgTBo1pK1mTMXn0sO7w/wf6TzSGHgCDJ4u85XsqD2qiN+IJ1HqUiwAe9LEL5KKIMO/6q0NCXc18OvAHibxwMQ3UfHjLdpYtMGyQxKDbSMS8o/zpxZfrxhmgrgfek8QgwY08gT+KhODxRUcWDz6YDSB/6mDEIg7Af58AWAqGhA4vQCEYkvoSgVLemXlb2a0UyFRHQegEQtvmlgzDI2+ZO6a0t+1ZOrmSnlVsT0vHQGEBeH+1L4XQAW4wcmTc8Zq/v/VWIhX1kgY2bZA5uQvDuDrgfQIp1JAgHDADxUv+/6D+qvLe7x/c2VchML+VPYGRz2TICQBYAZBGLp8/8bsEZP/1OJaehlLzdnXVbmCwSD+xDoL0jcOw7uy6B/111b8nyjr3iMdBileqOg0fMmgGbhGL0rANh4wF4A5Q1YnB4gYBlNT9Sjo5XqkDu78puMy8tOt8YcCvBi6TyCjg1a+qD26uLHm3ylQ6XDKNUTVFYWALBcOMbg9VNCX4UzdAGwzrgBjdMDTIl8e1Wlusqe+caKzMvLSw3RVAArpfMIMUR0RiBoP6+9tsS35pLxqdKBlOoB8bmMg8GQqwAhC4AlEi8Alkn8h6aU26RfVvZqRlbTQUQ4F4l7oOAgYlyXke5dVXfNpBns68FdTZUSYsm6YC6jnhcAAh82sGG6FfBsSnpLOINSrkTnrvBnXL54vrV2HwB3IHHvODgC4Hn1gZLltVeVyF+1VKkQPO12GYQv9kUWIT/U71AAmMcmAdh/wBPtDOE9mlzVJJpBKZfLvqKyNnNW+cwA2z0BfgKJe6DgIURYXHd18SvV10wcKx1Gqc7yXljeAOBD0RCEA7iw0Lv98I4rAFVpYwAkRyNTWCy/z0SpWJE7u/KbzFkVZzLx4QBXSucRNMVh827dVSXzGn0TBkuHUWob8WPaUtZnJO+9/WCIXQB8cDTS7AzL/7CUijlZsyreypxdUQzQiQC+lM4jxAviGUG/82ndlUWz2Bf+MqhKRQvBiM9pxNjhfhs7FAALK35TDsc6S6UzKBWrMmcvXpTRWr0vAxeDUCedR0g2iObUB4Kf1l5ZdCYDJB1IJS4HkF+ZM9x9ASAi2QLA+JoOr/lWNINSMY58K9uzZpffw0n+PQDMRaIeKMjYjYgeq7+q+M2aq4rEL2+uElPuospvAKyRzNDtCgAzDIADopYoFD3/X6mIyfrdsprMK8png80PAfxLOo+gwwxTed0VxX+rnV06UjqMSkDCp7Yz6MDtV8K6rgDUHzoSQEYUM+2IaYXo9pWKQ5lXln2SeUX5SWTpCALekc4jhED4KZngp7VXlNxT6yvNlg6kEgeDpf/dZdeUjtul80DXAmBJ/Frb1nCi3g5VqQGXcdXiN9KvKD+EiKYDWC2dR0gSEV9I7cEv6mYXzWLfWNHbnqsEwVZ8bguQ6XKa7PbHAIifQ+tpD4r/kJSKZ0TgjCsWL2xqbx7LhNkAGqQzCckF0Zz6ttwP6mYXTZMOo+KbSfaIz21sTZcP+V0LAPO+UU2zA15HE5sS9fKmSkXVcN+KTdlXlM+lJLMHgD9A+GplgvYC0YK6K4qXVl8xSfw26Co+FTxb8T2EL99tyLp3BYDIiDckpRJN5syyjVlXll9kLPYH07+l8wgab2CX1M4uWaAHCqqBQOAPJLfPTKFXAJhBAO0T/UjbMEMLgFJCMq4p/zjr6sUnsDVTiek96TxCCOBpQHBlzeySOdW+cZnSgVT8YJBoAQAwtvOZANtWAGoOHQFwukikzZhZ9nrJSilkX1P2asZegwsZdC6AddJ5hKQReJbTmvRp3RXF5/C0aY50IBUHWPwg98yNEycO2/KHbQXAmNEicTpxCIn6qUMpV6HpC4PZVy2e35KcMnrzgYIJeXMuBoYyY3797t9/WHNZ0fHSeVRsIyO+AgD2YI8tj7cVAMKeImm2CSCn7mPhDEqpToZe9nJz9lXlc73w7EPAfCTogYIM2ocMLaqdVfxK7ayiH0rnUbGpNdmuhPi/Id76YX9bAbC8R8jnRs8ntCfahDMopUJIu/r17zKvLj+XiQ8jcJl0HkFTAHqndnbx41VXFg/r/ulKbbPrwmUtAD4TDUEhVwBIeheA7v9XyuWyr6p4J/OaislE/P8A+lQ6jxADxhmeAFbVXlZy9VpfYZp0IBVDCKK7ASzz1tX+TqcBsnABSNhfJkrFnMyrK57LHNy0PzOdC+FzmwWlg/jG1JZBq+ouL5qhBwqqHrG0SnLzBAqxAgDsLpBlK2a7WnL7SqneoXNX+LOvXTzfBs3ezHQbkKC78Jh3YdC8ulHr3qqdWVQqHUe5nOGvhBN0PQaAGw7LAyB6CqADSP9QlFJ9kOMrq8u+bvHlAYM9QfwEAJbOJORgEL1Re1nxKzUzS/eTDqPcybJZLRwhq3pcx/UtOlYAgp5dReMAgCdhb0yiVFzIu7p8TdY1FWcCNA5AhXQeQVOIgu/WXFYyr3HmhMHSYZS7EIuvAKA9rWPO7ygAbKULgB+f130rnEEpFQFZ1y7+b9a15SUEOhHgL6TzCPEQeEYAzhe1l5f4vvKVpkgHUu4weF3LGgifCuhY7AZsKQAGIyTDAFhD06XPjVRKRVLmdYsXZeakjyXCZQDqpPOIIKSD+brs5uDK+kuLj5aOo+TRihV+AkQ/8DK40woAaDfJMMS6/1+peEQXvtCWeW357WD/HgTMRcIeKIjdLeHF2kuLF228ZPwu0nGULAavltw+MTrvAmDRFQAm3f+vVDzL8i2rybyufDbBHsCgf0rnEUM43nE8H9RdWnx255uyqATDJPqhl4k67QIgGi4ZBqDVsttXSkVDpq9yVbZv8cmAGQ9gqXQeITlMeLDu0uJ/1cyakiUdRkUfkewKAMDDgK0FAENEo5DVXQBKJZAsX9mbmdeVFzHRdCBhVwCPp0DbW9WXFo/p/qkqnlgY4TmPhgDbdgGIFgAnKLscopSKPiJw9nWLF2Y2+MeAMRuEeulMAvYywJu1l5b8WDqIih4XnAo4GAAMc6kHQK5oFK9dK7p9pZQYumtZS/YN5XM97d69QZgHSrgzgjIAfqZuZvE50kFUdDDoO+EEBQwYg03BAnS9JHD0meQq0e0rpcSl3/La+mxf+a8NzH4AFkrniTJixryaS4p/LR1EDTyP9W8UjuCsKy7OM0BgqHCQVvrh+mbhDEopl8j0lX2SfUP5dICnAPSedJ4oIiLcX/e7knOlg6iBlffC8gYG2iUzkBMcYuA3+ZIhAFQLb18p5ULZN1S8lvXx4EIwn8PA99J5ooQYfH/NpUWnSQdRA4uE5z5mKjBwhPf/g6WXQpRSLkULFwazb6x4qMU0jwYwG0CjdKYoMGB6ZOPMonHSQdSAEi0AhpFjABY9D5VANZLbV0q533Dfik3ZN5TPDVjPvgT6MwArnWmApRhr/t5waan0Cq0aKMyiBYBgsw0YOZIhGKQHACqleiT/5te/y7px8S8dh/cH8Lx0noHFuwQ4+JheMTBOGRJd/WaQ/AoAmHUFQCnVKxm+io+ybyw/zhKdCMIn0nkG0I/qLik5UzqEijwWXwFAtgFTtmQIGF0BUEr1Te4NixdlOWZ/EJ0L8HrpPAOBwXforoD4Q5BdAbDgbAMD2QLAVlcAlFJ9Rr6yQPaNi+dbf8reAM0F0CqdKcLy/NZeIx1CRRaR9AoA5Rgwp0uGYOEWpJSKD7lzX63Pvql8dtDj7AnQfMTRgYIE/nXdzJJR0jlU5DCT7CnwhEEGbFJFQzDVim5fKRVX8nxl32bfXH4uGZ7AhCXSeSIkyVp7qXQIFTlEwmfAMdIMiNNEMxiOt+U6pZQLZN1YuTznpooiCz4RwOfSefqN6Zf1l4wXvm6LihRrxee+VAOG6AqAh43o5RCVUvEt9+bKRVnemrFMfCmAWF5xTAuyV68QGCcI3CYcIM2AILoCAGtlfwhKqbhHvpXtOTdX3gnLe2w+UDA2f+8QawGIE5ZJ9sMvc6oBCxcAj64AKKWiI3tOZW32LeWzyTr7AfysdJ4+mLDhslLpG7ipCDAQ/vDLNMiAkCIbIqgFQCkVVVlzyj7PvqXyFAtTAuC/0nl6gTzB4BTpEKr/gtIffgkpBoBHNIT1xOZSnFIq5uX+fnFF1u8rxhHRzwF8I52nJwiYJJ1B9Z9D4ru/PfIFwBuQ/iEopRIYAZx1S/lfs5Jr9gTRxQDqpTPtDDMOls6g+s/DjvTqt2MANrIZvNI/BKWU6jhQ8JbyezyB4F5E+BOAgHSmMMawD8K/t1V/+ckv/eHXYwCSXQHwt0v/EJRSaquM25duyP59xfmOtfsBtFA6TwgpVc2lg6VDqP5JDop/+HUMIN0kU/2y21dKqR1l3rrk05w55dMJPBXAe9J5OkvyB4dLZ1D9s8m0SH/49RgAjmiEL9dK/xCUUiqs7DmVr2anVhwMxiUANknnAQBmEr2Hi+q/YSm7S899ju5HUkqpbpAPNufWirvZccYBaJTOY8Gy93BRccFA+o5ZI0YkiW5fKaV6oPryiYdTMPg0gAzpLIaELyOr+u371i+ThSMEPeg40lXuQMDUpmQALWLbV0qpnai6sniYEyAfEf8K0rtMNwsSuWJXhOq7VCcjyW9FD4ELeEDCKwAmWVcAlFKus9ZXmJbWmnoBW1wJ4kzpPJ05JrheOoPqn3bbkkyyl+EJesAISiYA/FoAlFKuwT6Yupai09FKcxgYJp0nhGB2Y9ta6RCqf7zsTQ6AJSMEtuwCkOP3SO8HUUopAEDNlcXH1bXiVhDGSGfZia9o/go9fTrGBSiYJHwWflC+AJiAFgCllKi62UWFINzGjMnSWbrH70gnUP0XZJMsfEBJwAMSPgCPHN0FoJQSUXvVhB/AOjcDOA3iF0XrGSJaJp1B9Z8TsEkwov+Ta/GAhQtAwGoBUEpF1QZfabq33c4ky7MA4Vui91LQ0kvSGVT/WZhk2cbJmzxg4StbGaO7AJRSUcG+sUl1/tzzqT14NYA86Tx98GX+3eUfS4dQ/ed4TDJbwZPwiFo6dgEIHogYIF0BUEoNvJqrik6ob6c7CRgtnaWvmPAX6QwqMiyCyQSSC8DY5AHLXlCCLMXU8ptSKrbUXFVUZJhuB2OcdJZ+sh52HpcOoSLDsElm2dMAWzwgK7oCAMO5gltXSsWphiuK9rLG3ATwT0Ag2d+1EbEo666yz6VDqMhga/NAgisAhE0eEDVB8F8GMcfifjillEs1+iYMDrSbay3RDIC90nkixvDt0hFU5JBBLkuWUkazBxa1ghEAUL7s9pVS8WDNJeNTMwY5FwYDdAURsqTzRNh/cu+orJQOoSKHQQWi22fUeEBcL7o0xjF5JK5SyiXYB1MXLD6TGDcCGCGdZwD4EXRmS4dQkcXMuZIHARpCvQegOtFdAIa0ACil+qTu6tIp9QF7GwEHSv4eG1CEu3L/UPahdAwVWSS8+s2EWg8gvAuAWXcBKKV6pcZXfIAJ0m2APSpe530AAOHTdkq9QTqGGgD3ZB2eAAAgAElEQVTMogcBEnOdB0T1YgkAMHQFQCnVMxuvOmIXjwlciyB+BUD4UuoDro2YTht6x8vN0kFU5BFRvujed0KtB0HpgwB1BUAptXPVvnGZDifNgg1cDCBNOk80MHBB7p3l70rnUAODha9EaWHqPPDQBuH7AeoKgFIqJJ5R6G0YOmgGW1wLYLB0nmhh5nvy7qp8UDqHGhgM0AYgV/AqACDiKgO0rRfMAADJvLIgXTiDUspl6nylU+qHDnqHgfuQQJM/mJ/NzfLMlI6hBk7tlMJMAkQvg2+RtM6DQYM2or7VQvJWmO3+fABNYttXSrlG/TVF40B0O1tbJJ0l6ogWZTdtOpXuWiG7LqsGlD85NU/40pSBYWVlNR6isgDXHV4NQO6iBAHaBcBqse0rpcTV+Ip2I9BNDDodVvIuKTIYeDqnsfkMmr/CL51FDSxiO0L0MsBAFQHWs/kP6yFYAIIGowAskdq+UkpOwxVH5nGS/2pmnA/hZVFBd+V8M/QyWrgwKB1EDTw2ZiSJXgcYGwCgcwHYTyoJsRkptW2llAz2jU1qoLzz2Pp9DGRL5xHSAtB5OXeUPyYdREWPgR3Fsotc64EtBYBprWQSEI8S3b5SKmrYB9NAJac1MN8Mxg+k8whaxeScknu7XuUv0TDTSNEAxN8DWwoA8RrJ4xGIMVJu60qpaKm9ftLkBsZtYC5E4u3m34IBPMme5Aty574qeiE2JYR4FFjwKoCW1gDbdgGsEUsCgAFdAVAqjjX4SvcB2RuYeZp0FmGfE5vzs+9Y/Ip0ECWHQaMk668lfANsXQGwoisAAHblN+ChycKXJFJKRVSDrzSfYa9hsudj2weORORn0J316cY3ylfWKh1GyeHCQm8VsItkBjLcqQAEaQ1ItAF4kJI9AqhbLRlCKRUZG3yl6clkZzLsTACDpPOIYn7WkJmddVv5Z9JRlLwNg5N3I+H7WFiYb4EtBcB414DbJfMg4MFI6LUAlIpp7INpMCWnA3YOGMOk8wj7LyzNzLmjolw6iHIPdpyRBCuaIWlTYNsxAJRdWcu1hzUCyJAKRIxRAMqktq+U6p+GG4uOb2AzF8AY6SyiGJ8T8ZVZt1U+Q4jrmxWrPnDIjpK9BADq8pYvbwC67pP7EsAPZfIAZPRaAErForobigoNzG3MmCydRVgNEd+a1ZpxN937Qpt0GOVO0ge9M/D5lsedCsD/b+/O46Mqz/6Pf64zk4RAIAQSNvfdilorKgKhhopWW/tUrWCtrXXFfV/QusXWfcOlretT11of0GrFigtKgABuVH8qlrZardYNEhJCyDYz5/r9wZaEmWSSTHKfmbner5cyuefMOd9hyfnmzDn30Y9wWABQ3cXZto0xXVZz7fe28TR6HfAzdTyriUsCTb5yl0RCNwy+o6LWdR4TeDu53LgnfLzh8aYCoPKR06NVwh7uNm6MSdaK8rKCvJB/ERqdDvRzncchReQpYkwfcuuCT1yHMWlCHf6gDeCz8WTUTQXA049xOQu1srPO27afTPrULpExJoD0vjE5q6sKThDf/w3ZdHve+F4T5eLBNy/4m+sgJn18PmVcPo3s4DSEF/cIgPcRbs9MDDOwZjfA/kEZEzB11x7wo7qVerugO7rO4pKgyxGuGnxj5SzXWUz6yW9kD9/xJYCoxCkArQ4LuBLzZU+sABgTGHXXlpWq+Leq6ljXWRz7SoSrCj8e+ZDdsc90l++Fdsd3ewmA+F6ckwCHvPEFq/Z1eymgnQdgTCDUXV+6M3jXqu8fRRaf4AesVeS3mt98/dDydZdOGdNtvr+n43tgrC5euPDrDV9sLAAiqFazHNjXSSxAlD1dbdsYA3XXHzgUjVysyvlArus8DvnAH6Me00uuX/CV6zAmQ4js6XhmiGWt56ZoPzf3MhwWAHV5GaIxWezL8jH9++cMOFs1chlQ6DqPY3PV48Ih1y98z3UQk3GcHuUW+LD1120LgMjf+zTN5kr09QHDZf+13zjOYUxW0HK81XkH/ERUb8Zuy70U8S4uumH+PNdBTOapOmzcFj4Uu8zgiy5r/XW8IwBORUPhPQG7VaYxvaz+hrLJderfIqp7uc7i2OeoXlvYr/JBKXc8SbvJWL4X2gPHcwCLLx0cAfD40OlcAICnYgXAmF605vqJuyneTb76h7nO4lgNqjcV9gvfKXaLXtPLFH9PcXw+bSjc0RGAwjc/pWqM0ysBUB3jbNvGZLCGm8q2jPr6G1U9DtRzncehFoHfkRu9trB8ySrXYUx2EJW9HUeoKX5tyRetB9oUABHUX8m7wMQ+jdU2xARn2zYmA319y8ED+kebzor6/hVAges8LqnwvEjsvMJrF3/c+dLGpJDIBKcfASjvtB9qfw4AKrwj6rAAwNb65pCtZL9VnzvMYEza0/vG5NSvKjhBo02/Boa7zuOWvO6Lf/GQ6yorXScx2eerw/fflphu6TSEJFEAPF/fcX0D65joBOBJxzGMSVv1N5RNXlPrzwDd3XUWx/4JekXhdQufEqd3OzPZLBwNTVDn02lJ5wUA5W+u5/0S3wqAMd2x+oYD9hX0Fl/8A7J8d1eN6i2FuTUzpHxZi+swJsuJTHDdP/2Ql0QBGDboQ1aubsLlbT4FOw/AmC5YdWPp1mGVaxH9OY7nGnWsAeRuP5p7w5Cb5q52HcYYAIVSxxEaR8RC/2w/uFkBEKmI+iu+8z4OZwQE9tTK4oFSWrXGYQZjAq/u+gOHihe5UoXTyfape1UejhK5qvi6tmc6G+PSqiljCqNNOtptCn1PKiqi7Uc3PwIAKPqmuC0AoWheZCww12EGYwJLy0fn1vUfejoaKVcY7DqPWzpX/dDFRddXvOs6iTHtRZv6jQecXnYryOvxxuMWAE/lDUXP7N1IHfPWnQdgBcCYVlSR+lsOOGqNcqOobu86j0sKH4bUnz7o2srnXWcxJhEPmeC7/vxf9Y1443ELAKKvuz6BSGw+AGPaqLvxu+PX3Cq3AONdZ3HsC5BfD14+7H9l1izHc5ca0zFFne/LVHRJvPH4BaDk3Y/4Zs9qYGhvhuqIKvvrTEIy1fXkxMa4tebGSaNVYjch8kPXxdyxOlRvXLM2esdWM5Y0ug5jTGd02picqq/Z1/G/229GVrz+abwn4hYAEdT/mjeAH/Rmqk4MZOtB+0Jd3M8ujMl0dbeWFYvqlar+GSDxy3p2iCA8FI7kXFVw/at2p1CTNlZ+029/gQFOQwhxf/qHREcAABF5XVVdFgB8vB8AVgBMVlnxu7KCvAYuQvUidf3NwzXlz17Iv2xQeeVmlzAZE3jKoa4jCPE//4cOCgA+zqfMVNFDgKtc5zCmL2g5Xl3/7/5cGvRGYKTrPI69qR4XF5UvWOA6iDHdJbgvAKq6MNFziQtAtP/rhNc2A3m9ESoZAmN0UcEwmVC/wlUGY/pC/S1lk9eI3ibKnq6zOPaZClcOvmbBYzZ1r0lnK35QNgIi33Yco7GuX9HbiZ5M/BHAVksa/a/2fAu3Mxh5sRzvYOBxhxmM6TW1t04a4+Hf4qOTXGdxbBXKzYU1A+6Qu+c0uw5jTI/ltByKitNZOUV5fac5if89dXhikSoLxPEUhqLeIVgBMBmm4bbvbhVVuQL8k3E8SYhjLcC9Kt7VRddU1LoOY0yqiMohrjOoR4cfoXVYADxkvsKvUhupq/T7qngi+G5zGNNztTeUFoVzw9Oj6Lm4vN+GeyrwlB9i+uArF3ziOowxqaRTpoSqWr6c7PpDLF9kfkfPd3xpUTi6mKhEUHJSmqprinl90L5Ql/BMRmOCTstH564tKD5ThSsUHeI6j2OvKnpJYfnCv7kOYkxvWNH89f6e4PrfeYv2b+pwv9lhAZBhy+r9L3Z/C8czj/kehwBWAExaqrv9gB/VKzOAHVxncWy5ilw1+Or5s1wHMaY3hUQPdX0Gq6CLR81e2tDRMp1OLqLwijguAIocClzjMoMxXbX6trL9PU9vQZ3fCtS1lcB1g9T7nZRvfkcyYzKNin8o6vau3D7eK50t02kB8OBlhatTE6l7BPa1ywFNuqi7Y9IuEvNvRPRw158BOlaPyC2N+Xm3jbj45bWuwxjTF1YeOXEkMf87rnOopz0vAIwqfpMvVq4GClMRqps8Pxw6ErjXYQZjOlT32wOHepHYxer75yPkus7jkI/oH8Mhpg+4fMFXrsMY05fUjx0luL38D6gZMWSLTs+x6bQAiFRE/c93nwd6eGpydY/gT8UKgAkgvW9M/zWNA86WSPQyVadFOQB0bsznwiHlC99zncQYF8SXqTje/Sv6SjJ3ykzqBiPi6Svq47QAKHKAVvYfJaUNX7rMYcwGWo5XP/iAn6xt4GaBbV3ncUp520cuKbp6wTzXUYxxpfrIsVv6sSDcrrvzz/8h2QlIxP9rj7KkhufnhI90HcIYgPoZZZPrCw9YijJTs3vn/7mqnDpIF4wtunq+7fxNVvNj4Sm4n9hLc/zoi8ksmNwRgFF//4//+W7LgNE9itVDCkcDv3WZwWS3NXdN3E187yZFD8vyE/xqFG4qjHl3SnlFk+swxgSCcHQAvi+8O7Tijf8ms2DS9xhXmC2OC4DABH27aGvZp+YzlzlM9mm4/XtbxCR2FT4nKYRc53EoIsJD4ukVA3+1cKXrMMYExaoflW4dQ/dznQOR55NdNOkC4HnyvMa4tHuJUkb8aOxI4A7HOUwKKRrF4Vkzoon/HVTfNXZQnva7NEb0PFTy+zJXwCgwU0P+rwovq/y36zDGBE3M06m4/Ea2nvqS9Ef2SRcARi17nc93rQKKuxMqVdZ/DGAFIJOI14i6O27mqw5oP6b3jcmpb+5/KshVipa4yBUUCgsEvbjwioVvus5iTGAJR7uOAKwYfkDlWyR5Nk7SBUCEWOxznSPwi+4mSwWBsbpo8DYyofY/LnOY1FFfG1zWZoGtNmYpx6sfWvqT+ma5FtjZYawgWC7opYVXLPyL6yDGBNk3h4/fAdjHdQ7gBSlP/sZ5yR8BADzkL4o6LQCA+OHYVOAWxzlMinhCg8MDAIjIWC0fnbt2aNGxa+ESkF3dpQmEb1TkmsIWecCm7jWmcyFkqvtz/wC0S2W9SwWA0IA5xOobgP5del2q+RyHFYCM4QtV4vBfj6LfX1tctBxlO3cpAqEB5faWnNjNJdMXrXEdxph0oCBVwnEBOPu/vqWBl7rygi5dryijljYAc7oUqTcIu+sbA8e5jmFSRV1f1TEQsnrn7wvM8jW8W+EVC660nb8xyVv54wmlgPOjhgLPb7VkSWNXXtO1IwCAqDyt6E+6+rpU85VTgCWuc5ieC/n8J+kPrUyK6VxfQxcXXV7xruskxqQjET0lACf/Azzd1Rd0fcaiaPSvQBAm/piqbxdl+bzrGeNT1wGyjcK7nngHFf5q4UG28zeme2oOLxuMyFGucwCNxHKTmv2vtS4XANnpozqQpOYZ7mUD/FjkGNchTM/l/efdj0HssHPf+EJETh204/B9Ci6rmOs6jDHpLEbk50AA5gfROcMqKuq7+qpuzVksqrO687qUUznNdQTTc+suW9F3XOfIcPUK1wzMi+w08LL598vUzu8UZozpmAonuc4AICrd2id376YF/fv9GVjbrdem1rd1SeHerkOYlHjbdYAMFQHu9/ycHQsvW1AuF3TtJCFjTHxVh4/bD9jLdQ7QtbFQwezuvLJ7RwBGvLdWVbq1wVTzxZ/mOoNJAWGx6wgZ6GkNMXrQZQtOLbj81W9chzEmk2godLLrDACi8syIl1/u1g/k3b5toSf6p+6+NsWO1criga5DmJ7JX9vyEtDsOkeGeFPggEGXLjiq8JIF/3IdxphMs2JKWQGqP3WdA0BVnujua7t/3+JVhXMQqrv9+tQpiHnNU1yHMD0jZy6rV1jgOkdaU/2Pwi8HTl+w/8BLF9jvpTG9RKItx7Bu/hDXVpasbur2ybzdLgCyz9KIKk919/WpJKJnus5gek4gEB8rpaEqRc4d2Lxq58JLFzwqEoA5yYzJZJ6c4ToCACozZenSSHdf3v0jAICnPNaT16fQ3pE3Cr7nOoTpmaiX8wTBmGMiXbQI3BXL9XYqnD7/Lilf1uI6kDGZrvqICQehQTj5Dzz1H+3R63vyYtnx40XA8p6sI1VCvlzoOoPpmUG/fLMa5BnXOdKAArN8j10HTl9wbtH5FbWuAxmTLdQLxr5GYFnxa0t6dIvuHhWA9SEe7uk6UkHRQ/X1gt1c5zA9I/j3uc4QZIq+GgrpmEHT508dfPGCT1znMSabfD1l3B6KHuw6x3oP9XQFPS4AhP1HQINwy1DxVS9wHcL0TP6J78wHFrrOEUDLBaYWXrJg8oALF9ikScY44PnehQRj4v+oRiJ/7OlKen4EYLtPvwavS7cg7D3yc327/0jXKUzPiKfXuM4QIF8KnDqwQfYYeMn8YMzAaUwWWvnTCaMEAjH9vCjPD6t46+uerqfnRwAAwf9DKtaTAnl+xDvLdQjTM/nHv/OqwDzXORyrF7iqgbydB14y/34prwjCUTZjspZG9Rwg13UOAER6fPgfUlQA+GK754AvUrKunjtd55UUuA5heiYqcgbZOTGQDzwWCvs7D7x4/m9GXNy9Gb6MMamz8n8mDBTkVNc51vuyeFXTnFSsKDVHACZVRFUIylGAIr9f8wmuQ5ieGXTC0uUoN7nO0ZcU5noh3WvQxfOPG3D+wq9c5zHGrJenpwCDXccAELi/J9f+t5aaIwCA54UfAIJxhzHV83QmIdcxTM/0b1h9PfCe6xx94C3xvLLCi+YfVHDBgvddhzHGbKJlZWFUznGdY72oRPXBVK0sZQVAdvz4c+D5VK2vh7aPbTUoEPM0m+6Tcz5q9rzYj4Eq11l6g8LnAqcOrJ+//8AL5s13nccYs7mVJS0/B7ZxnQMA1eeKX1uSso/bU1YAAET1nlSurydEtVznEXadw/RM/gnvfqq+/IygHF1KjRrQSwfVy84DL5p/v5Tjuw5kjNmcThuTIypXus6xgXqp3cemtACw6+evAB+ldJ3dt2Msb+BxrkOYnis45e1XUDkD0n6O+2aF231p2XHQhQtukvIKm/bYmACrqsk/AdjedQ4AhH8Oe+n1V1O5ytQeARB8Qe5I5Tp7QpSrdFlALtswPTLglLfuR+RU0rMEKDArFguNHnTh/AsLL1iyynUgY0zHdMroXEEvc51jA0VmSIq//6X2CABAQ+whCMRtggG28WsLT3IdwqTGgJPeegCV04CUnAHbJ5QFnsfYgRfOnzr4ktc+dh3HGJOclVp4qsK2rnOst7Klzn8k1StNeQGQfb5sUOH3qV5v9+mVuph81ylMagw45a37Pd//HrDCdZZO/ANl6sAL5x8w4Lz5b7kOY4xJ3ifHl/UTkemuc2ygwu+3WrKkMdXrTf0RAMCLRX5HcG7rOtJn0DTXIUzq5J+6tDIUYhxIpesscXwFcnpBnew+8EKbuteYdFTQED0T2MJ1DgCURl9Cv+uNVffaTQ1iH4x6QFRPBkB103+Atvu6/fMbx9rQVr+0e679siqtlhWAb7z6/B3k+9/YrGoZRMvxGkftd6bCDSgDNv51VlA2+zuw6fHGvy7xH2uiZbTdP5e2f+1WiupNAwasvUdOXdrQ0/dmjHFjxZSyApHIv1FKgLb/zjXBr52MaZLLbfp105Pqy33DX150WtJvoAt65QgAgKd6O8E5YWu4X9BwpusQJrWkHL//tDfvFpFdEe4FWhzE+Ccqpxf0r9+24IIFt9nO35g0J5FzYP3O3z3fC8vtvbXyXr2tof/+qNmghwXgCAAoVV44vIPsv6quZ+/KBFXjPftv63t6EcrPFCkCeusIQCMifxafhwesrnjNruM3JjPUHF42OJob+TdQlNxP6h081+pxd48AiPJsyUuLj0j+HXRNr06UI/i3KXJYb26jC4qj0dgVwCWug5jekX/6658CZ+lDZRetbW4+QkV/KsokYGAKVv8NInPxebYxlxeHnVlRn4J1GmMCJJobuQoocp1jAxXvtt5cf68eAQDw3x/5Fqr7BOAIAIq0hDwdLePrgjJZkellWl4WXlPSvJ/n8V2U3UB2QdkFKExwBKAZ5EtV/o3qByree4i3eNDZFctdvQdjTO9bOWXCLgjvAzlAkj+pd/Bcq8fdPALw+rAXF49LNn939PpUuSJym6r+qbe3k6TcmM+twOGug5i+IeUVUWDx+v820plTQqurvhqUp/4g8byQHw23NMeoLzq/otZNUmOMUx63o+t3/gGgyq29vY1ePwKg8wjrkBEfgW4TgCMAGxY/KGfi6rk9eFvGGGMyxIqjJxwq8EKyP9H3wRGAj0sGbrGLzJrVq/dA6bWrADaQSURF5Ibe3k7XyJ36dnCanjHGGDe0rCwscIvrHK2Jyo29vfOHPigAALR89Qfg332yrSQIupvfWGSTAxljTJarGhE5GxjtOscGCp8VD6p9tC+21ScFQPYhIiLX9sW2kqXob/SNgUNd5zDGGOPG6injhgBXuM7RmodeK7OW9cmcJn1zBABg+dePggTpTOqiaEvoKtchjDHGuNES8q4DhrjOsYHCZ8UFq1N+059E+qwAyFRiovymr7aXDIEzmucV7e46hzHGmL5VfcyE0cDJrnO05iHX9dVP/+u215f2+uZJYFmfbrNj4VBY71Lt/ashjDHGBIOW4/nKvfTBpfBd8GlxQc3DfbnBPi0AIvgiWt6X2+yUMim2cMhJrmMYY4zpG9X/KD1NoNR1jjaE8r786X/dJvuYKuK/W7IU1e+4mgcgzvzwq0Nhb7SMr/6iW2/KGGNMWlj50wmjRFiGMnjjnqOL1/X3wjwA/yhpyNldKiqiybyHVOnbjwAAEVQ9vbqvt9uJwlg0dqfrEMYYY3qXiP4OGOw6R2vqyWV9vfMHBwUAIPztqtmKvO5i24nJT6IVg3vtrkvGGGPcqj5mwlSQoE0F//aw5yufdbFhJwUAQL1Y0I4CgMhv9ZWiQtcxjDHGpFbtz0qL1CNwR3oVuUw2+1y7bzgrADl7rXpZkBddbT+BUbFcudl1CGOMMakVVf9WlBGuc7Qlfx3+10pn96VxVgAABL0AiLjMEMcpkdeGHug6hDHGmNRY+fPSMkROcJ2jnYjE9EKXAdwWgDHVf2fdtZhBInh6jy7eMt91EGOMMT3z+ZRx+aL6AA6ueuuIqtxd8uKif7jM4LQAAHgtkXKg2nWO1gR2irY0BOreBcYYY7ouP0duAHZ0naOdlbm5Yecz4zovADK+bhUq5a5ztCdwfrSi6FDXOYwxxnRP9bHjD0bkHNc52hPhyqJnK2pd53BeAAC8T6rvAd53naMdAe9BnTew2HUQY4wxXVN3TFmxIg8TsEP/AsuK1+T8r+scEJACIFOJ+Z5/nusccYyKkfuA6xDGGGO6piUU+V9gpOsc7fke57uY9CeeQBQAgJwxq18TeM51jjgOj1YUn+I6hDHGmORUHVt6BvA/rnPE8fTw5xa94jrEBoEpAADi6QVAs+scm1Gd0fRa8S6uYxhjjOlY1S/2/xait7jO0Z5CC+Jf6jpHa8EqAPus/hiVu1zniGNAyOMJnUmu6yDGGGPi+9fZh+ZB6I9Af9dZ2hO4ddhzSz5ynaO1QBUAAE/lWtCvXefYjLJ3tKTkGtcxjDHGxDekdvV1wHdc54jjSxFudB2ivcAVANl/VZ0qgbtsAwDVSyLzistcxzDGGNNW1XGlkxU533WOeFTlrJLnFq1xnaO9wBUAgPDY1bMEnNwdqRMeyp/05eJRroMYY4xZZ8XxZSNQfZQA7tNEeHr485XPuM4RT+B+szaQSM6ZgPOJEuIYEc2Rp+x8AGOMcU+njckRPzqLAF7yB7KamH+u6xSJBLcAlFZ9ifAr1zniUsZFh5QE7ixTY4zJNtVN+XcKlLrOEZfoRcXPL/nCdYxEAjVDUnuqeLE3B1UIMnHj7ZJ14//aLNj2a2m17KbHSvzxzR5vXJ202uzm46IcH5688pHuvj9jjDHdV3XcxJ+DPga03Q9ou1/jjWmrp5NZPsE6Ej+n84ufWzxJNtthBUdgjwAAiOCH0JOBJtdZ4lHhnpZXi/d2ncMYY7LNNyeWfhvR+1znSKBZVE8L8s4fAl4AAGTsmn8iep3rHAnke3hP69wthroOYowx2aL2Z6VF4Rh/JoDX+wMIUl48e8ly1zk6E/gCAOCtrbsReMd1jngUto1q5AmdSch1FmOMyXRajhfJ4Y8K27vOksB7Q4c33uY6RDLSogDIJKKecCoQc50lLuHg6NBhV7iOYYwxma76P6W/FgjqrdpjKCfJ/UsjroMkIy0KAIDsV/cWEMRpgtdRroq+PDyIN58wxpiMUHVc6RFoQK8OAxBmlDy36G3XMZKVNgUAwAsVXAEE9XMVT4UnW14aPtZ1EGOMyTQrT5ywDx6PEdyr1z6MRJuudh2iK9KqAMg+XzZ4KscCLa6zJJAvHs/qqyO3cR3EGGMyRc3xZduKyvPAANdZEmhW9NhRs5c2uA7SFWlVAABk3Oq/IVzpOkcHRkR9/wV9fusi10GMMSbdrZo2uTAm0dnAcNdZEtNfDXt28buuU3RV2hUAAG+/NbeKyquuc3Rgt2huyzP6wo55roMYY0y60mljcvxo09PA7q6zJKLwSvG3F9/hOkd3pGUBEMEXjfwSqHadpQMHRMJrH1IN7OdVxhgTWApSHc1/EOVA11k6UCUxjpdyfNdBuiMtCwCAjG/8QoVTXOfoiKDHRF8ZEeSPK4wxJpCqTpx4DXCc6xwdUeSMkucWfek6R3elbQEACI9d8wzwB9c5OlEefXFEoP8SG2NMkKw8ufQYQYM+t8p9w56pnOU6RE+kdQEA8Br7nQv8y3WODoiKPBB5afj3XAcxxpigqz5x/MGiPEJwL/cDWB6JNF3gOkRPpX0BkEkr6z3xjyG4lwYC5Cre7MiLIye6DmKMMUFVfeL4cYj3NJDjOksHIuL7v0y3S17cGCsAABljSURBVP7iSfsCACD7NywFfu06Ryf6q8jslpdGjnEdxBhjgqbmlPF74Xl/BQpcZ+nE5cXPLnnTdYhUyIgCAOB9Xn+jKC+7ztExLURlTvMLI3ZzncQYY4Ji1Unjd/c1NBcI+vwpLxTvsSgtbvSTjIwpADKVmMRCP0X5t+ssnSgRz3utac6oXVwHMcYY11acNG5HFe9l0EDfVl2UT/P8yHHpeslfPBlTAABk4uoaL6RHggb9s5nhHrzSOGfEtq6DGGOMK9UnfHerkOe9Aox0naUTjareTwY982aQ557psowqAAAydu3/U/VOdZ0jCVuFCL2iL24T9L/4xhiTcl+fNn4YYf9lkG0dR+mUKKeX/Hnh31znSLWMKwAA4Ql1j6Nyj+scSdgxotGXdO4WgT70ZYwxqVQ3raw4x/deA3Z1naUzgtxV/PSiR1zn6A0ZWQAAvMF15ykscZ0jCXtEImIlwBiTFeqmlRVHib4EjHadJQmVQ4c0XuQ6RG/J2AIgo2kJ5fhHAl+5ztIp1TGRFhaufXmrUa6jGGNMb/nm5LHDI0RfU9jbdZYkfE2Io+X+pRHXQXpLxhYAANlv7dee6FEEe5Kg9eRbORGtbHxum+1cJzHGmFRbNa1063AoZyGwh+ssSYioMrXkyfSd5z8ZGV0AAGT8msUol7rOkRRhu1AoVtE0e8udXEcxxphUqT35u9upMA9Ii+9tolww7KlFC13n6G0ZXwAAQqV1MxD+5DpHkrYOhaSi+YWtbbIgY0zaW3Xa+N1jYX8xsL3rLEl6vHjWot+6DtEXsqIAAHgtdSeisth1jmSoMkpUK1tmb7mf6yzGGNNdK6dN3Fvx5gEjXGdJUmV9/5xA32Y+lbKmAMgkmkK5sf9RCfSdA1srQuTlyPPbjHcdxBhjumrVtNJSz9PXgGLXWZL0cVS9I7d7uKLJdZC+kjUFAEDGrqkO+/5hKOkym1Ohoi81zt76QNdBjDEmWdVnjD9YQ7wIFLrOkqQq9f1DRs5auNJ1kL6UVQUAQCau+ad63uGg6dLyCjzhhZbZWx/nOogxxnSm6oyJx6PebJQBrrMkqckX/8fDZi35yHWQvpZ1BQAgp7SmEuGXgLrOkqRchYebZ29broq4DmOMMe0pSPUZpeWi+gcg13WeJCnIScOfXJIW54elWlbvTGILiy5X1Ws3/jYogLSqBZsea4LxNo+11W9nu8fafnzDtpJ4rG3G9ZHcxoHTZOqyNJjbwBiTDXTK6Nya4qIHFX6xabD9QnHGE4xpF5df96smuVyrX0WnF/9p8c1kqawuAADRBYW/B+90ID0KgILAazkx+Ykc8WltV9+vMcakUu3ppUU+/FmhrM0TAS8A6vNgyf8typoz/uPJyo8AWgv1X30u8LLrHF2h8L2WEIsan9l2W9dZjDHZq/as724XExZttvMPOIUXi7/JOd11DteyvgDIPkRCXugogf/nOksX7eZ5LGn5y/b7uA5ijMk+VadN3C/m+0uAb7nO0kUfhKJNP5WKiqjrIK5lfQEAkNKqNV7Y+yHwb9dZumiE4lc0/WW7/3EdxBiTParOLD1CPJ0HDHedpYs+0pB38JBZS1e7DhIEVgDWk/HVX4RCTEL4j+ssXTRA4NnmZ7e/Ucvtz9MY03sUZNXppdNFeQro7zpP18h/Q37soJLHFwb/DrF9JOtPAmxP55fsFNPYAmBEUE8CTJhBZE5uKHqsHPZZTZfetDHGdGL1+eOGRFtCf0Q5ZLMn411QHayTAFfg+wcU/2nJ8jhJs5b9xNiOHLDyXzHRgyFtZgvcRPXQlmj4XTsvwBiTSjVnjN8r2hJ6C+Ls/IOv1o/5h9jOf3NWAOLIO6DmfV/8g4B0vMxua1UWtjy7/Qmugxhj0t+qMyYc64u3iPS5m19rdaAHD3tyyTuugwSRfQTQgcj8IePFl5eBAWnxEUC7x4rcnxfpd7ZNGmSM6SotLwvXrIxeqzC97RPxFk5irO8/AmjwfT102BOLF8RJZ7AC0KnIvKGTBWYr0i/dCgAIqiyKhcJTB/z4H18m+ZaNMVmu6rRxW3jh8CxUx222b0+PAtDiKYcP+eOiOXGSmfXsI4BO5EyqngscA6TrNaMTQrHo241P7zDJdRBjTPBVnV06ORQOLQUd5zpLN0XwdKrt/DtnRwCSFH2t+GcKjwFemh0B2LBdH/TWvFi/K+0jAWNMe3r2oXm1/prrVLiADd+ElM1/uA/2EYCYqvyi5PHKP8VJZNqxAtAF0XnFP1XlUZCcNCwAGwY/kFj4Z3lTl7/f+Ts2xmSDqrPG7erhPQHynTZPpFcBiKFyYvHjlY/GSWPisI8AuiA8qepJEY4Emlxn6YHd1Yu90fTUTufarYWNMTVnlx7nSejtzXb+6aUFmGo7/66xHUA3ROYWT0LkOaAgDY8AtMogL0Y154SCqcu+7vRNG2MyypqzJ5ZE4EHQdVOJJ/gpPg2OADSI+EcMfWRxWt3ULQjsCEA35EyumofyA6DOdZYeET0kLJF3m57a+Qeuoxhj+k7V2aWTI+i7G3f+6ase9X5kO//usSMAPdDy6tD9hNAclCFA+h0B2PRYgTvytOFymfrfxg7ftDEmbX1+/rj8/rHQDaKcQ/vv/2l3BECq1fcPKXls0dtxtm6SYAWgh5rnjtjNw38FGJXGBWDD43+jemq/o/85N/E7Nsako1VnT5iIyAMou8RdIL0KwDeeysFDHl34XpwtmyRZAUiBpteKd/F8eUXU22rjYHoWgA3/f7w5LOcPOnJ5+t0PwRjTRs15ZYPVj94EnMLGbyhxpE8B+MzHmzzs4QX/irNV0wV2DkAK9Pte1T9yJDxR4CPXWVJAFH6RG+GDxie/dZzrMMaY7lt1dumP1I9+AEwjA37gU/gk5jHJdv6pkfZ/IYJEXx26RdQPvwDsmcZHANo/fibm61kDjrGphI1JF1Xnj9vC88O/R+Oc5JemRwAE3vUj8oOSxxd+FWdrphvsCEAKyYHVX4TD/gTgr66zpIoqR3jifdj05LfO1XL7+2JMkClIzbmlx3l++D3S/wz/1l6hJXKA7fxTy44A9AKdRzgWGXmPoievG0jfIwDaNs98T+XMvJ99uCzBWzfGOLLq/O/uga+/B0rXjcT78Z20OwIgyn1DtgmfJeUV6Xo/lsCyAtCLWl4efq4gt6PiZUgBAMQH+WM01HzhwKkfrUz03o0xfWP1+eOGRMm5Wnw9AwhveibtC4Aq/LrkD5Xl8eKanrMC0MuiL404SpFHFfKBTCgA69as1PgqN+XnMMNuLmRM39PysnDN6uiJqFwHFMfdU6dvAWhWnxNKHrKb+vQmKwB9IDJni3Hq+X8BSjKlALR6/A8RubDfMR9kzHkPxgRd1fmlkz1lBsjuGwczpwCsiokePuzBRQsTJDUpYgWgjzS9MGwHLxT6KyrrJuHInAKw4fFcT/zz7PwAY3rP6nO+u5Mf4jpVnbLZkxlQABQ+Vl9/WPKHRf9IkNKkkBWAPqQvjCiJeN6zwPgMLAAALeJzV15e3rUydenqOL8FxphuqDmvbDASu0rhLCAnuZ1wmhUApTIn0nL4oEfftAnI+ogVgD6m87btF2lu+QPKMRlYADY8XgXc0s+Xu+W499Zu9ptgjEnKijPKCsJ5sXOAi4CijU9kWAFQ1cfXRHNO2e7hinS+1XrasQLgSMuckdPA+y0b23xGFYD13zi0CuTW/LyCu2TqErvJkDFJ0rMPzavJXfNLVK5BGbH5AvFeFGcg+AUgKnDFkAcqb0qQyvQiKwAOReaMKvWRmaKMzMwCsPHxCkRvz4+uuVNO+NQavjEJaPno3NVrio73Va4GRq0bjLdgMmPBLgAKKxU9uuT+RfMSJDK9zAqAY2tf3mpUTsyfhcp4IFMLwIY8n6N6W/7qhnvlnI+a2/9eGJOtdNqYnNqC/GNArga2b7PvzMQCoCzyRaaU3G8z+7lkBSAAdObo3MiA2hmInJHhBWDD8x+LyDX9+u34hEydFdvsN8SYLKHlZeHautjPEa4Ctmv103GrheK9MJmxYBYA8fXuImm6UO5fGkmQxPQRKwAB0vzClseKcj9IfyCDC8DGx58iem9TU/jeIafaVQMme6w4o6wgJ98/CfR8YJuNT2R2AWgCzhh6X+VDCRKYPmYFIGBa/rrFXuA9DWyfBQVg/UukTnweJha7pf8p7/0XYzJU/bkHDo/kRE4HPRtlyGYLZG4B+MxX/UnJfYveTrB144AVgADSF7cc0hKTP4pySDYUgFaPW/Dl/2Lq3Tzw5Lc/wJgMUXdB6c4xzztT0GkK/YAOd5qZVQDkhZDozwffU1mTYMvGESsAAaXleNExW09X4RptfalgZheADdtVhRfV19sKTn7nVYxJU7UXlU5G5EJVvk/777eZXwBaBLmyaMTCW6UcP8FWjUNWAAKu5bmt9lXPexzVnbOoAKw/6iEA7yD8vn9j05Ny5rJ6jAm4lZdMGJij3tGKnAm6F9DlnXjaFwBhuR+VY0vuX/i3BFszAWAFIA3ozC3zI/nejYqck4UFYN0SKmuAZ31PHi048a25GBMwtZeWjvFj3jRBjwEGtnkyiwqAwGMtA/qfPuLWl20W0ICzApBGmmdvcwTKA8DQbCsAbR778qEij/otPDjoLJs33LizavrkQk+bjlbkNOA7Xd25JhpL0wJQpZ6cXPy7hX9JsAUTMFYA0kz9X7YbniP+QyCHZm0B2HRL5SZEZqvq/QNOeetVkYTf2oxJqdpLS8f4vjdN0GOBARufyNYC4POqEvtl8b1LvkiwdhNAVgDSkJbjNe+93QWieh2Qm8UFoPV2/67IoyFP/y//lDc/wZgUq714/A6+hKZ6oscpsmsqdq6JxtKlACg0i/KrIfdUzpDEazYBZQUgjTU/v8PuxGJPgOxhBaDN4w99lVkxz3ts8KmLP8aYbqq+/LtbeVGORHUKwnhaf8+0AvB3z/eOLbp3wTsJ1mgCzgpAmtPZo/pHNPda9eUcIGQFgPXblnVLKktUZKZEvFkDzl70JcZ0ourycVuE/PAUUaYq7A/E/3ApewtAFLizIS925VYz7C6f6cwKQIZoeW77fdXXB0H2tAKwsQC0HveBSvXl/yQSe7rgvDe+wZj11v5q4sioz0980amoTAC8NgtYAdjgXd/n5JJ7KpcmWItJI1YAMojOKwu3rP7sQqAcpZ8VgMTZUP0QZDa+N3dAXuN8OdVuTJJNdMqU0OodvtoLmKwiPxIYB3jr/t7Fe0EPxrrx+gAWgCaEm4YU11wv5ctaEqzBpBkrABmo6Zkdd/Dw71fke1YA4mdrt91VIvIqylwJxf7a/3Q7kzkTrblsYknM0zJFfiTKYUBR+52eFYC4q6hUiZ1S/NslyxO80qQpKwAZShWJ/GWHab7PTUChFYC22TrIoIq8g/Kiqs4ZWBN+Xcoropi0o+Vl4ZpmHeeF/ENRDkHZi/bf86wAdDReq75cMuT3Cx+UxK8yacwKQIarn7ntiHDYuxv1jto4aAWgwwza6rEga9XnXYFK35dFSsuiwguWrMIEzorysoJwJLqXJ0xQlVKBiUDhxgWS2BlaAdjoeZXw6UPvrrC7c2YwKwBZovnpHY9SuBsYYQWg4wzacbYYygd4Uikxf3Eo5Ffmn1v5GabP1Vz+vW28ULRUY4xHKAXdnQ0n73Vzp2kFgC9FOavod5XPJFjKZBArAFlEZ25f2Ox5V4OcBeSsG7QC0P5xJwWgVY6Nj/6LUKnwN8/X/yei7w84f+FXmJRZWT5hVK7v7aE+e4KMWbfDZwug1Z9Dqz2bFQC6WACaUO6I9dfrS25etCbuEibjWAHIQk1/3nVnYv6diB5iBWDzx90oAPHGakGXgSwT9EPf95Y2aO47Iy62G6R0RMtH566KDd7JIzRGhN1UZbSI7gOMWLdAvBdt9sAKwIaBZJYTnvdCnDt4RuW/4yxtMpgVgCzW/PSOR6kfug10a8AKQGoLQLzxGMpHCO/5qv8Q5VOBT2Jh/9PC/o2fZ8uliHrfmJzVKwq3xo9s6ynbKbKtws4o30bYASXUvR2pFYDNBjpe7j0RPa/orkXz4ixlsoAVgCyns0f1b2kacIEi01Ep2PSEFYBE2TblYHNJ7gDi7GhiwH9RPkH4VFQ/9ZVPBPnEj8W+iHi6smR6ehyarS4fOyhETrHnhbZQdDuU7VDZVkW3E9VtQbYEQhtfEG8/ZQUgBdtOWABWonpV0TejHpBZs2JxljBZwgqAAWDt098aGYr6v0Y4AQhZAUicbVMONtf9ApDMOltQqhGqUa0GqoEqVKvAq0a0GvGrvVi4CS+mUV9rAUKiTTGVRgBP81b70uy3NIcjw8or6mHd2fO5edEcT/M8X5oLAUIRzY/lSD8iQEgG44fEI9oP8YaCDMX3h+JJMUqxD0OBoaIMBYrZeH5J8u/PCkDbsV4qABFBf4uX8+uiOypqEyQ1WcQKgGmj+cmdvqVe6BaUH4IVgIAVgI5X0I31pWZH0/MxKwBtx1JdAATm+iE9b+iMRcsSJDRZyAqAiavpyV0PVo/r8NnHCkCcDBvXR+djccatALQdswLQdixVBUCUN2PK5cV3V85NkMxkMSsApkNN//etyb5ym8CeVgCsAPTWmBWAtmM9/3PR5QpXDbmz8ilJnMpkOa/zRUw263f03+fme3/fG5GTAJvwxphg+1RUji/6cuTuQ++snGU7f9MROwJgkqYzR+c2+f5PUbkKZQc7AsDm7AhAt8bsCEDbsW78uXwmvtxeW+fdt93DFU0JUhjThhUA02V635icpoKGYxDvKmAHKwCdjMUZtwLQdswKQNuxLvy5fCYitw+ODrhX7p7TnGDrxsRlBcB0m84cndsc4XiFS0G2WzcIVgA6H7cC0HbMCkDbsST+XD5WuHFIQ8Mjcn92TCBlUs8KgOkxLcdr3nn0D1XlSpR9rQB0Pm4FoO2YFYC2Yx38ufxNRO8cPCj8hN2m2vSUFQCTUo1PjC5VPzRdVA+zApB43ApA2zErAG3H2v25+MALPnpn8Qy7nM+kjhUA0ysaHtljHB4XgByBbpj21QpAmy+tAGwcswLQdmz9L42gj8bg9pLbK/+ZYM3GdJsVANOr1v7pO6NoiU0T4WyQIVYAWn1pBWDjmBWANmNVivxvLBy7q+TmRV8mWKMxPWYFwPQJnTm6oLExfAJwNrCTFYAuvN4KQJLrTPsC8E/1mbGW6CNbzVjSmGBNxqSMFQDTp1SR5ke/c6CPTkM5HMixAtCNdVoBiDOWlgXAB15T0buKbq18XhKvwZiUswJgnFn72JiR4kePQ70zULYGrABYAUi8XKfrTKsC8JX68ig5/u+H3FRpM2waJ6wAGOd0Xlm44dPaw0TlBJAfAGErAMmMWQFoOxb4AhABXsCXPwwe5L1gl/EZ16wAmEBZ/eC4IWGv+SjgDFS+vfEJKwCdr8AKQI/z9EYBEHQ5ysPhSN7DBXe++k2cVxnjhBUAE1gND+y9v3ryC2AqKsUbn7ACYAUg7ligCsBK0JmeyKOFNy98M86SxjhnBcAEns6cElpb/+kkz9fjgMNVZeC6J8AKQHdfG+dpKwA9/XNpROV5Vf+xorrGF22KXhN0VgBMWtFH9xywtqXfj0WZiur3QfqtewKsAHR9fVYA4nzZtdc2IvKiojOb8hueG1W+tCHOksYEkhUAk7b09nH5DYOik8WXKSiHK5uODFgBSG7MCkCcLztfrhHhVWI6Kyr6TMnNi9YkSGtMoFkBMBlBbx+X31gQO0TV+zG+/wMVr2TdE2AFIPGYFYA4X8ZfbgXwAspf6iPRl2yiHpMJrACYjKPleA3Dxn7HF/mRwGEgewNiBWDzMSsAcb7cNPahIrM9/LmF/cIVdtmeyTRWAEzGa7yvdGs/5h+C6EGqciBK0bpnrABYAWjz1SoVeVVUX4l58uLQ6xZ8niCFMRnBCoDJKjpzSqhxxVf7KP5BKnIQyjjaTUdsBaDvxxwVgBaUJai+IoReHvTxsL/JrFmxBFs2JuNYATBZTe8b039NNH9vT5mAMhmYoEi+FYC+HeujAhBBeA+Vub74izQnMn9o+Rt1CbZkTMazAmBMK3rXoXlraNgP/Ikesr/CWJRh6560AtBbY71TAPQbUXlDRZb4+JVFOTVvSvmylgRrNibrWAEwphO1M0q3D4e8cRqTseIxVpU9gX5WAFI3loIC0Aj6noq84cEbqiwZfO2CTxKsxRiDFQBjukxnTgnV/7dqVzx/N1RGi+oYFcYCJVYAujfWxQJQp/A+sBRYKvjLCmsHfiB3z2lO8CpjTBxWAIxJkdrflxZ5DeHREtLdUEYDuwHfJk4xsALQdixBAagD+ZfifyjIMh/50PNiywrLKz+RxBXBGJMkKwDG9LK1N00Y5YdCO6qwo4jsgM+OCDuqsj0wuM3C2VcAakE+VvQjVD9W9T5S5aO8mP/RgOsXfhVnDcaYFLECYIxD1XeNHZQb7b+Vr7FtPJUtfV+3EpGtBUaoMhKhBKUECLV5YfALQAxlhcBKFb7G52tE/qPKf0X43JPoZ015fFYy3abRNcYVKwDGBJwqUn/r+BLIHYavJaBFCkXAYFUG41HkKYNVyVd0kKjkiUh/RQeg5AKFgLdphfQD8tc93DBEoyhNrTbrA6tRWhBZi68NiDaLSJ36NCLU4FMrQi1KTUyoxZeasERX4OvKgqsXrxSxw/TGBNn/B9+GOL5BUk+bAAAAAElFTkSuQmCC'

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
        const pdfDoc = await generateStyledReportPdf(reportTitle, reportSubtitle, tableHeaders, tableBodyData, companyProfile, logoImageBase64, columnAlignments, columnWidths, summaryDetails);
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