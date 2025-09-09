const { admin } = require('../../config/firebase');

class AddressModel {
  constructor() {
    this.collection = 'addresses';
    this.userCollection = 'users';
  }

  // Lazy load database connection
  getDb() {
    const { getFirestore } = require('../../config/firebase');
    return getFirestore();
  }

  // Add new address for user
  async addAddress(addressData) {
    try {
      console.log('📍 Adding new address:', addressData);
      
      const db = this.getDb();
      if (!db) {
        throw new Error('Database connection not available');
      }

      const addressRef = db.collection(this.collection).doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Validate required fields
      const requiredFields = ['userId', 'latitude', 'longitude', 'addressLine1'];
      for (const field of requiredFields) {
        if (!addressData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      const newAddress = {
        id: addressRef.id,
        userId: addressData.userId,
        title: addressData.title || 'Home', // Home, Work, Other
        addressLine1: addressData.addressLine1,
        addressLine2: addressData.addressLine2 || '',
        landmark: addressData.landmark || '',
        area: addressData.area || '',
        city: addressData.city || '',
        state: addressData.state || '',
        pincode: addressData.pincode || '',
        country: addressData.country || 'India',
        latitude: parseFloat(addressData.latitude),
        longitude: parseFloat(addressData.longitude),
        isDefault: addressData.isDefault || false,
        isActive: true,
        // Additional fields for delivery
        contactName: addressData.contactName || '',
        contactPhone: addressData.contactPhone || '',
        deliveryInstructions: addressData.deliveryInstructions || '',
        // Address type for better categorization
        type: addressData.type || 'home', // home, work, hotel, hospital, other
        // Building details for apartments/complexes
        buildingName: addressData.buildingName || '',
        floorNumber: addressData.floorNumber || '',
        apartmentNumber: addressData.apartmentNumber || '',
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // If this is set as default, unset other default addresses
      if (newAddress.isDefault) {
        await this.unsetDefaultAddresses(addressData.userId);
      }

      await addressRef.set(newAddress);
      console.log('✅ Address created successfully with ID:', addressRef.id);

      // Update user's addresses array (for quick access)
      await this.updateUserAddressList(addressData.userId, addressRef.id, 'add');

      const createdAddress = await addressRef.get();
      return { id: createdAddress.id, ...createdAddress.data() };
    } catch (error) {
      console.error('❌ Error in addAddress:', error);
      throw new Error(`Failed to add address: ${error.message}`);
    }
  }

  // Get all addresses for a user
  async getUserAddresses(userId) {
    try {
      const db = this.getDb();
      const addressQuery = await db
        .collection(this.collection)
        .where('userId', '==', userId)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      if (addressQuery.empty) {
        return [];
      }

      return addressQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      throw new Error(`Failed to get user addresses: ${error.message}`);
    }
  }

  // Get address by ID
  async getAddressById(addressId) {
    try {
      const db = this.getDb();
      const addressRef = db.collection(this.collection).doc(addressId);
      const addressDoc = await addressRef.get();

      if (!addressDoc.exists) {
        return null;
      }

      return { id: addressDoc.id, ...addressDoc.data() };
    } catch (error) {
      throw new Error(`Failed to get address: ${error.message}`);
    }
  }

  // Update address
  async updateAddress(addressId, updateData) {
    try {
      const db = this.getDb();
      const addressRef = db.collection(this.collection).doc(addressId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Get current address to check ownership
      const currentAddress = await addressRef.get();
      if (!currentAddress.exists) {
        throw new Error('Address not found');
      }

      const currentData = currentAddress.data();

      // If updating coordinates, ensure they're numbers
      if (updateData.latitude) {
        updateData.latitude = parseFloat(updateData.latitude);
      }
      if (updateData.longitude) {
        updateData.longitude = parseFloat(updateData.longitude);
      }

      // If setting as default, unset other default addresses
      if (updateData.isDefault && !currentData.isDefault) {
        await this.unsetDefaultAddresses(currentData.userId);
      }

      const updatedData = {
        ...updateData,
        updatedAt: timestamp
      };

      await addressRef.update(updatedData);

      const updatedAddress = await addressRef.get();
      return { id: updatedAddress.id, ...updatedAddress.data() };
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  // Delete address (soft delete)
  async deleteAddress(addressId, userId) {
    try {
      const db = this.getDb();
      const addressRef = db.collection(this.collection).doc(addressId);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      // Verify address belongs to user
      const addressDoc = await addressRef.get();
      if (!addressDoc.exists) {
        throw new Error('Address not found');
      }

      const addressData = addressDoc.data();
      if (addressData.userId !== userId) {
        throw new Error('Unauthorized to delete this address');
      }

      await addressRef.update({
        isActive: false,
        deletedAt: timestamp,
        updatedAt: timestamp
      });

      // Update user's addresses array
      await this.updateUserAddressList(userId, addressId, 'remove');

      return { success: true, message: 'Address deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  }

  // Set address as default
  async setDefaultAddress(addressId, userId) {
    try {
      const db = this.getDb();
      
      // First unset all default addresses for the user
      await this.unsetDefaultAddresses(userId);

      // Then set the specified address as default
      const addressRef = db.collection(this.collection).doc(addressId);
      await addressRef.update({
        isDefault: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const updatedAddress = await addressRef.get();
      return { id: updatedAddress.id, ...updatedAddress.data() };
    } catch (error) {
      throw new Error(`Failed to set default address: ${error.message}`);
    }
  }

  // Get default address for user
  async getDefaultAddress(userId) {
    try {
      const db = this.getDb();
      const addressQuery = await db
        .collection(this.collection)
        .where('userId', '==', userId)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (addressQuery.empty) {
        return null;
      }

      const addressDoc = addressQuery.docs[0];
      return { id: addressDoc.id, ...addressDoc.data() };
    } catch (error) {
      throw new Error(`Failed to get default address: ${error.message}`);
    }
  }

  // Get addresses near a location (for delivery optimization)
  async getAddressesNearLocation(latitude, longitude, radiusKm = 10) {
    try {
      const db = this.getDb();
      
      // Calculate bounding box for the query
      const latDelta = radiusKm / 111; // Roughly 111 km per degree latitude
      const lngDelta = radiusKm / (111 * Math.cos(latitude * Math.PI / 180));

      const minLat = latitude - latDelta;
      const maxLat = latitude + latDelta;
      const minLng = longitude - lngDelta;
      const maxLng = longitude + lngDelta;

      const addressQuery = await db
        .collection(this.collection)
        .where('latitude', '>=', minLat)
        .where('latitude', '<=', maxLat)
        .where('isActive', '==', true)
        .get();

      // Filter by longitude and calculate actual distance
      const nearbyAddresses = [];
      addressQuery.docs.forEach(doc => {
        const data = doc.data();
        if (data.longitude >= minLng && data.longitude <= maxLng) {
          const distance = this.calculateDistance(
            latitude, longitude,
            data.latitude, data.longitude
          );
          
          if (distance <= radiusKm) {
            nearbyAddresses.push({
              id: doc.id,
              ...data,
              distance: parseFloat(distance.toFixed(2))
            });
          }
        }
      });

      // Sort by distance
      return nearbyAddresses.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      throw new Error(`Failed to get nearby addresses: ${error.message}`);
    }
  }

  // Helper method to unset default addresses for a user
  async unsetDefaultAddresses(userId) {
    try {
      const db = this.getDb();
      const defaultAddressQuery = await db
        .collection(this.collection)
        .where('userId', '==', userId)
        .where('isDefault', '==', true)
        .where('isActive', '==', true)
        .get();

      const batch = db.batch();
      defaultAddressQuery.docs.forEach(doc => {
        batch.update(doc.ref, {
          isDefault: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      });

      if (!defaultAddressQuery.empty) {
        await batch.commit();
      }
    } catch (error) {
      console.error('Error unsetting default addresses:', error);
    }
  }

  // Helper method to update user's address list
  async updateUserAddressList(userId, addressId, operation) {
    try {
      const db = this.getDb();
      const userRef = db.collection(this.userCollection).doc(userId);

      if (operation === 'add') {
        await userRef.update({
          addresses: admin.firestore.FieldValue.arrayUnion(addressId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      } else if (operation === 'remove') {
        await userRef.update({
          addresses: admin.firestore.FieldValue.arrayRemove(addressId),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating user address list:', error);
      // Don't throw error here as it's not critical
    }
  }

  // Helper method to calculate distance between two points
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Validate if delivery is possible to this address
  async validateDeliveryAddress(addressId) {
    try {
      const address = await this.getAddressById(addressId);
      if (!address) {
        throw new Error('Address not found');
      }

      // Add your delivery validation logic here
      // For example, check if the address is within delivery radius
      const deliveryHubLocation = {
        latitude: 12.9716, // Your restaurant/hub location
        longitude: 80.2340
      };

      const distance = this.calculateDistance(
        deliveryHubLocation.latitude,
        deliveryHubLocation.longitude,
        address.latitude,
        address.longitude
      );

      const maxDeliveryRadius = 25; // 25 km radius
      const isDeliverable = distance <= maxDeliveryRadius;

      return {
        isDeliverable,
        distance: parseFloat(distance.toFixed(2)),
        maxRadius: maxDeliveryRadius,
        estimatedTime: Math.ceil(distance * 3) // Rough estimate: 3 minutes per km
      };
    } catch (error) {
      throw new Error(`Failed to validate delivery address: ${error.message}`);
    }
  }
}

module.exports = new AddressModel();