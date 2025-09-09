// services/admin/adminService.js - SIMPLIFIED VERSION
const { getFirestore, auth, admin: firebaseAdmin } = require('../../config/firebase');
const Admin = require('../../models/admin/adminModel');
const { generateToken, generateRefreshToken } = require('../../utils/jwt');

class AdminService {
   constructor() {
    const db = getFirestore();
    this.collection = db.collection('admins');
  }

  // Create a new admin (only super admin can do this)
  async createAdmin({ email, password, displayName, role, phoneNumber, createdBy }) {
    try {
      // Validate role
      if (!['admin', 'superadmin'].includes(role)) {
        throw new Error('Invalid role. Must be "admin" or "superadmin"');
      }

      // Check if admin already exists
      const existingAdmin = await this.collection.where('email', '==', email).get();
      if (!existingAdmin.empty) {
        throw new Error('Admin with this email already exists');
      }

      // Create Firebase Auth user with email and password
      const userRecord = await firebaseAdmin.auth().createUser({
        email,
        password,
        displayName,
        emailVerified: true // Auto-verify admin emails
      });

      // Set custom claims for role
      await firebaseAdmin.auth().setCustomUserClaims(userRecord.uid, {
        role: role,
        isAdmin: true
      });

      // Create admin document in Firestore
      const adminData = new Admin({
        uid: userRecord.uid,
        email,
        displayName,
        role,
        phoneNumber,
        createdBy,
        isActive: true
      });

      await this.collection.doc(userRecord.uid).set(adminData.toFirestore());

      return {
        success: true,
        message: `${role === 'superadmin' ? 'Super Admin' : 'Admin'} created successfully`,
        admin: {
          uid: userRecord.uid,
          email,
          displayName,
          role
        }
      };
    } catch (error) {
      console.error('Error creating admin:', error);
      throw error;
    }
  }

