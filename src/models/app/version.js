class AppVersion {
  constructor(data) {
    this.id = data.id || null;
    this.latestVersion = data.latestVersion; // e.g., "2.0.0"
    this.minimumRequiredVersion = data.minimumRequiredVersion; // e.g., "1.2.0"
    this.isMandatory = data.isMandatory || false; // boolean
    this.updateUrl = data.updateUrl; // App Store or Play Store URL
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new AppVersion({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  }

  toFirestore() {
    return {
      latestVersion: this.latestVersion,
      minimumRequiredVersion: this.minimumRequiredVersion,
      isMandatory: this.isMandatory,
      updateUrl: this.updateUrl,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = AppVersion;