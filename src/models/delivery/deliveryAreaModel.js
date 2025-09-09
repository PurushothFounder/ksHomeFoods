class DeliveryArea {
  constructor(data) {
    this.id = data.id || null;
    this.pincode = data.pincode; // string or number
    this.areaName = data.areaName; // e.g., "Kelambakkam"
    this.city = data.city || '';
    this.state = data.state || 'Tamil Nadu';
    this.status = data.status || 'active'; // 'active' | 'inactive'
    this.deliveryRadius = data.deliveryRadius || 5; // in km
    this.minOrder = data.minOrder || 0;
    this.deliveryFee = data.deliveryFee || 0;
    this.assignedPartners = data.assignedPartners || 0;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = new Date();
  }

  static fromFirestore(doc) {
    const data = doc.data();
    return new DeliveryArea({
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || new Date(),
    });
  }

  toFirestore() {
    return {
      pincode: this.pincode,
      areaName: this.areaName,
      city: this.city,
      state: this.state,
      status: this.status,
      deliveryRadius: this.deliveryRadius,
      minOrder: this.minOrder,
      deliveryFee: this.deliveryFee,
      assignedPartners: this.assignedPartners,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = DeliveryArea;