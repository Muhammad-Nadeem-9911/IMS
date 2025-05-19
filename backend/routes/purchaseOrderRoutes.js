const express = require('express');
const router = express.Router();
const {
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    updatePurchaseOrder,
    deletePurchaseOrder,
    receivePurchaseOrderItems // Import the new controller function
} = require('../controllers/purchaseOrderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Define roles that can manage purchase orders
const poManageRoles = ['admin'];
const poViewRoles = ['admin', 'manager'];

router.route('/')
    .get(protect, authorize(poViewRoles), getPurchaseOrders)
    .post(protect, authorize(poManageRoles), createPurchaseOrder);

router.route('/:id')
    .get(protect, authorize(poViewRoles), getPurchaseOrderById)
    .put(protect, authorize(poManageRoles), updatePurchaseOrder)
    .delete(protect, authorize(poManageRoles), deletePurchaseOrder);

router.route('/:id/receive')
    .post(protect, authorize(poManageRoles), receivePurchaseOrderItems); // Only admin can receive items

module.exports = router;