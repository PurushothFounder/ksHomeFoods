const DeliveryBoyModel = require('../../models/deliveryboy/deliveryboy_model');

class DeliveryBoyService {
  /**
   * @desc Checks if a delivery boy profile exists and handles initial login.
   * @param {object} initialData The initial data from Google Auth.
   * @returns {Promise<object>} An object containing existence status and data.
   */
  async loginOrRegister(initialData) {
    try {
      const deliveryBoy = await DeliveryBoyModel.getByUid(initialData.uid);
      console.log('📝 Delivery boy login/registration attempt:', initialData);
      if (deliveryBoy) {
        // Update last login timestamp
        await DeliveryBoyModel.set({ uid: initialData.uid, lastLogin: new Date() });
        return { exists: true, deliveryBoy };
      }

      // No profile found, return initial data for frontend form
      return { exists: false, initialData };
    } catch (error) {
      console.error('Login/Register service error:', error);
      throw new Error(`Failed to process login/registration: ${error.message}`);
    }
  }

  /**
   * @desc Creates a new delivery boy profile with details from the frontend form.
   * @param {object} registrationData The data from the registration form.
   * @returns {Promise<DeliveryBoy>} The newly created DeliveryBoy instance.
   */
  async registerDetails(registrationData) {
  try {
    console.log('📝 Registering delivery boy details:', registrationData);
    const existingUser = await DeliveryBoyModel.getByUid(registrationData.uid);

    // This should not happen if the loginOrRegister flow is followed, but good to check
    if (existingUser && existingUser.aadhaarNumber) {
      throw new Error('User already has a registered Aadhaar number.');
    }

    // Pass the complete registrationData object directly to the model.
    // This ensures all fields, including 'email' and 'displayName', are included.
    const newDeliveryBoy = await DeliveryBoyModel.set(registrationData);

    return newDeliveryBoy;
  } catch (error) {
    console.error('Register details service error:', error);
    throw new Error(`Failed to register details: ${error.message}`);
  }
}

  /**
   * @desc Fetches a delivery boy's profile by UID.
   * @param {string} uid The UID of the delivery boy.
   * @returns {Promise<DeliveryBoy|null>} The DeliveryBoy instance or null.
   */
  async getProfile(uid) {
    try {
      const deliveryBoy = await DeliveryBoyModel.getByUid(uid);
      return deliveryBoy;
    } catch (error) {
      console.error('Get profile service error:', error);
      throw new Error(`Failed to get profile: ${error.message}`);
    }
  }
}

module.exports = new DeliveryBoyService();