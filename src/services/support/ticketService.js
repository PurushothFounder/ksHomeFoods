// services/support/ticketService.js

const { getFirestore } = require('../../config/firebase');
const Ticket = require('../../models/support/ticket');

class TicketService {
    constructor() {
        this.collection = getFirestore().collection('tickets');
    }

    /**
     * Creates a new support ticket.
     * @param {string} userId - The ID of the user creating the ticket.
     * @param {string} subject - The subject of the ticket.
     * @param {string} message - The message of the ticket.
     * @returns {Promise<string>} The ID of the new ticket document.
     */
    async createTicket(userId, subject, message) {
        const newTicket = new Ticket({ userId, subject, message });
        const docRef = await this.collection.add(newTicket.toFirestore());
        return docRef.id;
    }

    /**
     * Retrieves all support tickets.
     * @returns {Promise<Array<Ticket>>} A list of all ticket objects.
     */
    async getAllTickets() {
        const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
        return snapshot.docs.map(doc => Ticket.fromFirestore(doc));
    }
    
    /**
     * Retrieves a single support ticket by its ID.
     * @param {string} ticketId - The ID of the ticket.
     * @returns {Promise<Ticket|null>} The ticket object or null if not found.
     */
    async getTicketById(ticketId) {
        const doc = await this.collection.doc(ticketId).get();
        if (!doc.exists) return null;
        return Ticket.fromFirestore(doc);
    }

    /**
     * Updates the status of a specific ticket.
     * @param {string} ticketId - The ID of the ticket to update.
     * @param {string} newStatus - The new status (e.g., 'closed').
     * @returns {Promise<boolean>} True if the update was successful.
     */
    async updateTicketStatus(ticketId, newStatus) {
        await this.collection.doc(ticketId).update({
            status: newStatus,
            updatedAt: new Date(),
        });
        return true;
    }
    
    /**
     * Retrieves tickets for a specific user.
     * @param {string} userId - The ID of the user.
     * @returns {Promise<Array<Ticket>>} A list of ticket objects for the user.
     */
    async getTicketsByUserId(userId) {
        const snapshot = await this.collection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        return snapshot.docs.map(doc => Ticket.fromFirestore(doc));
    }
}

module.exports = new TicketService();