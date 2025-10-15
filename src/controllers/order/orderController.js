const OrderService = require('../../services/order/orderService');
const CashfreeService = require('../../services/payment/cashfree_payment_service');
const Order = require('../../models/order/orderModel');
const { getFirestore, admin } = require('../../config/firebase');

class OrderController {
    constructor() {
        // Binding all methods to the class instance to preserve 'this' context.
        this.placeOrder = this.placeOrder.bind(this);
        this.initializePayment = this.initializePayment.bind(this);
        this.handleCashfreeWebhook = this.handleCashfreeWebhook.bind(this);
        this.verifyPaymentStatus = this.verifyPaymentStatus.bind(this);
        this.getOrder = this.getOrder.bind(this);
        this.getOrdersByDate = this.getOrdersByDate.bind(this);
        this.getUserOrders = this.getUserOrders.bind(this);
        this.cancelOrder = this.cancelOrder.bind(this);
        this.getAllOrders = this.getAllOrders.bind(this);
        this.getOrdersByPincode = this.getOrdersByPincode.bind(this);
        this.updateOrderStatus = this.updateOrderStatus.bind(this);
        this.assignDeliveryBoy = this.assignDeliveryBoy.bind(this);
        this.adminCancelOrder = this.adminCancelOrder.bind(this);
        this.getOrderAnalytics = this.getOrderAnalytics.bind(this);
        this.getOrderSummary = this.getOrderSummary.bind(this);
    }
    