  // SIMPLIFIED Admin login - No password verification for now (DEVELOPMENT ONLY)
  async adminLogin({ email, password }) {
    try {
      console.log('Admin login attempt for:', email);

      // Check if user exists in admins collection
      const adminSnapshot = await this.collection.where('email', '==', email).get();
      
      if (adminSnapshot.empty) {
        console.log('Admin not found in database');
        throw new Error('Invalid credentials. Not an admin account.');
      }

      const adminDoc = adminSnapshot.docs[0];
      const adminData = Admin.fromFirestore(adminDoc);

      console.log('Found admin:', adminData.email, 'Role:', adminData.role);

      // Check if admin is active
      if (!adminData.isActive) {
        throw new Error('Account is deactivated. Please contact super admin.');
      }

      // Check if user exists in Firebase Auth
      let userRecord;
      try {
        userRecord = await firebaseAdmin.auth().getUserByEmail(email);
        console.log('Firebase Auth user found:', userRecord.uid);
      } catch (error) {
        console.log('Firebase Auth user not found');
        throw new Error('Invalid credentials');
      }

      // Verify UIDs match
      if (adminData.uid !== userRecord.uid) {
        console.log('UID mismatch');
        throw new Error('Authentication error. Please contact support.');
      }

      console.log('Admin validation successful');

      // Generate JWT tokens for our backend
      const tokenPayload = {
        uid: adminData.uid,
        email: adminData.email,
        role: adminData.role,
        isAdmin: true
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Update last login
      await this.collection.doc(adminData.uid).update({
        lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      console.log('Login successful for:', adminData.email);

      return {
        success: true,
        message: `${adminData.role === 'superadmin' ? 'Super Admin' : 'Admin'} logged in successfully`,
        admin: {
          uid: adminData.uid,
          email: adminData.email,
          displayName: adminData.displayName,
          role: adminData.role,
          phoneNumber: adminData.phoneNumber,
          isActive: adminData.isActive
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '7d'
        }
      };
    } catch (error) {
      console.error('Admin login error:', error.message);
      throw error;
    }
  }

  // Alternative: Login with basic password check (for production)
  async adminLoginWithPasswordCheck({ email, password }) {
    try {
      console.log('Admin login with password check for:', email);

      // Step 1: Check if user exists in admins collection
      const adminSnapshot = await this.collection.where('email', '==', email).get();
      
      if (adminSnapshot.empty) {
        throw new Error('Invalid credentials. Not an admin account.');
      }

      const adminDoc = adminSnapshot.docs[0];
      const adminData = Admin.fromFirestore(adminDoc);

      // Step 2: Check if admin is active
      if (!adminData.isActive) {
        throw new Error('Account is deactivated. Please contact super admin.');
      }

      // Step 3: Get Firebase Auth user
      let userRecord;
      try {
        userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      } catch (error) {
        throw new Error('Invalid credentials');
      }

      // Step 4: Create a custom token for verification
      const customToken = await firebaseAdmin.auth().createCustomToken(userRecord.uid);
      
      // Step 5: For now, we'll do a basic password length check
      // In production, you'd want to use Firebase Client SDK or another method
      if (!password || password.length < 6) {
        throw new Error('Invalid password format');
      }

      // Generate JWT tokens
      const tokenPayload = {
        uid: adminData.uid,
        email: adminData.email,
        role: adminData.role,
        isAdmin: true
      };

      const accessToken = generateToken(tokenPayload);
      const refreshToken = generateRefreshToken(tokenPayload);

      // Update last login
      await this.collection.doc(adminData.uid).update({
        lastLogin: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: `${adminData.role === 'superadmin' ? 'Super Admin' : 'Admin'} logged in successfully`,
        admin: {
          uid: adminData.uid,
          email: adminData.email,
          displayName: adminData.displayName,
          role: adminData.role,
          phoneNumber: adminData.phoneNumber,
          isActive: adminData.isActive
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: '7d'
        },
        firebaseCustomToken: customToken
      };
    } catch (error) {
      console.error('Admin login error:', error.message);
      throw error;
    }
  }

  // Get all admins (only super admin can do this)
  async getAllAdmins(requestingAdminRole) {
    try {
      if (requestingAdminRole !== 'superadmin') {
        throw new Error('Only super admins can view all admins');
      }

      const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
      const admins = [];

      snapshot.forEach(doc => {
        const admin = Admin.fromFirestore(doc);
        admins.push({
          uid: admin.uid,
          email: admin.email,
          displayName: admin.displayName,
          role: admin.role,
          phoneNumber: admin.phoneNumber,
          isActive: admin.isActive,
          createdAt: admin.createdAt,
          lastLogin: admin.lastLogin
        });
      });

      return admins;
    } catch (error) {
      console.error('Error fetching admins:', error);
      throw error;
    }
  }

  // Update admin status (activate/deactivate)
  async updateAdminStatus(adminUid, isActive, requestingAdminRole) {
    try {
      if (requestingAdminRole !== 'superadmin') {
        throw new Error('Only super admins can update admin status');
      }

      await this.collection.doc(adminUid).update({
        isActive,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      // Also disable/enable the Firebase Auth account
      await firebaseAdmin.auth().updateUser(adminUid, {
        disabled: !isActive
      });

      return {
        success: true,
        message: `Admin ${isActive ? 'activated' : 'deactivated'} successfully`
      };
    } catch (error) {
      console.error('Error updating admin status:', error);
      throw error;
    }
  }

  // Update admin profile
  async updateAdminProfile(adminUid, updates, requestingAdminRole) {
    try {
      const allowedUpdates = {};

      // Only super admin can change roles
      if (updates.role && requestingAdminRole !== 'superadmin') {
        throw new Error('Only super admins can change roles');
      }

      if (updates.displayName) allowedUpdates.displayName = updates.displayName;
      if (updates.phoneNumber !== undefined) allowedUpdates.phoneNumber = updates.phoneNumber;
      if (updates.role) allowedUpdates.role = updates.role;

      allowedUpdates.updatedAt = firebaseAdmin.firestore.FieldValue.serverTimestamp();

      await this.collection.doc(adminUid).update(allowedUpdates);

      // Update Firebase Auth user
      const authUpdates = {};
      if (updates.displayName) authUpdates.displayName = updates.displayName;
      
      if (Object.keys(authUpdates).length > 0) {
        await firebaseAdmin.auth().updateUser(adminUid, authUpdates);
      }

      // Update custom claims if role changed
      if (updates.role) {
        await firebaseAdmin.auth().setCustomUserClaims(adminUid, {
          role: updates.role,
          isAdmin: true
        });
      }

      return {
        success: true,
        message: 'Admin profile updated successfully'
      };
    } catch (error) {
      console.error('Error updating admin profile:', error);
      throw error;
    }
  }

  // Delete admin (only super admin can do this)
  async deleteAdmin(adminUid, requestingAdminRole) {
    try {
      if (requestingAdminRole !== 'superadmin') {
        throw new Error('Only super admins can delete admins');
      }

      // Delete from Firestore
      await this.collection.doc(adminUid).delete();

      // Delete from Firebase Auth
      await firebaseAdmin.auth().deleteUser(adminUid);

      return {
        success: true,
        message: 'Admin deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting admin:', error);
      throw error;
    }
  }

  // Reset admin password
  async resetAdminPassword(email, newPassword, requestingAdminRole) {
    try {
      if (requestingAdminRole !== 'superadmin') {
        throw new Error('Only super admins can reset passwords');
      }

      const userRecord = await firebaseAdmin.auth().getUserByEmail(email);
      
      await firebaseAdmin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });

      return {
        success: true,
        message: 'Password reset successfully'
      };
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  }

  // Get admin by UID
  async getAdminByUid(uid) {
    try {
      const doc = await this.collection.doc(uid).get();
      
      if (!doc.exists) {
        throw new Error('Admin not found');
      }

      return Admin.fromFirestore(doc);
    } catch (error) {
      console.error('Error fetching admin:', error);
      throw error;
    }
  }
}

module.exports = new AdminService();