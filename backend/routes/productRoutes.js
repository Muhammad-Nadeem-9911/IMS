const express = require('express');
const {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductStatsByCategory // Import the new controller function
} = require('../controllers/productController');

const { protect, authorize } = require('../middleware/authMiddleware'); // Import auth middleware

const router = express.Router();

// Stats route - must be defined before routes with /:id to avoid conflicts
router.get('/stats/category-count', protect, getProductStatsByCategory);

// Apply protect middleware to all routes, and authorize for specific roles on CUD operations
router.route('/')
    .get(protect, authorize(['admin', 'manager']), getProducts) // Admin/Manager can get products
    .post(protect, authorize(['admin']), createProduct); // Only admin can create

router.route('/:id')
    .get(protect, authorize(['admin', 'manager']), getProductById) // Admin/Manager can view
    .put(protect, authorize(['admin']), updateProduct)    // Only admin can update
    .delete(protect, authorize(['admin']), deleteProduct); // Only admin can delete

module.exports = router;