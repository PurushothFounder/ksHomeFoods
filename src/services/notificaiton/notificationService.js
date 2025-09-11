const { getFirestore, getMessaging } = require('../../config/firebase');
const NotificationModel = require('../../models/notification/notification');
const fcmTokenService = require('./fcm_service');

class NotificationService {
    constructor() {
        this.collection = getFirestore().collection('notifications');
        this.messaging = getMessaging();
        this.MAX_NOTIFICATIONS = 10;
    }

    /**
     * Adds a new notification to the database and sends a push notification.
     * @param {object} data - The notification data.
     * @returns {Promise<string>} The ID of the new document.
     */
    async addNotification(data) {
        const notification = new NotificationModel(data);
        const docRef = await this.collection.add(notification.toFirestore());

        // Maintain the 10-notification limit
        await this.maintainLimit();

        // Send a push notification
        await this.sendPushNotification(notification);

        return docRef.id;
    }

    /**
     * Retrieves the latest 10 notifications for the user's app.
     * @returns {Promise<Array<Notification>>} A list of the latest notifications.
     */
    async getNotifications() {
        const snapshot = await this.collection
            .orderBy('createdAt', 'desc')
            .limit(this.MAX_NOTIFICATIONS)
            .get();

        return snapshot.docs.map(doc => NotificationModel.fromFirestore(doc));
    }

    /**
     * Deletes the oldest notification if the total count exceeds the limit.
     * @returns {Promise<void>}
     */
    async maintainLimit() {
        const snapshot = await this.collection
            .orderBy('createdAt', 'desc')
            .get();

        if (snapshot.size > this.MAX_NOTIFICATIONS) {
            const oldestDocs = snapshot.docs.slice(this.MAX_NOTIFICATIONS);
            const batch = getFirestore().batch();
            oldestDocs.forEach(doc => {
                batch.delete(doc.ref);
            });
            await batch.commit();
            console.log(`Deleted ${oldestDocs.length} old notifications.`);
        }
    }

    /**
     * Sends a push notification to all registered devices using FCM.
     * @param {NotificationModel} notification - The notification to send.
     * @returns {Promise<void>}
     */
    async sendPushNotification(notification) {
  try {
    const tokens = await fcmTokenService.getAllTokens();
    console.log(`Retrieved ${tokens.length} FCM tokens.`);

    if (tokens.length === 0) {
      console.log("No FCM tokens found, skipping push notification.");
      return;
    }

    const message = {
  tokens, // array of FCM tokens
  notification: {
    title: notification.title,
    body: notification.message,
  },
  android: {
    priority: "high",
    notification: {
       sound: "tone",  // 🔔 Android sound here
    },
  },
  apns: {
    payload: {
      aps: {
        sound: "default", // 🔔 iOS sound here
      },
    },
  },
  data: {
    type: notification.type || "",
    icon: notification.icon || "",
  },
};


    const response = await this.messaging.sendEachForMulticast(message);

    console.log("✅ Push Notification Success:");
    console.log("   Success count:", response.successCount);
    console.log("   Failure count:", response.failureCount);

    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Error for token[${idx}]:`, tokens[idx], resp.error);
        }
      });
    }

    return response;
  } catch (err) {
    console.error("🔥 Push Notification Error:", err);
    throw err;
  }
}

}

module.exports = new NotificationService();
