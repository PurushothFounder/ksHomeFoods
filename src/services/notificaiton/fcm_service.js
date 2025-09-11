
const { getFirestore } = require('../../config/firebase');

class FcmTokenService {
    constructor() {
        this.collection = getFirestore().collection('fcmTokens');
    }

    /**
     * Saves or updates an FCM token for a user.
     * @param {string} userId - The user's ID.
     * @param {string} token - The FCM device token.
     * @returns {Promise<void>}
     */
    async saveToken(userId, token) {
        if (!userId || !token) {
            throw new Error('User ID and FCM token are required.');
        }

        const docRef = this.collection.doc(userId);
        await docRef.set({
            token: token,
            createdAt: new Date(),
        });
    }

    /**
     * Retrieves all FCM tokens from the database.
     * @returns {Promise<Array<string>>} A list of all FCM tokens.
     */
    async getAllTokens() {
        const snapshot = await this.collection.get();
        const tokens = snapshot.docs.map(doc => doc.data().token);
        return tokens;
    }
}

module.exports = new FcmTokenService();
