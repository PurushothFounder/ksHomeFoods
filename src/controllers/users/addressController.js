const AddressService = require('../../services/users/addressService');

class AddressController {
  // Add new address
  async addAddress(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      const addressData = { ...req.body, userId: uid };

      console.log('📍 Adding address for user:', uid);
      
      const newAddress = await AddressService.addAddress(addressData);

      return res.status(201).json({
        success: true,
        message: 'Address added successfully',
        data: {
          address: newAddress
        }
      });
    } catch (error) {
      console.error('Add address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  // Get all user addresses
  async getUserAddresses(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      
      console.log('📋 Getting addresses for user:', uid);
      
      const addresses = await AddressService.getUserAddresses(uid);

      return res.status(200).json({
        success: true,
        message: 'Addresses retrieved successfully',
        data: {
          addresses,
          count: addresses.length
        }
      });
    } catch (error) {
      console.error('Get user addresses controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }
  }

  // Get address by ID
  async getAddressById(req, res) {
    try {
      const { uid } = req.user;
      const { addressId } = req.params;

      console.log('🔍 Getting address:', addressId, 'for user:', uid);

      const address = await AddressService.getAddressById(addressId, uid);

      if (!address) {
        return res.status(404).json({
          success: false,
          message: 'Address not found',
          error: 'Address not found',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Address retrieved successfully',
        data: {
          address
        }
      });
    } catch (error) {
      console.error('Get address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Update address
  async updateAddress(req, res) {
    try {
      const { uid } = req.user;
      const { addressId } = req.params;
      const updateData = req.body;

      console.log('✏️ Updating address:', addressId, 'for user:', uid);

      const updatedAddress = await AddressService.updateAddress(addressId, updateData, uid);

      return res.status(200).json({
        success: true,
        message: 'Address updated successfully',
        data: {
          address: updatedAddress
        }
      });
    } catch (error) {
      console.error('Update address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Delete address
  async deleteAddress(req, res) {
    try {
      const { uid } = req.user;
      const { addressId } = req.params;

      console.log('🗑️ Deleting address:', addressId, 'for user:', uid);

      const result = await AddressService.deleteAddress(addressId, uid);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Delete address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Set default address
  async setDefaultAddress(req, res) {
    try {
      const { uid } = req.user;
      const { addressId } = req.params;

      console.log('⭐ Setting default address:', addressId, 'for user:', uid);

      const defaultAddress = await AddressService.setDefaultAddress(addressId, uid);

      return res.status(200).json({
        success: true,
        message: 'Default address set successfully',
        data: {
          address: defaultAddress
        }
      });
    } catch (error) {
      console.error('Set default address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Get default address
  async getDefaultAddress(req, res) {
    try {
      const { uid } = req.user;

      console.log('🎯 Getting default address for user:', uid);

      const defaultAddress = await AddressService.getDefaultAddress(uid);

      if (!defaultAddress) {
        return res.status(404).json({
          success: false,
          message: 'No default address found',
          error: 'No default address found',
          data: null
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Default address retrieved successfully',
        data: {
          address: defaultAddress
        }
      });
    } catch (error) {
      console.error('Get default address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Validate delivery to address
  async validateDeliveryAddress(req, res) {
    try {
      const { addressId } = req.params;

      console.log('✅ Validating delivery for address:', addressId);

      const validation = await AddressService.validateDeliveryAddress(addressId);

      return res.status(200).json({
        success: true,
        message: 'Address validation completed',
        data: {
          validation
        }
      });
    } catch (error) {
      console.error('Validate delivery address controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Get addresses near location (for delivery optimization)
  async getAddressesNearLocation(req, res) {
    try {
      const { latitude, longitude, radius = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
          error: 'Missing location parameters',
          data: null
        });
      }

      console.log('📍 Getting addresses near:', latitude, longitude, 'radius:', radius);

      const nearbyAddresses = await AddressService.getAddressesNearLocation(
        parseFloat(latitude),
        parseFloat(longitude),
        parseFloat(radius)
      );

      return res.status(200).json({
        success: true,
        message: 'Nearby addresses retrieved successfully',
        data: {
          addresses: nearbyAddresses,
          count: nearbyAddresses.length,
          searchRadius: parseFloat(radius)
        }
      });
    } catch (error) {
      console.error('Get nearby addresses controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Reverse geocoding - Get address details from coordinates
  async reverseGeocode(req, res) {
    try {
      const { latitude, longitude } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required',
          error: 'Missing coordinates',
          data: null
        });
      }

      console.log('🔄 Reverse geocoding:', latitude, longitude);

      const addressDetails = await AddressService.reverseGeocode(
        parseFloat(latitude),
        parseFloat(longitude)
      );

      return res.status(200).json({
        success: true,
        message: 'Address details retrieved successfully',
        data: {
          addressDetails
        }
      });
    } catch (error) {
      console.error('Reverse geocode controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Get delivery info for address
  async getDeliveryInfo(req, res) {
    try {
      const { addressId } = req.params;

      console.log('🚚 Getting delivery info for address:', addressId);

      const deliveryInfo = await AddressService.getDeliveryInfo(addressId);

      return res.status(200).json({
        success: true,
        message: 'Delivery information retrieved successfully',
        data: {
          deliveryInfo
        }
      });
    } catch (error) {
      console.error('Get delivery info controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Search addresses by query
  async searchAddresses(req, res) {
    try {
      const { uid } = req.user;
      const { query, limit = 10 } = req.query;

      if (!query || query.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Search query is required',
          error: 'Empty search query',
          data: null
        });
      }

      console.log('🔍 Searching addresses for user:', uid, 'query:', query);

      const addresses = await AddressService.searchUserAddresses(uid, query.trim(), parseInt(limit));

      return res.status(200).json({
        success: true,
        message: 'Address search completed',
        data: {
          addresses,
          count: addresses.length,
          query: query.trim()
        }
      });
    } catch (error) {
      console.error('Search addresses controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new AddressController();