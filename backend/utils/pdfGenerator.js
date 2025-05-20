const PdfPrinter = require('pdfmake');
const fs = require('fs'); // Required for font VFS, not for actual file saving here
const path = require('path'); // Import the path module

// Define font files. This is crucial for pdfmake.
// You might need to download these font files (e.g., Roboto from Google Fonts)
// and place them in a 'fonts' directory in your backend, then adjust paths.
// For simplicity, we'll assume they are in a 'fonts' folder at the root of the backend.
// If you don't have these, pdfmake will use a default, but custom fonts are better.
const fonts = {
    Roboto: {
        normal: path.join(__dirname, '..', 'fonts', 'Roboto-Regular.ttf'),
        bold: path.join(__dirname, '..', 'fonts', 'Roboto-Medium.ttf'),
        italics: path.join(__dirname, '..', 'fonts', 'Roboto-Italic.ttf'),
        bolditalics: path.join(__dirname, '..', 'fonts', 'Roboto-MediumItalic.ttf')
    }
};

const printer = new PdfPrinter(fonts);

function generateInvoicePdf(invoiceDetails, companyProfile) {
    const {
        invoiceNumber,
        invoiceDate,
        dueDate,
        items,
        subTotal,
        taxRate,
        taxAmount,
        grandTotal,
        status,
        notes
    } = invoiceDetails;

    const {
        companyName,
        address: companyAddress,
        phone: companyPhone,
        email: companyEmail,
        website: companyWebsite,
        logoUrl, // We'll handle this if it's a local path or base64. For now, assume it's not directly embedded.
        taxId: companyTaxId
    } = companyProfile || {}; // Handle if companyProfile is null

    // Define the companyLogo object based on companyLogoBase64
    const companyLogo = logoUrl ? { image: logoUrl, width: 100, alignment: 'right' } : { text: '', width: 100, alignment: 'right' };

    // Helper to build the Bill To content array for pdfmake
    const buildBillToContent = () => {
        const customer = invoiceDetails.customer;
        const content = [];

        // Each element pushed to this 'content' array will be a new paragraph/line in pdfmake
        content.push({ text: 'Bill To:', style: 'billToTitle' }); 

        content.push({ text: customer?.name || 'N/A' }); // Name on its own line

        if (customer?.address) {
            const addr = customer.address;
            if (addr.street) content.push({ text: addr.street }); // Street on its own line

            let line2 = '';
            if (addr.city) line2 = addr.city;
            if (addr.state) {
                if (line2) line2 += ', ';
                line2 += addr.state;
            }
            if (addr.postalCode) {
                if (line2) line2 += ' ';
                line2 += addr.postalCode;
            }
            if (line2) content.push({ text: line2 }); // City, State, Postal on its own line
            if (addr.country) content.push({ text: addr.country }); // Country on its own line
        }

        if (customer?.email) content.push({ text: customer.email }); // Email on its own line
        return content;
    };
    const documentDefinition = {
        content: [
            // Header Section
            {
                columns: [
                    [
                        { text: companyName || 'Your Company Name', style: 'companyName', alignment: 'left' },
                        { text: companyAddress || '123 Your Street, City, State, Zip', style: 'companyAddress', alignment: 'left' },
                        { text: `Phone: ${companyPhone || 'N/A'}`, style: 'companyAddress', alignment: 'left' },
                        { text: `Email: ${companyEmail || 'N/A'}`, style: 'companyAddress', alignment: 'left' },
                        companyWebsite ? { text: `Website: ${companyWebsite}`, style: 'companyAddress', alignment: 'left' } : {},
                        companyTaxId ? { text: `Tax ID: ${companyTaxId}`, style: 'companyAddress', alignment: 'left' } : {},
                    ], // Company details on the left
                    companyLogo // Use the companyLogo variable here
                ]
            },
            { canvas: [{ type: 'line', x1: 0, y1: 5, x2: 595 - 2 * 40, y2: 5, lineWidth: 1, lineColor: '#cccccc' }], margin: [0, 10, 0, 10] }, // Horizontal Line

            // Invoice Meta Information (Number, Date, Due Date) & Bill To
            {
                columns: [
                    {
                        width: '60%',
                        stack: buildBillToContent(), // Use 'stack' instead of 'text' here
                        margin: [0, 0, 20, 0] // Right margin to create space
                    },
                    {
                        width: '40%',
                        text: [
                            { text: `INVOICE\n`, style: 'invoiceTitle' },
                            { text: `Invoice #: `, style: 'label' }, `${invoiceNumber}\n`,
                            { text: `Date: `, style: 'label' }, `${new Date(invoiceDate).toLocaleDateString()}\n`,
                            { text: `Due Date: `, style: 'label' }, `${dueDate ? new Date(dueDate).toLocaleDateString() : 'N/A'}\n`,
                            { text: `Status: `, style: 'label' }, `${status}`
                        ],
                        alignment: 'right'
                    }
                ],
                margin: [0, 20, 0, 20] // Top, Right, Bottom, Left
            },

            // Items Table
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto'], // Item & Description, Qty, Unit Price, Amount
                    body: [
                        // Table Header
                        [
                            { text: 'Description', style: 'tableHeader' },
                            { text: 'Quantity', style: 'tableHeader', alignment: 'right' },
                            { text: 'Unit Price', style: 'tableHeader', alignment: 'right' },
                            { text: 'Total', style: 'tableHeader', alignment: 'right' }
                        ],
                        // Table Items
                        ...items.map(item => [
                            {
                                stack: [
                                    { text: item.productName, style: 'itemTitle' },
                                    item.description ? { text: item.description, style: 'itemDescription' } : {}
                                ]
                            },
                            { text: item.quantity, alignment: 'right' },
                            { text: `$${item.unitPrice.toFixed(2)}`, alignment: 'right' },
                            { text: `$${item.totalPrice.toFixed(2)}`, alignment: 'right' }
                        ])
                    ],
                },
                layout: 'lightHorizontalLines', // Optional: adds light horizontal lines
                margin: [0, 0, 0, 20]
            },

            // Totals
            {
                columns: [
                    { text: '' }, // Spacer
                    {   // Totals block aligned to the right
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [{ text: 'Subtotal:', style: 'totalsLabel', alignment: 'right' }, { text: `$${subTotal.toFixed(2)}`, style: 'totalsValue', alignment: 'right' }],
                                [{ text: `Tax (${taxRate}%):`, style: 'totalsLabel', alignment: 'right' }, { text: `$${taxAmount.toFixed(2)}`, style: 'totalsValue', alignment: 'right' }],
                                [{ text: 'Grand Total:', style: 'grandTotalLabel', alignment: 'right' }, { text: `$${grandTotal.toFixed(2)}`, style: 'grandTotalValue', alignment: 'right' }]
                            ],
                        },
                        layout: 'noBorders', // No borders for the totals table
                        width: 'auto',
                        alignment: 'right'
                    }
                ],
                margin: [0, 0, 0, 20]
            },

            // Notes
            notes ? { text: 'Notes:', style: 'notesTitle', margin: [0, 20, 0, 5] } : {},
            notes ? { text: notes, style: 'notesText', margin: [0, 0, 0, 20] } : {},
        ],
        footer: function(currentPage, pageCount) {
            return {
                columns: [
                    { text: 'Thank you for your business!', alignment: 'left', style: 'footer' },
                    { text: `Page ${currentPage.toString()} of ${pageCount}`, alignment: 'right', style: 'footer' }
                ],
                margin: [40, 10, 40, 0] // Left, Top, Right, Bottom
            };
        },
        styles: {
            companyName: { fontSize: 22, bold: true, color: '#333333' },
            companyAddress: { fontSize: 9, color: '#555555', margin: [0, 1, 0, 1] },
            invoiceTitle: { fontSize: 20, bold: true, color: '#333333', margin: [0, 0, 0, 5] },
            label: { bold: true, color: '#555555' },
            billToTitle: { fontSize: 12, bold: true, margin: [0, 0, 0, 3], color: '#333333' },
            tableHeader: { bold: true, fontSize: 10, color: 'white', fillColor: '#4A90E2', margin: [0, 5, 0, 5] },
            itemTitle: { bold: true, fontSize: 10 },
            itemDescription: { fontSize: 9, italics: true, color: 'grey' },
            totalsLabel: { bold: false, fontSize: 10, margin: [0, 2, 0, 2] },
            totalsValue: { bold: false, fontSize: 10, margin: [0, 2, 0, 2] },
            grandTotalLabel: { bold: true, fontSize: 12, margin: [0, 5, 0, 5] },
            grandTotalValue: { bold: true, fontSize: 12, margin: [0, 5, 0, 5] },
            notesTitle: { fontSize: 10, bold: true, margin: [0, 0, 0, 3] },
            notesText: { fontSize: 10 },
            footer: { fontSize: 8, italics: true, color: 'grey' }
        },
        defaultStyle: {
            font: 'Roboto',
            fontSize: 10,
            lineHeight: 1.3,
        },
        pageMargins: [40, 40, 40, 60] // Left, Top, Right, Bottom (increased bottom for footer)
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);
    return pdfDoc;
}

module.exports = generateInvoicePdf;