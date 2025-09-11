// models/support/ticket.js

class Ticket {
    constructor(data) {
        this.id = data.id || null;
        this.userId = data.userId;
        this.subject = data.subject;
        this.message = data.message;
        this.status = data.status || 'open'; // Default status is 'open'
        this.createdAt = data.createdAt || new Date();
        this.updatedAt = new Date();
    }

    static fromFirestore(doc) {
        const data = doc.data();
        return new Ticket({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
        });
    }

    toFirestore() {
        return {
            userId: this.userId,
            subject: this.subject,
            message: this.message,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
        };
    }
}

module.exports = Ticket;