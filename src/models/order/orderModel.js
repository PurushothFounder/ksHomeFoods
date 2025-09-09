// models/orders/orderModel.js
const { admin } = require('../../config/firebase');

class Order {
  constructor(data) {
    this.id = data.id || null;
    this.orderNumber = data.orderNumber || this.generateOrderNumber();
    this.userId = data.userId;
    this.userName = data.userName;
    this.userEmail = data.userEmail;
    this.userPhone = data.userPhone;
    
    // Address information
    this.deliveryAddress = {
      id: data.deliveryAddress?.id,
      title: data.deliveryAddress?.title,
      addressLine1: data.deliveryAddress?.addressLine1,
      addressLine2: data.deliveryAddress?.addressLine2,
      landmark: data.deliveryAddress?.landmark,
      area: data.deliveryAddress?.area,
      city: data.deliveryAddress?.city,
      state: data.deliveryAddress?.state,
      pincode: data.deliveryAddress?.pincode,
      country: data.deliveryAddress?.country || 'India',
      latitude: data.deliveryAddress?.latitude,
      longitude: data.deliveryAddress?.longitude,
      contactName: data.deliveryAddress?.contactName,
      contactPhone: data.deliveryAddress?.contactPhone,
      deliveryInstructions: data.deliveryAddress?.deliveryInstructions
    };
    
    // Order items from cart
    this.items = data.items || []; // Array of {menuItemId, name, price, quantity, isVeg, imageUrl}
    
    // Pricing
    this.subtotal = data.subtotal || 0;
    this.deliveryFee = data.deliveryFee || 0;
    this.taxAmount = data.taxAmount || 0;
    this.discountAmount = data.discountAmount || 0;
    this.totalAmount = data.totalAmount || 0;
    
    // Payment
    this.paymentMethod = data.paymentMethod; // 'cod', 'online', 'wallet'
    this.paymentStatus = data.paymentStatus || 'pending'; // 'pending', 'paid', 'failed', 'refunded'
    this.paymentId = data.paymentId || null; // Payment gateway transaction ID
    
    // Order status and tracking
    this.orderStatus = data.orderStatus || 'placed'; 
    // Status flow: placed -> confirmed -> preparing -> ready -> picked_up -> on_the_way -> delivered -> cancelled
    this.orderType = data.orderType || 'delivery'; // 'delivery', 'pickup'
    
    // Delivery information
    this.estimatedDeliveryTime = data.estimatedDeliveryTime || null;
    this.actualDeliveryTime = data.actualDeliveryTime || null;
    this.deliveryBoyId = data.deliveryBoyId || null;
    this.deliveryBoyName = data.deliveryBoyName || null;
    this.deliveryBoyPhone = data.deliveryBoyPhone || null;
    
    // Admin management
    this.assignedAdminId = data.assignedAdminId || null;
    this.adminNotes = data.adminNotes || '';
    
    // Timestamps
    this.placedAt = data.placedAt || admin.firestore.FieldValue.serverTimestamp();
    this.confirmedAt = data.confirmedAt || null;
    this.preparedAt = data.preparedAt || null;
    this.deliveredAt = data.deliveredAt || null;
    this.cancelledAt = data.cancelledAt || null;
    this.createdAt = data.createdAt || admin.firestore.FieldValue.serverTimestamp();
    this.updatedAt = admin.firestore.FieldValue.serverTimestamp();
    
    // Additional fields
    this.cancellationReason = data.cancellationReason || null;
    this.customerRating = data.customerRating || null;
    this.customerReview = data.customerReview || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
  
      // --- Add these fields for food orders ---
    this.orderDate = data.orderDate || null;
    this.slotTiming = data.slotTiming || null;
  }

