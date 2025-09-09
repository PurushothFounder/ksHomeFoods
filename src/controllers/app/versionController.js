const AppVersionService = require('../../services/app/versionService');

class AppVersionController {
  /**
   * @route GET /api/app-version/latest
   * @desc Get the latest version details
   * @access Public
   */
  async getLatestVersion(req, res) {
    try {
      const version = await AppVersionService.getLatestVersion();
      if (!version) {
        return res.status(404).json({ success: false, message: 'Version information not found' });
      }
      res.json({ success: true, data: { version } });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  /**
   * @route POST /api/app-version
   * @desc Add a new app version
   * @access Admin
   */
  async addVersion(req, res) {
    try {
      const id = await AppVersionService.addVersion(req.body);
      res.status(201).json({ success: true, message: 'App version added', id });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  /**
   * @route PUT /api/app-version/:id
   * @desc Update an existing app version
   * @access Admin
   */
  async updateVersion(req, res) {
    try {
      await AppVersionService.updateVersion(req.params.id, req.body);
      res.json({ success: true, message: 'App version updated' });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  /**
   * @route DELETE /api/app-version/:id
   * @desc Delete an app version
   * @access Admin
   */
  async deleteVersion(req, res) {
    try {
      await AppVersionService.deleteVersion(req.params.id);
      res.json({ success: true, message: 'App version deleted' });
    } catch (e) {
      res.status(400).json({ success: false, message: e.message });
    }
  }

  /**
   * @route GET /api/app-version
   * @desc Get all app versions
   * @access Admin
   */
  async getVersions(req, res) {
    try {
      const versions = await AppVersionService.getVersions();
      res.json({ success: true, data: { versions } });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }
}

module.exports = new AppVersionController();