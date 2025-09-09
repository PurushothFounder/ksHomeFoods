// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const AdminController = require('../../controllers/admin/adminController');
const { adminAuth, superAdminAuth } = require('../../middleware/admin/adminAuth');

// Public routes (no auth required)
router.post('/login', AdminController.adminLogin);

// Protected routes (require admin authentication)
router.use(adminAuth); // Apply admin auth middleware to all routes below

// Admin routes (both admin and super admin can access)
router.get('/profile', AdminController.getAdminProfile);
router.put('/profile/:adminId', AdminController.updateAdminProfile);

// Super admin only routes
router.post('/create', superAdminAuth, AdminController.createAdmin);
router.get('/all', superAdminAuth, AdminController.getAllAdmins);
router.put('/status/:adminId', superAdminAuth, AdminController.updateAdminStatus);
router.delete('/:adminId', superAdminAuth, AdminController.deleteAdmin);
router.post('/reset-password', superAdminAuth, AdminController.resetAdminPassword);

module.exports = router;