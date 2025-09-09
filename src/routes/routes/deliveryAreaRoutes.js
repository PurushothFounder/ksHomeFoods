const express = require('express');
const router = express.Router();
const DeliveryAreaController = require('../../controllers/delivery/deliveryAreaController');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Admin routes
router.post('/add', adminAuth, DeliveryAreaController.addArea);
router.put('/:id', adminAuth, DeliveryAreaController.updateArea);
router.delete('/:id', adminAuth, DeliveryAreaController.deleteArea);

// Public routes
router.get('/get', DeliveryAreaController.getAreas);
router.get('/pincode/:pincode', DeliveryAreaController.getAreaByPincode);

module.exports = router;