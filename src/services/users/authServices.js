const UserModel = require('../../models/users/userModel');
const { generateToken } = require('../../utils/jwt'); // Removed generateRefreshToken

class AuthService {
  constructor() {
    // Don't initialize auth here - use lazy loading
  }

  // Lazy load Firebase Auth
  getAuth() {
    const { getAuth } = require('../../config/firebase');
    return getAuth();
  }

  // Verify Firebase ID token
  async verifyFirebaseToken(idToken) {
    try {
      const auth = this.getAuth();
      console.log('🔍 Verifying Firebase token...');
      const decodedToken = await auth.verifyIdToken(idToken);
      console.log('✅ Firebase token verified successfully');
      return decodedToken;
    } catch (error) {
      console.error('❌ Firebase token verification failed:', error.message);
      throw new Error(`Invalid Firebase token: ${error.message}`);
    }
  }

  // Google Sign-in process - SIMPLIFIED
  async googleSignIn(signInData) {
    try {
      const { idToken, email, displayName, photoURL } = signInData;
      console.log('🔍 Starting Google sign-in process...');
      
      // 1. Verify Firebase ID token
      const decodedToken = await this.verifyFirebaseToken(idToken);
      
      // 2. Extract user data from Firebase token
      const firebaseUser = {
        uid: decodedToken.uid,
        email: decodedToken.email || email,
        displayName: displayName || decodedToken.name || '',
        photoURL: photoURL || decodedToken.picture || null,
        emailVerified: decodedToken.email_verified || false
      };

      // 3. Check if user exists in our database
      console.log(`🔍 Checking if user exists: ${firebaseUser.uid}`);
      let user = await UserModel.getUserByUid(firebaseUser.uid);
      let isNewUser = false;

      if (!user) {
        // 4. Create new user if doesn't exist
        console.log('📝 Creating new user...');
        user = await UserModel.createUser(firebaseUser);
        isNewUser = true;
        console.log(`✅ New user created: ${user.email}`);
      } else {
        // 5. Optionally update existing user's info (simplified)
        console.log(`✅ Existing user found: ${user.email}`);
        // REMOVED automatic profile updates to keep it simple
        // If you want auto-updates, uncomment below:
        /*
        const updateData = {};
        if (firebaseUser.displayName && firebaseUser.displayName !== user.displayName) {
          updateData.displayName = firebaseUser.displayName;
        }
        if (firebaseUser.photoURL && firebaseUser.photoURL !== user.photoURL) {
          updateData.photoURL = firebaseUser.photoURL;
        }
        
        if (Object.keys(updateData).length > 0) {
          user = await UserModel.updateUser(user.uid, updateData);
          console.log(`✅ User updated: ${user.email}`);
        }
        */
      }

      // 6. Generate single JWT token with LONG expiry (30 days)
      const tokenPayload = {
        uid: user.uid,
        email: user.email,
        role: 'user'
      };

      const accessToken = generateToken(tokenPayload);
      // REMOVED refresh token generation for simplicity

      // 7. Return simplified response
      return {
        success: true,
        message: isNewUser ? 'Account created successfully' : 'Signed in successfully',
        isNewUser,
        user: {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          phoneNumber: user.phoneNumber,
          photoURL: user.photoURL,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        tokens: {
          accessToken,
          // REMOVED refreshToken
          expiresIn: '30d' // Long expiry for simplicity
        }
      };

    } catch (error) {
      console.error('❌ Google sign-in error:', error);
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  // Get user profile
  async getUserProfile(uid) {
    try {
      const user = await UserModel.getUserByUid(uid);
      
      if (!user) {
        throw new Error('User not found');
      }

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        addresses: user.addresses || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to get user profile: ${error.message}`);
    }
  }

  // Update user profile
  async updateUserProfile(uid, updateData) {
    try {
      const user = await UserModel.updateUser(uid, updateData);
      
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        updatedAt: user.updatedAt
      };
    } catch (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }
  }

  async deleteUserAccount(uid) { // 👈 NEW METHOD
    try {
      console.log(`🔍 Starting account deletion for uid: ${uid}`);

      // 1. Delete user from local database
      // **ASSUMPTION:** UserModel has a method like deleteUserByUid(uid)
      console.log('📝 Deleting user from local database...');
      await UserModel.deleteUserByUid(uid); 
      console.log('✅ User deleted from local database');

      // 2. Delete user from Firebase Auth
      // This step ensures the user cannot sign in with Google or the same credentials again
      const auth = this.getAuth();
      console.log('📝 Deleting user from Firebase Auth...');
      await auth.deleteUser(uid);
      console.log('✅ User deleted from Firebase Auth');

      return { success: true };
    } catch (error) {
      console.error(`❌ Account deletion failed for uid ${uid}:`, error);
      // Re-throw a generic error to the controller
      throw new Error(`Failed to delete account: ${error.message}`);
    }
  }
  
}

module.exports = new AuthService();