const notificationService = require('../../services/notificaiton/notificationService');

class NotificationController {
    /**
     * @route POST /api/notifications
     * @desc Add a new notification and send push notifications
     * @access Admin
     */
    async createNotification(req, res) {
        try {
            const { title, message, icon, type, imageUrl } = req.body;
            if (!title || !message || !type || !icon) {
                return res.status(400).json({ success: false, message: 'Title, message, icon, and type are required' });
            }

            const id = await notificationService.addNotification({
                title,
                message,
                icon,
                type,
                imageUrl,
            });

            res.status(201).json({ success: true, message: 'Notification added and sent', id });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * @route GET /api/notifications
     * @desc Get the latest 10 notifications for a user
     * @access User
     */
    async getNotifications(req, res) {
        try {
            const notifications = await notificationService.getNotifications();
            res.json({ success: true, data: { notifications } });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }
}

module.exports = new NotificationController();