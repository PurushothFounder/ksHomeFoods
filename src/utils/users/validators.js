const { body, validationResult } = require('express-validator');

// Google Sign-in validation
const validateGoogleSignIn = [
  body('idToken')
    .notEmpty()
    .withMessage('Firebase ID token is required'),
  body('email')
    .isEmail()
    .withMessage('Valid email is required'),
  body('displayName')
    .optional()
    .isLength({ min: 1 })
    .withMessage('Display name must not be empty'),
  body('photoURL')
    .optional()
    .isURL()
    .withMessage('Photo URL must be a valid URL'),
];

// Update profile validation
const validateUpdateProfile = [
  body('displayName')
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('Display name must be between 2 and 50 characters'),
  body('phoneNumber')
    .optional()
    .isMobilePhone()
    .withMessage('Valid phone number is required'),
];

// Check validation errors
const checkValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  validateGoogleSignIn,
  validateUpdateProfile,
  checkValidationErrors
};