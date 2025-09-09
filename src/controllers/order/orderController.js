// controllers/orders/orderController.js
const OrderService = require('../../services/order/orderService');

class OrderController {
  // User: Place a new order
  async placeOrder(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      const orderData = {
        ...req.body,
        userId: uid
      };

      console.log('📦 Order placement request from user:', uid);

      const result = await OrderService.placeOrder(orderData);

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          order: result.order,
          orderNumber: result.order.orderNumber
        }
      });

    } catch (error) {
      console.error('❌ Order placement error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
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
}

module.exports = new OrderController();