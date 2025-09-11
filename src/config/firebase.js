const admin = require('firebase-admin');
// Adjust the path to where you saved the JSON file
const serviceAccount = require('../services/notificaiton/ksdeliveryboy-16bec-firebase-adminsdk.json');

let isInitialized = false;

const initializeFirebase = () => {
  try {
    if (isInitialized || admin.apps.length > 0) {
      console.log('✅ Firebase already initialized');
      return;
    }

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
  admin
};