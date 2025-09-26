const express = require('express');
const router = express.Router();
const DeliveryBoyController = require('../../controllers/deliveryboy/deliveryboy_controller');
// Assuming you have a middleware for Google Auth token validation
const { authenticateDeliveryBoyToken } = require('../../middleware/deliveryboy/deliveryboy_auth');

/**
 * @route   POST /api/delivery-boy/login
 * @desc    Handles Google login for delivery boys. Checks if profile exists.
 * @access  Public (authentication is handled by the middleware)
 */
router.post('/login', authenticateDeliveryBoyToken, DeliveryBoyController.loginOrRegister);

/**
 * @route   POST /api/delivery-boy/register
 * @desc    Completes the registration by adding Aadhaar and pincodes.
 * @access  Private (requires an authenticated user, even if not fully registered as a delivery boy yet)
 */
router.post('/register', authenticateDeliveryBoyToken, DeliveryBoyController.registerDetails);

/**
 * @route   GET /api/delivery-boy/profile
 * @desc    Gets the profile of the logged-in delivery boy.
 * @access  Private
 */
router.get('/profile', authenticateDeliveryBoyToken, DeliveryBoyController.getProfile);

module.exports = router;