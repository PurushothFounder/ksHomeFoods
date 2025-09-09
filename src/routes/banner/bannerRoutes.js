const express = require('express');
const router = express.Router();
const BannerController = require('../../controllers/banner/bannerController');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Debug: Check if controller methods exist
console.log('BannerController methods:', Object.getOwnPropertyNames(BannerController));

// Admin utility routes (moved to top to avoid conflicts with /:bannerId)

// Get expired banners
// GET /api/banners/admin/expired
router.get('/admin/expired', adminAuth, BannerController.getExpiredBanners);

// Deactivate expired banners
// POST /api/banners/admin/deactivate-expired
router.post('/admin/deactivate-expired', adminAuth, BannerController.deactivateExpiredBanners);

// Public routes (no authentication required)

// Get active banners for public display
// GET /api/banners/active?location=kelambakkam
router.get('/active', BannerController.getActiveBanners);

// Get banners by specific location
// GET /api/banners/location/kelambakkam
router.get('/location/:location', BannerController.getBannersByLocation);

// Protected routes (authentication required)

// Get all banners (admin)
// GET /api/banners
router.get('', BannerController.getAllBanners);

// Create new banner
// POST /api/banners
router.post('', adminAuth, BannerController.createBanner);

// Get banner by ID
// GET /api/banners/:bannerId
router.get('/:bannerId', adminAuth, BannerController.getBannerById);

// Update banner
// PUT /api/banners/:bannerId
router.put('/:bannerId', adminAuth, BannerController.updateBanner);

// Toggle banner status (activate/deactivate)
// PATCH /api/banners/:bannerId/toggle
router.patch('/:bannerId/toggle', adminAuth, BannerController.toggleBannerStatus);

// Delete banner
// DELETE /api/banners/:bannerId
router.delete('/:bannerId', adminAuth, BannerController.deleteBanner);

module.exports = router;