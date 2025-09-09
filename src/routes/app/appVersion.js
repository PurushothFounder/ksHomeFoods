const express = require('express');
const router = express.Router();
const AppVersionController = require('../../controllers/app/versionController');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Public route to check the latest app version
// This should not require authentication for the mobile app to function
router.get('/latest', AppVersionController.getLatestVersion);

// --- Admin Routes for managing versions ---
// These routes should be protected by admin authentication middleware

// Add a new app version
router.post('', adminAuth, AppVersionController.addVersion);

// Update an existing app version by ID
router.put('/:id', adminAuth, AppVersionController.updateVersion);

// Delete an app version by ID
router.delete('/:id', adminAuth, AppVersionController.deleteVersion);

// Get all app versions (for admin panel/auditing)
router.get('', AppVersionController.getVersions);

module.exports = router;