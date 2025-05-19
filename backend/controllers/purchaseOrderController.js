const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product'); // To fetch product details
const Supplier = require('../models/Supplier'); // To validate supplier
const Counter = require('../models/Counter'); // For auto-incrementing PO numbers
const JournalEntry = require('../models/JournalEntry'); // For creating journal entries
const ChartOfAccount = require('../models/ChartOfAccount'); // To find account IDs

// Helper function to get the next PO number
async function getNextPoNumber() {
    const counter = await Counter.findByIdAndUpdate(
        { _id: 'poNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    // Format: PO-YYYYMM-XXXX (e.g., PO-202310-0001)
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `PO-${year}${month}-${counter.seq.toString().padStart(4, '0')}`;
}

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private (e.g., Admin, Manager, Purchaser)
exports.getPurchaseOrders = async (req, res) => {
    try {
        const purchaseOrders = await PurchaseOrder.find()
            .populate('supplier', 'name')
            .populate('items.product', 'name sku')
            .sort({ orderDate: -1 });
        res.json({ success: true, count: purchaseOrders.length, data: purchaseOrders });
    } catch (err) {
        console.error('Error getting purchase orders:', err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single purchase order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
exports.getPurchaseOrderById = async (req, res) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id)
            .populate('supplier') // Populate full supplier details
            .populate('items.product'); // Populate full product details for items

        if (!purchaseOrder) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }
        res.json({ success: true, data: purchaseOrder });
    } catch (err) {
        console.error('Error getting purchase order by ID:', err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Purchase Order not found (invalid ID)' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create a new purchase order
// @route   POST /api/purchase-orders
// @access  Private (e.g., Admin, Manager, Purchaser)
exports.createPurchaseOrder = async (req, res) => {
    const { supplier: supplierId, items, expectedDeliveryDate, notes, status } = req.body;

    try {
        if (!supplierId) {
            return res.status(400).json({ success: false, message: 'Supplier is required.' });
        }
        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one item is required in the purchase order.' });
        }

        const supplier = await Supplier.findById(supplierId);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found.' });
        }

        let subTotal = 0;
        const processedItems = [];

        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) {
                return res.status(400).json({ success: false, message: `Product with ID ${item.product} not found.` });
            }
            if (item.quantityOrdered <= 0) {
                return res.status(400).json({ success: false, message: `Quantity for ${product.name} must be positive.` });
            }
            // Use product's purchase price as default if unitPrice not provided, or validate provided unitPrice
            const unitPrice = item.unitPrice !== undefined ? parseFloat(item.unitPrice) : parseFloat(product.purchasePrice);
            if (isNaN(unitPrice) || unitPrice < 0) {
                 return res.status(400).json({ success: false, message: `Invalid unit price for ${product.name}.` });
            }

            const totalPrice = item.quantityOrdered * unitPrice;
            subTotal += totalPrice;
            processedItems.push({
                product: product._id,
                productName: product.name, // Snapshot of product name
                quantityOrdered: item.quantityOrdered,
                unitPrice: unitPrice,
                totalPrice: totalPrice,
                quantityReceived: 0
            });
        }

        const poNumber = await getNextPoNumber();

        const purchaseOrder = new PurchaseOrder({
            poNumber,
            supplier: supplierId,
            items: processedItems,
            subTotal,
            grandTotal: subTotal, // For now, grandTotal is same as subTotal. Add tax/shipping later.
            expectedDeliveryDate,
            notes,
            status: status || 'Draft', // Default to Draft if not provided
            // createdBy: req.user.id // Assuming auth middleware populates req.user
        });

        await purchaseOrder.save();
        res.status(201).json({ success: true, message: 'Purchase Order created successfully', data: purchaseOrder });

    } catch (err) {
        console.error('Error creating purchase order:', err.message, err.stack);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error creating purchase order' });
    }
};

