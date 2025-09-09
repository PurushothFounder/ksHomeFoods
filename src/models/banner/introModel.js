class Intro {
  constructor({
    id = null,
    type, // 'banner' or 'youtube'
    bannerImageUrl = null,
    youtubeUrl = null,
    status = 'inactive', // 'active' or 'inactive'
    updatedDate,
    createdBy = null,
    createdAt = null,
    updatedAt = null
  }) {
    this.id = id;
    this.type = type;
    this.bannerImageUrl = bannerImageUrl;
    this.youtubeUrl = youtubeUrl;
    this.status = status;
    this.updatedDate = updatedDate;
    this.createdBy = createdBy;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  // Convert to Firestore document
  toFirestore() {
    return {
      type: this.type,
      bannerImageUrl: this.bannerImageUrl,
      youtubeUrl: this.youtubeUrl,
      status: this.status,
      updatedDate: this.updatedDate,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from Firestore document
  static fromFirestore(doc) {
    const data = doc.data();
    return new Intro({
      id: doc.id,
      type: data.type,
      bannerImageUrl: data.bannerImageUrl,
      youtubeUrl: data.youtubeUrl,
      status: data.status,
      updatedDate: data.updatedDate,
      createdBy: data.createdBy,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt
    });
  }

  // Validation
  static validate({ type, bannerImageUrl, youtubeUrl, status, updatedDate }) {
    const errors = [];

    // Required fields validation
    if (!type || !['banner', 'youtube'].includes(type)) {
      errors.push('Type is required and must be either "banner" or "youtube"');
    }

    if (!status || !['active', 'inactive'].includes(status)) {
      errors.push('Status is required and must be either "active" or "inactive"');
    }

    if (!updatedDate) {
      errors.push('Updated date is required');
    }

    // Type-specific validation
    if (type === 'banner') {
      if (!bannerImageUrl || bannerImageUrl.trim().length === 0) {
        errors.push('Banner image URL is required for banner type');
      } else {
        // URL validation (basic)
        const urlPattern = /^https?:\/\/.+/;
        if (!urlPattern.test(bannerImageUrl.trim())) {
          errors.push('Banner image URL must be a valid URL starting with http:// or https://');
        }
      }
      // Youtube URL should be null for banner type
      if (youtubeUrl) {
        errors.push('YouTube URL should not be provided for banner type');
      }
    }

    if (type === 'youtube') {
      if (!youtubeUrl || youtubeUrl.trim().length === 0) {
        errors.push('YouTube URL is required for youtube type');
      } else {
        // YouTube URL validation
        const youtubePattern = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)[a-zA-Z0-9_-]{11}/;
        if (!youtubePattern.test(youtubeUrl.trim())) {
          errors.push('Please provide a valid YouTube URL');
        }
      }
      // Banner URL should be null for youtube type
      if (bannerImageUrl) {
        errors.push('Banner image URL should not be provided for youtube type');
      }
    }

    // Date validation
    if (updatedDate) {
      const date = new Date(updatedDate);
      if (isNaN(date.getTime())) {
        errors.push('Updated date must be a valid date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Get display content based on type
  getDisplayContent() {
    if (this.type === 'banner') {
      return {
        type: 'banner',
        content: this.bannerImageUrl,
        updatedDate: this.updatedDate
      };
    } else if (this.type === 'youtube') {
      return {
        type: 'youtube',
        content: this.youtubeUrl,
        updatedDate: this.updatedDate
      };
    }
    return null;
  }

  // Extract YouTube video ID from URL
  static extractYouTubeVideoId(url) {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    return null;
  }

  // Get YouTube thumbnail URL
  getYouTubeThumbnail() {
    if (this.type !== 'youtube' || !this.youtubeUrl) return null;
    
    const videoId = Intro.extractYouTubeVideoId(this.youtubeUrl);
    if (!videoId) return null;
    
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  }
}

module.exports = Intro;