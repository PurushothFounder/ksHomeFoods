const express = require('express');
const router = express.Router();
const AuthController = require('../../controllers/users/authController');
const { authenticateToken } = require('../../middleware/users/auth');

// Public routes - No authentication required
router.post('/users/google-signin', AuthController.googleSignIn);

// Protected routes - Only when user needs to access/modify their data
router.get('/users/profile', authenticateToken, AuthController.getProfile);
router.put('/users/profile', authenticateToken, AuthController.updateProfile);
router.post('/users/logout', authenticateToken, AuthController.logout);

// Optional: Add a public route to check if service is working
router.get('/users/health', (req, res) => {
  res.json({
    success: true,
    message: 'User service is healthy',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;