const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private (adjust based on your auth rules)
exports.getSuppliers = async (req, res) => {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const searchTerm = req.query.search || '';

    const query = {};

    if (searchTerm) {
        const regex = new RegExp(searchTerm, 'i'); // 'i' for case-insensitive
        query.$or = [
            { name: regex },
            { contactPerson: regex },
            { email: regex },
            // Add other fields you want to search by, e.g., phone
            // { phone: regex }
        ];
    }

    const startIndex = (page - 1) * limit;

    try {
        const total = await Supplier.countDocuments(query);
        const suppliers = await Supplier.find(query).sort({ name: 1 }).skip(startIndex).limit(limit);
        res.json({ success: true, count: total, data: suppliers });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error fetching suppliers' });
    }
};

// @desc    Get single supplier by ID
// @route   GET /api/suppliers/:id
// @access  Private
exports.getSupplierById = async (req, res) => {
    try {
        const supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }
        res.json({ success: true, data: supplier });
    } catch (err) {
        console.error(err.message);
        if (err.kind === 'ObjectId') {
            return res.status(404).json({ success: false, message: 'Supplier not found (invalid ID)' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create a new supplier
// @route   POST /api/suppliers
// @access  Private (e.g., Admin, Manager)
exports.createSupplier = async (req, res) => {
    const { name, contactPerson, email, phone, address, notes } = req.body;

    try {
        // Basic validation
        if (!name || !email) {
            return res.status(400).json({ success: false, message: 'Name and Email are required.' });
        }

        let supplier = await Supplier.findOne({ email });
        if (supplier) {
            return res.status(400).json({ success: false, message: 'Supplier with this email already exists.' });
        }
        supplier = await Supplier.findOne({ name });
         if (supplier) {
            return res.status(400).json({ success: false, message: 'Supplier with this name already exists.' });
        }

        supplier = new Supplier({
            name,
            contactPerson,
            email,
            phone,
            address,
            notes,
            updatedAt: Date.now()
        });

        await supplier.save();
        res.status(201).json({ success: true, message: 'Supplier created successfully', data: supplier });
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private (e.g., Admin, Manager)
exports.updateSupplier = async (req, res) => {
    const { name, contactPerson, email, phone, address, notes } = req.body;

    try {
        let supplier = await Supplier.findById(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }

        // Check if email is being changed and if it conflicts with another supplier
        if (email && email !== supplier.email) {
            const existingSupplierWithEmail = await Supplier.findOne({ email: email, _id: { $ne: req.params.id } });
            if (existingSupplierWithEmail) {
                return res.status(400).json({ success: false, message: 'Another supplier with this email already exists.' });
            }
        }
        // Check if name is being changed and if it conflicts with another supplier
        if (name && name !== supplier.name) {
            const existingSupplierWithName = await Supplier.findOne({ name: name, _id: { $ne: req.params.id } });
            if (existingSupplierWithName) {
                return res.status(400).json({ success: false, message: 'Another supplier with this name already exists.' });
            }
        }

        supplier.name = name || supplier.name;
        supplier.contactPerson = contactPerson !== undefined ? contactPerson : supplier.contactPerson;
        supplier.email = email || supplier.email;
        supplier.phone = phone !== undefined ? phone : supplier.phone;
        supplier.address = address !== undefined ? address : supplier.address;
        supplier.notes = notes !== undefined ? notes : supplier.notes;
        supplier.updatedAt = Date.now();

        await supplier.save();
        res.json({ success: true, message: 'Supplier updated successfully', data: supplier });
    } catch (err) {
        console.error(err.message);
        if (err.name === 'ValidationError') {
            const messages = Object.values(err.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private (e.g., Admin, Manager)
exports.deleteSupplier = async (req, res) => {
    try {
        const supplier = await Supplier.findByIdAndDelete(req.params.id);
        if (!supplier) {
            return res.status(404).json({ success: false, message: 'Supplier not found' });
        }
        // Add any cleanup logic here if suppliers are linked to other collections (e.g., products)
        res.json({ success: true, message: 'Supplier deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};