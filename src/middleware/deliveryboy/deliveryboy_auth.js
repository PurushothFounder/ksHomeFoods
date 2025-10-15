// deliveryboy_auth.js
const { getAuth } = require('../../config/firebase');

/**
 * @desc Authentication middleware for delivery boys.
 * Verifies a Firebase ID token and attaches user data to the request.
 * @access Public (token verification is done here)
 */
const authenticateDeliveryBoyToken = async (req, res, next) => {
  try {
    console.log('🔐 Delivery Boy Authentication middleware triggered.');

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization header must be in "Bearer <token>" format.',
        code: 'INVALID_AUTH_HEADER'
      });
    }

    const idToken = authHeader.substring(7);

    const firebaseAuth = getAuth();

    const decodedToken = await firebaseAuth.verifyIdToken(idToken);

    // Attach all relevant decoded user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null, // <-- Get display name
      phoneNumber: decodedToken.phone_number || null, // <-- Get phone number
      authTimestamp: new Date().toISOString()
    };

    console.log('✅ Authentication successful for delivery boy:', req.user.email);
    next();

  } catch (error) {
    console.error('❌ Delivery Boy Firebase Authentication error:', error.message);

    let errorCode = 'AUTH_ERROR';
    let statusCode = 401;

    if (error.code === 'auth/id-token-expired') {
      errorCode = 'TOKEN_EXPIRED';
      statusCode = 401;
    } else if (error.message.includes('malformed')) {
      errorCode = 'INVALID_TOKEN_STRUCTURE';
      statusCode = 400;
    }

    return res.status(statusCode).json({
      success: false,
      message: error.message || 'Authentication failed',
      code: errorCode
    });
  }
};

/**
 * @desc Middleware to check if the authenticated user is a delivery boy.
 * @access Private
 */
const requireDeliveryBoy = (req, res, next) => {
  console.log('🔒 Checking delivery boy privileges for user:', req.user.uid);
  
  // This assumes you have a way to check if the user is a delivery boy.
  // This could be via custom claims on the Firebase token or by checking
  // a field in your Firestore 'deliveryBoys' collection.
  // For this example, we assume we check against a role or a specific claim.
  // You might want to adjust this logic based on your application's design.

  // Placeholder logic: We'll assume the authentication in the previous step
  // ensures they are a user, and a separate check in a service or controller
  // will confirm their delivery boy status based on the database.
  // For now, this middleware will simply pass through.
  // A more robust implementation would check if the user exists in the deliveryBoy collection.
  
  console.log('✅ Delivery boy access granted.');
  next();
};

module.exports = {
  authenticateDeliveryBoyToken,
  requireDeliveryBoy
};