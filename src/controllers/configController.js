/**
 * @fileoverview Controller for fetching application configuration settings,
 * primarily from environment variables.
 */
class ConfigController {
  /**
   * Fetches the current delivery charge and sends it as a response.
   * This is a public, unauthenticated endpoint for the Flutter app to access
   * essential configuration before sign-in.
   * * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  getDeliveryCharge(req, res) {
    try {
      // Access the environment variable. Since dotenv is loaded in app.js,
      // process.env will contain the variable.
      const deliveryCharge = process.env.DELIVERY_CHARGE || 0;
      
      // Ensure the charge is returned as a number if possible, or a string
      // for consistency, but often clients prefer numbers for calculations.
      const chargeAmount = parseFloat(deliveryCharge);
      
      if (isNaN(chargeAmount)) {
        console.warn('DELIVERY_CHARGE is not a valid number. Defaulting to 0.');
        return res.status(200).json({
          success: true,
          message: 'Default delivery charge retrieved.',
          data: {
            deliveryCharge: 0
          }
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Delivery charge retrieved successfully.',
        data: {
          deliveryCharge: chargeAmount
        }
      });
    } catch (error) {
      console.error('Error fetching delivery charge:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve delivery charge due to a server error.',
        error: error.message
      });
    }
  }

  /**
   * Fetches all public configuration settings (e.g., radius, hub location, charge)
   * in a single API call.
   * * @param {object} req - Express request object.
   * @param {object} res - Express response object.
   */
  getPublicConfig(req, res) {
    try {
      const publicConfig = {
        deliveryCharge: parseFloat(process.env.DELIVERY_CHARGE) || 0,
        maxDeliveryRadiusKm: parseFloat(process.env.MAX_DELIVERY_RADIUS_KM) || 25,
        deliveryHubLatitude: parseFloat(process.env.DELIVERY_HUB_LATITUDE) || null,
        deliveryHubLongitude: parseFloat(process.env.DELIVERY_HUB_LONGITUDE) || null,
      };

      return res.status(200).json({
        success: true,
        message: 'Public configuration retrieved successfully.',
        data: publicConfig
      });
    } catch (error) {
      console.error('Error fetching public config:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve public configuration.',
        error: error.message
      });
    }
  }
}

module.exports = new ConfigController();
