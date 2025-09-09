const express = require('express');
const router = express.Router();
const CategoryController = require('../../controllers/category/categoryController');
const { adminAuth } = require('../../middleware/admin/adminAuth');

// Category routes
router.get('', CategoryController.getAllCategories);
router.get('/with-count', CategoryController.getCategoriesWithItemCount);
router.get('/type/:type', CategoryController.getCategoriesByType);
router.post('/',adminAuth, CategoryController.createCategory);
router.put('/:categoryId',adminAuth, CategoryController.updateCategory);
router.delete('/:categoryId',adminAuth, CategoryController.deleteCategory);

module.exports = router;
