// controllers/admin/adminController.js - SIMPLIFIED VERSION
const AdminService = require('../../services/admin/adminService');

class AdminController {
  // Admin login - SIMPLIFIED (no password verification for development)
  async adminLogin(req, res) {
    try {
      const { email, password } = req.body;

      console.log('Login attempt for:', email);

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          data: null
        });
      }

      // Use the simplified adminLogin method (no password verification for now)
      const result = await AdminService.adminLogin({ email, password });

      console.log('Login successful for:', result.admin.email, 'Role:', result.admin.role);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          admin: result.admin,
          tokens: result.tokens
        }
      });
    } catch (error) {
      console.error('Admin login error:', error.message);
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
        error: error.message,
        data: null
      });
    }
  }

  // Alternative login with basic password check
  async adminLoginWithPasswordCheck(req, res) {
    try {
      const { email, password } = req.body;

      console.log('Login with password check for:', email);

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required',
          data: null
        });
      }

      // Use the method with basic password validation
      const result = await AdminService.adminLoginWithPasswordCheck({ email, password });

      console.log('Login successful for:', result.admin.email, 'Role:', result.admin.role);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          admin: result.admin,
          tokens: result.tokens,
          firebaseCustomToken: result.firebaseCustomToken
        }
      });
    } catch (error) {
      console.error('Admin login error:', error.message);
      return res.status(401).json({
        success: false,
        message: error.message || 'Invalid credentials',
        error: error.message,
        data: null
      });
    }
  }

  // Create new admin (only super admin can do this)
  async createAdmin(req, res) {
    try {
      // Check if requesting user is super admin
      if (req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'Only super admins can create new admins',
          data: null
        });
      }

      const { email, password, displayName, role, phoneNumber } = req.body;

      // Validate required fields
      if (!email || !password || !displayName || !role) {
        return res.status(400).json({
          success: false,
          message: 'Email, password, display name, and role are required',
          data: null
        });
      }

      // Password validation
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null
        });
      }

      const result = await AdminService.createAdmin({
        email,
        password,
        displayName,
        role,
        phoneNumber,
        createdBy: req.user.uid
      });

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          admin: result.admin
        }
      });
    } catch (error) {
      console.error('Create admin error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to create admin',
        error: error.message,
        data: null
      });
    }
  }

  // Get all admins (only super admin)
  async getAllAdmins(req, res) {
    try {
      const admins = await AdminService.getAllAdmins(req.user.role);

      return res.status(200).json({
        success: true,
        message: 'Admins fetched successfully',
        data: {
          admins,
          total: admins.length
        }
      });
    } catch (error) {
      console.error('Get admins error:', error);
      return res.status(403).json({
        success: false,
        message: error.message || 'Failed to fetch admins',
        error: error.message,
        data: null
      });
    }
  }

  // Update admin status
  async updateAdminStatus(req, res) {
    try {
      const { adminId } = req.params;
      const { isActive } = req.body;

      if (typeof isActive !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: 'isActive must be a boolean value',
          data: null
        });
      }

      const result = await AdminService.updateAdminStatus(
        adminId,
        isActive,
        req.user.role
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Update admin status error:', error);
      return res.status(403).json({
        success: false,
        message: error.message || 'Failed to update admin status',
        error: error.message,
        data: null
      });
    }
  }

  // Update admin profile
  async updateAdminProfile(req, res) {
    try {
      const { adminId } = req.params;
      const updates = req.body;

      // Admins can update their own profile, super admins can update any
      if (req.user.uid !== adminId && req.user.role !== 'superadmin') {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own profile',
          data: null
        });
      }

      const result = await AdminService.updateAdminProfile(
        adminId,
        updates,
        req.user.role
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Update admin profile error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to update admin profile',
        error: error.message,
        data: null
      });
    }
  }

  // Delete admin (only super admin)
  async deleteAdmin(req, res) {
    try {
      const { adminId } = req.params;

      // Prevent self-deletion
      if (req.user.uid === adminId) {
        return res.status(400).json({
          success: false,
          message: 'You cannot delete your own account',
          data: null
        });
      }

      const result = await AdminService.deleteAdmin(adminId, req.user.role);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Delete admin error:', error);
      return res.status(403).json({
        success: false,
        message: error.message || 'Failed to delete admin',
        error: error.message,
        data: null
      });
    }
  }

  // Reset admin password (only super admin)
  async resetAdminPassword(req, res) {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({
          success: false,
          message: 'Email and new password are required',
          data: null
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long',
          data: null
        });
      }

      const result = await AdminService.resetAdminPassword(
        email,
        newPassword,
        req.user.role
      );

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Reset password error:', error);
      return res.status(403).json({
        success: false,
        message: error.message || 'Failed to reset password',
        error: error.message,
        data: null
      });
    }
  }

  // Get current admin profile
  async getAdminProfile(req, res) {
    try {
      const admin = await AdminService.getAdminByUid(req.user.uid);

      return res.status(200).json({
        success: true,
        message: 'Profile fetched successfully',
        data: {
          admin: {
            uid: admin.uid,
            email: admin.email,
            displayName: admin.displayName,
            role: admin.role,
            phoneNumber: admin.phoneNumber,
            isActive: admin.isActive,
            createdAt: admin.createdAt,
            lastLogin: admin.lastLogin
          }
        }
      });
    } catch (error) {
      console.error('Get admin profile error:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Failed to fetch profile',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new AdminController();