    /**
     * POST /api/orders
     * Acts as a router: directs flow based on paymentMethod (COD vs. Online).
     * Online payments are delegated to initializePayment (below).
     */
    async placeOrder(req, res) {
        console.log('--- placeOrder: Received request ---');
        try {
            const { paymentMethod, deliveryAddressId } = req.body;
            const { uid } = req.user;
            
            console.log(`➡️ Request details: uid=${uid}, paymentMethod=${paymentMethod}, deliveryAddressId=${deliveryAddressId}`);
            
            // If the user selected Online Payment, delegate to the initialization method.
            if (paymentMethod === 'online') {
                console.log('➡️ Directing to initializePayment for online payment.');
                return this.initializePayment(req, res);
            }

            // --- Handle COD (or other non-gateway payments) ---
            console.log('➡️ Handling COD payment flow.');
            const orderData = {
                ...req.body,
                userId: uid
            };

            console.log(`📦 COD order placement request from user: ${uid}`);
            const result = await OrderService.placeCODOrder(orderData); // Dedicated COD logic

            console.log('✅ COD order placed successfully.');
            return res.status(201).json({
                success: true,
                message: result.message,
                data: {
                    order: result.order,
                    orderNumber: result.order.orderNumber
                }
            });

        } catch (error) {
            console.error('❌ Order placement (Router) error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

  /**
     * POST /api/orders/initialize-payment (Used internally when paymentMethod is 'online')
     * 1. Fetches user/address data.
     * 2. Creates a PENDING order in Firestore using createBaseOrder.
     * 3. Calls CashfreeService to create a payment session (session_id).
     * 4. Returns session_id to the Flutter frontend to initiate the payment.
     */
    async initializePayment(req, res) {
    console.log('--- initializePayment: Starting online payment flow ---');
    const { uid, email } = req.user;
    const { deliveryAddressId, items, subtotal, deliveryFee, taxAmount, discountAmount, totalAmount, orderDate, slotTiming, orderType } = req.body;
    
    let address;
    let userProfile;

    try {
        const db = getFirestore();
        
        userProfile = await OrderService.getUserProfileDetails(uid);
        const addressDocRef = db.collection('addresses').doc(deliveryAddressId);
        const addressDoc = await addressDocRef.get();
        
        if (!addressDoc.exists) {
            console.error('❌ Document does not exist at the specified path!');
            return res.status(400).json({ success: false, message: "Delivery address not found." });
        }
        
        address = { id: addressDoc.id, ...addressDoc.data() }; 
        console.log('   ✅ Address document found and data is:', JSON.stringify(address, null, 2));
        
    } catch(e) {
        console.error('\n❌ Error fetching data from Firestore:', e);
        return res.status(500).json({ success: false, message: "Failed to validate user or address." });
    }

    console.log('\n4. Preparing order data object...');
    const pendingOrderData = new Order({
        userId: uid,
        userName: userProfile.displayName || 'Customer',
        userEmail: email,
        userPhone: userProfile.phoneNumber || address.contactPhone,
        deliveryAddress: address,
        items, subtotal, deliveryFee, taxAmount, discountAmount, totalAmount,
        paymentMethod: 'online', 
        paymentStatus: 'pending', 
        orderStatus: 'placed', 
        orderDate, slotTiming, orderType,
    });
    
    let pendingOrderRef;
    let pendingOrderId;

    try {
        console.log('   💾 Saving base order document to Firestore...');
        const result = await OrderService.createBaseOrder(pendingOrderData.toFirestore(), userProfile, address);
        pendingOrderRef = result.orderRef;
        pendingOrderId = pendingOrderRef.id;
        console.log(`   ✅ Base order document created with ID: ${pendingOrderId}`);
    } catch(e) {
        console.error('\n❌ Error creating base order:', e);
        return res.status(400).json({ success: false, message: e.message || "Failed to create base order." });
    }
    
    // --- 5. Call CashfreeService to generate session ---
    console.log('\n5. Calling Cashfree API to generate session...');
    // PASS THE INTERNAL FIRESTORE ORDER ID
    const cashfreeResponse = await CashfreeService.createOrderSession(
        pendingOrderId,
        totalAmount,
        { userId: uid, userEmail: email, userPhone: userProfile.phoneNumber || address.contactPhone }
    );
    console.log('   Cashfree response received:', JSON.stringify(cashfreeResponse, null, 2));

    if (cashfreeResponse.success) {
        console.log('\n   ✅ Cashfree session created. Updating order document...');
        await pendingOrderRef.update({
            // STORE BOTH THE RAW CF_ORDER_ID (the number) AND YOUR UNIQUE STRING ID
            // THIS IS THE KEY FIX
            cashfreeOrderId: cashfreeResponse.cf_order_id,
            uniqueCashfreeOrderId: cashfreeResponse.unique_cashfree_order_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`   ✅ Order document updated with Cashfree Order ID: ${cashfreeResponse.cf_order_id}`);
        return res.status(200).json({
            success: true,
            message: 'Payment session initialized.',
            data: {
                orderId: pendingOrderId,
                cfOrderId: cashfreeResponse.cf_order_id,
                sessionId: cashfreeResponse.session_id,
            }
        });
    } else {
        console.error('\n❌ Cashfree session creation failed. Cancelling pending order...');
        await pendingOrderRef.update({
            orderStatus: 'cancelled',
            cancellationReason: 'Payment gateway session initialization failed.',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('   ✅ Pending order cancelled due to payment failure.');
        return res.status(400).json({
            success: false,
            message: `Payment initialization failed: ${cashfreeResponse.message}`,
            error: cashfreeResponse.message
        });
    }
}

    /**
     * POST /api/orders/cashfree-webhook (Public Endpoint)
     * Cashfree calls this on payment success/failure. No user auth required.
     */
    async handleCashfreeWebhook(req, res) {
        const { data, type } = req.body;
        // const signature = req.headers['x-cf-signature']; // Signature verification is critical

        console.log(`Webhook Received: ${type} for CF Order ID: ${data?.order?.cf_order_id}`);

        if (type === 'ORDER_PAID' || type === 'PAYMENT_SUCCESS') {
            const cfOrderId = data.order.cf_order_id;
            const paymentId = data.payment.cf_payment_id;

            try {
                const db = getFirestore();
                
                // Find order by Cashfree Order ID
                const orderQuery = await db.collection('orders').where('cashfreeOrderId', '==', cfOrderId).limit(1).get();
                
                if (orderQuery.empty) {
                    return res.status(404).json({ status: 'Order not found in DB' });
                }

                const orderDoc = orderQuery.docs[0];
                const orderRef = orderDoc.ref;
                
                // Update Order Status: PAID
                await orderRef.update({
                    paymentStatus: 'paid',
                    orderStatus: 'confirmed', // Finalize order status
                    paymentId: paymentId,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(`Order ${orderDoc.id} successfully updated to PAID/CONFIRMED.`);
                
                return res.status(200).json({ status: 'Order Updated Successfully' });

            } catch (error) {
                console.error('Webhook processing error:', error);
                return res.status(500).json({ status: 'Internal Server Error' });
            }
        }
        
        if (type === 'PAYMENT_FAILED' || type === 'ORDER_FAILED') {
            // NOTE: Add logic here to find the pending order by cf_order_id and update its status to 'cancelled'
            console.log(`Payment failed webhook received for CF Order ID: ${data.order.cf_order_id}`);
            // You can implement similar logic to the success case here to update the order status to 'cancelled'
        }

        return res.status(200).json({ status: 'Webhook received but action not taken' });
    }
    
    // User: Get order by ID
    async getOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { uid } = req.user;

            const order = await OrderService.getOrderById(orderId);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: 'Order not found',
                    data: null
                });
            }

            // Check if user owns the order (unless admin)
            if (order.userId !== uid && !req.user.isAdmin) {
                return res.status(403).json({
                    success: false,
                    message: 'Unauthorized to view this order',
                    data: null
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Order retrieved successfully',
                data: {
                    order
                }
            });

        } catch (error) {
            console.error('❌ Get order error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    async getOrdersByDate(req, res) {
        try {
            const { fromDate, toDate } = req.query;

            if (!fromDate || !toDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Both fromDate and toDate are required.',
                    data: null
                });
            }

            console.log(`📋 Admin fetching orders from ${fromDate} to ${toDate}`);

            const orders = await OrderService.getAllOrders({ fromDate, toDate });

            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully for the specified date range',
                data: {
                    orders,
                    count: orders.length
                }
            });

        } catch (error) {
            console.error('❌ Get orders by date error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // User: Get user's orders
    async getUserOrders(req, res) {
        try {
            const { uid } = req.user;
            const { limit = 20, lastOrderId } = req.query;

            const orders = await OrderService.getUserOrders(uid, parseInt(limit), lastOrderId);

            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: {
                    orders,
                    count: orders.length,
                    hasMore: orders.length === parseInt(limit)
                }
            });

        } catch (error) {
            console.error('❌ Get user orders error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // User: Cancel order
    async cancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { uid } = req.user;
            const { reason } = req.body;

            if (!reason || reason.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required (minimum 5 characters)',
                    data: null
                });
            }

            const result = await OrderService.cancelOrder(orderId, uid, reason);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    orderId: result.orderId
                }
            });

        } catch (error) {
            console.error('❌ Cancel order error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Get all orders with filters
    async getAllOrders(req, res) {
        try {
            const filters = {
                status: req.query.status,
                paymentMethod: req.query.paymentMethod,
                pincode: req.query.pincode,
                assignedAdminId: req.query.assignedAdminId,
                deliveryBoyId: req.query.deliveryBoyId,
                fromDate: req.query.fromDate,
                toDate: req.query.toDate,
                limit: req.query.limit ? parseInt(req.query.limit) : 50
            };

            // Remove undefined values
            Object.keys(filters).forEach(key => 
                filters[key] === undefined && delete filters[key]
            );

            console.log('📋 Admin fetching orders with filters:', filters);

            const orders = await OrderService.getAllOrders(filters);

            return res.status(200).json({
                success: true,
                message: 'Orders retrieved successfully',
                data: {
                    orders,
                    count: orders.length,
                    filters: filters
                }
            });

        } catch (error) {
            console.error('❌ Get all orders error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Get orders by pincode
    async getOrdersByPincode(req, res) {
        try {
            const { pincode } = req.params;
            const { status } = req.query;

            const orders = await OrderService.getOrdersByPincode(pincode, status);

            return res.status(200).json({
                success: true,
                message: `Orders retrieved for pincode ${pincode}`,
                data: {
                    orders,
                    pincode,
                    count: orders.length,
                    status: status || 'all'
                }
            });

        } catch (error) {
            console.error('❌ Get orders by pincode error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Update order status
    async updateOrderStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { status, notes } = req.body;
            const { uid: adminId } = req.user;

            if (!status) {
                return res.status(400).json({
                    success: false,
                    message: 'Order status is required',
                    data: null
                });
            }

            const validStatuses = [
                'placed', 'confirmed', 'preparing', 'ready', 
                'picked_up', 'on_the_way', 'delivered', 'cancelled'
            ];

            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`,
                    data: null
                });
            }

            console.log(`📝 Admin ${adminId} updating order ${orderId} status to ${status}`);

            const result = await OrderService.updateOrderStatus(orderId, status, adminId, notes);

            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    orderId: result.orderId,
                    newStatus: status
                }
            });

        } catch (error) {
            console.error('❌ Update order status error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Assign delivery boy (preparation for future delivery boy app)
    async assignDeliveryBoy(req, res) {
        try {
            const { orderId } = req.params;
            const { deliveryBoyId, deliveryBoyName, deliveryBoyPhone } = req.body;
            const { uid: adminId } = req.user;

            if (!deliveryBoyId || !deliveryBoyName || !deliveryBoyPhone) {
                return res.status(400).json({
                    success: false,
                    message: 'Delivery boy ID, name, and phone are required',
                    data: null
                });
            }

            const deliveryBoyData = {
                name: deliveryBoyName,
                phone: deliveryBoyPhone
            };

            console.log(`🚚 Admin ${adminId} assigning delivery boy ${deliveryBoyId} to order ${orderId}`);

            const result = await OrderService.assignDeliveryBoy(
                orderId, 
                deliveryBoyId, 
                deliveryBoyData, 
                adminId
            );

            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    orderId: result.orderId,
                    deliveryBoyId: result.deliveryBoyId
                }
            });

        } catch (error) {
            console.error('❌ Assign delivery boy error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Cancel order
    async adminCancelOrder(req, res) {
        try {
            const { orderId } = req.params;
            const { reason } = req.body;
            const { uid: adminId } = req.user;

            if (!reason || reason.trim().length < 5) {
                return res.status(400).json({
                    success: false,
                    message: 'Cancellation reason is required (minimum 5 characters)',
                    data: null
                });
            }

            console.log(`❌ Admin ${adminId} cancelling order ${orderId}`);

            const result = await OrderService.cancelOrder(
                orderId, 
                null, // userId not needed for admin
                reason, 
                true, // isAdmin
                adminId
            );

            return res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    orderId: result.orderId
                }
            });

        } catch (error) {
            console.error('❌ Admin cancel order error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Get order analytics
    async getOrderAnalytics(req, res) {
        try {
            const filters = {
                fromDate: req.query.fromDate,
                toDate: req.query.toDate
            };

            // Remove undefined values
            Object.keys(filters).forEach(key => 
                filters[key] === undefined && delete filters[key]
            );

            console.log('📊 Admin requesting order analytics with filters:', filters);

            const analytics = await OrderService.getOrderAnalytics(filters);

            return res.status(200).json({
                success: true,
                message: 'Order analytics retrieved successfully',
                data: {
                    analytics,
                    filters
                }
            });

        } catch (error) {
            console.error('❌ Get order analytics error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    // Admin: Get order summary by status
    async getOrderSummary(req, res) {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get today's orders
            const todayOrders = await OrderService.getAllOrders({
                fromDate: today.toISOString(),
                toDate: tomorrow.toISOString()
            });

            // Get all active orders
            const activeOrders = await OrderService.getAllOrders({
                status: null // Get all statuses
            });

            // Calculate summary
            const summary = {
                today: {
                    total: todayOrders.length,
                    revenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
                    byStatus: {}
                },
                active: {
                    pending: activeOrders.filter(o => ['placed', 'confirmed'].includes(o.orderStatus)).length,
                    preparing: activeOrders.filter(o => ['preparing', 'ready'].includes(o.orderStatus)).length,
                    delivery: activeOrders.filter(o => ['picked_up', 'on_the_way'].includes(o.orderStatus)).length,
                    completed: activeOrders.filter(o => o.orderStatus === 'delivered').length,
                    cancelled: activeOrders.filter(o => o.orderStatus === 'cancelled').length
                },
                byPincode: {}
            };

            // Today's orders by status
            todayOrders.forEach(order => {
                summary.today.byStatus[order.orderStatus] = 
                    (summary.today.byStatus[order.orderStatus] || 0) + 1;
            });

            // Orders by pincode (active orders only)
            activeOrders
                .filter(o => !['delivered', 'cancelled'].includes(o.orderStatus))
                .forEach(order => {
                    const pincode = order.deliveryAddress.pincode;
                    summary.byPincode[pincode] = (summary.byPincode[pincode] || 0) + 1;
                });

            return res.status(200).json({
                success: true,
                message: 'Order summary retrieved successfully',
                data: {
                    summary
                }
            });

        } catch (error) {
            console.error('❌ Get order summary error:', error);
            return res.status(400).json({
                success: false,
                message: error.message,
                error: error.message,
                data: null
            });
        }
    }

    async paymentFailed(req, res) {
    const { orderId, message } = req.query;
    // Handle the payment failed logic here
    return res.status(200).json({ success: false, message: message || 'Payment failed', orderId });
}

async orderSuccess(req, res) {
    const { orderId } = req.query;
    // Handle the payment success logic here
    return res.status(200).json({ success: true, message: 'Payment successful', orderId });
}

    /**
     * GET /api/orders/verify-payment (Public Endpoint)
     * Cashfree redirects here after a payment attempt. This endpoint must be public.
     * It verifies the payment status with Cashfree and updates the order.
     */

// D:\Node\ks-home-foods-backend\src\controllers\order\orderController.js

async verifyPaymentStatus(req, res) {
    console.log('--- verifyPaymentStatus: Received payment verification request ---');
    const { order_id: incomingId } = req.query; 
    console.log('   ➡️ Incoming Order ID from query:', incomingId);

    if (!incomingId) {
        return res.status(400).json({
            success: false,
            message: 'Missing order ID in request.'
        });
    }

    try {
        const db = getFirestore();
        
        // Use the incoming ID to find the document.
        // It could be either the numerical cashfreeOrderId or your custom uniqueCashfreeOrderId.
        // We'll first try to find it by the numerical cashfreeOrderId, which seems to be the one Cashfree is sending.
        const numericalId = parseInt(incomingId);
        
        let orderQuery;
        let queryField;

        if (!isNaN(numericalId)) {
            queryField = 'cashfreeOrderId';
            orderQuery = await db.collection('orders').where(queryField, '==', numericalId).limit(1).get();
        } else {
            // Fallback to searching by the custom unique ID if the incoming ID is not a number.
            queryField = 'uniqueCashfreeOrderId';
            orderQuery = await db.collection('orders').where(queryField, '==', incomingId).limit(1).get();
        }
        
        if (orderQuery.empty) {
            console.error(`❌ Order not found for ${queryField}: ${incomingId}`);
            return res.status(404).json({
                success: false,
                message: 'Order not found for verification.'
            });
        }
        
        const orderDoc = orderQuery.docs[0];
        const orderRef = orderDoc.ref;
        const appOrderId = orderDoc.id;
        const uniqueCashfreeOrderId = orderDoc.data().uniqueCashfreeOrderId;
        
        console.log(`   ✅ Found local order ${appOrderId}. Verifying with Cashfree using unique ID: ${uniqueCashfreeOrderId}`);
        
        // Pass the correct unique ID to the Cashfree service for the API call.
        const paymentStatus = await CashfreeService.verifyPaymentStatus(uniqueCashfreeOrderId);
        
        if (paymentStatus === 'SUCCESS') {
            console.log(`✅ Payment for order ${appOrderId} confirmed as SUCCESS.`);
            await orderRef.update({
                paymentStatus: 'paid',
                orderStatus: 'confirmed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(200).json({
                success: true,
                message: 'Payment successful.',
                orderId: appOrderId
            });
        } else {
            console.log(`❌ Payment for order ${appOrderId} FAILED or was CANCELLED. Status: ${paymentStatus}`);
            await orderRef.update({
                paymentStatus: 'failed',
                orderStatus: 'cancelled',
                cancellationReason: `Payment failed or was cancelled. Status: ${paymentStatus}`,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            return res.status(400).json({
                success: false,
                message: `Payment failed or was cancelled. Status: ${paymentStatus}`,
                orderId: appOrderId
            });
        }

    } catch (error) {
        console.error('❌ Error verifying payment and updating order:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error: Failed to verify payment status.'
        });
    }
}
}

module.exports = new OrderController();