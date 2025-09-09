// src/routes/intro/introRoutes.js

const express = require('express');
const router = express.Router();
const IntroController = require('../../controllers/banner/introController');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Public routes (no authentication required)

// Get active intro content for app startup
// GET /api/intro/active
router.get('/active', IntroController.getActiveIntro);

// Protected routes (authentication required)

// Get all intro content (admin)
// GET /api/intro
router.get('/', IntroController.getAllIntros);

// Create new intro content
// POST /api/intro
router.post('/', adminAuth, IntroController.createIntro);

// Get intro content by ID
// GET /api/intro/:introId
router.get('/:introId', adminAuth, IntroController.getIntroById);

// Update intro content
// PUT /api/intro/:introId
router.put('/:introId', adminAuth, IntroController.updateIntro);

// Toggle intro status (activate/deactivate)
// PATCH /api/intro/:introId/toggle
router.patch('/:introId/toggle', adminAuth, IntroController.toggleIntroStatus);

// Delete intro content
// DELETE /api/intro/:introId
router.delete('/:introId', adminAuth, IntroController.deleteIntro);

// Get intro content by type
// GET /api/intro/type/:type (type: banner or youtube)
router.get('/type/:type', adminAuth, IntroController.getIntrosByType);

// Get intro statistics
// GET /api/intro/stats/overview
router.get('/stats/overview', adminAuth, IntroController.getIntroStats);

module.exports = router;