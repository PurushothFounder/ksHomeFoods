// scripts/createSuperAdmin.js
// Run this script once to create the initial super admin
// Usage: node scripts/createSuperAdmin.js

// Import necessary functions from firebase.js
const { initializeFirebase, getFirestore, getAuth } = require('../config/firebase');
const readline = require('readline');
const admin = require('firebase-admin'); // Import admin separately to access FieldValue

// Initialize Firebase first
initializeFirebase();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function createSuperAdmin() {
  // Get the Firestore and Auth instances after initialization
  const db = getFirestore();
  const auth = getAuth();

  try {
    console.log('=== Create Initial Super Admin ===\n');

    // Get super admin details
    const email = await question('Enter super admin email: ');
    const password = await question('Enter password (min 6 characters): ');
    const displayName = await question('Enter display name: ');
    const phoneNumber = await question('Enter phone number (optional, press enter to skip): ');

    // Validate inputs
    if (!email || !password || !displayName) {
      console.error('Email, password, and display name are required!');
      process.exit(1);
    }

    if (password.length < 6) {
      console.error('Password must be at least 6 characters!');
      process.exit(1);
    }

    console.log('\nCreating super admin...');

    // Check if admin already exists
    const existingAdmin = await db.collection('admins')
      .where('email', '==', email)
      .get();

    if (!existingAdmin.empty) {
      console.error('An admin with this email already exists!');
      process.exit(1);
    }

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true
    });

    console.log('Firebase Auth user created:', userRecord.uid);

    // Set custom claims
    await auth.setCustomUserClaims(userRecord.uid, {
      role: 'superadmin',
      isAdmin: true
    });

    console.log('Custom claims set');

    // Create admin document in Firestore
    const adminData = {
      uid: userRecord.uid,
      email,
      displayName,
      role: 'superadmin',
      phoneNumber: phoneNumber || null,
      isActive: true,
      createdBy: 'system',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastLogin: null
    };

    await db.collection('admins').doc(userRecord.uid).set(adminData);

    console.log('\n✅ Super Admin created successfully!');
    console.log('Email:', email);
    console.log('UID:', userRecord.uid);
    console.log('\nYou can now login with these credentials in your admin panel.');

  } catch (error) {
    console.error('\n❌ Error creating super admin:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

// Run the script
createSuperAdmin();