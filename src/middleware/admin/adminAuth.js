// middleware/adminAuth.js
const { verifyToken } = require('../../utils/jwt');
const AdminService = require('../../services/admin/adminService');

// Middleware to verify admin token
const adminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
        data: null
      });
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify JWT token
      const decoded = verifyToken(token);
      
      // Check if user is an admin
      if (!decoded.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Admin privileges required.',
          data: null
        });
      }

      // Get admin from database to check if still active
      const admin = await AdminService.getAdminByUid(decoded.uid);
      
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Account is deactivated',
          data: null
        });
      }

      // Attach admin info to request
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role,
        isAdmin: true
      };

      next();
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
        data: null
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
      data: null
    });
  }
};

// Middleware to verify super admin
const superAdminAuth = (req, res, next) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({
      success: false,
      message: 'Super admin privileges required',
      data: null
    });
  }
  next();
};

module.exports = {
  adminAuth,
  superAdminAuth
};