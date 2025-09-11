// controllers/support/ticketController.js

const TicketService = require('../../services/support/ticketService');

class TicketController {
    /**
     * @route POST /api/tickets
     * @desc Create a new support ticket
     * @access Private (User)
     */
    async createTicket(req, res) {
        try {
            const { subject, message } = req.body;
            const { uid } = req.user; // User ID from auth middleware

            if (!subject || !message) {
                return res.status(400).json({ success: false, message: 'Subject and message are required' });
            }

            const ticketId = await TicketService.createTicket(uid, subject, message);
            res.status(201).json({ success: true, message: 'Ticket created successfully', ticketId });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * @route GET /api/tickets
     * @desc Get all support tickets (Admin Only)
     * @access Admin
     */
    async getAllTickets(req, res) {
        try {
            const tickets = await TicketService.getAllTickets();
            res.json({ success: true, data: { tickets } });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }
    
    /**
     * @route GET /api/tickets/user
     * @desc Get all support tickets for the authenticated user
     * @access Private (User)
     */
    async getUserTickets(req, res) {
        try {
            const { uid } = req.user; // User ID from auth middleware
            const tickets = await TicketService.getTicketsByUserId(uid);
            res.json({ success: true, data: { tickets } });
        } catch (e) {
            res.status(500).json({ success: false, message: e.message });
        }
    }

    /**
     * @route PUT /api/tickets/:id/status
     * @desc Update the status of a ticket (Admin Only)
     * @access Admin
     */
    async updateTicketStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!status) {
                return res.status(400).json({ success: false, message: 'Status is required' });
            }
            
            await TicketService.updateTicketStatus(id, status);
            res.json({ success: true, message: 'Ticket status updated successfully' });
        } catch (e) {
            res.status(400).json({ success: false, message: e.message });
        }
    }
}

module.exports = new TicketController();