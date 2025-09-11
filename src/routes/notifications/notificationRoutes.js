// routes/notifications/notificationRoutes.js

const express = require('express');
const router = express.Router();
const NotificationController = require('../../controllers/notificaitons/notificationController');
const FcmTokenService = require('../../services/notificaiton/fcm_service');
const { adminAuth } = require('../../middleware/admin/adminAuth');
const { authenticateToken } = require('../../middleware/users/auth');

// Public route for a user to save their FCM token
router.post('/fcm-token', authenticateToken, async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: 'FCM token is required.' });
        }
        await FcmTokenService.saveToken(req.user.uid, token);
        res.status(200).json({ success: true, message: 'FCM token saved successfully.' });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
});

// Admin route to create a new notification
router.post('/', adminAuth, NotificationController.createNotification);

// User route to get all notifications
router.get('/', NotificationController.getNotifications);

module.exports = router;
