const { getFirestore } = require('../../config/firebase');
const DeliveryArea = require('../../models/delivery/deliveryAreaModel');

class DeliveryAreaService {
  constructor() {
    this.collection = getFirestore().collection('deliveryAreas');
  }

  async addArea(data) {
    const area = new DeliveryArea(data);
    const docRef = await this.collection.add(area.toFirestore());
    return docRef.id;
  }

  async updateArea(id, data) {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    });
    return true;
  }

  async deleteArea(id) {
    await this.collection.doc(id).delete();
    return true;
  }

  async getAreas({ status } = {}) {
    let query = this.collection;
    if (status) query = query.where('status', '==', status);
    const snapshot = await query.get();
    return snapshot.docs.map(doc => DeliveryArea.fromFirestore(doc));
  }

  async getAreaByPincode(pincode) {
    const snapshot = await this.collection.where('pincode', '==', pincode).where('status', '==', 'active').limit(1).get();
    if (snapshot.empty) return null;
    return DeliveryArea.fromFirestore(snapshot.docs[0]);
  }
}

module.exports = new DeliveryAreaService();