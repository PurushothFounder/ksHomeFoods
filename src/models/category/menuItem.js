class MenuItem {
  constructor({
    id = null,
    name,
    description,
    price,
    categories = [],
    imageUrl = '',
    isVeg = true,
    isBestseller = false,
    isAvailable = true,
    servingSize = '1',
    createdBy,
    createdAt = null,
    updatedAt = null
  }) {
    this.id = id;
    this.name = name.trim();
    this.description = description.trim();
    this.price = parseFloat(price);
    this.categories = categories;
    this.imageUrl = imageUrl;
    this.isVeg = isVeg;
    this.isBestseller = isBestseller;
    this.isAvailable = isAvailable;
    this.servingSize = servingSize;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Convert to Firestore document
  toFirestore() {
    const doc = {
      name: this.name,
      description: this.description,
      price: this.price,
      categories: this.categories,
      imageUrl: this.imageUrl,
      isVeg: this.isVeg,
      isBestseller: this.isBestseller,
      isAvailable: this.isAvailable,
      servingSize: this.servingSize,
      createdBy: this.createdBy,
    };

    if (this.createdAt) doc.createdAt = this.createdAt;
    if (this.updatedAt) doc.updatedAt = this.updatedAt;

    return doc;
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new MenuItem({
      id: doc.id,
      name: data.name,
      description: data.description,
      price: data.price,
      categories: data.categories || [],
      imageUrl: data.imageUrl || '',
      isVeg: data.isVeg,
      isBestseller: data.isBestseller,
      isAvailable: data.isAvailable,
      servingSize: data.servingSize,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  // Validation
  static validate(itemData) {
    const errors = [];

    if (!itemData.name || itemData.name.trim().length < 2) {
      errors.push('Item name must be at least 2 characters');
    }

    if (!itemData.description || itemData.description.trim().length < 5) {
      errors.push('Description must be at least 5 characters');
    }

    if (!itemData.price || isNaN(itemData.price) || parseFloat(itemData.price) <= 0) {
      errors.push('Price must be a valid positive number');
    }

    if (!itemData.categories || !Array.isArray(itemData.categories) || itemData.categories.length === 0) {
      errors.push('At least one category must be selected');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = MenuItem;