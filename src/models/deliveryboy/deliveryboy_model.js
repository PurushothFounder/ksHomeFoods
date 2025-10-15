// deliveryboy_model.js

// 1. Correct the require statement to get the getFirestore function
const { getFirestore, admin: firebaseAdmin } = require('../../config/firebase');

// 2. Get the Firestore database instance
const db = getFirestore();

class DeliveryBoy {
  /**
   * Represents a Delivery Boy document in Firestore.
   * @param {object} data The data for the delivery boy.
   * @param {string} data.uid The Firebase Auth UID.
   * @param {string} data.email The user's email.
   * @param {string} data.displayName The user's display name.
   * @param {string} data.phoneNumber The delivery boy's phone number.
   * @param {string} data.aadhaarNumber The delivery boy's Aadhaar card number.
   * @param {string[]} data.deliveryPincodes An array of pincodes the delivery boy services.
   * @param {boolean} [data.isActive=true] Whether the delivery boy account is active.
   * @param {string} [data.provider] The authentication provider (e.g., 'google').
   * @param {firebaseAdmin.firestore.FieldValue} [data.createdAt] The timestamp of creation.
   * @param {firebaseAdmin.firestore.FieldValue} [data.updatedAt] The timestamp of the last update.
   * @param {firebaseAdmin.firestore.FieldValue} [data.lastLogin] The timestamp of the last login.
   */
  constructor(data) {
    this.uid = data.uid;
    this.email = data.email;
    this.displayName = data.displayName;
    this.phoneNumber = data.phoneNumber || null;
    this.aadhaarNumber = data.aadhaarNumber || null;
    this.deliveryPincodes = data.deliveryPincodes || [];
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.provider = data.provider || null;
    this.createdAt = data.createdAt || firebaseAdmin.firestore.FieldValue.serverTimestamp();
    this.updatedAt = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    this.lastLogin = data.lastLogin || null;
  }

  /**
   * Converts the instance to a plain object for Firestore storage.
   * @returns {object} The Firestore-compatible object.
   */
  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      phoneNumber: this.phoneNumber,
      aadhaarNumber: this.aadhaarNumber,
      deliveryPincodes: this.deliveryPincodes,
      isActive: this.isActive,
      provider: this.provider,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }

  /**
   * Creates a DeliveryBoy instance from a Firestore document snapshot.
   * @param {firebaseAdmin.firestore.DocumentSnapshot} doc The Firestore document snapshot.
   * @returns {DeliveryBoy} The new DeliveryBoy instance.
   */
  static fromFirestore(doc) {
    const data = doc.data();
    return new DeliveryBoy({
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLogin: data.lastLogin?.toDate() || null
    });
  }

  /**
   * Gets a Delivery Boy document reference.
   * @param {string} uid The UID of the delivery boy.
   * @returns {firebaseAdmin.firestore.DocumentReference}
   */
  static getDocRef(uid) {
    return db.collection('deliveryBoys').doc(uid);
  }

  /**
   * Fetches a Delivery Boy by UID.
   * @param {string} uid The UID of the delivery boy.
   * @returns {Promise<DeliveryBoy|null>} A promise that resolves to the DeliveryBoy instance or null if not found.
   */
  static async getByUid(uid) {
    try {
      const doc = await this.getDocRef(uid).get();
      if (!doc.exists) {
        return null;
      }
      return this.fromFirestore(doc);
    } catch (error) {
      console.error('Error fetching delivery boy:', error);
      throw new Error(`Failed to get delivery boy: ${error.message}`);
    }
  }

  /**
   * Fetches all active Delivery Boys who service a given pincode.
   * @param {string} pincode The pincode to search for.
   * @returns {Promise<DeliveryBoy[]>} A promise that resolves to an array of DeliveryBoy instances.
   */
  static async getByPincode(pincode) {
    try {
      const snapshot = await db.collection('deliveryBoys')
        .where('deliveryPincodes', 'array-contains', pincode)
        .where('isActive', '==', true)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => this.fromFirestore(doc));
    } catch (error) {
      console.error('Error fetching delivery boys by pincode:', error);
      throw new Error(`Failed to get delivery boys by pincode: ${error.message}`);
    }
  }

  /**
   * Creates or updates a delivery boy in Firestore.
   * @param {object} data The delivery boy data.
   * @returns {Promise<DeliveryBoy>} A promise that resolves to the saved DeliveryBoy instance.
   */
  static async set(data) {
    try {
      const docRef = this.getDocRef(data.uid);
      const existingDoc = await docRef.get();
      
      // If the document already exists, get the current data and merge it with the new data
      if (existingDoc.exists) {
          const existingData = existingDoc.data();
          const mergedData = { ...existingData, ...data };
          await docRef.set(mergedData, { merge: true });
          return this.getByUid(data.uid);
      } else {
          // If the document does not exist, create a new one
          await docRef.set(new DeliveryBoy(data).toFirestore(), { merge: true });
          return this.getByUid(data.uid);
      }
    } catch (error) {
      console.error('Error saving delivery boy:', error);
      throw new Error(`Failed to save delivery boy: ${error.message}`);
    }
  }
}

module.exports = DeliveryBoy;