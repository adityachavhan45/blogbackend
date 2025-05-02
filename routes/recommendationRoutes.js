const express = require('express');
const router = express.Router();
const RecommendationService = require('../services/recommendationService');
const authenticateToken = require('../middleware/authMiddleware');

// Track user activity on a blog
router.post('/track-activity', authenticateToken, async (req, res) => {
  try {
    const { blogId, timeSpent, readPercentage, liked, commented, shared } = req.body;
    const userId = req.user.id;

    const activityData = {
      userId,
      blogId,
      timeSpent,
      readPercentage,
      liked,
      commented,
      shared
    };

    await RecommendationService.trackActivity(activityData);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({ message: 'Failed to track activity' });
  }
});

// Get personalized recommendations for the current user
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 5;
    
    const recommendations = await RecommendationService.getPersonalizedRecommendations(userId, limit);
    res.status(200).json(recommendations);
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({ message: 'Failed to get recommendations' });
  }
});

// Get trending blogs (available without authentication)
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const trendingBlogs = await RecommendationService.getTrendingBlogs(limit);
    res.status(200).json(trendingBlogs);
  } catch (error) {
    console.error('Error getting trending blogs:', error);
    res.status(500).json({ message: 'Failed to get trending blogs' });
  }
});

module.exports = router;
