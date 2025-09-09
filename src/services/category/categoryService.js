const { getFirestore, admin: firebaseAdmin } = require('../../config/firebase');
const Category = require('../../models/category/categoryModel');

class CategoryService {
  constructor() {
    const db = getFirestore();
    this.collection = db.collection('categories');
  }

  // Create a new category (admin/superadmin only)
  async createCategory({ name, type, timeSlots, createdBy }) {
    try {
      // Validate category data
      const validation = Category.validate({ name, type, timeSlots });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if category with same name already exists
      const existingCategory = await this.collection
        .where('name', '==', name.toLowerCase().trim())
        .where('isActive', '==', true)
        .get();

      if (!existingCategory.empty) {
        throw new Error('Category with this name already exists');
      }

      // Create category document
      const categoryData = new Category({
        name,
        type,
        timeSlots,
        createdBy,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      const docRef = await this.collection.add(categoryData.toFirestore());

      return {
        success: true,
        message: 'Category created successfully',
        categoryId: docRef.id
      };
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  // Get all active categories
  async getAllCategories() {
    try {
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .orderBy('type')
        .orderBy('name')
        .get();

      const categories = [];
      snapshot.forEach(doc => {
        const category = Category.fromFirestore(doc);
        categories.push(category);
      });

      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      throw error;
    }
  }

  // Get categories by type
  async getCategoriesByType(type) {
    try {
      const snapshot = await this.collection
        .where('type', '==', type)
        .where('isActive', '==', true)
        .orderBy('name')
        .get();

      const categories = [];
      snapshot.forEach(doc => {
        const category = Category.fromFirestore(doc);
        categories.push(category);
      });

      return categories;
    } catch (error) {
      console.error('Error fetching categories by type:', error);
      throw error;
    }
  }

  // Get category by ID
  async getCategoryById(categoryId) {
    try {
      const doc = await this.collection.doc(categoryId).get();
      
      if (!doc.exists) {
        throw new Error('Category not found');
      }

      return Category.fromFirestore(doc);
    } catch (error) {
      console.error('Error fetching category:', error);
      throw error;
    }
  }


   async getCategoryByName(categoryName) {
    try {
      // Convert category name to lowercase for case-insensitive search
      const normalizedName = categoryName.toLowerCase().trim();
      
      // Query for category by name
      const snapshot = await this.collection
        .where('name', '==', normalizedName)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        // Try with a case-insensitive search if exact match not found
        const allCategoriesSnapshot = await this.collection
          .where('isActive', '==', true)
          .get();
        
        let foundCategory = null;
        allCategoriesSnapshot.forEach(doc => {
          const category = doc.data();
          if (category.name.toLowerCase() === normalizedName) {
            foundCategory = {
              id: doc.id,
              ...category
            };
          }
        });

        if (!foundCategory) {
          return null;
        }
        
        return foundCategory;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('Error fetching category by name:', error);
      throw error;
    }
  }

  // Alternative implementation if you want to support partial matching
  async searchCategoryByName(categoryName) {
    try {
      const normalizedName = categoryName.toLowerCase().trim();
      
      // Get all active categories
      const snapshot = await this.collection
        .where('isActive', '==', true)
        .get();

      const matchingCategories = [];
      
      snapshot.forEach(doc => {
        const category = doc.data();
        // Check if the category name includes the search term
        if (category.name.toLowerCase().includes(normalizedName)) {
          matchingCategories.push({
            id: doc.id,
            ...category,
            matchScore: category.name.toLowerCase() === normalizedName ? 100 : 50
          });
        }
      });

      // Sort by match score (exact matches first)
      matchingCategories.sort((a, b) => b.matchScore - a.matchScore);

      return matchingCategories;
    } catch (error) {
      console.error('Error searching categories by name:', error);
      throw error;
    }
  }

  // Update category
  async updateCategory(categoryId, { name, type, timeSlots, updatedBy }) {
    try {
      // Validate category data
      const validation = Category.validate({ name, type, timeSlots });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if category exists
      const categoryDoc = await this.collection.doc(categoryId).get();
      if (!categoryDoc.exists) {
        throw new Error('Category not found');
      }

      // Check if another category with same name exists (if name is being changed)
      const currentCategory = Category.fromFirestore(categoryDoc);
      if (name.toLowerCase().trim() !== currentCategory.name) {
        const existingCategory = await this.collection
          .where('name', '==', name.toLowerCase().trim())
          .where('isActive', '==', true)
          .get();

        const duplicateExists = existingCategory.docs.some(doc => doc.id !== categoryId);
        if (duplicateExists) {
          throw new Error('Category with this name already exists');
        }
      }

      // Update category
      const updateData = {
        name: name.toLowerCase().trim(),
        type,
        timeSlots,
        updatedBy,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      };

      await this.collection.doc(categoryId).update(updateData);

      return {
        success: true,
        message: 'Category updated successfully'
      };
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  // Delete category (soft delete)
  async deleteCategory(categoryId) {
    try {
      // Check if category exists
      const categoryDoc = await this.collection.doc(categoryId).get();
      if (!categoryDoc.exists) {
        throw new Error('Category not found');
      }

      // Check if category is being used by any menu items
      const db = getFirestore();
      const menuItemsSnapshot = await db.collection('menuItems')
        .where('categories', 'array-contains', categoryId)
        .where('isAvailable', '==', true)
        .get();

      if (!menuItemsSnapshot.empty) {
        throw new Error(`Cannot delete category. It is being used by ${menuItemsSnapshot.size} menu item(s)`);
      }

      // Soft delete
      await this.collection.doc(categoryId).update({
        isActive: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'Category deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  // Get categories with menu item count
  async getCategoriesWithItemCount() {
    try {
      const categories = await this.getAllCategories();
      const db = getFirestore();

      const categoriesWithCount = await Promise.all(
        categories.map(async (category) => {
          const menuItemsSnapshot = await db.collection('menuItems')
            .where('categories', 'array-contains', category.id)
            .where('isAvailable', '==', true)
            .get();

          return {
            ...category,
            itemCount: menuItemsSnapshot.size
          };
        })
      );

      return categoriesWithCount;
    } catch (error) {
      console.error('Error fetching categories with item count:', error);
      throw error;
    }
  }
}

module.exports = new CategoryService();