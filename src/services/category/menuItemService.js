const { getFirestore, admin: firebaseAdmin } = require('../../config/firebase');
const MenuItem = require('../../models/category/menuItem');
const CategoryService = require('../category/categoryService');

class MenuItemService {
  constructor() {
    const db = getFirestore();
    this.collection = db.collection('menuItems');
    this.categoriesCollection = db.collection('categories');
    this.productSubCategoriesCollection = db.collection('productSubCategories');
  }

  // Helper method to get category ID by name or type
  async getCategoryIdByName(categoryName) {
    try {
      // First try to find by type field (based on your database structure)
      let snapshot = await this.categoriesCollection
        .where('type', '==', categoryName.toLowerCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // If not found by type, try by name field
      snapshot = await this.categoriesCollection
        .where('name', '==', categoryName.toLowerCase())
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (!snapshot.empty) {
        return snapshot.docs[0].id;
      }

      // Try case-insensitive search on both fields
      const allCategoriesSnapshot = await this.categoriesCollection
        .where('isActive', '==', true)
        .get();

      for (const doc of allCategoriesSnapshot.docs) {
        const data = doc.data();
        if ((data.type && data.type.toLowerCase() === categoryName.toLowerCase()) ||
          (data.name && data.name.toLowerCase() === categoryName.toLowerCase())) {
          return doc.id;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting category ID by name:', error);
      return null;
    }
  }

  // Create a new menu item
  async createMenuItem({ name, description, price, categories, imageUrl, isVeg, isBestseller, servingSize, productSubCategory, createdBy }) {
    try {
      // Validate menu item data
      const validation = MenuItem.validate({ name, description, price, categories, productSubCategory });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Verify all categories exist
      for (const categoryId of categories) {
        try {
          await CategoryService.getCategoryById(categoryId);
        } catch (error) {
          throw new Error(`Invalid category ID: ${categoryId}`);
        }
      }

      // Check if menu item with same name already exists
      const existingItem = await this.collection
        .where('name', '==', name.toLowerCase().trim())
        .where('isAvailable', '==', true)
        .get();

      if (!existingItem.empty) {
        throw new Error('Menu item with this name already exists');
      }

      // Create menu item document
      const menuItemData = new MenuItem({
        name,
        description,
        price,
        categories,
        imageUrl: imageUrl || '',
        isVeg,
        isBestseller,
        servingSize,
        productSubCategory, // Add product sub-category if it's a product
        createdBy,
        createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      const docRef = await this.collection.add(menuItemData.toFirestore());

      return {
        success: true,
        message: 'Menu item created successfully',
        itemId: docRef.id
      };
    } catch (error) {
      console.error('Error creating menu item:', error);
      throw error;
    }
  }

  // Get all menu items with pagination and filters
  async getAllMenuItems({ page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc', filters = {} }) {
    try {
      // Build base query
      let query = this.collection;

      // Apply filters
      if (filters.isVeg !== undefined) {
        query = query.where('isVeg', '==', filters.isVeg);
      }
      if (filters.isBestseller !== undefined) {
        query = query.where('isBestseller', '==', filters.isBestseller);
      }

      // Get total count for pagination
      const countSnapshot = await query.get();
      let allItems = [];
      
      countSnapshot.forEach(doc => {
        const item = MenuItem.fromFirestore(doc);
        // Apply search filter in memory if search term provided
        if (!search || 
          item.name.toLowerCase().includes(search.toLowerCase()) || 
          item.description.toLowerCase().includes(search.toLowerCase())) {
          allItems.push(item);
        }
      });

      // Sort items
      allItems.sort((a, b) => {
        // 🎯 NEW: Primary Sort - Availability (True items first)
        // Handle cases where isAvailable might be undefined/null (treat as available)
        if (a.isAvailable === undefined) a.isAvailable = true;
        if (b.isAvailable === undefined) b.isAvailable = true;

        let availabilityComparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
        
        if (availabilityComparison !== 0) {
            return availabilityComparison;
        }

        // Secondary Sort: User-requested sort
        let comparison = 0;
        
        switch(sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'createdAt':
            comparison = (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Get paginated items
      const paginatedItems = allItems.slice(startIndex, endIndex);

      // Get category details for each item
      const menuItemsWithCategories = [];
      for (const item of paginatedItems) {
        const categoryDetails = [];
        for (const categoryId of item.categories) {
          try {
            const category = await CategoryService.getCategoryById(categoryId);
            categoryDetails.push(category);
          } catch (error) {
            console.warn(`Category ${categoryId} not found for menu item ${item.id}`);
          }
        }
        
        menuItemsWithCategories.push({
          ...item,
          categoryDetails
        });
      }

      return {
        menuItems: menuItemsWithCategories,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching menu items:', error);
      throw error;
    }
  }

  // Get menu items by category ID with pagination
  async getMenuItemsByCategory({ categoryId, page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' }) {
    try {
      // Get category info
      const categoryInfo = await CategoryService.getCategoryById(categoryId);

      // Get all items in this category
      const snapshot = await this.collection
        .where('categories', 'array-contains', categoryId)
        .get();

      let allItems = [];
      snapshot.forEach(doc => {
        const item = MenuItem.fromFirestore(doc);
        // Apply search filter
        if (!search || 
          item.name.toLowerCase().includes(search.toLowerCase()) || 
          item.description.toLowerCase().includes(search.toLowerCase())) {
          allItems.push(item);
        }
      });

      // Sort items
      allItems.sort((a, b) => {
        // 🎯 NEW: Primary Sort - Availability (True items first)
         if (a.isAvailable === undefined) a.isAvailable = true;
         if (b.isAvailable === undefined) b.isAvailable = true;

         let availabilityComparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
         
         if (availabilityComparison !== 0) {
             return availabilityComparison;
         }

        // Secondary Sort: User-requested sort
        let comparison = 0;
        
        switch(sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'createdAt':
            comparison = (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Pagination calculations
      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;

      // Get paginated items
      const paginatedItems = allItems.slice(startIndex, endIndex);

      return {
        menuItems: paginatedItems,
        categoryInfo,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching menu items by category:', error);
      throw error;
    }
  }

  // Get menu items by category name with pagination
  async getMenuItemsByCategoryName({ categoryName, page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' }) {
    try {
      // Special handling for "products" category
      if (categoryName.toLowerCase() === 'products') {
        // Note: getAllProducts also needs the new sort logic, ensure it is covered below
        return await this.getAllProducts({ page, limit, search, sortBy, sortOrder });
      }

      // Get all matching category IDs
      const categoryIds = await this.getCategoryIdsByName(categoryName);

      if (categoryIds.length === 0) {
        throw new Error(`Category with name or type '${categoryName}' not found`);
      }

      // Get category info for response (first one)
      const categoryDoc = await this.categoriesCollection.doc(categoryIds[0]).get();
      const categoryInfo = categoryDoc.exists
        ? { id: categoryIds[0], ...categoryDoc.data() }
        : { id: categoryIds[0], name: categoryName };

      // Fetch menu items that belong to any of these categories
      let allItems = [];
      for (const categoryId of categoryIds) {
        const snapshot = await this.collection
          .where('categories', 'array-contains', categoryId)
          .get();

        snapshot.forEach(doc => {
          const item = MenuItem.fromFirestore(doc);
          // Avoid duplicates
          if (!allItems.some(i => i.id === item.id)) {
            // Apply search filter
            if (
              !search ||
              item.name.toLowerCase().includes(search.toLowerCase()) ||
              item.description.toLowerCase().includes(search.toLowerCase())
            ) {
              allItems.push(item);
            }
          }
        });
      }

      // Sort items
      allItems.sort((a, b) => {
        // 🎯 NEW: Primary Sort - Availability (True items first)
         if (a.isAvailable === undefined) a.isAvailable = true;
         if (b.isAvailable === undefined) b.isAvailable = true;

         let availabilityComparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
         
         if (availabilityComparison !== 0) {
             return availabilityComparison;
         }

        // Secondary Sort: User-requested sort
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Pagination
      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      return {
        menuItems: paginatedItems,
        categoryInfo,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching menu items by category name:', error);
      throw error;
    }
  }

  // Get all products (when user selects "Products" category)
  async getAllProducts({ page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' }) {
    try {
      // Get all category IDs where type is 'products'
      const categoryIds = [];
      const snapshot = await this.categoriesCollection
        .where('type', '==', 'products')
        .where('isActive', '==', true)
        .get();

      snapshot.forEach(doc => {
        categoryIds.push(doc.id);
      });

      if (categoryIds.length === 0) {
        // If no products category exists, return empty result
        return {
          menuItems: [],
          categoryInfo: {
            id: 'products',
            name: 'Products',
            type: 'products',
            description: 'Physical products with delivery'
          },
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: limit,
          hasNextPage: false,
          hasPrevPage: false
        };
      }

      // Fetch menu items that belong to any of these categories
      let allItems = [];
      for (const categoryId of categoryIds) {
        const itemsSnapshot = await this.collection
          .where('categories', 'array-contains', categoryId)
          .get();

        itemsSnapshot.forEach(doc => {
          const item = MenuItem.fromFirestore(doc);
          // Avoid duplicates
          if (!allItems.some(i => i.id === item.id)) {
            if (
              !search ||
              item.name.toLowerCase().includes(search.toLowerCase()) ||
              item.description.toLowerCase().includes(search.toLowerCase())
            ) {
              allItems.push(item);
            }
          }
        });
      }

      // Sort items
      allItems.sort((a, b) => {
        // 🎯 NEW: Primary Sort - Availability (True items first)
         if (a.isAvailable === undefined) a.isAvailable = true;
         if (b.isAvailable === undefined) b.isAvailable = true;

         let availabilityComparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
         
         if (availabilityComparison !== 0) {
             return availabilityComparison;
         }
         
        // Secondary Sort: User-requested sort
        let comparison = 0;
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'createdAt':
            comparison = (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Pagination
      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      // Get product sub-categories for filtering options
      const subCategories = await this.getProductSubCategories();

      // Use the first products category for categoryInfo
      const categoryDoc = await this.categoriesCollection.doc(categoryIds[0]).get();
      const categoryInfo = categoryDoc.exists
        ? { id: categoryIds[0], ...categoryDoc.data(), subCategories }
        : { id: categoryIds[0], name: 'Products', type: 'products', subCategories };

      return {
        menuItems: paginatedItems,
        categoryInfo,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching all products:', error);
      throw error;
    }
  }

  // Get products by sub-category (e.g., clothes, electronics)
  async getProductsBySubCategory({ subCategoryId, page = 1, limit = 20, search = '', sortBy = 'name', sortOrder = 'asc' }) {
    try {
      // First get the products category ID
      const productsCategoryId = await this.getCategoryIdByName('products');
      
      if (!productsCategoryId) {
        throw new Error('Products category not found');
      }

      // Get sub-category info
      const subCategory = await this.getSubCategoryById(subCategoryId);
      
      if (!subCategory) {
        throw new Error(`Sub-category '${subCategoryId}' not found`);
      }

      // Query for products with specific sub-category
      let query = this.collection
        .where('categories', 'array-contains', productsCategoryId);

      // Add sub-category filter if not 'all'
      if (subCategoryId !== 'all') {
        query = query.where('productSubCategory', '==', subCategoryId);
      }

      const snapshot = await query.get();

      let allItems = [];
      snapshot.forEach(doc => {
        const item = MenuItem.fromFirestore(doc);
        // Apply search filter
        if (!search || 
          item.name.toLowerCase().includes(search.toLowerCase()) || 
          item.description.toLowerCase().includes(search.toLowerCase())) {
          allItems.push(item);
        }
      });

      // Sort items
      allItems.sort((a, b) => {
        // 🎯 NEW: Primary Sort - Availability (True items first)
         if (a.isAvailable === undefined) a.isAvailable = true;
         if (b.isAvailable === undefined) b.isAvailable = true;

         let availabilityComparison = (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
         
         if (availabilityComparison !== 0) {
             return availabilityComparison;
         }
         
        // Secondary Sort: User-requested sort
        let comparison = 0;
        
        switch(sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'price':
            comparison = a.price - b.price;
            break;
          case 'createdAt':
            comparison = (a.createdAt?.toDate?.() || 0) - (b.createdAt?.toDate?.() || 0);
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        
        return sortOrder === 'desc' ? -comparison : comparison;
      });

      // Pagination
      const totalItems = allItems.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedItems = allItems.slice(startIndex, endIndex);

      return {
        menuItems: paginatedItems,
        categoryInfo: {
          id: productsCategoryId,
          name: 'Products',
          type: 'products',
          description: 'Physical products with delivery'
        },
        subCategoryInfo: subCategory,
        currentPage: page,
        totalPages,
        totalItems,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      };
    } catch (error) {
      console.error('Error fetching products by sub-category:', error);
      throw error;
    }
  }

  // Get product sub-categories (clothes, electronics, etc.)
  async getProductSubCategories() {
    try {
      const snapshot = await this.productSubCategoriesCollection
        .where('isActive', '==', true)
        .orderBy('name')
        .get();

      const subCategories = [];
      snapshot.forEach(doc => {
        subCategories.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // If no sub-categories in database, return default ones
      if (subCategories.length === 0) {
        return [
          { id: 'clothes', name: 'clothes', description: 'Clothing and apparel' },
          { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
          { id: 'books', name: 'Books', description: 'Books and reading materials' },
          { id: 'home-kitchen', name: 'Home & Kitchen', description: 'Home and kitchen items' },
          { id: 'sports', name: 'Sports', description: 'Sports equipment and accessories' },
          { id: 'toys', name: 'toys', description: 'Baby toys and accessories' }
        ];
      }

      return subCategories;
    } catch (error) {
      console.error('Error fetching product sub-categories:', error);
      // Return default sub-categories if collection doesn't exist
      return [
        { id: 'clothes', name: 'Clothes', description: 'Clothing and apparel' },
        { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
        { id: 'books', name: 'Books', description: 'Books and reading materials' },
        { id: 'home-kitchen', name: 'Home & Kitchen', description: 'Home and kitchen items' },
        { id: 'sports', name: 'Sports', description: 'Sports equipment and accessories' }
      ];
    }
  }

  // Get sub-category by ID
  async getSubCategoryById(subCategoryId) {
    try {
      // First check in database
      const doc = await this.productSubCategoriesCollection.doc(subCategoryId).get();
      
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      }
      
      // Fallback to predefined sub-categories
      const defaultSubCategories = {
        'clothes': { id: 'clothes', name: 'Clothes', description: 'Clothing and apparel' },
        'electronics': { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
        'books': { id: 'books', name: 'Books', description: 'Books and reading materials' },
        'home-kitchen': { id: 'home-kitchen', name: 'Home & Kitchen', description: 'Home and kitchen items' },
        'sports': { id: 'sports', name: 'Sports', description: 'Sports equipment and accessories' }
      };
      
      return defaultSubCategories[subCategoryId] || null;
    } catch (error) {
      console.error('Error fetching sub-category:', error);
      
      // Fallback to predefined sub-categories on error
      const defaultSubCategories = {
        'clothes': { id: 'clothes', name: 'Clothes', description: 'Clothing and apparel' },
        'electronics': { id: 'electronics', name: 'Electronics', description: 'Electronic devices and gadgets' },
        'books': { id: 'books', name: 'Books', description: 'Books and reading materials' },
        'home-kitchen': { id: 'home-kitchen', name: 'Home & Kitchen', description: 'Home and kitchen items' },
        'sports': { id: 'sports', name: 'Sports', description: 'Sports equipment and accessories' }
      };
      
      return defaultSubCategories[subCategoryId] || null;
    }
  }

  async getCategoryIdsByName(categoryName) {
    try {
      const matchedIds = [];
      const snapshot = await this.categoriesCollection
        .where('isActive', '==', true)
        .get();

      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (
          (data.type && data.type.toLowerCase() === categoryName.toLowerCase()) ||
          (data.name && data.name.toLowerCase() === categoryName.toLowerCase())
        ) {
          matchedIds.push(doc.id);
        }
      }
      return matchedIds;
    } catch (error) {
      console.error('Error getting category IDs by name:', error);
      return [];
    }
  }

  // Update menu item
  async updateMenuItem(itemId, { name, description, price, categories, imageUrl, isVeg, isBestseller, servingSize, productSubCategory, updatedBy }) {
    try {
      // Validate menu item data
      const validation = MenuItem.validate({ name, description, price, categories, productSubCategory });
      if (!validation.isValid) {
        throw new Error(validation.errors.join(', '));
      }

      // Check if menu item exists
      const itemDoc = await this.collection.doc(itemId).get();
      if (!itemDoc.exists) {
        throw new Error('Menu item not found');
      }

      // Verify all categories exist
      for (const categoryId of categories) {
        try {
          await CategoryService.getCategoryById(categoryId);
        } catch (error) {
          throw new Error(`Invalid category ID: ${categoryId}`);
        }
      }

      // Update menu item
      const updateData = {
        name: name.trim(),
        description: description.trim(),
        price: parseFloat(price),
        categories,
        imageUrl: imageUrl || '',
        isVeg,
        isBestseller,
        servingSize,
        updatedBy,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      };

      // Add productSubCategory only if it's provided
      if (productSubCategory !== undefined) {
        updateData.productSubCategory = productSubCategory;
      }

      await this.collection.doc(itemId).update(updateData);

      return {
        success: true,
        message: 'Menu item updated successfully'
      };
    } catch (error) {
      console.error('Error updating menu item:', error);
      throw error;
    }
  }

  // Toggle menu item availability
  async toggleItemAvailability(itemId) {
    try {
      const itemDoc = await this.collection.doc(itemId).get();
      if (!itemDoc.exists) {
        throw new Error('Menu item not found');
      }

      const currentItem = MenuItem.fromFirestore(itemDoc);
      const newAvailability = !currentItem.isAvailable;

      await this.collection.doc(itemId).update({
        isAvailable: newAvailability,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: `Menu item ${newAvailability ? 'enabled' : 'disabled'} successfully`,
        isAvailable: newAvailability
      };
    } catch (error) {
      console.error('Error toggling item availability:', error);
      throw error;
    }
  }

  // Delete menu item (soft delete)
  async deleteMenuItem(itemId) {
    try {
      const itemDoc = await this.collection.doc(itemId).get();
      if (!itemDoc.exists) {
        throw new Error('Menu item not found');
      }

      await this.collection.doc(itemId).update({
        isAvailable: false,
        updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'Menu item deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting menu item:', error);
      throw error;
    }
  }
}

module.exports = new MenuItemService();