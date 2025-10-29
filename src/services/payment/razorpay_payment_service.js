// D:\Node\ks-home-foods-backend\src\services\payment\razorpay_payment_service.js

const Razorpay = require('razorpay'); // Need to install: npm install razorpay
const crypto = require('crypto');

// Environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

class RazorpayService {
    constructor() {
        if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
            console.error("Razorpay API keys are missing! Payment gateway integration will fail.");
            // You might want to throw an error or handle this more gracefully
        }
        
        // Initialize Razorpay instance
        this.instance = new Razorpay({
            key_id: RAZORPAY_KEY_ID,
            key_secret: RAZORPAY_KEY_SECRET
        });
    }

    /**
     * STEP 1: Creates an Order in Razorpay.
     * @param {string} internalOrderId - Your internal Firestore Order ID.
     * @param {number} amount - Total amount in standard currency (e.g., 100.00).
     * @param {object} user - User details.
     * @returns {Promise<object>} The Razorpay order details.
     */
    async createOrder(internalOrderId, amount, user) {
        try {
            // Razorpay amount must be in the smallest currency unit (e.g., paise for INR)
            const amountInPaise = Math.round(amount * 100); 

            const options = {
                amount: amountInPaise, 
                currency: 'INR', // Assuming currency is INR based on Cashfree setup
                receipt: `receipt_${internalOrderId}`, // Use internal ID as receipt for tracking
                notes: {
                    userId: user.userId,
                    orderId: internalOrderId
                }
            };
            
            console.log('Razorpay Request:', options);
            const razorpayOrder = await this.instance.orders.create(options);
            
            console.log('Razorpay response received:', JSON.stringify(razorpayOrder, null, 2));

            return {
                success: true,
                razorpayOrderId: razorpayOrder.id, // This is the ID passed to the frontend
                amount: razorpayOrder.amount / 100, // Return amount in standard unit
                currency: razorpayOrder.currency,
                message: 'Razorpay order created successfully.'
            };

        } catch (error) {
            console.error('Razorpay createOrder Error:', error.message);
            return { 
                success: false, 
                message: `Payment gateway error: ${error.message}` 
            };
        }
    }
    
    /**
     * STEP 3 (Option A - Webhook): Validates the incoming webhook signature.
     * @param {object} reqBody - Raw request body from the webhook.
     * @param {string} signature - X-Razorpay-Signature header value.
     * @returns {boolean} True if the signature is valid.
     */
    verifyWebhookSignature(reqBody, signature) {
        if (!RAZORPAY_WEBHOOK_SECRET) {
            console.error('RAZORPAY_WEBHOOK_SECRET is not set. Webhook verification skipped!');
            return true; // DANGEROUS: Always verify in production!
        }
        
        // Ensure the body is passed as a raw string for verification
        const rawBody = JSON.stringify(reqBody); 
        
        const generatedSignature = crypto
            .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
            .update(rawBody)
            .digest('hex');

        return generatedSignature === signature;
    }

    /**
     * STEP 3 (Option B - Redirect/Verification): Validates the payment signature after redirect.
     * This is an alternative/fallback to webhooks.
     * @param {string} razorpayOrderId - Razorpay's Order ID (from response).
     * @param {string} razorpayPaymentId - Razorpay's Payment ID (from response).
     * @param {string} razorpaySignature - Razorpay's Signature (from response).
     * @returns {boolean} True if the signature is valid.
     */
    verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        // Concatenate the order ID and payment ID with a '|'
        const expectedSignature = crypto
            .createHmac('sha256', RAZORPAY_KEY_SECRET) // Use Key Secret for this check
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        return expectedSignature === razorpaySignature;
    }
}

module.exports = new RazorpayService();