  // Generate unique order number
  generateOrderNumber() {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `KS${timestamp}${random}`;
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      orderNumber: this.orderNumber,
      userId: this.userId,
      userName: this.userName,
      userEmail: this.userEmail,
      userPhone: this.userPhone,
      deliveryAddress: this.deliveryAddress,
      items: this.items,
      subtotal: this.subtotal,
      deliveryFee: this.deliveryFee,
      taxAmount: this.taxAmount,
      discountAmount: this.discountAmount,
      totalAmount: this.totalAmount,
      paymentMethod: this.paymentMethod,
      paymentStatus: this.paymentStatus,
      paymentId: this.paymentId,
      orderStatus: this.orderStatus,
      orderType: this.orderType,
      estimatedDeliveryTime: this.estimatedDeliveryTime,
      actualDeliveryTime: this.actualDeliveryTime,
      deliveryBoyId: this.deliveryBoyId,
      deliveryBoyName: this.deliveryBoyName,
      deliveryBoyPhone: this.deliveryBoyPhone,
      assignedAdminId: this.assignedAdminId,
      adminNotes: this.adminNotes,
      placedAt: this.placedAt,
      confirmedAt: this.confirmedAt,
      preparedAt: this.preparedAt,
      deliveredAt: this.deliveredAt,
      cancelledAt: this.cancelledAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      cancellationReason: this.cancellationReason,
      customerRating: this.customerRating,
      customerReview: this.customerReview,
      isActive: this.isActive,
      orderDate: this.orderDate,
      slotTiming: this.slotTiming
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Order({
      id: doc.id,
      ...data,
      placedAt: data.placedAt?.toDate() || new Date(),
      confirmedAt: data.confirmedAt?.toDate() || null,
      preparedAt: data.preparedAt?.toDate() || null,
      deliveredAt: data.deliveredAt?.toDate() || null,
      cancelledAt: data.cancelledAt?.toDate() || null,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      estimatedDeliveryTime: data.estimatedDeliveryTime?.toDate() || null,
      actualDeliveryTime: data.actualDeliveryTime?.toDate() || null,
      orderDate: data.orderDate || null,
      slotTiming: data.slotTiming || null
    });
  }

  // Validation for order placement
  static validate(orderData) {
    const errors = [];

    // User validation
    if (!orderData.userId) errors.push('User ID is required');
    if (!orderData.userName || orderData.userName.trim().length < 2) {
      errors.push('User name is required');
    }

    // Address validation
    if (!orderData.deliveryAddress) {
      errors.push('Delivery address is required');
    } else {
      const addr = orderData.deliveryAddress;
      if (!addr.addressLine1) errors.push('Address line 1 is required');
      if (!addr.pincode) errors.push('Pincode is required');
      if (!addr.latitude || !addr.longitude) {
        errors.push('Address coordinates are required');
      }
    }

    // Items validation
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      errors.push('Order items are required');
    } else {
      orderData.items.forEach((item, index) => {
        if (!item.menuItemId) errors.push(`Item ${index + 1}: Menu item ID is required`);
        if (!item.name) errors.push(`Item ${index + 1}: Name is required`);
        if (!item.price || item.price <= 0) errors.push(`Item ${index + 1}: Valid price is required`);
        if (!item.quantity || item.quantity <= 0) errors.push(`Item ${index + 1}: Valid quantity is required`);
      });
    }

    // Payment validation
    if (!orderData.paymentMethod) errors.push('Payment method is required');
    if (!['cod', 'online', 'wallet'].includes(orderData.paymentMethod)) {
      errors.push('Invalid payment method');
    }

    // Pricing validation
    if (!orderData.totalAmount || orderData.totalAmount <= 0) {
      errors.push('Valid total amount is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get order status display text
  getStatusDisplay() {
    const statusMap = {
      'placed': 'Order Placed',
      'confirmed': 'Order Confirmed',
      'preparing': 'Preparing Food',
      'ready': 'Ready for Pickup',
      'picked_up': 'Picked Up',
      'on_the_way': 'On the Way',
      'delivered': 'Delivered',
      'cancelled': 'Cancelled'
    };
    return statusMap[this.orderStatus] || this.orderStatus;
  }

  // Check if order can be cancelled
  canBeCancelled() {
    return ['placed', 'confirmed'].includes(this.orderStatus);
  }

  // Check if order can be assigned to delivery boy
  canBeAssigned() {
    return ['confirmed', 'preparing', 'ready'].includes(this.orderStatus);
  }

  // Calculate estimated delivery time
  calculateEstimatedDeliveryTime() {
    const basePreparationTime = 30; // 30 minutes base preparation
    const itemsCount = this.items.reduce((sum, item) => sum + item.quantity, 0);
    const additionalTime = Math.ceil(itemsCount / 5) * 5; // 5 minutes per 5 items
    
    const estimatedMinutes = basePreparationTime + additionalTime;
    const estimatedTime = new Date();
    estimatedTime.setMinutes(estimatedTime.getMinutes() + estimatedMinutes);
    
    return estimatedTime;
  }
}

module.exports = Order;