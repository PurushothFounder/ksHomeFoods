const { getFirestore } = require('../../config/firebase');
const AppVersion = require('../../models/app/version');

class AppVersionService {
  constructor() {
    this.collection = getFirestore().collection('appVersions');
  }

  /**
   * Adds a new app version to the database.
   * @param {object} data - The version data.
   * @returns {Promise<string>} The ID of the new document.
   */
  async addVersion(data) {
    const version = new AppVersion(data);
    const docRef = await this.collection.add(version.toFirestore());
    return docRef.id;
  }

  /**
   * Updates an existing app version.
   * @param {string} id - The document ID of the version to update.
   * @param {object} data - The updated data.
   * @returns {Promise<boolean>} True if the update was successful.
   */
  async updateVersion(id, data) {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
    return true;
  }

  /**
   * Deletes an app version by ID.
   * @param {string} id - The document ID of the version to delete.
   * @returns {Promise<boolean>} True if the deletion was successful.
   */
  async deleteVersion(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  /**
   * Retrieves all app versions from the database.
   * @returns {Promise<Array<AppVersion>>} A list of all versions.
   */
  async getVersions() {
    const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => AppVersion.fromFirestore(doc));
  }

  /**
   * Retrieves the latest app version, which should be used by the app for updates.
   * This method assumes the latest version is the most recently created document.
   * @returns {Promise<AppVersion|null>} The latest version object or null if none is found.
   */
  async getLatestVersion() {
    const snapshot = await this.collection
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
      
    if (snapshot.empty) return null;
    return AppVersion.fromFirestore(snapshot.docs[0]);
  }
}

module.exports = new AppVersionService();