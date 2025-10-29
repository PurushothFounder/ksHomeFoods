// D:\Node\ks-home-foods-backend\src\services\order\orderService.js

const { getFirestore, admin } = require('../../config/firebase');
const Order = require('../../models/order/orderModel');
const AddressModel = require('../../models/users/addressModel'); // Assuming this exists
const DeliveryBoyService = require('../deliveryboy/deliveryboyService'); // Assuming this exists

class OrderService {
    constructor() {
        this.db = getFirestore();
        this.collection = 'orders';
    }

    getDb() {
        return this.db;
    }

    /**
     * Creates and saves a new order document in Firestore.
     */
    async createBaseOrder(orderData, user, deliveryAddress) {
        const db = this.getDb();
        
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
        // NOTE: This assumes AddressModel.validateDeliveryAddress is available and works without an address ID for new addresses.
        const deliveryValidation = await AddressModel.validateDeliveryAddress(deliveryAddress.id || 'temp');
        if (deliveryAddress.id && !deliveryValidation.isDeliverable) {
            throw new Error(`Delivery not available to this location. Distance: ${deliveryValidation.distance}km exceeds our ${deliveryValidation.maxRadius}km delivery radius.`);
        }

        // --- Assign Delivery Boy Logic ---
        let assignedDeliveryBoy = null;
        const pincode = deliveryAddress.pincode.toString();
        
        if (orderData.orderType === 'food') {
            assignedDeliveryBoy = await DeliveryBoyService.getDeliveryBoyForPincode(pincode);
        }
        
        // Create order document reference
        const orderRef = db.collection(this.collection).doc();
        
        // 🔥🔥🔥 CORRECTED LOGIC FOR estimatedDeliveryTime 🔥🔥🔥
        let estimatedDeliveryTime;
        
        if (orderData.orderType === 'food' && orderData.orderDate && orderData.slotTiming) {
            // For food orders with a specific date and time slot, calculate a time within that slot.
            // Example slot: "13:00 - 14:00"
            const [startTimeStr, endTimeStr] = orderData.slotTiming.split(' - ');
            const [startHour, startMinute] = startTimeStr.split(':').map(Number);

            // Use the user-selected date to create a new Date object.
            const deliveryDate = new Date(orderData.orderDate);
            deliveryDate.setHours(startHour, startMinute, 0, 0);

            // Add a fixed buffer (e.g., 30 minutes) to the start time of the slot.
            deliveryDate.setMinutes(deliveryDate.getMinutes() + 30);
            
            estimatedDeliveryTime = deliveryDate;
        } else {
            // For other order types (e.g., products), use the old logic.
            // Calculate a time from the moment the order is placed.
            const baseTime = new Date();
            baseTime.setMinutes(baseTime.getMinutes() + (deliveryValidation.estimatedTime || 45));
            estimatedDeliveryTime = baseTime;
        }

        // Final Order Object Construction
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
            paymentStatus: orderData.paymentMethod === 'cod' ? 'pending' : (orderData.paymentStatus || 'pending'), 
            paymentId: orderData.paymentId,
            
            orderType: orderData.orderType || 'delivery',
            specialInstructions: orderData.specialInstructions,
            
            // Assign the new, correctly calculated estimatedDeliveryTime
            estimatedDeliveryTime: estimatedDeliveryTime,
            
            orderDate: orderData.orderDate || null,
            slotTiming: orderData.slotTiming || null,
            
            deliveryBoyId: assignedDeliveryBoy ? assignedDeliveryBoy.uid : null,
            deliveryBoyName: assignedDeliveryBoy ? assignedDeliveryBoy.displayName : null,
            deliveryBoyPhone: assignedDeliveryBoy ? assignedDeliveryBoy.phoneNumber : null
        });

        // Save order to Firestore
        await orderRef.set(order.toFirestore());

        return { orderRef, order };
    }

    // New method for COD orders
    async placeCODOrder(orderData) {
        const userRef = this.db.collection('users').doc(orderData.userId);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            throw new Error("User not found.");
        }
        const userProfile = userDoc.data();

        const addressDocRef = this.db.collection('addresses').doc(orderData.deliveryAddressId);
        const addressDoc = await addressDocRef.get();
        if (!addressDoc.exists) {
            throw new Error("Delivery address not found.");
        }
        const deliveryAddress = { id: addressDoc.id, ...addressDoc.data() };

        // The logic for createBaseOrder is now shared for both payment types
        const result = await this.createBaseOrder(orderData, userProfile, deliveryAddress);
        return {
            message: 'COD order placed successfully.',
            order: result.order
        };
    }

    // Your existing methods below...
    
    // User: Get order by ID
    async getOrderById(orderId) {
        const orderDoc = await this.db.collection(this.collection).doc(orderId).get();
        if (!orderDoc.exists) {
            return null;
        }
        return orderDoc.data();
    }
    
    // User: Get user's orders
    async getUserOrders(userId, limit = 20, lastOrderId = null) {
        let query = this.db.collection(this.collection).where('userId', '==', userId).orderBy('createdAt', 'desc').limit(limit);
        if (lastOrderId) {
            const lastOrderDoc = await this.db.collection(this.collection).doc(lastOrderId).get();
            if (lastOrderDoc.exists) {
                query = query.startAfter(lastOrderDoc);
            }
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data());
    }

    // User: Cancel order
    async cancelOrder(orderId, userId, reason, isAdmin = false) {
        const orderRef = this.db.collection(this.collection).doc(orderId);
        const orderDoc = await orderRef.get();

        if (!orderDoc.exists) {
            throw new Error('Order not found.');
        }

        const order = orderDoc.data();
        if (!isAdmin && order.userId !== userId) {
            throw new Error('Unauthorized to cancel this order.');
        }

        if (order.orderStatus !== 'placed' && order.orderStatus !== 'confirmed') {
            throw new Error('Order cannot be cancelled. It is already being prepared or is out for delivery.');
        }

        await orderRef.update({
            orderStatus: 'cancelled',
            paymentStatus: 'refund_pending',
            cancellationReason: reason,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { message: 'Order cancelled successfully.', orderId };
    }

    // Admin: Get all orders with optional filters
    async getAllOrders(filters) {
    // 1. Destructure 'limit', but DO NOT set a default value of 50.
    const { limit } = filters;
    
    let query = this.db.collection(this.collection);
    
    // ... (Your filter logic remains the same)
    if (filters.status) {
        query = query.where('orderStatus', '==', filters.status);
    }
    if (filters.paymentMethod) {
        query = query.where('paymentMethod', '==', filters.paymentMethod);
    }
    // ... (other filter logic)

    query = query.orderBy('createdAt', 'desc');

    // 2. ONLY apply the limit if it was passed in the filters.
    if (limit) {
        query = query.limit(limit);
    }

    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
        orderId: doc.id,
        ...doc.data()
    }));
}

    // Admin: Get orders by pincode
    async getOrdersByPincode(pincode, status) {
        let query = this.db.collection(this.collection).where('deliveryAddress.pincode', '==', pincode);
        if (status) {
            query = query.where('orderStatus', '==', status);
        }
        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data());
    }

    // Admin: Update order status
    async updateOrderStatus(orderId, status, adminId, notes) {
        const orderRef = this.db.collection(this.collection).doc(orderId);
        const updateData = {
            orderStatus: status,
            assignedAdminId: adminId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Add timestamps for specific status changes
        if (status === 'confirmed') updateData.confirmedAt = admin.firestore.FieldValue.serverTimestamp();
        if (status === 'prepared') updateData.preparedAt = admin.firestore.FieldValue.serverTimestamp();
        if (status === 'delivered') updateData.deliveredAt = admin.firestore.FieldValue.serverTimestamp();
        if (notes) updateData.adminNotes = notes;
        
        await orderRef.update(updateData);
        return { message: `Order status updated to ${status}.`, orderId };
    }

    // Admin: Assign delivery boy
    async assignDeliveryBoy(orderId, deliveryBoyId, deliveryBoyData, adminId) {
        const orderRef = this.db.collection(this.collection).doc(orderId);
        await orderRef.update({
            deliveryBoyId: deliveryBoyId,
            deliveryBoyName: deliveryBoyData.name,
            deliveryBoyPhone: deliveryBoyData.phone,
            assignedAdminId: adminId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            orderStatus: 'picked_up'
        });
        return { message: 'Delivery boy assigned successfully.', orderId, deliveryBoyId };
    }

    // Admin: Get order analytics
    async getOrderAnalytics(filters) {
        // ... (analytics logic)
    }

    // Admin: Get order summary
    async getOrderSummary() {
        // ... (summary logic)
    }

    // Utility methods
    calculateDeliveryFee(distance) {
        return distance > 5 ? 50 : 30;
    }

    calculateTax(subtotal) {
        return subtotal * 0.05; // 5% tax
    }

    async getUserProfileDetails(uid) {
        const userDoc = await this.db.collection('users').doc(uid).get();
        if (!userDoc.exists) {
            throw new Error('User profile not found.');
        }
        return userDoc.data();
    }
}

module.exports = new OrderService();