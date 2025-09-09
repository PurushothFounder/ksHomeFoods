// src/controllers/intro/introController.js

const IntroService = require('../../services/banner/introService');

class IntroController {
  // Get active intro content (for app startup) - PUBLIC API
  async getActiveIntro(req, res) {
    try {
      const intro = await IntroService.getActiveIntro();

      if (!intro) {
        return res.status(200).json({
          success: true,
          message: 'No active intro content found',
          data: {
            intro: null,
            hasActiveIntro: false
          }
        });
      }

      // Return the display content for the app
      const displayContent = intro.getDisplayContent();
      
      return res.status(200).json({
        success: true,
        message: 'Active intro content retrieved successfully',
        data: {
          intro: {
            id: intro.id,
            type: intro.type,
            content: displayContent.content,
            updatedDate: displayContent.updatedDate,
            // Include YouTube thumbnail for youtube type
            thumbnail: intro.type === 'youtube' ? intro.getYouTubeThumbnail() : null
          },
          hasActiveIntro: true
        }
      });
    } catch (error) {
      console.error('Error fetching active intro content:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching active intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Get all intro content (admin)
  async getAllIntros(req, res) {
    try {
      const intros = await IntroService.getAllIntros();

      // Enhance intros with additional data for admin panel
      const enhancedIntros = intros.map(intro => ({
        ...intro,
        displayContent: intro.getDisplayContent(),
        thumbnail: intro.type === 'youtube' ? intro.getYouTubeThumbnail() : null
      }));

      return res.status(200).json({
        success: true,
        message: 'Intro content retrieved successfully',
        data: {
          intros: enhancedIntros,
          total: intros.length
        }
      });
    } catch (error) {
      console.error('Error fetching intro content:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Create new intro content
  async createIntro(req, res) {
    try {
      const { type, bannerImageUrl, youtubeUrl, status, updatedDate } = req.body;

      // Validate required fields
      if (!type || !['banner', 'youtube'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type is required and must be either "banner" or "youtube"',
          data: null
        });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status is required and must be either "active" or "inactive"',
          data: null
        });
      }

      if (!updatedDate) {
        return res.status(400).json({
          success: false,
          message: 'Updated date is required',
          data: null
        });
      }

      // Type-specific validation
      if (type === 'banner' && !bannerImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Banner image URL is required for banner type',
          data: null
        });
      }

      if (type === 'youtube' && !youtubeUrl) {
        return res.status(400).json({
          success: false,
          message: 'YouTube URL is required for youtube type',
          data: null
        });
      }

      const result = await IntroService.createIntro({
        type,
        bannerImageUrl,
        youtubeUrl,
        status,
        updatedDate,
        createdBy: req.user.uid
      });

      return res.status(201).json({
        success: true,
        message: result.message,
        data: {
          introId: result.introId
        }
      });
    } catch (error) {
      console.error('Error creating intro content:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error creating intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Update intro content
  async updateIntro(req, res) {
    try {
      const { introId } = req.params;
      const { type, bannerImageUrl, youtubeUrl, status, updatedDate } = req.body;

      if (!type || !['banner', 'youtube'].includes(type)) {
        return res.status(400).json({
          success: false,
          message: 'Type is required and must be either "banner" or "youtube"',
          data: null
        });
      }

      if (!status || !['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Status is required and must be either "active" or "inactive"',
          data: null
        });
      }

      if (!updatedDate) {
        return res.status(400).json({
          success: false,
          message: 'Updated date is required',
          data: null
        });
      }

      // Type-specific validation
      if (type === 'banner' && !bannerImageUrl) {
        return res.status(400).json({
          success: false,
          message: 'Banner image URL is required for banner type',
          data: null
        });
      }

      if (type === 'youtube' && !youtubeUrl) {
        return res.status(400).json({
          success: false,
          message: 'YouTube URL is required for youtube type',
          data: null
        });
      }

      const result = await IntroService.updateIntro(introId, {
        type,
        bannerImageUrl,
        youtubeUrl,
        status,
        updatedDate,
        updatedBy: req.user.uid
      });

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error updating intro content:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Toggle intro status
  async toggleIntroStatus(req, res) {
    try {
      const { introId } = req.params;

      const result = await IntroService.toggleIntroStatus(introId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: {
          status: result.status
        }
      });
    } catch (error) {
      console.error('Error toggling intro status:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error updating intro status',
        error: error.message,
        data: null
      });
    }
  }

  // Delete intro content
  async deleteIntro(req, res) {
    try {
      const { introId } = req.params;

      const result = await IntroService.deleteIntro(introId);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: null
      });
    } catch (error) {
      console.error('Error deleting intro content:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error deleting intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Get intro by ID
  async getIntroById(req, res) {
    try {
      const { introId } = req.params;

      const intro = await IntroService.getIntroById(introId);

      // Enhance with additional data
      const enhancedIntro = {
        ...intro,
        displayContent: intro.getDisplayContent(),
        thumbnail: intro.type === 'youtube' ? intro.getYouTubeThumbnail() : null
      };

      return res.status(200).json({
        success: true,
        message: 'Intro content retrieved successfully',
        data: {
          intro: enhancedIntro
        }
      });
    } catch (error) {
      console.error('Error fetching intro content:', error);
      return res.status(404).json({
        success: false,
        message: error.message || 'Intro content not found',
        error: error.message,
        data: null
      });
    }
  }

  // Get intro content by type
  async getIntrosByType(req, res) {
    try {
      const { type } = req.params;

      const intros = await IntroService.getIntrosByType(type);

      // Enhance intros with additional data
      const enhancedIntros = intros.map(intro => ({
        ...intro,
        displayContent: intro.getDisplayContent(),
        thumbnail: intro.type === 'youtube' ? intro.getYouTubeThumbnail() : null
      }));

      return res.status(200).json({
        success: true,
        message: 'Intro content retrieved successfully',
        data: {
          intros: enhancedIntros,
          total: intros.length,
          type
        }
      });
    } catch (error) {
      console.error('Error fetching intro content by type:', error);
      return res.status(400).json({
        success: false,
        message: error.message || 'Error fetching intro content',
        error: error.message,
        data: null
      });
    }
  }

  // Get intro statistics
  async getIntroStats(req, res) {
    try {
      const stats = await IntroService.getIntroStats();

      return res.status(200).json({
        success: true,
        message: 'Intro statistics retrieved successfully',
        data: {
          stats
        }
      });
    } catch (error) {
      console.error('Error fetching intro statistics:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching intro statistics',
        error: error.message,
        data: null
      });
    }
  }
}

module.exports = new IntroController();