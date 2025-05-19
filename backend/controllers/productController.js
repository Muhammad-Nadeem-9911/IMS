const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Private (to be protected)
exports.getProducts = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const searchTerm = req.query.search || '';

        const query = {};

        if (searchTerm) {
            const regex = new RegExp(searchTerm, 'i'); // 'i' for case-insensitive
            query.$or = [
                { name: regex },
                { sku: regex },
                { category: regex },
                // If you want to search by supplier name (assuming supplier is populated and 'name' is a field on supplier)
                // This requires a more complex query or doing it after populating.
                // For simplicity, we'll stick to direct product fields for now.
                // If supplier is an ObjectId and you want to search by supplier name,
                // you'd typically fetch matching supplier IDs first, then use $in for product.supplier.
            ];
        }

        const startIndex = (page - 1) * limit;

        const total = await Product.countDocuments(query);
        const products = await Product.find(query)
            .populate('supplier', 'name email') // Populate supplier name and email
            .sort({ name: 1 }) // Sort by name
            .skip(startIndex)
            .limit(limit);

        res.status(200).json({
            success: true,
            count: total, // Total matching documents for pagination
            pagination: { // Optional: send pagination metadata
                currentPage: page,
                totalPages: Math.ceil(total / limit),
            },
            data: products
        });
    } catch (error) {
        console.error('Get Products Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Private
exports.getProductById = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id).populate('supplier', 'name email contactPerson phone'); // Populate more supplier details

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error('Get Product By ID Error:', error.message);
        if (error.kind === 'ObjectId') { // Handle invalid MongoDB ObjectId format
            return res.status(404).json({ success: false, message: 'Product not found (invalid ID format)' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Create a new product
// @route   POST /api/products
// @access  Private (e.g., Admin or Manager only)
exports.createProduct = async (req, res, next) => {
    try {
        // Add user to req.body if you want to associate product with the logged-in user
        // req.body.user = req.user.id; // Assuming req.user is populated by auth middleware
        const productData = { ...req.body };

        // If supplier is sent as an empty string (e.g., from a form select), convert to null
        if (productData.supplier === '') {
            productData.supplier = null;
        }
        productData.updatedAt = Date.now(); // Set updatedAt on creation

        const product = await Product.create(productData);
        res.status(201).json({
            success: true,
            data: product
        });
    } catch (error) {
        console.error('Create Product Error:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        } else if (error.code === 11000) { // Duplicate key error (e.g., for SKU)
            return res.status(400).json({ success: false, message: 'Duplicate field value entered. SKU might already exist.' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private (e.g., Admin or Manager only)
exports.updateProduct = async (req, res, next) => {
    try {
        let product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        // Optional: Check if user is authorized to update this product
        // if (product.user.toString() !== req.user.id && req.user.role !== 'admin') {
        //     return res.status(401).json({ success: false, message: 'Not authorized to update this product' });
        // }
        const updateData = { ...req.body };

        // If supplier is explicitly sent as an empty string, set it to null to unset the supplier
        // If 'supplier' key is not in updateData, it won't be changed.
        if (updateData.hasOwnProperty('supplier') && updateData.supplier === '') {
            updateData.supplier = null;
        }
        updateData.updatedAt = Date.now(); // Set updatedAt on update

        product = await Product.findByIdAndUpdate(req.params.id, updateData, {
            new: true, // Return the modified document
            runValidators: true // Run Mongoose validators on update
        });

        res.status(200).json({ success: true, data: product });
    } catch (error) {
        console.error('Update Product Error:', error.message);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages });
        } else if (error.code === 11000) {
            return res.status(400).json({ success: false, message: 'Duplicate field value entered for SKU.' });
        }
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private (e.g., Admin or Manager only)
exports.deleteProduct = async (req, res, next) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        await product.deleteOne(); // or product.remove() for older Mongoose versions

        res.status(200).json({ success: true, data: {} }); // Or message: 'Product removed'
    } catch (error) {
        console.error('Delete Product Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};

// @desc    Get product statistics (e.g., count by category)
// @route   GET /api/products/stats/category-count
// @access  Private
exports.getProductStatsByCategory = async (req, res, next) => {
    try {
        const stats = await Product.aggregate([
            {
                $group: {
                    _id: '$category', // Group by the category field
                    count: { $sum: 1 }    // Count documents in each group
                }
            },
            { $sort: { count: -1 } } // Optional: sort by count descending
        ]);

        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        console.error('Get Product Stats Error:', error.message);
        res.status(500).json({ success: false, message: 'Server Error' });
    }
};