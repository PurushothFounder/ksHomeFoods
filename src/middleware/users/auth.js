// Import the getAuth function from your firebase.js module
const { getAuth } = require('../../config/firebase');

// Enhanced authentication middleware with better error handling
const authenticateToken = async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware triggered for:', req.method, req.path);

    const authHeader = req.headers.authorization;

    // Check for Authorization header
    if (!authHeader) {
      console.log('❌ No Authorization header found');
      return res.status(401).json({
        success: false,
        message: 'Authorization header is required',
        code: 'NO_AUTH_HEADER'
      });
    }

    // Check for Bearer format
    if (!authHeader.startsWith('Bearer ')) {
      console.log('❌ Invalid Authorization header format');
      return res.status(401).json({
        success: false,
        message: 'Authorization header must start with "Bearer "',
        code: 'INVALID_AUTH_FORMAT'
      });
    }

    const idToken = authHeader.substring(7); // Remove 'Bearer '

    // Check if token exists after Bearer
    if (!idToken || idToken.trim() === '') {
      console.log('❌ Empty token after Bearer');
      return res.status(401).json({
        success: false,
        message: 'Access token is required',
        code: 'EMPTY_TOKEN'
      });
    }

    console.log('🔍 Token extracted, length:', idToken.length);

    // Get the Firebase Auth instance from your module
    const firebaseAuth = getAuth();
    
    // Verify the Firebase ID token using the Firebase Admin SDK
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    
    // Add user info to request object from the decoded Firebase token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'user', 
      authTimestamp: new Date().toISOString()
    };

    console.log('✅ Authentication successful for user:', req.user.email, 'UID:', req.user.uid);
    next();
    
  } catch (error) {
    console.error('❌ Firebase Authentication error:', error.message);
    
    // Return specific error codes for different scenarios
    let errorCode = 'AUTH_ERROR';
    let statusCode = 401;
    
    // Firebase Admin SDK provides specific error codes
    if (error.code === 'auth/id-token-expired') {
      errorCode = 'TOKEN_EXPIRED';
      statusCode = 401; // Unauthorized, needs a new token
    } else if (error.code === 'auth/argument-error' || error.message.includes('malformed')) {
      errorCode = 'INVALID_TOKEN_STRUCTURE';
      statusCode = 400; // Bad Request
    } else if (error.code === 'auth/invalid-credential') {
      errorCode = 'INVALID_CREDENTIAL';
      statusCode = 401; // Unauthorized
    } else {
      statusCode = 401; // General auth failure
    }
    
    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Authentication failed',
      code: errorCode
    });
  }
};

// Optional middleware for admin-only routes
const requireAdmin = (req, res, next) => {
  console.log('🔒 Checking admin privileges for user:', req.user.email);
  
  if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
    console.log('❌ Admin access denied for user:', req.user.email, 'Role:', req.user.role);
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required',
      code: 'INSUFFICIENT_PRIVILEGES'
    });
  }
  
  console.log('✅ Admin access granted for user:', req.user.email);
  next();
};

// Middleware to log all requests for debugging
const requestLogger = (req, res, next) => {
  console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('📝 Headers:', {
    'content-type': req.headers['content-type'],
    'user-agent': req.headers['user-agent']?.substring(0, 50),
    'authorization': req.headers.authorization ? 'Bearer [PRESENT]' : 'NOT_PRESENT'
  });
  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requestLogger
};