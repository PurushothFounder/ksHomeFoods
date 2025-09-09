// models/Admin.js
const { db, admin: firebaseAdmin } = require('../../config/firebase');

class Admin {
  constructor(data) {
    this.uid = data.uid;
    this.email = data.email;
    this.displayName = data.displayName;
    this.role = data.role; // 'admin' or 'superadmin'
    this.phoneNumber = data.phoneNumber || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.createdBy = data.createdBy || null; // UID of the super admin who created this admin
    this.createdAt = data.createdAt || firebaseAdmin.firestore.FieldValue.serverTimestamp();
    this.updatedAt = firebaseAdmin.firestore.FieldValue.serverTimestamp();
    this.lastLogin = data.lastLogin || null;
  }

  // Convert to plain object for Firestore
  toFirestore() {
    return {
      uid: this.uid,
      email: this.email,
      displayName: this.displayName,
      role: this.role,
      phoneNumber: this.phoneNumber,
      isActive: this.isActive,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLogin: this.lastLogin
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Admin({
      ...data,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      lastLogin: data.lastLogin?.toDate() || null
    });
  }
}

module.exports = Admin;