const express = require('express');
const router = express.Router();
const policyController = require('../../controllers/support/policyController');

// Public route to get the privacy policy
router.get('/privacy-policy', policyController.getPrivacyPolicy);

// Public route to get the terms and conditions
router.get('/terms-and-conditions', policyController.getTermsAndConditions);

module.exports = router;