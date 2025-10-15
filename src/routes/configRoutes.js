/**
 * @fileoverview Routes for public application configuration endpoints.
 */
const express = require('express');
const router = express.Router();
const ConfigController = require('../controllers/configController');

// Public route to get the delivery charge specifically
// GET /api/config/delivery-charge
router.get('/delivery-charge', ConfigController.getDeliveryCharge);

// Public route to get all essential public configuration settings
// GET /api/config/public
router.get('/public', ConfigController.getPublicConfig);

module.exports = router;
