const Customer = require('../models/Customer');
const asyncHandler = require('express-async-handler'); // Assuming you use this for error handling

// @desc    Get all customers
// @route   GET /api/customers
// @access  Private
exports.getCustomers = asyncHandler(async (req, res, next) => {
    // Add pagination later if needed
    const customers = await Customer.find().sort({ name: 1 }); // Sort by name
    res.status(200).json({
        success: true,
        count: customers.length,
        data: customers
    });
});

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Private
exports.getCustomerById = asyncHandler(async (req, res, next) => {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    res.status(200).json({ success: true, data: customer });
});

// @desc    Create a new customer
// @route   POST /api/customers
// @access  Private (e.g., Admin or Manager)
exports.createCustomer = asyncHandler(async (req, res, next) => {
    // req.body.user = req.user.id; // If associating customer with the logged-in user

    const customer = await Customer.create(req.body);
    res.status(201).json({
        success: true,
        data: customer
    });
});

// @desc    Update a customer
// @route   PUT /api/customers/:id
// @access  Private (e.g., Admin or Manager)
exports.updateCustomer = asyncHandler(async (req, res, next) => {
    let customer = await Customer.findById(req.params.id);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Optional: Check if user is authorized to update this customer
    // if (customer.user && customer.user.toString() !== req.user.id && req.user.role !== 'admin') {
    //     res.status(401);
    //     throw new Error('Not authorized to update this customer');
    // }

    customer = await Customer.findByIdAndUpdate(req.params.id, req.body, {
        new: true, // Return the modified document
        runValidators: true // Run Mongoose validators on update
    });

    res.status(200).json({ success: true, data: customer });
});

// @desc    Delete a customer
// @route   DELETE /api/customers/:id
// @access  Private (e.g., Admin or Manager)
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
        res.status(404);
        throw new Error('Customer not found');
    }

    // Optional: Check if user is authorized to delete

    // TODO: Consider what happens to invoices associated with this customer.
    // Option 1: Prevent deletion if invoices exist.
    // Option 2: Allow deletion (customer field on invoice becomes null or orphaned - not ideal).
    // Option 3: Mark customer as 'inactive' instead of hard delete.
    // For now, we'll proceed with hard delete.

    // Example check for associated invoices (you'll need your Invoice model imported)
    // const Invoice = require('../models/Invoice');
    // const invoices = await Invoice.find({ customer: req.params.id });
    // if (invoices.length > 0) {
    //     res.status(400);
    //     throw new Error('Cannot delete customer with existing invoices. Consider deactivating instead.');
    // }

    await customer.deleteOne();

    res.status(200).json({ success: true, data: {}, message: 'Customer removed' });
});