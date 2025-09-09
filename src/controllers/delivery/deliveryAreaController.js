const DeliveryAreaService = require('../../services/delivery/deliveryAreaService');

class DeliveryAreaController {
  async addArea(req, res) {
    try {
      const id = await DeliveryAreaService.addArea(req.body);
      res.status(201).json({ success: true, message: 'Area added', id });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async updateArea(req, res) {
    try {
      await DeliveryAreaService.updateArea(req.params.id, req.body);
      res.json({ success: true, message: 'Area updated' });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async deleteArea(req, res) {
    try {
      await DeliveryAreaService.deleteArea(req.params.id);
      res.json({ success: true, message: 'Area deleted' });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async getAreas(req, res) {
    try {
      const areas = await DeliveryAreaService.getAreas({ status: req.query.status });
      res.json({ success: true, data: areas });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  async getAreaByPincode(req, res) {
    try {
      const area = await DeliveryAreaService.getAreaByPincode(req.params.pincode);
      res.json({ success: true, data: area });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }
}

module.exports = new DeliveryAreaController();