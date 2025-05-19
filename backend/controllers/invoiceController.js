const Invoice = require('../models/Invoice');
const Product = require('../models/Product'); // Needed for stock updates if implemented here
const CompanyProfile = require('../models/CompanyProfile'); // To fetch company details
const JournalEntry = require('../models/JournalEntry'); // For creating journal entries
const ChartOfAccount = require('../models/ChartOfAccount'); // To find account IDs
const generateInvoicePdf = require('../utils/pdfGenerator'); // Our PDF generation utility

// Helper function to generate a unique invoice number (customize as needed)
async function generateInvoiceNumber() {
    const lastInvoice = await Invoice.findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastInvoice && lastInvoice.invoiceNumber) {
        const lastNumStr = lastInvoice.invoiceNumber.replace(/^INV-/i, '');
        const lastNum = parseInt(lastNumStr, 10);
        if (!isNaN(lastNum)) {
            nextNumber = lastNum + 1;
        }
    }
    return `INV-${String(nextNumber).padStart(5, '0')}`; // e.g., INV-00001
}

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (e.g., Admin or Manager)
exports.createInvoice = async (req, res, next) => {
    try {
        const { customerId, invoiceDate, dueDate, items, taxRate, notes, status } = req.body;

        if (!customerId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Invoice must have at least one item.' });
        }

        let subTotal = 0;
        for (const item of items) {
            item.totalPrice = item.quantity * item.unitPrice;
            subTotal += item.totalPrice;
        }

        const taxAmount = subTotal * (taxRate / 100);
        const grandTotal = subTotal + taxAmount;
        const invoiceNumber = await generateInvoiceNumber();

        const newInvoice = await Invoice.create({
            invoiceNumber,
            customer: customerId, // Store the customer's ObjectId
            invoiceDate,
            dueDate,
            items,
            subTotal,
            taxRate,
            taxAmount,
            grandTotal,
            status,
            notes
            // user: req.user.id // If you want to store the user who created the invoice itself
        });

        // --- Start: Update Product Stock & Calculate COGS ---
        let totalCOGS = 0;
        for (const item of newInvoice.items) {
            if (item.productId) {
                const product = await Product.findById(item.productId);
                if (product) {
                    product.quantityInStock -= item.quantity;
                    product.updatedAt = Date.now();
                    await product.save();
                    totalCOGS += (product.purchasePrice || 0) * item.quantity;
                } else {
                    console.warn(`Product with ID ${item.productId} not found for stock update during invoice ${newInvoice.invoiceNumber} creation.`);
                }
            }
        }
        totalCOGS = Math.round(totalCOGS * 100) / 100;
        // --- End: Update Product Stock & Calculate COGS ---

        // --- Start: Automated Journal Entry Creation for Sale ---
        // Only create JE if the invoice is not a draft (or based on your business logic)
        if (newInvoice.status !== 'draft' && newInvoice.grandTotal > 0) {
            try {
                const accountsReceivableAcc = await ChartOfAccount.findOne({ accountName: 'Accounts Receivable' });
                const salesRevenueAcc = await ChartOfAccount.findOne({ accountName: 'Sales Revenue' });
                const inventoryAcc = await ChartOfAccount.findOne({ accountName: 'Inventory' });
                const cogsAcc = await ChartOfAccount.findOne({ accountName: 'Cost of Goods Sold' });
                // Optional: Sales Tax Payable account
                const salesTaxPayableAcc = newInvoice.taxAmount > 0 ? await ChartOfAccount.findOne({ accountName: 'Sales Tax Payable' }) : null;

                if (accountsReceivableAcc && salesRevenueAcc && inventoryAcc && cogsAcc && (newInvoice.taxAmount === 0 || salesTaxPayableAcc)) {
                    const jeDescription = `Sale recorded for Invoice #${newInvoice.invoiceNumber}`;
                    const jeEntries = [
                        { account: accountsReceivableAcc._id, debit: newInvoice.grandTotal, credit: 0 },
                        { account: salesRevenueAcc._id, debit: 0, credit: newInvoice.subTotal },
                        { account: inventoryAcc._id, debit: 0, credit: totalCOGS }, // Credit Inventory
                        { account: cogsAcc._id, debit: totalCOGS, credit: 0 },      // Debit COGS
                    ];
                    if (newInvoice.taxAmount > 0 && salesTaxPayableAcc) {
                        jeEntries.push({ account: salesTaxPayableAcc._id, debit: 0, credit: newInvoice.taxAmount });
                    }
                    if (!req.user || !req.user.id) {
                        console.error(`[JE CREATION ABORTED] User ID not found in request for Invoice ${newInvoice.invoiceNumber}. Journal Entry not created.`);
                        // Optionally, you could decide to throw an error here or handle it differently
                        // For now, we'll log and skip JE creation to prevent a crash if user is missing.
                    } else {
                    const journalEntryData = {
                            date: newInvoice.invoiceDate,
                            description: jeDescription,
                            referenceNumber: newInvoice.invoiceNumber,
                            entries: jeEntries,
                            createdBy: req.user.id,
                        };
                        const autoJournalEntry = new JournalEntry(journalEntryData);
                        await autoJournalEntry.save();
                        console.log(`Journal Entry created successfully for Invoice ${newInvoice.invoiceNumber} sale.`);
                    }
                } else {
                    console.warn(`Could not create Journal Entry for Invoice ${newInvoice.invoiceNumber}: One or more required accounts (AR, Sales, Inventory, COGS, Sales Tax) not found.`);
                }
            
            } catch (jeError) {
                console.error(`Error creating Journal Entry for Invoice ${newInvoice.invoiceNumber} sale:`, jeError.message, jeError.stack);
            }
        }
        // --- End: Automated Journal Entry Creation ---

        res.status(201).json({ success: true, data: newInvoice });
    } catch (error) {
        console.error('Create Invoice Error:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Generate and download PDF for an invoice
// @route   GET /api/invoices/:id/pdf
// @access  Private
exports.generateInvoicePdfController = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer'); // Populate customer for PDF
        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        const companyProfile = await CompanyProfile.findOne();
        if (!companyProfile) {
            // It's good to have a fallback or handle this gracefully
            // For now, we'll proceed, and pdfGenerator handles null companyProfile
            console.warn('Company profile not found. PDF will be generated with default company details.');
        }

        const pdfDoc = generateInvoicePdf(invoice, companyProfile);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoiceNumber}.pdf`); // Suggests download

        pdfDoc.pipe(res); // Stream the PDF to the response
        pdfDoc.end();

    } catch (error) {
        console.error('Generate Invoice PDF Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error while generating PDF' });
    }
};

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
exports.getInvoices = async (req, res, next) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        const skip = (pageNumber - 1) * limitNumber;

        let invoices = [];
        let totalCount = 0;

        if (search) {
            const searchRegex = new RegExp(search, 'i');

            const lookupStage = {
                $lookup: {
                    from: 'customers', // Ensure this is the correct name of your customers collection
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            };

            const unwindCustomerStage = {
                $unwind: {
                    path: '$customerDetails',
                    preserveNullAndEmptyArrays: true // Keep invoices even if customer is not found/linked
                }
            };

            const matchStage = {
                $match: {
                    $or: [
                        { invoiceNumber: searchRegex },
                        { 'customerDetails.name': searchRegex } // Search on the looked-up customer name
                    ]
                }
            };

            const projectStage = { // To reshape the customer field like populate did
                $project: {
                    // Pass through all original invoice fields
                    invoiceNumber: 1,
                    invoiceDate: 1,
                    dueDate: 1,
                    items: 1,
                    subTotal: 1,
                    taxRate: 1,
                    taxAmount: 1,
                    grandTotal: 1,
                    status: 1,
                    notes: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    // Reshape customer field
                    customer: {
                        _id: '$customerDetails._id',
                        name: '$customerDetails.name',
                        email: '$customerDetails.email'
                        // Add other customer fields if they were previously populated and used by frontend
                    }
                }
            };

            const countPipeline = [lookupStage, unwindCustomerStage, matchStage, { $count: "totalCount" }];
            const countResult = await Invoice.aggregate(countPipeline);
            totalCount = countResult.length > 0 ? countResult[0].totalCount : 0;

            if (totalCount > 0) {
                const dataPipeline = [
                    lookupStage,
                    unwindCustomerStage,
                    matchStage,
                    { $sort: { invoiceDate: -1 } },
                    { $skip: skip },
                    { $limit: limitNumber },
                    projectStage // Apply projection to shape the output
                ];
                invoices = await Invoice.aggregate(dataPipeline);
            }
        } else {
            invoices = await Invoice.find({}).populate('customer', 'name email').sort({ invoiceDate: -1 }).skip(skip).limit(limitNumber);
            totalCount = await Invoice.countDocuments({});
        }
        res.status(200).json({ success: true, count: totalCount, data: invoices });
    } catch (error) {
        console.error('Get Invoices Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
exports.getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate('customer'); // Populate customer details
        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        console.error('Get Invoice By ID Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update an invoice
// @route   PUT /api/invoices/:id
// @access  Private (e.g., Admin or Manager)
exports.updateInvoice = async (req, res, next) => {
    try {
        let invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        // For simplicity, allow updating most fields. In a real app, you'd restrict updates based on invoice status.
        // Recalculate totals if items or taxRate change
        const { items, taxRate, customerId, ...otherUpdates } = req.body; // Expect customerId
        let updatedData = { ...otherUpdates };

        if (customerId) { // If customerId is provided, update the customer reference
            updatedData.customer = customerId;
        }

        if (items || taxRate !== undefined) {
            updatedData.items = items || invoice.items;
            updatedData.taxRate = taxRate !== undefined ? taxRate : invoice.taxRate;

            updatedData.subTotal = 0;
            for (const item of updatedData.items) {
                item.totalPrice = item.quantity * item.unitPrice;
                updatedData.subTotal += item.totalPrice;
            }
            updatedData.taxAmount = updatedData.subTotal * (updatedData.taxRate / 100);
            updatedData.grandTotal = updatedData.subTotal + updatedData.taxAmount;
        }

        invoice = await Invoice.findByIdAndUpdate(req.params.id, updatedData, { new: true, runValidators: true });
        res.status(200).json({ success: true, data: invoice });
    } catch (error) {
        console.error('Update Invoice Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete an invoice
// @route   DELETE /api/invoices/:id
// @access  Private (e.g., Admin or Manager)
exports.deleteInvoice = async (req, res, next) => {
    try {
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }
        // Add logic here: e.g., only allow deletion if status is 'Draft'
        // Or, mark as 'Cancelled' instead of hard delete.
        await invoice.deleteOne();
        res.status(200).json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete Invoice Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};