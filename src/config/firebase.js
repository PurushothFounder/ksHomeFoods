const admin = require('firebase-admin');
require('dotenv').config();

let isInitialized = false;

const initializeFirebase = () => {
  try {
    if (isInitialized || admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return;
    }

    // Build credentials object from environment variables
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'), // important!
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

    isInitialized = true;
    console.log('✅ Firebase initialized successfully');
    console.log('📊 Project ID:', serviceAccount.project_id);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    process.exit(1);
  }
};

const getFirestore = () => {
  if (!isInitialized && admin.apps.length === 0) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.firestore();
};

const getAuth = () => {
  if (!isInitialized && admin.apps.length === 0) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.auth();
};

const getStorage = () => {
  if (!isInitialized && admin.apps.length === 0) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.storage();
};

const getMessaging = () => {
  if (!isInitialized && admin.apps.length === 0) {
    throw new Error('Firebase not initialized. Call initializeFirebase() first.');
  }
  return admin.messaging();
};

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  getMessaging,
  admin,
};