// D:\Node\ks-home-foods-backend\src\services\payment\cashfree_payment_service.js

const axios = require('axios');

// Environment variables
const CASHFREE_APP_ID = process.env.CASHFREE_APP_ID;
const CASHFREE_SECRET_KEY = process.env.CASHFREE_SECRET_KEY;

// 🔥 Hardcode the correct Cashfree sandbox Base URL to bypass any .env loading issues
const CASHFREE_API_BASE_URL = 'https://sandbox.cashfree.com/pg';

class CashfreeService {
    constructor() {
        if (!CASHFREE_APP_ID || !CASHFREE_SECRET_KEY) {
            console.error("Cashfree API keys are missing! Payment gateway integration will fail.");
        }
        this.api = axios.create({
            baseURL: CASHFREE_API_BASE_URL,
            headers: {
                'x-client-id': CASHFREE_APP_ID,
                'x-client-secret': CASHFREE_SECRET_KEY,
                'x-api-version': '2022-09-01', // Recommended stable version
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
    }

      /**
     * Verifies the status of a payment using the Cashfree API.
     * @param {string} cfOrderId - The Cashfree order ID.
     * @returns {Promise<string>} The payment status (e.g., 'SUCCESS', 'FAILED').
     */
    async verifyPaymentStatus(cfOrderId) {
        try {
            const response = await this.api.get(`/orders/${cfOrderId}/payments`);

            if (response.data && Array.isArray(response.data) && response.data.length > 0) {
                // Return the payment status of the first payment in the list
                return response.data[0].payment_status;
            }

            return 'PENDING'; // Or another appropriate status if no payment is found

        } catch (error) {
            console.error('Cashfree verifyPaymentStatus Error:', error.response?.data || error.message);
            throw new Error(`Failed to verify payment status: ${error.response?.data?.message || error.message}`);
        }
    }

     async createOrderSession(orderId, amount, user) {
    try {
        // Create a unique order ID for Cashfree using your internal ID and a timestamp.
        // This is the ID that Cashfree will return in the redirect URL.
        const cashfreeUniqueOrderId = `ORDER_${orderId}_${Date.now()}`;
        
        const payload = {
            order_id: cashfreeUniqueOrderId, // Use the unique ID here
            order_amount: amount,
            order_currency: 'INR',
            order_meta: {
                // The return_url no longer supports {order_token}, but it does support {order_id}
                return_url: `${process.env.API_BASE_URL}/api/orders/verify-payment?order_id={order_id}`,
                notify_url: `${process.env.API_BASE_URL}/api/orders/cashfree-webhook`, // Webhook URL
            },
            customer_details: {
                customer_id: user.userId,
                customer_email: user.userEmail,
                customer_phone: user.userPhone || '9999999999', // Phone is mandatory
            },
        };
        
        console.log('Cashfree Request:', payload.order_id);
        const response = await this.api.post('/orders', payload);
        
        if (response.data && response.data.cf_order_id && response.data.payment_session_id) {
            const sessionId = response.data.payment_session_id;

            // Log the final values to confirm they are correct
            console.log('Raw cf_order_id from Cashfree API:', response.data.cf_order_id);
            console.log('Raw payment_session_id from Cashfree API:', sessionId);
            
            return {
                success: true,
                session_id: sessionId, // This is the ID Flutter needs
                payment_link: response.data.payment_link,
                cf_order_id: response.data.cf_order_id, // This is Cashfree's internal ID
                // Return the unique ID you generated as well, for your verifyPaymentStatus function.
                unique_cashfree_order_id: cashfreeUniqueOrderId,
            };
        }
        
        return { success: false, message: response.data.message || 'Cashfree session failed.' };

    } catch (error) {
        console.error('Cashfree createOrderSession Error:', error.response?.data || error.message);
        return { success: false, message: `Payment gateway error: ${error.response?.data?.message || error.message}` };
    }
}

}

module.exports = new CashfreeService();