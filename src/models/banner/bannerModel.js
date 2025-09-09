class Banner {
  constructor({
    id = null,
    bannerTitle,
    bannerImageUrl,
    displayLocations = [],
    startDate,
    endDate = null,
    isActive = true,
    createdBy = null,
    createdAt = null,
    updatedAt = null
  }) {
    this.id = id;
    this.bannerTitle = bannerTitle?.trim();
    this.bannerImageUrl = bannerImageUrl?.trim();
    this.displayLocations = displayLocations || [];
    this.startDate = startDate;
    this.endDate = endDate;
    this.isActive = isActive;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      bannerTitle: this.bannerTitle,
      bannerImageUrl: this.bannerImageUrl,
      displayLocations: this.displayLocations,
      startDate: this.startDate,
      endDate: this.endDate,
      isActive: this.isActive,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Banner({
      id: doc.id,
      bannerTitle: data.bannerTitle,
      bannerImageUrl: data.bannerImageUrl,
      displayLocations: data.displayLocations || [],
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  // Validation
  static validate({ bannerTitle, bannerImageUrl, displayLocations, startDate }) {
    const errors = [];

    // Required fields validation
    if (!bannerTitle || bannerTitle.trim().length === 0) {
      errors.push('Banner title is required');
    }

    if (!bannerImageUrl || bannerImageUrl.trim().length === 0) {
      errors.push('Banner image URL is required');
    }

    if (!displayLocations || displayLocations.length === 0) {
      errors.push('At least one display location is required');
    }

    if (!startDate) {
      errors.push('Start date is required');
    }

    // Banner title length validation
    if (bannerTitle && bannerTitle.trim().length > 100) {
      errors.push('Banner title must be less than 100 characters');
    }

    // URL validation (basic)
    if (bannerImageUrl && bannerImageUrl.trim().length > 0) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(bannerImageUrl.trim())) {
        errors.push('Banner image URL must be a valid URL starting with http:// or https://');
      }
    }

    // Date validation
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        errors.push('Start date must be a valid date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Check if banner is currently active based on dates
  isCurrentlyActive() {
    if (!this.isActive) return false;

    const now = new Date();
    const start = new Date(this.startDate);
    
    // Check if banner has started
    if (start > now) return false;
    
    // Check if banner has ended (if end date is set)
    if (this.endDate) {
      const end = new Date(this.endDate);
      if (end < now) return false;
    }
    
    return true;
  }
}

module.exports = Banner;