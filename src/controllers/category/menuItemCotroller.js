const MenuItemService = require('../../services/category/menuItemService');

class MenuItemController {
  // Get all menu items with pagination
  async getAllMenuItems(req, res) {
    try {
      // Extract pagination parameters from query
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'name';
      const sortOrder = req.query.sortOrder || 'asc';
      const filterVeg = req.query.isVeg; // 'true', 'false', or undefined for all
      const filterBestseller = req.query.isBestseller; // 'true', 'false', or undefined for all

      // Build filters object
      const filters = {};
      if (filterVeg !== undefined) {
        filters.isVeg = filterVeg === 'true';
      }
      if (filterBestseller !== undefined) {
        filters.isBestseller = filterBestseller === 'true';
      }

      const result = await MenuItemService.getAllMenuItems({
        page,
        limit,
        search,
        sortBy,
        sortOrder,
        filters
      });

      return res.status(200).json({
        success: true,
        message: 'Menu items retrieved successfully',
        data: {
          menuItems: result.menuItems,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.itemsPerPage,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching menu items:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching menu items',
        error: error.message,
        data: null
      });
    }
  }

  // Create new menu item
  async createMenuItem(req, res) {
    try {
      const { name, description, price, categories, imageUrl, isVeg, isBestseller, servingSize } = req.body;

      // Validate required fields
      if (!name || !description || !price || !categories) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, price, and categories are required',
          data: null
        });
      }

      const result = await MenuItemService.createMenuItem({
        name,
        description,
        price,
        categories,
        imageUrl,
        isVeg,
        isBestseller,
        servingSize,
        createdBy: req.user.uid
      });

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          itemId: result.itemId
        }
      });
    } catch (error) {
      console.error('Error creating menu item:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating menu item',
        error: error.message,
        data: null
      });
    }
  }

  // Update menu item
  async updateMenuItem(req, res) {
    try {
      const { itemId } = req.params;
      const { name, description, price, categories, imageUrl, isVeg, isBestseller, servingSize } = req.body;

      if (!name || !description || !price || !categories) {
        return res.status(400).json({
          success: false,
          message: 'Name, description, price, and categories are required',
          data: null
        });
      }

      const result = await MenuItemService.updateMenuItem(itemId, {
        name,
        description,
        price,
        categories,
        imageUrl,
        isVeg,
        isBestseller,
        servingSize,
        updatedBy: req.user.uid
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error updating menu item:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating menu item',
        error: error.message,
        data: null
      });
    }
  }

  // Toggle menu item availability
  async toggleItemAvailability(req, res) {
    try {
      const { itemId } = req.params;

      const result = await MenuItemService.toggleItemAvailability(itemId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          isAvailable: result.isAvailable
        }
      });
    } catch (error) {
      console.error('Error toggling item availability:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating item availability',
        error: error.message,
        data: null
      });
    }
  }

  // Delete menu item
  async deleteMenuItem(req, res) {
    try {
      const { itemId } = req.params;

      const result = await MenuItemService.deleteMenuItem(itemId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error deleting menu item:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting menu item',
        error: error.message,
        data: null
      });
    }
  }

  // Get menu items by category ID with pagination
  async getMenuItemsByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'name';
      const sortOrder = req.query.sortOrder || 'asc';

      const result = await MenuItemService.getMenuItemsByCategory({
        categoryId,
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      return res.status(200).json({
        success: true,
        message: 'Menu items retrieved successfully',
        data: {
          menuItems: result.menuItems,
          categoryInfo: result.categoryInfo,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.itemsPerPage,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching menu items by category:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching menu items',
        error: error.message,
        data: null
      });
    }
  }

  // Get menu items by category name with pagination
  async getMenuItemsByCategoryName(req, res) {
    try {
      const { categoryName } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 100;
      const search = req.query.search || '';
      const sortBy = req.query.sortBy || 'name';
      const sortOrder = req.query.sortOrder || 'asc';

      const result = await MenuItemService.getMenuItemsByCategoryName({
        categoryName,
        page,
        limit,
        search,
        sortBy,
        sortOrder
      });

      return res.status(200).json({
        success: true,
        message: 'Menu items retrieved successfully',
        data: {
          menuItems: result.menuItems,
          categoryInfo: result.categoryInfo,
          pagination: {
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalItems: result.totalItems,
            itemsPerPage: result.itemsPerPage,
            hasNextPage: result.hasNextPage,
            hasPrevPage: result.hasPrevPage
          }
        }
      });
    } catch (error) {
      console.error('Error fetching menu items by category name:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching menu items',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new MenuItemController();