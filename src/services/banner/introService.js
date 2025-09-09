// src/services/intro/introService.js

const { getFirestore, admin: firebaseAdmin } = require('../../config/firebase');
const Intro = require('../../models/banner/introModel');

class IntroService {
  constructor() {
    const db = getFirestore();
    this.collection = db.collection('introContent');
  }

  // Create a new intro content
  async createIntro({ type, bannerImageUrl, youtubeUrl, status, updatedDate, createdBy }) {
    try {
      // Validate intro data
      const validation = Intro.validate({ type, bannerImageUrl, youtubeUrl, status, updatedDate });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // If status is active, deactivate all other intro content first
      if (status === 'active') {
        await this.deactivateAllIntros();
      }

      // Create intro document
      const introData = new Intro({
        type,
        bannerImageUrl: type === 'banner' ? bannerImageUrl : null,
        youtubeUrl: type === 'youtube' ? youtubeUrl : null,
        status,
        updatedDate,
        createdBy,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      const docRef = await this.collection.add(introData.toFirestore());

      return {
        success: true,
        message: 'Intro content created successfully',
        introId: docRef.id
      };
    } catch (error) {
      console.error('Error creating intro content:', error);
      throw error;
    }
  }

  // Get all intro content
  async getAllIntros() {
    try {
      const snapshot = await this.collection.get();

      const intros = [];
      snapshot.forEach(doc => {
        const intro = Intro.fromFirestore(doc);
        intros.push(intro);
      });

      // Sort by updatedDate descending
      intros.sort((a, b) => {
        const dateA = new Date(a.updatedDate || 0);
        const dateB = new Date(b.updatedDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      return intros;
    } catch (error) {
      console.error('Error fetching intro content:', error);
      throw error;
    }
  }

  // Get active intro content (for app startup)
  async getActiveIntro() {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        return null;
      }

      // Should only be one active intro, but just in case get the most recent
      const intros = [];
      snapshot.forEach(doc => {
        const intro = Intro.fromFirestore(doc);
        intros.push(intro);
      });

      // Sort by updatedDate descending and get the first one
      intros.sort((a, b) => {
        const dateA = new Date(a.updatedDate || 0);
        const dateB = new Date(b.updatedDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      const activeIntro = intros[0];

      // If there are multiple active intros, deactivate all except the most recent
      if (intros.length > 1) {
        console.warn('Multiple active intros found, cleaning up...');
        const batch = getFirestore().batch();
        
        for (let i = 1; i < intros.length; i++) {
          const introRef = this.collection.doc(intros[i].id);
          batch.update(introRef, {
            status: 'inactive',
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
          });
        }
        
        await batch.commit();
      }

      return activeIntro;
    } catch (error) {
      console.error('Error fetching active intro content:', error);
      throw error;
    }
  }

  // Update intro content
  async updateIntro(introId, { type, bannerImageUrl, youtubeUrl, status, updatedDate, updatedBy }) {
    try {
      // Validate intro data
      const validation = Intro.validate({ type, bannerImageUrl, youtubeUrl, status, updatedDate });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if intro exists
      const introDoc = await this.collection.doc(introId).get();
      if (!introDoc.exists) {
        throw new Error('Intro content not found');
      }

      // If status is being set to active, deactivate all other intro content first
      if (status === 'active') {
        await this.deactivateAllIntros(introId); // Exclude current intro from deactivation
      }

      // Update intro
      const updateData = {
        type,
        bannerImageUrl: type === 'banner' ? bannerImageUrl : null,
        youtubeUrl: type === 'youtube' ? youtubeUrl : null,
        status,
        updatedDate,
        updatedBy,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(introId).update(updateData);

      return {
        success: true,
        message: 'Intro content updated successfully'
      };
    } catch (error) {
      console.error('Error updating intro content:', error);
      throw error;
    }
  }

  // Toggle intro status
  async toggleIntroStatus(introId) {
    try {
      const introDoc = await this.collection.doc(introId).get();
      if (!introDoc.exists) {
        throw new Error('Intro content not found');
      }

      const currentIntro = Intro.fromFirestore(introDoc);
      const newStatus = currentIntro.status === 'active' ? 'inactive' : 'active';

      // If activating, deactivate all others first
      if (newStatus === 'active') {
        await this.deactivateAllIntros(introId);
      }

      await this.collection.doc(introId).update({
        status: newStatus,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: `Intro content ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`,
        status: newStatus
      };
    } catch (error) {
      console.error('Error toggling intro status:', error);
      throw error;
    }
  }

  // Delete intro content
  async deleteIntro(introId) {
    try {
      const introDoc = await this.collection.doc(introId).get();
      if (!introDoc.exists) {
        throw new Error('Intro content not found');
      }

      await this.collection.doc(introId).delete();

      return {
        success: true,
        message: 'Intro content deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting intro content:', error);
      throw error;
    }
  }

  // Get intro by ID
  async getIntroById(introId) {
    try {
      const introDoc = await this.collection.doc(introId).get();
      if (!introDoc.exists) {
        throw new Error('Intro content not found');
      }

      return Intro.fromFirestore(introDoc);
    } catch (error) {
      console.error('Error fetching intro content:', error);
      throw error;
    }
  }

  // Helper method to deactivate all intro content
  async deactivateAllIntros(excludeId = null) {
    try {
      const snapshot = await this.collection
        .where('status', '==', 'active')
        .get();

      if (snapshot.empty) {
        return;
      }

      const batch = getFirestore().batch();
      let updateCount = 0;

      snapshot.forEach(doc => {
        // Skip the excluded intro if provided
        if (excludeId && doc.id === excludeId) {
          return;
        }

        const introRef = this.collection.doc(doc.id);
        batch.update(introRef, {
          status: 'inactive',
          updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        });
        updateCount++;
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`Deactivated ${updateCount} intro content items`);
      }

      return updateCount;
    } catch (error) {
      console.error('Error deactivating intro content:', error);
      throw error;
    }
  }

  // Get intro content by type
  async getIntrosByType(type) {
    try {
      if (!['banner', 'youtube'].includes(type)) {
        throw new Error('Invalid type. Must be "banner" or "youtube"');
      }

      const snapshot = await this.collection
        .where('type', '==', type)
        .get();

      const intros = [];
      snapshot.forEach(doc => {
        const intro = Intro.fromFirestore(doc);
        intros.push(intro);
      });

      // Sort by updatedDate descending
      intros.sort((a, b) => {
        const dateA = new Date(a.updatedDate || 0);
        const dateB = new Date(b.updatedDate || 0);
        return dateB.getTime() - dateA.getTime();
      });

      return intros;
    } catch (error) {
      console.error('Error fetching intro content by type:', error);
      throw error;
    }
  }

  // Get statistics
  async getIntroStats() {
    try {
      const snapshot = await this.collection.get();

      const stats = {
        total: 0,
        active: 0,
        inactive: 0,
        bannerType: 0,
        youtubeType: 0,
        lastUpdated: null
      };

      let latestUpdateDate = null;

      snapshot.forEach(doc => {
        const intro = Intro.fromFirestore(doc);
        stats.total++;

        if (intro.status === 'active') {
          stats.active++;
        } else {
          stats.inactive++;
        }

        if (intro.type === 'banner') {
          stats.bannerType++;
        } else if (intro.type === 'youtube') {
          stats.youtubeType++;
        }

        // Track latest update
        const updateDate = new Date(intro.updatedDate || intro.createdAt);
        if (!latestUpdateDate || updateDate > latestUpdateDate) {
          latestUpdateDate = updateDate;
        }
      });

      stats.lastUpdated = latestUpdateDate;

      return stats;
    } catch (error) {
      console.error('Error fetching intro stats:', error);
      throw error;
    }
  }
}

module.exports = new IntroService();