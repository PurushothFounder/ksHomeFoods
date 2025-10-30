const AuthService = require('../../services/users/authServices');

class AuthController {
  // Google Sign-in endpoint
  async googleSignIn(req, res) {
    try {
      const { idToken, email, displayName, photoURL } = req.body;
      console.log('Google sign-in controller called');
      
      const result = await AuthService.googleSignIn({
        idToken,
        email,
        displayName,
        photoURL
      });

      // Return response matching frontend expectations
      const response = {
        success: result.success,
        message: result.message || 'Signed in successfully',
        data: {
          user: result.user,
          tokens: result.tokens,
          isNewUser: result.isNewUser
        }
      };

      return res.status(200).json(response);
    } catch (error) {
      console.error('Google sign-in controller error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Get user profile
  async getProfile(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      const userProfile = await AuthService.getUserProfile(uid);

      return res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: userProfile
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Update user profile
  async updateProfile(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      const { displayName, phoneNumber } = req.body;

      const updateData = {};
      if (displayName !== undefined) updateData.displayName = displayName;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

      const updatedUser = await AuthService.updateUserProfile(uid, updateData);

      return res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedUser
        }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  async deleteAccount(req, res) { // 👈 NEW METHOD
    try {
      const { uid } = req.user; // Get uid from the authenticated user

      await AuthService.deleteUserAccount(uid); // Call service to delete

      // Successful deletion
      return res.status(200).json({
        success: true,
        message: 'Account and all associated data deleted successfully',
        data: null
      });
    } catch (error) {
      console.error('Delete account error:', error);
      return res.status(400).json({
        success: false,
        message: error.message,
        error: error.message,
        data: null
      });
    }
  }

  // Simple logout - just return success (client handles token removal)
  async logout(req, res) {
    try {
      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
        data: null
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Logout failed',
        error: error.message,
        data: null
      });
    }
  }

  // REMOVED REFRESH TOKEN ENDPOINT - Keep it simple
  // If you need refresh token later, uncomment below:
  /*
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: 'Refresh token is required',
          error: 'Refresh token is required',
          data: null
        });
      }

      const { verifyToken, generateToken } = require('../../utils/jwt');
      
      // Verify refresh token
      const decoded = verifyToken(refreshToken);
      
      // Generate new access token
      const newAccessToken = generateToken({
        uid: decoded.uid,
        email: decoded.email,
        role: decoded.role
      });

      return res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: newAccessToken,
          expiresIn: '30d'
        }
      });
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token',
        error: 'Invalid refresh token',
        data: null
      });
    }
  }
  */
}

module.exports = new AuthController();