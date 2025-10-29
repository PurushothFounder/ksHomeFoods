class Category {
  constructor({
    id = null,
    name,
    type,
    timeSlots = [],
    isActive = true,
    createdBy,
    createdAt = null,
    updatedAt = null
  }) {
    this.id = id;
    this.name = name.toLowerCase().trim();
    this.type = type;
    this.timeSlots = timeSlots;
    this.isActive = isActive;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Convert to Firestore document
  toFirestore() {
    const doc = {
      name: this.name,
      type: this.type,
      timeSlots: this.timeSlots,
      isActive: this.isActive,
      createdBy: this.createdBy,
    };

    if (this.createdAt) doc.createdAt = this.createdAt;
    if (this.updatedAt) doc.updatedAt = this.updatedAt;

    return doc;
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Category({
      id: doc.id,
      name: data.name,
      type: data.type,
      timeSlots: data.timeSlots || [],
      isActive: data.isActive,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  // Validation
  static validate(categoryData) {
    const errors = [];

    if (!categoryData.name || categoryData.name.trim().length < 2) {
      errors.push('Category name must be at least 2 characters');
    }

    if (!categoryData.type || !['breakfast', 'lunch', 'snacks', 'dinner','essentials', 'products'].includes(categoryData.type)) {
      errors.push('Invalid category type');
    }

    if (!categoryData.timeSlots || !Array.isArray(categoryData.timeSlots) || categoryData.timeSlots.length === 0) {
      errors.push('At least one time slot is required');
    }

    if (categoryData.timeSlots) {
      categoryData.timeSlots.forEach((slot, index) => {
        if (!slot.id || !slot.startTime || !slot.endTime) {
          errors.push(`Time slot ${index + 1} is missing required fields`);
        }
        
        if (categoryData.type !== 'products' && slot.startTime >= slot.endTime) {
          errors.push(`Time slot ${index + 1} has invalid time range`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = Category;