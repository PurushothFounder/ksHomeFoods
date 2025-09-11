// routes/support/ticketRoutes.js

const express = require('express');
const router = express.Router();
const TicketController = require('../../controllers/support/ticketController');
const { adminAuth } = require('../../middleware/admin/adminAuth');
const { authenticateToken } = require('../../middleware/users/auth'); // Import your auth middleware

// Private (User) route to create a new ticket
router.post('', authenticateToken, TicketController.createTicket);

// Private (User) route to get a user's own tickets
router.get('/user', authenticateToken, TicketController.getUserTickets);

// --- Admin Routes for managing tickets ---

// Admin route to get all tickets
router.get('', adminAuth, TicketController.getAllTickets);

// Admin route to update the status of a ticket
router.put('/:id/status', adminAuth, TicketController.updateTicketStatus);

module.exports = router;