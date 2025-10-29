const express = require('express');
const router = express.Router();
const OrderController = require('../../controllers/order/orderController');
const { authenticateToken } = require('../../middleware/users/auth');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// =============================================================================
// PUBLIC ROUTES (No authentication required)
// =============================================================================

// ➡️ CHANGE: Webhook endpoint for Razorpay payment status updates
// IMPORTANT: Need to ensure a body parser (like 'raw-body') is used BEFORE express.json() 
// for signature verification in production. For this context, we stick to express.json().
router.post('/razorpay-webhook', express.json(), OrderController.handleRazorpayWebhook); 

// Fallback success/failure endpoints (often used as redirect targets)
router.get('/payment-failed', OrderController.paymentFailed);
router.get('/order-success', OrderController.orderSuccess);
// ➡️ CHANGE: Verification endpoint after redirect
router.get('/verify-payment', OrderController.verifyRazorpayPayment); 

// =============================================================================
// USER ROUTES (require user authentication)
// =============================================================================

// Place a new order (Handles both COD and initializes Online Payment, which calls initializeRazorpayOrder internally)
router.post('/', authenticateToken, OrderController.placeOrder);

// Get user's orders
router.get('/my-orders', authenticateToken, OrderController.getUserOrders);

// Get specific order by ID
router.get('/:orderId', authenticateToken, OrderController.getOrder);

// Cancel order
router.put('/:orderId/cancel', authenticateToken, OrderController.cancelOrder);

// =============================================================================
// ADMIN ROUTES (require admin authentication)
// =============================================================================

// Get all orders with filters
router.get('/admin/all', adminAuth, OrderController.getAllOrders);

// Get order summary for dashboard
router.get('/admin/summary', adminAuth, OrderController.getOrderSummary);

// Get order analytics
router.get('/admin/analytics', adminAuth, OrderController.getOrderAnalytics);

// Get orders by pincode
router.get('/admin/pincode/:pincode', adminAuth, OrderController.getOrdersByPincode);

// Update order status
router.patch('/admin/:orderId/status', adminAuth, OrderController.updateOrderStatus);

// Assign delivery boy to order (prepare for delivery boy app)
router.patch('/admin/:orderId/assign-delivery-boy', adminAuth, OrderController.assignDeliveryBoy);

// Admin cancel order
router.patch('/admin/:orderId/cancel', adminAuth, OrderController.adminCancelOrder);

router.get('/admin/orders/date-range', adminAuth, OrderController.getOrdersByDate);

module.exports = router;