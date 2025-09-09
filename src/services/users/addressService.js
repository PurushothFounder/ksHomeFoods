const AddressModel = require('../../models/users/addressModel');
const axios = require('axios');

class AddressService {
  // Add new address
  async addAddress(addressData) {
    try {
      // Validate required fields
      if (!addressData.latitude || !addressData.longitude) {
        throw new Error('Latitude and longitude are required');
      }

      if (!addressData.addressLine1) {
        throw new Error('Address line 1 is required');
      }

      // Validate coordinates
      const lat = parseFloat(addressData.latitude);
      const lng = parseFloat(addressData.longitude);
      
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates provided');
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        throw new Error('Coordinates are out of valid range');
      }

      // If no area/city provided, try to get from reverse geocoding
      if (!addressData.city || !addressData.area) {
        try {
          const geocodedData = await this.reverseGeocode(lat, lng);
          if (!addressData.city) addressData.city = geocodedData.city;
          if (!addressData.area) addressData.area = geocodedData.area;
          if (!addressData.state) addressData.state = geocodedData.state;
          if (!addressData.pincode) addressData.pincode = geocodedData.pincode;
        } catch (geocodeError) {
          console.log('Reverse geocoding failed:', geocodeError.message);
          // Continue without geocoded data
        }
      }

      // Check if address already exists for this user at the same location
      const existingAddresses = await AddressModel.getUserAddresses(addressData.userId);
      const duplicateAddress = existingAddresses.find(addr => {
        const distance = this.calculateDistance(lat, lng, addr.latitude, addr.longitude);
        return distance < 0.1; // Within 100 meters
      });

      if (duplicateAddress) {
        throw new Error('An address already exists at this location');
      }

      // Validate delivery possibility
      const deliveryValidation = await this.validateDeliveryToCoordinates(lat, lng);
      if (!deliveryValidation.isDeliverable) {
        throw new Error(`Delivery not available to this location. Distance: ${deliveryValidation.distance}km (Max: ${deliveryValidation.maxRadius}km)`);
      }

      const newAddress = await AddressModel.addAddress(addressData);
      return newAddress;
    } catch (error) {
      throw new Error(`Failed to add address: ${error.message}`);
    }
  }

  // Get all addresses for user
  async getUserAddresses(userId) {
    try {
      const addresses = await AddressModel.getUserAddresses(userId);
      
      // Add delivery info to each address
      const addressesWithDeliveryInfo = await Promise.all(
        addresses.map(async (address) => {
          try {
            const deliveryInfo = await this.getDeliveryInfo(address.id);
            return { ...address, deliveryInfo };
          } catch (error) {
            return { ...address, deliveryInfo: null };
          }
        })
      );

      return addressesWithDeliveryInfo;
    } catch (error) {
      throw new Error(`Failed to get user addresses: ${error.message}`);
    }
  }

  // Get address by ID with ownership validation
  async getAddressById(addressId, userId) {
    try {
      const address = await AddressModel.getAddressById(addressId);
      
      if (!address) {
        return null;
      }

      // Verify ownership
      if (address.userId !== userId) {
        throw new Error('Unauthorized to access this address');
      }

      return address;
    } catch (error) {
      throw new Error(`Failed to get address: ${error.message}`);
    }
  }

  // Update address with validation
  async updateAddress(addressId, updateData, userId) {
    try {
      // First verify ownership
      const existingAddress = await this.getAddressById(addressId, userId);
      if (!existingAddress) {
        throw new Error('Address not found or unauthorized');
      }

      // If coordinates are being updated, validate them
      if (updateData.latitude || updateData.longitude) {
        const lat = updateData.latitude ? parseFloat(updateData.latitude) : existingAddress.latitude;
        const lng = updateData.longitude ? parseFloat(updateData.longitude) : existingAddress.longitude;

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid coordinates provided');
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Coordinates are out of valid range');
        }

        // Validate delivery to new coordinates
        const deliveryValidation = await this.validateDeliveryToCoordinates(lat, lng);
        if (!deliveryValidation.isDeliverable) {
          throw new Error(`Delivery not available to this location. Distance: ${deliveryValidation.distance}km (Max: ${deliveryValidation.maxRadius}km)`);
        }

        updateData.latitude = lat;
        updateData.longitude = lng;
      }

      const updatedAddress = await AddressModel.updateAddress(addressId, updateData);
      return updatedAddress;
    } catch (error) {
      throw new Error(`Failed to update address: ${error.message}`);
    }
  }

  // Delete address
  async deleteAddress(addressId, userId) {
    try {
      // Verify ownership
      const address = await this.getAddressById(addressId, userId);
      if (!address) {
        throw new Error('Address not found or unauthorized');
      }

      const result = await AddressModel.deleteAddress(addressId, userId);
      return result;
    } catch (error) {
      throw new Error(`Failed to delete address: ${error.message}`);
    }
  }

  // Set default address
  async setDefaultAddress(addressId, userId) {
    try {
      // Verify ownership
      const address = await this.getAddressById(addressId, userId);
      if (!address) {
        throw new Error('Address not found or unauthorized');
      }

      const defaultAddress = await AddressModel.setDefaultAddress(addressId, userId);
      return defaultAddress;
    } catch (error) {
      throw new Error(`Failed to set default address: ${error.message}`);
    }
  }

  // Get default address
  async getDefaultAddress(userId) {
    try {
      const defaultAddress = await AddressModel.getDefaultAddress(userId);
      return defaultAddress;
    } catch (error) {
      throw new Error(`Failed to get default address: ${error.message}`);
    }
  }

  // Validate delivery to address
  async validateDeliveryAddress(addressId) {
    try {
      const validation = await AddressModel.validateDeliveryAddress(addressId);
      return validation;
    } catch (error) {
      throw new Error(`Failed to validate delivery address: ${error.message}`);
    }
  }

  // Validate delivery to coordinates
  async validateDeliveryToCoordinates(latitude, longitude) {
    try {
      // Your restaurant/hub location
      const deliveryHubLocation = {
        latitude: 12.9716, // Replace with your actual location
        longitude: 80.2340
      };

      const distance = this.calculateDistance(
        deliveryHubLocation.latitude,
        deliveryHubLocation.longitude,
        latitude,
        longitude
      );

      const maxDeliveryRadius = 25; // 25 km radius
      const isDeliverable = distance <= maxDeliveryRadius;

      return {
        isDeliverable,
        distance: parseFloat(distance.toFixed(2)),
        maxRadius: maxDeliveryRadius,
        estimatedTime: Math.ceil(distance * 3), // Rough estimate: 3 minutes per km
        deliveryFee: this.calculateDeliveryFee(distance)
      };
    } catch (error) {
      throw new Error(`Failed to validate delivery: ${error.message}`);
    }
  }

  // Get addresses near location
  async getAddressesNearLocation(latitude, longitude, radius = 10) {
    try {
      const nearbyAddresses = await AddressModel.getAddressesNearLocation(latitude, longitude, radius);
      return nearbyAddresses;
    } catch (error) {
      throw new Error(`Failed to get nearby addresses: ${error.message}`);
    }
  }

  // Reverse geocoding to get address from coordinates
  async reverseGeocode(latitude, longitude) {
    try {
      // Using OpenStreetMap Nominatim (free) - you can replace with Google Maps API
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'KS-Home-Foods-App'
        },
        timeout: 5000
      });

      if (response.data && response.data.address) {
        const addr = response.data.address;
        return {
          formattedAddress: response.data.display_name,
          addressLine1: `${addr.house_number || ''} ${addr.road || ''}`.trim() || addr.suburb || addr.neighbourhood || '',
          area: addr.suburb || addr.neighbourhood || addr.town || '',
          city: addr.city || addr.town || addr.village || addr.county || '',
          state: addr.state || addr.region || '',
          country: addr.country || 'India',
          pincode: addr.postcode || '',
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude)
        };
      } else {
        throw new Error('Unable to get address details from coordinates');
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      // Return basic structure if geocoding fails
      return {
        formattedAddress: `${latitude}, ${longitude}`,
        addressLine1: '',
        area: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude)
      };
    }
  }

  // Get delivery information for an address
  async getDeliveryInfo(addressId) {
    try {
      const address = await AddressModel.getAddressById(addressId);
      if (!address) {
        throw new Error('Address not found');
      }

      const validation = await this.validateDeliveryToCoordinates(address.latitude, address.longitude);
      
      return {
        isDeliverable: validation.isDeliverable,
        distance: validation.distance,
        estimatedTime: validation.estimatedTime,
        deliveryFee: validation.deliveryFee,
        maxRadius: validation.maxRadius
      };
    } catch (error) {
      throw new Error(`Failed to get delivery info: ${error.message}`);
    }
  }

  // Search user addresses
  async searchUserAddresses(userId, query, limit = 10) {
    try {
      const allAddresses = await AddressModel.getUserAddresses(userId);
      
      const searchTerms = query.toLowerCase().split(' ');
      const filteredAddresses = allAddresses.filter(address => {
        const searchText = [
          address.title,
          address.addressLine1,
          address.addressLine2,
          address.area,
          address.city,
          address.landmark,
          address.pincode
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchText.includes(term));
      });

      return filteredAddresses.slice(0, limit);
    } catch (error) {
      throw new Error(`Failed to search addresses: ${error.message}`);
    }
  }

  // Calculate distance between two points
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

  // Calculate delivery fee based on distance
  calculateDeliveryFee(distance) {
    if (distance <= 5) return 0; // Free delivery within 5km
    if (distance <= 10) return 25; // ₹25 for 5-10km
    if (distance <= 15) return 50; // ₹50 for 10-15km
    if (distance <= 20) return 75; // ₹75 for 15-20km
    return 100; // ₹100 for 20km+
  }

  // Get optimized route for delivery (for delivery boy app)
  async getOptimizedRoute(deliveryBoyLocation, addressIds) {
    try {
      const addresses = await Promise.all(
        addressIds.map(id => AddressModel.getAddressById(id))
      );

      const validAddresses = addresses.filter(addr => addr !== null);

      // Calculate distances from delivery boy to each address
      const addressesWithDistance = validAddresses.map(address => {
        const distance = this.calculateDistance(
          deliveryBoyLocation.latitude,
          deliveryBoyLocation.longitude,
          address.latitude,
          address.longitude
        );

        return {
          ...address,
          distanceFromDeliveryBoy: distance
        };
      });

      // Sort by distance (nearest first) - basic optimization
      // For more complex optimization, you can implement algorithms like:
      // - Traveling Salesman Problem (TSP) solution
      // - Google Maps Route Optimization API
      const optimizedRoute = addressesWithDistance.sort((a, b) => 
        a.distanceFromDeliveryBoy - b.distanceFromDeliveryBoy
      );

      return {
        route: optimizedRoute,
        totalDistance: optimizedRoute.reduce((sum, addr) => sum + addr.distanceFromDeliveryBoy, 0),
        estimatedTime: optimizedRoute.reduce((sum, addr) => sum + Math.ceil(addr.distanceFromDeliveryBoy * 3), 0)
      };
    } catch (error) {
      throw new Error(`Failed to get optimized route: ${error.message}`);
    }
  }

  // Format address for display
  formatAddressForDisplay(address) {
    const parts = [
      address.buildingName,
      address.apartmentNumber && `Apt ${address.apartmentNumber}`,
      address.floorNumber && `Floor ${address.floorNumber}`,
      address.addressLine1,
      address.addressLine2,
      address.landmark,
      address.area,
      address.city,
      address.state,
      address.pincode
    ].filter(Boolean);

    return parts.join(', ');
  }

  // Get delivery slots for address
  async getDeliverySlots(addressId) {
    try {
      const address = await AddressModel.getAddressById(addressId);
      if (!address) {
        throw new Error('Address not found');
      }

      const deliveryInfo = await this.getDeliveryInfo(addressId);
      if (!deliveryInfo.isDeliverable) {
        throw new Error('Delivery not available to this address');
      }

      // Generate delivery slots based on distance and current time
      const now = new Date();
      const slots = [];
      
      // Base preparation time + delivery time
      const baseTime = 30; // 30 minutes preparation
      const deliveryTime = deliveryInfo.estimatedTime;
      const totalTime = baseTime + deliveryTime;

      // Generate slots starting from current time + total time
      const startTime = new Date(now.getTime() + totalTime * 60000);
      
      // Generate slots for next 3 days
      for (let day = 0; day < 3; day++) {
        const slotDate = new Date(startTime);
        slotDate.setDate(slotDate.getDate() + day);
        
        // Generate slots from 11 AM to 9 PM with 1-hour intervals
        for (let hour = 11; hour <= 21; hour++) {
          const slotTime = new Date(slotDate);
          slotTime.setHours(hour, 0, 0, 0);
          
          // Skip slots that are in the past
          if (slotTime <= now) continue;
          
          slots.push({
            date: slotTime.toDateString(),
            time: slotTime.toLocaleTimeString('en-IN', { 
              hour: '2-digit', 
              minute: '2-digit',
              hour12: true 
            }),
            timestamp: slotTime.getTime(),
            isAvailable: true // You can add availability logic here
          });
        }
      }

      return slots;
    } catch (error) {
      throw new Error(`Failed to get delivery slots: ${error.message}`);
    }
  }
}

module.exports = new AddressService();