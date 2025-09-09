const { admin } = require('../../config/firebase');

class UserModel {
  constructor() {
    // Don't initialize db here - use lazy loading
    this.collection = 'users';
  }

  // Lazy load database connection
  getDb() {
    const { getFirestore } = require('../../config/firebase');
    return getFirestore();
  }

  // Create new user
  async createUser(userData) {
  try {
    console.log('📝 Creating user with data:', userData);
    
    const db = this.getDb();
    if (!db) {
      throw new Error('Database connection not available');
    }
    
    const userRef = db.collection(this.collection).doc(userData.uid);
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    const newUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName || '',
      phoneNumber: userData.phoneNumber || null,
      photoURL: userData.photoURL || null,
      provider: 'google',
      isActive: true,
      addresses: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    console.log('📄 Attempting to create document with ID:', userData.uid);
    
    // Try to set the document
    await userRef.set(newUser);
    console.log('✅ Document created successfully');
    
    // Get the created user with server timestamp
    const createdUser = await userRef.get();
    const createdData = createdUser.data();
    
    if (!createdData) {
      throw new Error('Created user data is undefined');
    }
    
    return { id: createdUser.id, ...createdData };
  } catch (error) {
    console.error('❌ Error in createUser:', error);
    console.error('Error code:', error.code);
    console.error('Error details:', error.details);
    throw new Error(`Failed to create user: ${error.message}`);
  }
}

  // Get user by UID
  async getUserByUid(uid) {
  try {
    const db = this.getDb();
    const userRef = db.collection(this.collection).doc(uid);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return null;  // This should work, but the error is being thrown before this
    }
    
    return { id: userDoc.id, ...userDoc.data() };
  } catch (error) {
    // Check if it's a NOT_FOUND error (which is expected for new users)
    if (error.code === 5 || error.message.includes('NOT_FOUND')) {
      console.log(`User ${uid} not found in database - this is expected for new users`);
      return null;  // Return null for new users
    }
    
    // Only throw error for actual problems
    console.error('Error fetching user:', error);
    throw new Error(`Failed to get user: ${error.message}`);
  }
}

  // Get user by email
  async getUserByEmail(email) {
    try {
      const db = this.getDb();
      const userQuery = await db
        .collection(this.collection)
        .where('email', '==', email)
        .limit(1)
        .get();
      
      if (userQuery.empty) {
        return null;
      }
      
      const userDoc = userQuery.docs[0];
      return { id: userDoc.id, ...userDoc.data() };
    } catch (error) {
      throw new Error(`Failed to get user by email: ${error.message}`);
    }
  }

  // Update user
  async updateUser(uid, updateData) {
    try {
      const db = this.getDb();
      const userRef = db.collection(this.collection).doc(uid);
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      
      const updatedData = {
        ...updateData,
        updatedAt: timestamp
      };
      
      await userRef.update(updatedData);
      
      // Get updated user
      const updatedUser = await userRef.get();
      return { id: updatedUser.id, ...updatedUser.data() };
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  // Check if user exists
  async userExists(uid) {
    try {
      const db = this.getDb();
      const userRef = db.collection(this.collection).doc(uid);
      const userDoc = await userRef.get();
      return userDoc.exists;
    } catch (error) {
      throw new Error(`Failed to check user existence: ${error.message}`);
    }
  }
}

module.exports = new UserModel();