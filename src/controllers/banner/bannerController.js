const BannerService = require('../../services/banner/bannerServices');

class BannerController {
  // Get all banners (admin)
  async getAllBanners(req, res) {
    try {
      const banners = await BannerService.getAllBanners();

      return res.status(200).json({
        success: true,
        message: 'Banners retrieved successfully',
        data: {
          banners,
          total: banners.length
        }
      });
    } catch (error) {
      console.error('Error fetching banners:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching banners',
        error: error.message,
        data: null
      });
    }
  }

  // Get active banners for public display
  async getActiveBanners(req, res) {
    try {
      const { location } = req.query;
      
      const banners = await BannerService.getActiveBanners(location);

      return res.status(200).json({
        success: true,
        message: 'Active banners retrieved successfully',
        data: {
          banners,
          total: banners.length,
          location: location || 'all'
        }
      });
    } catch (error) {
      console.error('Error fetching active banners:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching active banners',
        error: error.message,
        data: null
      });
    }
  }

  // Get banners by specific location
  async getBannersByLocation(req, res) {
    try {
      const { location } = req.params;

      if (!location) {
        return res.status(400).json({
          success: false,
          message: 'Location parameter is required',
          data: null
        });
      }

      const banners = await BannerService.getBannersByLocation(location);

      return res.status(200).json({
        success: true,
        message: 'Banners retrieved successfully',
        data: {
          banners,
          total: banners.length,
          location
        }
      });
    } catch (error) {
      console.error('Error fetching banners by location:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching banners',
        error: error.message,
        data: null
      });
    }
  }

  // Create new banner
  async createBanner(req, res) {
    try {
      const { bannerTitle, bannerImageUrl, displayLocations, startDate, endDate } = req.body;

      // Validate required fields
      if (!bannerTitle || !bannerImageUrl || !displayLocations || !startDate) {
        return res.status(400).json({
          success: false,
          message: 'Banner title, image URL, display locations, and start date are required',
          data: null
        });
      }

      // Validate displayLocations is an array
      if (!Array.isArray(displayLocations) || displayLocations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Display locations must be a non-empty array',
          data: null
        });
      }

      const result = await BannerService.createBanner({
        bannerTitle,
        bannerImageUrl,
        displayLocations,
        startDate,
        endDate,
        createdBy: req.user.uid
      });

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          bannerId: result.bannerId
        }
      });
    } catch (error) {
      console.error('Error creating banner:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating banner',
        error: error.message,
        data: null
      });
    }
  }

  // Update banner
  async updateBanner(req, res) {
    try {
      const { bannerId } = req.params;
      const { bannerTitle, bannerImageUrl, displayLocations, startDate, endDate } = req.body;

      if (!bannerTitle || !bannerImageUrl || !displayLocations || !startDate) {
        return res.status(400).json({
          success: false,
          message: 'Banner title, image URL, display locations, and start date are required',
          data: null
        });
      }

      // Validate displayLocations is an array
      if (!Array.isArray(displayLocations) || displayLocations.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Display locations must be a non-empty array',
          data: null
        });
      }

      const result = await BannerService.updateBanner(bannerId, {
        bannerTitle,
        bannerImageUrl,
        displayLocations,
        startDate,
        endDate,
        updatedBy: req.user.uid
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error updating banner:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating banner',
        error: error.message,
        data: null
      });
    }
  }

  // Toggle banner status
  async toggleBannerStatus(req, res) {
    try {
      const { bannerId } = req.params;

      const result = await BannerService.toggleBannerStatus(bannerId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          isActive: result.isActive
        }
      });
    } catch (error) {
      console.error('Error toggling banner status:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating banner status',
        error: error.message,
        data: null
      });
    }
  }

  // Delete banner
  async deleteBanner(req, res) {
    try {
      const { bannerId } = req.params;

      const result = await BannerService.deleteBanner(bannerId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error deleting banner:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting banner',
        error: error.message,
        data: null
      });
    }
  }

  // Get banner by ID
  async getBannerById(req, res) {
    try {
      const { bannerId } = req.params;

      const banner = await BannerService.getBannerById(bannerId);

      return res.status(200).json({
        success: true,
        message: 'Banner retrieved successfully',
        data: {
          banner
        }
      });
    } catch (error) {
      console.error('Error fetching banner:', error);
      return res.status(404).json({
        success: false,
        message: error.message || 'Banner not found',
        error: error.message,
        data: null
      });
    }
  }

  // Get expired banners (admin utility)
  async getExpiredBanners(req, res) {
    try {
      const banners = await BannerService.getExpiredBanners();

      return res.status(200).json({
        success: true,
        message: 'Expired banners retrieved successfully',
        data: {
          banners,
          total: banners.length
        }
      });
    } catch (error) {
      console.error('Error fetching expired banners:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching expired banners',
        error: error.message,
        data: null
      });
    }
  }

  // Deactivate expired banners (admin utility)
  async deactivateExpiredBanners(req, res) {
    try {
      const result = await BannerService.deactivateExpiredBanners();

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          deactivatedCount: result.deactivatedCount
        }
      });
    } catch (error) {
      console.error('Error deactivating expired banners:', error);
      return res.status(500).json({
        success: false,
        message: 'Error deactivating expired banners',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new BannerController();