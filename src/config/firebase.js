require('dotenv').config();
const admin = require('firebase-admin');

let isInitialized = false;

const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (isInitialized || admin.apps.length > 0) {
      
      console.log('✅ Firebase already initialized');
      return;
    }

    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    isInitialized = true;
    console.log('✅ Firebase initialized successfully');
    console.log('📊 Project ID:', process.env.FIREBASE_PROJECT_ID);
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

module.exports = {
  initializeFirebase,
  getFirestore,
  getAuth,
  getStorage,
  admin
};