const CategoryService = require('../../services/category/categoryService');

class CategoryController {
  // Get all categories
  async getAllCategories(req, res) {
    try {
      const categories = await CategoryService.getAllCategories();

      return res.status(200).json({
        success: true,
        message: 'Categories retrieved successfully',
        data: {
          categories,
          total: categories.length
        }
      });
    } catch (error) {
      console.error('Error fetching categories:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message,
        data: null
      });
    }
  }

  // Get categories by type
  async getCategoriesByType(req, res) {
    try {
      const { type } = req.params;
      
      if (!['breakfast', 'lunch', 'snacks', 'dinner', 'products'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid category type',
          data: null
        });
      }

      const categories = await CategoryService.getCategoriesByType(type);

      return res.status(200).json({
        success: true,
        message: `${type} categories retrieved successfully`,
        data: {
          categories,
          total: categories.length
        }
      });
    } catch (error) {
      console.error('Error fetching categories by type:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message,
        data: null
      });
    }
  }

  // Create new category
  async createCategory(req, res) {
    try {
      const { name, type, timeSlots } = req.body;

      // Validate required fields
      if (!name || !type || !timeSlots) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and timeSlots are required',
          data: null
        });
      }

      const result = await CategoryService.createCategory({
        name,
        type,
        timeSlots,
        createdBy: req.user.uid
      });

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          categoryId: result.categoryId
        }
      });
    } catch (error) {
      console.error('Error creating category:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating category',
        error: error.message,
        data: null
      });
    }
  }

  // Update category
  async updateCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const { name, type, timeSlots } = req.body;

      if (!name || !type || !timeSlots) {
        return res.status(400).json({
          success: false,
          message: 'Name, type, and timeSlots are required',
          data: null
        });
      }

      const result = await CategoryService.updateCategory(categoryId, {
        name,
        type,
        timeSlots,
        updatedBy: req.user.uid
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error updating category:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating category',
        error: error.message,
        data: null
      });
    }
  }

  // Delete category
  async deleteCategory(req, res) {
    try {
      const { categoryId } = req.params;

      const result = await CategoryService.deleteCategory(categoryId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting category',
        error: error.message,
        data: null
      });
    }
  }

  // Get categories with item count
  async getCategoriesWithItemCount(req, res) {
    try {
      const categories = await CategoryService.getCategoriesWithItemCount();

      return res.status(200).json({
        success: true,
        message: 'Categories with item count retrieved successfully',
        data: {
          categories,
          total: categories.length
        }
      });
    } catch (error) {
      console.error('Error fetching categories with item count:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching categories',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new CategoryController();