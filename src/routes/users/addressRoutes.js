const express = require('express');
const router = express.Router();
const AddressController = require('../../controllers/users/addressController');
const { authenticateToken } = require('../../middleware/users/auth');

// Basic validation middleware (simplified)
const basicValidation = (req, res, next) => {
  // Only validate required fields, not extensive validation
  next();
};

// Address Routes - Similar pattern to menu items
// Most GET routes don't need authentication, only user-specific operations do

/**
 * @route   GET /api/address/reverse-geocode
 * @desc    Get address details from coordinates (public utility)
 * @access  Public
 */
router.get('/reverse-geocode', AddressController.reverseGeocode);

/**
 * @route   POST /api/address/add
 * @desc    Add new address for user
 * @access  Private (requires auth)
 */
router.post('/add', authenticateToken, AddressController.addAddress);

/**
 * @route   GET /api/address/get
 * @desc    Get all addresses for authenticated user
 * @access  Private (requires auth)
 */
router.get('/get', authenticateToken, AddressController.getUserAddresses);

/**
 * @route   GET /api/address/default
 * @desc    Get default address for authenticated user  
 * @access  Private (requires auth)
 */
router.get('/default', authenticateToken, AddressController.getDefaultAddress);

/**
 * @route   GET /api/address/search
 * @desc    Search user addresses by query
 * @access  Private (requires auth)
 */
router.get('/search', authenticateToken, AddressController.searchAddresses);

/**
 * @route   GET /api/address/nearby
 * @desc    Get addresses near a location
 * @access  Private (requires auth)
 */
router.get('/nearby', authenticateToken, AddressController.getAddressesNearLocation);

/**
 * @route   GET /api/address/:addressId
 * @desc    Get address by ID
 * @access  Private (requires auth)
 */
router.get('/:addressId', authenticateToken, AddressController.getAddressById);

/**
 * @route   PUT /api/address/:addressId
 * @desc    Update address
 * @access  Private (requires auth)
 */
router.put('/:addressId', authenticateToken, AddressController.updateAddress);

/**
 * @route   DELETE /api/address/:addressId
 * @desc    Delete address
 * @access  Private (requires auth)
 */
router.delete('/:addressId', authenticateToken, AddressController.deleteAddress);

/**
 * @route   PUT /api/address/:addressId/set-default
 * @desc    Set address as default
 * @access  Private (requires auth)
 */
router.put('/:addressId/set-default', authenticateToken, AddressController.setDefaultAddress);

/**
 * @route   GET /api/address/:addressId/validate-delivery
 * @desc    Validate if delivery is available to this address (can be public)
 * @access  Public
 */
router.get('/:addressId/validate-delivery', AddressController.validateDeliveryAddress);

/**
 * @route   GET /api/address/:addressId/delivery-info
 * @desc    Get delivery information for address (can be public)
 * @access  Public  
 */
router.get('/:addressId/delivery-info', AddressController.getDeliveryInfo);

module.exports = router;