// @desc    Update a purchase order (e.g., status, notes, expected delivery)
// @route   PUT /api/purchase-orders/:id
// @access  Private
exports.updatePurchaseOrder = async (req, res) => {
    const { status, expectedDeliveryDate, notes } = req.body; // Add other updatable fields as needed

    try {
        let purchaseOrder = await PurchaseOrder.findById(req.params.id);
        if (!purchaseOrder) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        // For now, only allow updating certain fields. Item updates would be more complex.
        if (status) purchaseOrder.status = status;
        if (expectedDeliveryDate) purchaseOrder.expectedDeliveryDate = expectedDeliveryDate;
        if (notes !== undefined) purchaseOrder.notes = notes;
        // Recalculate totals if items were changed (more complex, handle separately or disallow item changes post-creation for simplicity)

        await purchaseOrder.save();
        res.json({ success: true, message: 'Purchase Order updated successfully', data: purchaseOrder });

    } catch (err) {
        console.error('Error updating purchase order:', err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a purchase order (typically only if in 'Draft' status)
// @route   DELETE /api/purchase-orders/:id
// @access  Private (e.g., Admin, Manager)
exports.deletePurchaseOrder = async (req, res) => {
    try {
        const purchaseOrder = await PurchaseOrder.findById(req.params.id);
        if (!purchaseOrder) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found' });
        }

        // Add logic here to restrict deletion based on status, e.g.:
        // if (purchaseOrder.status !== 'Draft' && purchaseOrder.status !== 'Cancelled') {
        //     return res.status(400).json({ success: false, message: `Cannot delete PO in '${purchaseOrder.status}' status.` });
        // }

        await purchaseOrder.deleteOne(); // or .remove() for older Mongoose
        res.json({ success: true, message: 'Purchase Order deleted successfully' });

    } catch (err) {
        console.error('Error deleting purchase order:', err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// Note: You'll also need a Counter model for the getNextPoNumber function.
// d:\IMS\backend\models\Counter.js
// const mongoose = require('mongoose');
// const CounterSchema = new mongoose.Schema({
//     _id: { type: String, required: true },
//     seq: { type: Number, default: 0 }
// });
// module.exports = mongoose.model('Counter', CounterSchema);

// @desc    Receive items against a purchase order
// @route   POST /api/purchase-orders/:id/receive
// @access  Private (e.g., Admin, Manager, Warehouse Staff)
exports.receivePurchaseOrderItems = async (req, res) => {
    const { id: poId } = req.params;
    const { itemsToReceive } = req.body; // Expected: [{ itemId: String, quantityNewlyReceived: Number }]

    if (!itemsToReceive || !Array.isArray(itemsToReceive) || itemsToReceive.length === 0) {
        return res.status(400).json({ success: false, message: 'No items provided for receiving.' });
    }

    try {
        const purchaseOrder = await PurchaseOrder.findById(poId).populate('items.product');
        if (!purchaseOrder) {
            return res.status(404).json({ success: false, message: 'Purchase Order not found.' });
        }

        if (purchaseOrder.status === 'Received' || purchaseOrder.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: `Cannot receive items for a PO with status '${purchaseOrder.status}'.` });
        }

        let allItemsFullyReceived = true;

        for (const receivedItem of itemsToReceive) {
            const poItem = purchaseOrder.items.find(item => item._id.toString() === receivedItem.itemId);
            
            if (!poItem) {
                console.error(`PO Item not found: PO ID ${poId}, Received Item ID from request: ${receivedItem.itemId}`);
                return res.status(400).json({ success: false, message: `Item with ID ${receivedItem.itemId} not found in this PO.` });
            }
            
            const quantityNewlyReceived = parseInt(receivedItem.quantityNewlyReceived, 10);
            if (isNaN(quantityNewlyReceived) || quantityNewlyReceived < 0) {
                return res.status(400).json({ success: false, message: `Invalid quantity received for ${poItem.productName}.` });
            }

            if (quantityNewlyReceived > (poItem.quantityOrdered - poItem.quantityReceived)) {
                return res.status(400).json({ success: false, message: `Cannot receive more than outstanding for ${poItem.productName}. Ordered: ${poItem.quantityOrdered}, Already Received: ${poItem.quantityReceived}, Trying to receive: ${quantityNewlyReceived}` });
            }

            if (quantityNewlyReceived > 0) {
                poItem.quantityReceived += quantityNewlyReceived;

                if (!poItem.product || !poItem.product._id) {
                    console.error(`Product details missing or not populated for PO item: ${poItem._id}, productName: ${poItem.productName}. PO ID: ${poId}`);
                    // This is a critical data integrity issue.
                    return res.status(500).json({ success: false, message: `Internal error: Product details not found for item ${poItem.productName}. Please check PO data.` });
                }

                // Update product stock
                const product = await Product.findById(poItem.product._id);
                if (product) {
                    product.quantityInStock += quantityNewlyReceived;
                    product.updatedAt = Date.now();
                    await product.save();
                } else {
                    console.error(`Product with ID ${poItem.product._id} (for PO item ${poItem.productName}, PO ID ${poId}) not found in Product collection during receiving.`);
                    console.warn(`Product ${poItem.product._id} for PO item ${poItem._id} not found during receiving.`);
                }
            }
            if (poItem.quantityReceived < poItem.quantityOrdered) {
                allItemsFullyReceived = false;
            }
        }

        purchaseOrder.status = allItemsFullyReceived ? 'Received' : 'Partially Received';
        if (purchaseOrder.status === 'Draft' && itemsToReceive.some(i => i.quantityNewlyReceived > 0)) { // If receiving against a draft, move to ordered/partially received
             purchaseOrder.status = allItemsFullyReceived ? 'Received' : 'Partially Received'; // Or 'Ordered' if you prefer a manual step
        }

        const savedPO = await purchaseOrder.save();

        // --- Start: Automated Journal Entry Creation ---
        let totalValueOfGoodsReceivedThisTransaction = 0;
        itemsToReceive.forEach(receivedItemInput => {
            const poItem = purchaseOrder.items.find(item => item._id.toString() === receivedItemInput.itemId);
            if (poItem && receivedItemInput.quantityNewlyReceived > 0) {
                totalValueOfGoodsReceivedThisTransaction += receivedItemInput.quantityNewlyReceived * poItem.unitPrice;
            }
        });
        totalValueOfGoodsReceivedThisTransaction = Math.round(totalValueOfGoodsReceivedThisTransaction * 100) / 100;

        if (totalValueOfGoodsReceivedThisTransaction > 0) {
            try {
                const inventoryAccount = await ChartOfAccount.findOne({ accountName: 'Inventory' }); // Adjust name if different
                const accountsPayableAccount = await ChartOfAccount.findOne({ accountName: 'Accounts Payable' }); // Adjust name if different

                if (inventoryAccount && accountsPayableAccount) {
                    const jeDescription = `Goods received for PO #${purchaseOrder.poNumber}`;
                    const journalEntryData = {
                        date: new Date(),
                        description: jeDescription,
                        referenceNumber: purchaseOrder.poNumber,
                        entries: [
                            { account: inventoryAccount._id, debit: totalValueOfGoodsReceivedThisTransaction, credit: 0 },
                            { account: accountsPayableAccount._id, debit: 0, credit: totalValueOfGoodsReceivedThisTransaction },
                        ],
                        createdBy: req.user.id, // Assuming req.user is populated by auth middleware
                    };
                    const newJournalEntry = new JournalEntry(journalEntryData);
                    await newJournalEntry.save();
                    console.log(`Journal Entry created successfully for PO ${purchaseOrder.poNumber} receipt.`);
                } else {
                    console.warn(`Could not create Journal Entry for PO ${purchaseOrder.poNumber}: Inventory or Accounts Payable account not found in Chart of Accounts.`);
                }
            } catch (jeError) {
                console.error(`Error creating Journal Entry for PO ${purchaseOrder.poNumber} receipt:`, jeError.message, jeError.stack);
                // Do not fail the entire PO receipt if JE creation fails, but log it.
            }
        }
        // --- End: Automated Journal Entry Creation ---

        res.json({ success: true, message: 'Items received successfully. Inventory and PO updated.', data: savedPO });

    } catch (err) {
        console.error('Error receiving purchase order items:', err.message, err.stack);
        res.status(500).json({ success: false, message: 'Server Error while receiving items.' });
    }
};