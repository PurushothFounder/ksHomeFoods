const DeliveryBoyService = require('../../services/deliveryboy/deliveryboyService');

class DeliveryBoyController {
  /**
   * @desc Handles the login and registration flow for a delivery boy.
   * Checks if the delivery boy exists and returns data accordingly.
   * @route POST /api/delivery-boy/login
   * @access Public
   */
  async loginOrRegister(req, res) {
    try {
      const { uid, email, displayName, phoneNumber } = req.user; // from auth middleware

      console.log('📝 Attempting login/registration for delivery boy:', email);

      const deliveryBoyData = { uid, email, displayName, phoneNumber };
      const result = await DeliveryBoyService.loginOrRegister(deliveryBoyData);

      if (!result.exists) {
        // If the delivery boy doesn't exist, we send a special status code
        // and message to signal the frontend to show the registration form.
        return res.status(202).json({
          success: true,
          message: 'Delivery boy not registered. Redirecting to details page.',
          data: {
            isRegistered: false,
            initialData: result.initialData
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery boy logged in successfully.',
        data: {
          isRegistered: true,
          deliveryBoy: result.deliveryBoy
        }
      });
    } catch (error) {
      console.error('Login/Register controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to authenticate delivery boy.',
        error: error.message
      });
    }
  }

  /**
   * @desc Handles the details submission for a new delivery boy.
   * @route POST /api/delivery-boy/register
   * @access Private
   */
   // deliveryboy_controller.js

async registerDetails(req, res) {
  try {
    const { uid, email, displayName } = req.user; // <-- Get all necessary data from req.user
    const { aadhaarNumber, deliveryPincodes, phoneNumber } = req.body;

    if (!aadhaarNumber || !deliveryPincodes || !Array.isArray(deliveryPincodes) || deliveryPincodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number and at least one pincode are required.'
      });
    }
    
    console.log('📝 Registering details for delivery boy:', req.body);
    console.log('📝 Registering details for delivery boy:', req.user);

    // Construct a complete data object with all required fields
    const data = {
      uid,
      email,           // <-- Include email
      displayName: displayName ? displayName : 'Guest User',    // <-- Include displayName
      aadhaarNumber,
      phoneNumber,
      deliveryPincodes
    };

    const newDeliveryBoy = await DeliveryBoyService.registerDetails(data);

    return res.status(201).json({
      success: true,
      message: 'Delivery boy registered successfully.',
      data: {
        deliveryBoy: newDeliveryBoy
      }
    });
  } catch (error) {
    console.error('Register details controller error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to register delivery boy details.',
      error: error.message
    });
  }
}

  /**
   * @desc Gets the profile of the authenticated delivery boy.
   * @route GET /api/delivery-boy/profile
   * @access Private
   */
  async getProfile(req, res) {
    try {
      const { uid } = req.user;

      console.log('👤 Fetching profile for delivery boy:', uid);

      const deliveryBoy = await DeliveryBoyService.getProfile(uid);

      if (!deliveryBoy) {
        return res.status(404).json({
          success: false,
          message: 'Delivery boy profile not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery boy profile retrieved successfully.',
        data: {
          deliveryBoy
        }
      });
    } catch (error) {
      console.error('Get profile controller error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch profile.',
        error: error.message
      });
    }
  }
}

module.exports = new DeliveryBoyController();