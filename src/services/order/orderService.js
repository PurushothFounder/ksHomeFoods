// services/orders/orderService.js
const { getFirestore, admin } = require('../../config/firebase');
const Order = require('../../models/order/orderModel');
const UserModel = require('../../models/users/userModel');
const AddressModel = require('../../models/users/addressModel');

class OrderService {
  constructor() {
    this.collection = 'orders';
  }

  // Lazy load database connection
  getDb() {
    return getFirestore();
  }

async placeOrder(orderData) {
  try {
    console.log('📝 Placing new order:', orderData);

    const db = this.getDb();

    // Get user information FIRST
    const user = await UserModel.getUserByUid(orderData.userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validate and get delivery address FIRST
    let deliveryAddress = orderData.deliveryAddress;

    if (orderData.deliveryAddressId) {
      const fullAddress = await AddressModel.getAddressById(orderData.deliveryAddressId);
      if (!fullAddress || fullAddress.userId !== orderData.userId) {
        throw new Error('Invalid delivery address');
      }
      deliveryAddress = fullAddress;
    }

    if (!deliveryAddress) {
      throw new Error('Delivery address is required');
    }

    // Prepare complete order data for validation
    const completeOrderData = {
      ...orderData,
      userName: user.displayName || user.email || 'Customer',
      deliveryAddress: deliveryAddress,
      userEmail: user.email,
      userPhone: user.phoneNumber || deliveryAddress.contactPhone
    };

    // Validate order data
    const validation = Order.validate(completeOrderData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Validate delivery availability
    const deliveryValidation = await AddressModel.validateDeliveryAddress(deliveryAddress.id || 'temp');
    if (deliveryAddress.id && !deliveryValidation.isDeliverable) {
      throw new Error(`Delivery not available to this location. Distance: ${deliveryValidation.distance}km exceeds our ${deliveryValidation.maxRadius}km delivery radius.`);
    }

    // Create order document
    const orderRef = db.collection(this.collection).doc();

    // Calculate estimated delivery time
    const baseTime = new Date();
    baseTime.setMinutes(baseTime.getMinutes() + (deliveryValidation.estimatedTime || 45));

    // --- NEW: Add orderDate and slotTiming for food orders ---
    let orderDate = null;
    let slotTiming = null;

    // You can check orderType or check if any item is food
    // Here, we check orderType === 'food'
    if (orderData.orderType === 'food') {
      orderDate = orderData.orderDate || null;
      slotTiming = orderData.slotTiming || null;
    }

    const order = new Order({
      id: orderRef.id,
      userId: user.uid,
      userName: user.displayName || user.email || 'Customer',
      userEmail: user.email,
      userPhone: user.phoneNumber || deliveryAddress.contactPhone,
      deliveryAddress: {
        id: deliveryAddress.id,
        title: deliveryAddress.title,
        addressLine1: deliveryAddress.addressLine1,
        addressLine2: deliveryAddress.addressLine2,
        landmark: deliveryAddress.landmark,
        area: deliveryAddress.area,
        city: deliveryAddress.city,
        state: deliveryAddress.state,
        pincode: deliveryAddress.pincode,
        country: deliveryAddress.country,
        latitude: deliveryAddress.latitude,
        longitude: deliveryAddress.longitude,
        contactName: deliveryAddress.contactName || user.displayName,
        contactPhone: deliveryAddress.contactPhone || user.phoneNumber,
        deliveryInstructions: deliveryAddress.deliveryInstructions
      },
      items: orderData.items,
      subtotal: orderData.subtotal,
      deliveryFee: orderData.deliveryFee || this.calculateDeliveryFee(deliveryValidation.distance),
      taxAmount: orderData.taxAmount || this.calculateTax(orderData.subtotal),
      discountAmount: orderData.discountAmount || 0,
      totalAmount: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod,
      paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : orderData.paymentStatus,
      paymentId: orderData.paymentId,
      orderType: orderData.orderType || 'delivery',
      specialInstructions: orderData.specialInstructions,
      estimatedDeliveryTime: baseTime,
      // --- Add these fields for food orders ---
      orderDate,
      slotTiming
    });

    // Save order to Firestore
    await orderRef.set(order.toFirestore());

    console.log('✅ Order placed successfully:', order.orderNumber);

    // Return the created order
    const createdOrder = await orderRef.get();
    return {
      success: true,
      message: 'Order placed successfully',
      order: Order.fromFirestore(createdOrder)
    };

  } catch (error) {
    console.error('❌ Error placing order:', error);
    throw new Error(`Failed to place order: ${error.message}`);
  }
}

  // Get order by ID
  async getOrderById(orderId) {
    try {
      const db = this.getDb();
      const orderDoc = await db.collection(this.collection).doc(orderId).get();

      if (!orderDoc.exists) {
        return null;
      }

      return Order.fromFirestore(orderDoc);
    } catch (error) {
      throw new Error(`Failed to get order: ${error.message}`);
    }
  }

  // Get orders for a user
  async getUserOrders(userId, limit = 20, lastOrderId = null) {
    try {
      const db = this.getDb();
      let query = db
        .collection(this.collection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .limit(limit);

      // For pagination
      if (lastOrderId) {
        const lastOrderDoc = await db.collection(this.collection).doc(lastOrderId).get();
        if (lastOrderDoc.exists) {
          query = query.startAfter(lastOrderDoc);
        }
      }

      const orderDocs = await query.get();
      
      return orderDocs.docs.map(doc => Order.fromFirestore(doc));
    } catch (error) {
      throw new Error(`Failed to get user orders: ${error.message}`);
    }
  }

  // Admin: Get all orders with filters
  async getAllOrders(filters = {}) {
    try {
      const db = this.getDb();
      let query = db.collection(this.collection).where('isActive', '==', true);

      // Apply filters
      if (filters.status) {
        query = query.where('orderStatus', '==', filters.status);
      }
      
      if (filters.paymentMethod) {
        query = query.where('paymentMethod', '==', filters.paymentMethod);
      }

      if (filters.pincode) {
        query = query.where('deliveryAddress.pincode', '==', filters.pincode);
      }

      if (filters.assignedAdminId) {
        query = query.where('assignedAdminId', '==', filters.assignedAdminId);
      }

      if (filters.deliveryBoyId) {
        query = query.where('deliveryBoyId', '==', filters.deliveryBoyId);
      }

      // Date range filter
      if (filters.fromDate) {
        query = query.where('createdAt', '>=', new Date(filters.fromDate));
      }
      
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999); // End of day
        query = query.where('createdAt', '<=', toDate);
      }

      // Order by creation time (newest first)
      query = query.orderBy('createdAt', 'desc');

      // Apply limit
      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const orderDocs = await query.get();
      return orderDocs.docs.map(doc => Order.fromFirestore(doc));

    } catch (error) {
      throw new Error(`Failed to get orders: ${error.message}`);
    }
  }

  // Admin: Get orders by pincode
  async getOrdersByPincode(pincode, status = null) {
    try {
      const db = this.getDb();
      let query = db
        .collection(this.collection)
        .where('deliveryAddress.pincode', '==', pincode)
        .where('isActive', '==', true);

      if (status) {
        query = query.where('orderStatus', '==', status);
      }

      query = query.orderBy('createdAt', 'desc');

      const orderDocs = await query.get();
      return orderDocs.docs.map(doc => Order.fromFirestore(doc));
    } catch (error) {
      throw new Error(`Failed to get orders by pincode: ${error.message}`);
    }
  }

  // Admin: Update order status
  async updateOrderStatus(orderId, newStatus, adminId, notes = '') {
    try {
      const db = this.getDb();
      const orderRef = db.collection(this.collection).doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const currentOrder = Order.fromFirestore(orderDoc);
      const updateData = {
        orderStatus: newStatus,
        assignedAdminId: adminId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Add notes if provided
      if (notes) {
        updateData.adminNotes = notes;
      }

      // Set timestamp based on status
      switch (newStatus) {
        case 'confirmed':
          updateData.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
          break;
        case 'preparing':
          updateData.confirmedAt = updateData.confirmedAt || admin.firestore.FieldValue.serverTimestamp();
          break;
        case 'ready':
          updateData.preparedAt = admin.firestore.FieldValue.serverTimestamp();
          break;
        case 'delivered':
          updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
          updateData.actualDeliveryTime = admin.firestore.FieldValue.serverTimestamp();
          break;
        case 'cancelled':
          updateData.cancelledAt = admin.firestore.FieldValue.serverTimestamp();
          break;
      }

      await orderRef.update(updateData);

      return {
        success: true,
        message: `Order status updated to ${newStatus}`,
        orderId: orderId
      };

    } catch (error) {
      throw new Error(`Failed to update order status: ${error.message}`);
    }
  }

  // Admin: Assign order to delivery boy (prepare for future)
  async assignDeliveryBoy(orderId, deliveryBoyId, deliveryBoyData, adminId) {
    try {
      const db = this.getDb();
      const orderRef = db.collection(this.collection).doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const currentOrder = Order.fromFirestore(orderDoc);
      
      if (!currentOrder.canBeAssigned()) {
        throw new Error(`Order cannot be assigned in status: ${currentOrder.orderStatus}`);
      }

      const updateData = {
        deliveryBoyId: deliveryBoyId,
        deliveryBoyName: deliveryBoyData.name,
        deliveryBoyPhone: deliveryBoyData.phone,
        assignedAdminId: adminId,
        orderStatus: currentOrder.orderStatus === 'ready' ? 'picked_up' : currentOrder.orderStatus,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await orderRef.update(updateData);

      return {
        success: true,
        message: 'Delivery boy assigned successfully',
        orderId: orderId,
        deliveryBoyId: deliveryBoyId
      };

    } catch (error) {
      throw new Error(`Failed to assign delivery boy: ${error.message}`);
    }
  }

  // Cancel order
  async cancelOrder(orderId, userId, reason, isAdmin = false, adminId = null) {
    try {
      const db = this.getDb();
      const orderRef = db.collection(this.collection).doc(orderId);
      const orderDoc = await orderRef.get();

      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }

      const order = Order.fromFirestore(orderDoc);

      // Check authorization
      if (!isAdmin && order.userId !== userId) {
        throw new Error('Unauthorized to cancel this order');
      }

      // Check if order can be cancelled
      if (!order.canBeCancelled() && !isAdmin) {
        throw new Error(`Order cannot be cancelled in status: ${order.orderStatus}`);
      }

      const updateData = {
        orderStatus: 'cancelled',
        cancellationReason: reason,
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (adminId) {
        updateData.assignedAdminId = adminId;
      }

      await orderRef.update(updateData);

      return {
        success: true,
        message: 'Order cancelled successfully',
        orderId: orderId
      };

    } catch (error) {
      throw new Error(`Failed to cancel order: ${error.message}`);
    }
  }

  // Get order analytics for admin
  async getOrderAnalytics(filters = {}) {
    try {
      const db = this.getDb();
      let query = db.collection(this.collection).where('isActive', '==', true);

      // Apply date filter
      if (filters.fromDate) {
        query = query.where('createdAt', '>=', new Date(filters.fromDate));
      }
      
      if (filters.toDate) {
        const toDate = new Date(filters.toDate);
        toDate.setHours(23, 59, 59, 999);
        query = query.where('createdAt', '<=', toDate);
      }

      const orderDocs = await query.get();
      const orders = orderDocs.docs.map(doc => Order.fromFirestore(doc));

      // Calculate analytics
      const analytics = {
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
        statusBreakdown: {},
        paymentMethodBreakdown: {},
        pincodeBreakdown: {},
        averageOrderValue: 0,
        ordersByDate: {}
      };

      // Calculate breakdowns
      orders.forEach(order => {
        // Status breakdown
        analytics.statusBreakdown[order.orderStatus] = 
          (analytics.statusBreakdown[order.orderStatus] || 0) + 1;

        // Payment method breakdown
        analytics.paymentMethodBreakdown[order.paymentMethod] = 
          (analytics.paymentMethodBreakdown[order.paymentMethod] || 0) + 1;

        // Pincode breakdown
        const pincode = order.deliveryAddress.pincode;
        analytics.pincodeBreakdown[pincode] = 
          (analytics.pincodeBreakdown[pincode] || 0) + 1;

        // Orders by date
        const date = order.createdAt.toISOString().split('T')[0];
        analytics.ordersByDate[date] = (analytics.ordersByDate[date] || 0) + 1;
      });

      // Calculate average order value
      analytics.averageOrderValue = analytics.totalOrders > 0 
        ? Math.round((analytics.totalRevenue / analytics.totalOrders) * 100) / 100
        : 0;

      return analytics;

    } catch (error) {
      throw new Error(`Failed to get order analytics: ${error.message}`);
    }
  }

  // Helper method to calculate delivery fee
  calculateDeliveryFee(distance) {
    const baseFee = 25; // Base delivery fee
    const perKmFee = 5; // Additional fee per km
    const maxFee = 60; // Maximum delivery fee
    
    const calculatedFee = baseFee + (Math.ceil(distance) * perKmFee);
    return Math.min(calculatedFee, maxFee);
  }

  // Helper method to calculate tax
  calculateTax(subtotal) {
    const taxRate = 0.05; // 5% tax
    return Math.round(subtotal * taxRate * 100) / 100;
  }
}

module.exports = new OrderService();