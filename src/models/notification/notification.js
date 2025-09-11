
class Notification {
    constructor(data) {
        this.id = data.id || null;
        this.title = data.title;
        this.message = data.message;
        this.icon = data.icon; // Icon identifier from the admin panel
        this.type = data.type; // e.g., 'offer', 'new_dish', 'order', 'personal'
        this.imageUrl = data.imageUrl || null;
        this.createdAt = data.createdAt || new Date();
        this.isRead = data.isRead || false; // This will be managed on the client side
    }

    /**
     * Creates a Notification object from a Firestore document snapshot.
     * @param {FirebaseFirestore.DocumentSnapshot} doc - The Firestore document snapshot.
     * @returns {Notification} A new Notification instance.
     */
    static fromFirestore(doc) {
        const data = doc.data();
        return new Notification({
            id: doc.id,
            title: data.title,
            message: data.message,
            icon: data.icon,
            type: data.type,
            imageUrl: data.imageUrl,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            isRead: data.isRead,
        });
    }

    /**
     * Converts the Notification object to a format suitable for Firestore.
     * @returns {object} The data to be stored in Firestore.
     */
    toFirestore() {
        return {
            title: this.title,
            message: this.message,
            icon: this.icon,
            type: this.type,
            imageUrl: this.imageUrl,
            createdAt: this.createdAt,
            isRead: this.isRead,
        };
    }
}

module.exports = Notification;
