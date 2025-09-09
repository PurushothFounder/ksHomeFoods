// config/firebaseClient.js
const { initializeApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');

// Your Firebase client configuration
// This is the same config you use in your React admin panel
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase Client SDK
const clientApp = initializeApp(firebaseConfig, 'clientApp');
const clientAuth = getAuth(clientApp);

module.exports = {
  clientApp,
  clientAuth
};