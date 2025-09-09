const { getFirestore, admin: firebaseAdmin } = require('../../config/firebase');
const Banner = require('../../models/banner/bannerModel');

class BannerService {
  constructor() {
    const db = getFirestore();
    this.collection = db.collection('banners');
  }

  // Create a new banner
  async createBanner({ bannerTitle, bannerImageUrl, displayLocations, startDate, endDate, createdBy }) {
    try {
      // Validate banner data
      const validation = Banner.validate({ bannerTitle, bannerImageUrl, displayLocations, startDate });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if banner with same title already exists and is active
      const existingBanner = await this.collection
        .where('bannerTitle', '==', bannerTitle.toLowerCase().trim())
        .where('isActive', '==', true)
        .get();

      if (!existingBanner.empty) {
        throw new Error('Banner with this title already exists');
      }

      // Validate date logic
      if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }

      // Create banner document
      const bannerData = new Banner({
        bannerTitle,
        bannerImageUrl,
        displayLocations,
        startDate,
        endDate,
        createdBy,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      const docRef = await this.collection.add(bannerData.toFirestore());

      return {
        success: true,
        message: 'Banner created successfully',
        bannerId: docRef.id
      };
    } catch (error) {
      console.error('Error creating banner:', error);
      throw error;
    }
  }

  // Get all banners
  async getAllBanners() {
    try {
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      const banners = [];
      snapshot.forEach(doc => {
        const banner = Banner.fromFirestore(doc);
        banners.push(banner);
      });

      return banners;
    } catch (error) {
      console.error('Error fetching banners:', error);
      throw error;
    }
  }

  // Get banners by location
  async getBannersByLocation(location) {
    try {
      const snapshot = await this.collection
        .where('displayLocations', 'array-contains', location)
        .where('isActive', '==', true)
        .orderBy('createdAt', 'desc')
        .get();

      const banners = [];
      const now = new Date();

      snapshot.forEach(doc => {
        const banner = Banner.fromFirestore(doc);
        
        // Check if banner is currently active based on dates
        if (banner.isCurrentlyActive()) {
          banners.push(banner);
        }
      });

      return banners;
    } catch (error) {
      console.error('Error fetching banners by location:', error);
      throw error;
    }
  }

  // Get active banners (for public display)
  async getActiveBanners(location = null) {
    try {
      let query = this.collection.where('isActive', '==', true);
      
      if (location) {
        query = query.where('displayLocations', 'array-contains', location);
      }
      
      const snapshot = await query.orderBy('createdAt', 'desc').get();

      const banners = [];
      const now = new Date();

      snapshot.forEach(doc => {
        const banner = Banner.fromFirestore(doc);
        
        // Check if banner is currently active based on dates
        if (banner.isCurrentlyActive()) {
          banners.push(banner);
        }
      });

      return banners;
    } catch (error) {
      console.error('Error fetching active banners:', error);
      throw error;
    }
  }

  // Update banner
  async updateBanner(bannerId, { bannerTitle, bannerImageUrl, displayLocations, startDate, endDate, updatedBy }) {
    try {
      // Validate banner data
      const validation = Banner.validate({ bannerTitle, bannerImageUrl, displayLocations, startDate });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if banner exists
      const bannerDoc = await this.collection.doc(bannerId).get();
      if (!bannerDoc.exists) {
        throw new Error('Banner not found');
      }

      // Validate date logic
      if (endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (end <= start) {
          throw new Error('End date must be after start date');
        }
      }

      // Update banner
      const updateData = {
        bannerTitle: bannerTitle.trim(),
        bannerImageUrl: bannerImageUrl.trim(),
        displayLocations,
        startDate,
        endDate,
        updatedBy,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(bannerId).update(updateData);

      return {
        success: true,
        message: 'Banner updated successfully'
      };
    } catch (error) {
      console.error('Error updating banner:', error);
      throw error;
    }
  }

  // Toggle banner status
  async toggleBannerStatus(bannerId) {
    try {
      const bannerDoc = await this.collection.doc(bannerId).get();
      if (!bannerDoc.exists) {
        throw new Error('Banner not found');
      }

      const currentBanner = Banner.fromFirestore(bannerDoc);
      const newStatus = !currentBanner.isActive;

      await this.collection.doc(bannerId).update({
        isActive: newStatus,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: `Banner ${newStatus ? 'activated' : 'deactivated'} successfully`,
        isActive: newStatus
      };
    } catch (error) {
      console.error('Error toggling banner status:', error);
      throw error;
    }
  }

  // Delete banner (soft delete)
  async deleteBanner(bannerId) {
    try {
      const bannerDoc = await this.collection.doc(bannerId).get();
      if (!bannerDoc.exists) {
        throw new Error('Banner not found');
      }

      await this.collection.doc(bannerId).update({
        isActive: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'Banner deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting banner:', error);
      throw error;
    }
  }

  // Get banner by ID
  async getBannerById(bannerId) {
    try {
      const bannerDoc = await this.collection.doc(bannerId).get();
      if (!bannerDoc.exists) {
        throw new Error('Banner not found');
      }

      return Banner.fromFirestore(bannerDoc);
    } catch (error) {
      console.error('Error fetching banner:', error);
      throw error;
    }
  }

  // Get expired banners
  async getExpiredBanners() {
    try {
      const now = new Date();
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .where('endDate', '<', now)
        .get();

      const banners = [];
      snapshot.forEach(doc => {
        const banner = Banner.fromFirestore(doc);
        banners.push(banner);
      });

      return banners;
    } catch (error) {
      console.error('Error fetching expired banners:', error);
      throw error;
    }
  }

  // Auto-deactivate expired banners (can be called by a cron job)
  async deactivateExpiredBanners() {
    try {
      const expiredBanners = await this.getExpiredBanners();
      
      const batch = getFirestore().batch();
      let updateCount = 0;

      expiredBanners.forEach(banner => {
        const bannerRef = this.collection.doc(banner.id);
        batch.update(bannerRef, {
          isActive: false,
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
      }

      return {
        success: true,
        message: `${updateCount} expired banners deactivated`,
        deactivatedCount: updateCount
      };
    } catch (error) {
      console.error('Error deactivating expired banners:', error);
      throw error;
    }
  }
}

module.exports = new BannerService();