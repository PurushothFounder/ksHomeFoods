// utils/jwt.js - IMPROVED VERSION
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Validate JWT_SECRET on startup
if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

console.log('✅ JWT_SECRET loaded successfully');

// Generate JWT token WITHOUT expiry (never expires)
const generateToken = (payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload for token generation');
    }
    
    console.log('🔑 Generating token for user:', payload.email);
    const token = jwt.sign(payload, JWT_SECRET);
    console.log('✅ Token generated successfully');
    return token;
  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    throw new Error('Failed to generate token');
  }
};

// Enhanced token verification with better error handling
const verifyToken = (token) => {
  try {
    if (!token) {
      throw new Error('No token provided');
    }

    // Log token info safely (without exposing the actual token)
    console.log('🔍 Verifying token of length:', token.length);
    console.log('🔍 Token starts with:', token.substring(0, 10) + '...');
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Validate decoded token structure
    if (!decoded.uid || !decoded.email) {
      throw new Error('Invalid token structure - missing required fields');
    }
    
    console.log('✅ Token verified successfully for user:', decoded.email);
    return decoded;
  } catch (error) {
    // More specific error logging
    if (error.name === 'JsonWebTokenError') {
      console.log('❌ Token verification failed: Invalid token signature');
      throw new Error('Invalid token signature');
    } else if (error.name === 'TokenExpiredError') {
      console.log('❌ Token verification failed: Token expired');
      throw new Error('Token expired');
    } else if (error.name === 'NotBeforeError') {
      console.log('❌ Token verification failed: Token not active');
      throw new Error('Token not active');
    } else {
      console.log('❌ Token verification failed:', error.message);
      throw new Error(error.message);
    }
  }
};

// Generate refresh token (optional)
const generateRefreshToken = (payload) => {
  try {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Invalid payload for refresh token generation');
    }
    
    console.log('🔑 Generating refresh token for user:', payload.email);
    return jwt.sign(payload, JWT_SECRET);
  } catch (error) {
    console.error('❌ Refresh token generation failed:', error.message);
    throw new Error('Failed to generate refresh token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken
};