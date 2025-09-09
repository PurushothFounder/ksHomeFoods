const express = require('express');
const router = express.Router();
const MenuItemController = require('../../controllers/category/menuItemCotroller');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Menu item routes
// GET /menu-items?page=1&limit=10&search=chicken&sortBy=price&sortOrder=desc&isVeg=false&isBestseller=true
router.get('/', MenuItemController.getAllMenuItems);

// GET /menu-items/category/:categoryId?page=1&limit=10
router.get('/category/:categoryId', MenuItemController.getMenuItemsByCategory);

// GET /menu-items/category/name/:categoryName?page=1&limit=10
router.get('/category/name/:categoryName', MenuItemController.getMenuItemsByCategoryName);

// POST /menu-items
router.post('/',adminAuth, MenuItemController.createMenuItem);

// PUT /menu-items/:itemId
router.put('/:itemId',adminAuth, MenuItemController.updateMenuItem);

// PATCH /menu-items/:itemId/availability
router.patch('/:itemId/availability',adminAuth, MenuItemController.toggleItemAvailability);

// DELETE /menu-items/:itemId
router.delete('/:itemId',adminAuth, MenuItemController.deleteMenuItem);

module.exports = router;