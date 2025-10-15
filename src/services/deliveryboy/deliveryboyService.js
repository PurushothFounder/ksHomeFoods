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
        // If a delivery boy exists, update their lastLogin timestamp.
        // We'll also update other fields that might have changed (e.g., displayName, email).
        const updatedData = {
          uid: initialData.uid,
          email: initialData.email || deliveryBoy.email,
          displayName: initialData.displayName || deliveryBoy.displayName,
          phoneNumber: initialData.phoneNumber || deliveryBoy.phoneNumber,
          lastLogin: new Date()
        };
        
        await DeliveryBoyModel.set(updatedData);
        
        // Fetch the updated document to return the latest data.
        const updatedDeliveryBoy = await DeliveryBoyModel.getByUid(initialData.uid);

        return { exists: true, deliveryBoy: updatedDeliveryBoy };
      }

      // If no profile found, return initial data for frontend form
      return { exists: false, initialData };
    } catch (error) {
      console.error('Login/Register service error:', error);
      throw new Error(`Failed to process login/registration: ${error.message}`);
    }
  }

   /**
   * @desc Finds an available delivery boy for a given pincode using a round-robin strategy.
   * @param {string} pincode The pincode of the order.
   * @returns {Promise<DeliveryBoy|null>} The selected DeliveryBoy instance or null if none are available.
   */
  async getDeliveryBoyForPincode(pincode) {
    console.log('deliveryboyService.js - getDeliveryBoyForPincode called with pincode:', pincode);
    try {
      // Find all active delivery boys for the pincode
      const deliveryBoys = await DeliveryBoyModel.getByPincode(pincode);
      console.log('Found delivery boys for pincode:', pincode, deliveryBoys);
      if (!deliveryBoys || deliveryBoys.length === 0) {
        console.log(`No delivery boys found for pincode ${pincode}`);
        return null;
      }
      
      // Implement a simple round-robin logic.
      // This is a basic in-memory implementation. A production system might use a database to store the last assigned boy to ensure persistence across restarts.
      // For this example, we'll sort by 'lastLogin' to simulate a round-robin by picking the least recently active one.
      const sortedByLastLogin = deliveryBoys.sort((a, b) => {
          const aLastLogin = a.lastLogin ? a.lastLogin.getTime() : 0;
          const bLastLogin = b.lastLogin ? b.lastLogin.getTime() : 0;
          return aLastLogin - bLastLogin;
      });

      const deliveryBoyToAssign = sortedByLastLogin[0];
      
      // Update the delivery boy's lastLogin timestamp to reflect the new assignment
      await DeliveryBoyModel.set({
        uid: deliveryBoyToAssign.uid,
        lastLogin: new Date()
      });

      console.log(`✅ Selected delivery boy ${deliveryBoyToAssign.uid} for pincode ${pincode}`);

      return deliveryBoyToAssign;
    } catch (error) {
      console.error('Get delivery boy by pincode service error:', error);
      return null; // Return null on error so order placement can proceed without assignment
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