const express = require('express');
const router = express.Router();
const AiSummaryService = require('../services/aiSummaryService');
const authenticateToken = require('../middleware/authMiddleware');

// Admin middleware function
const isAdmin = (req, res, next) => {
  if (!req.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Generate AI summary for a blog
router.post('/blogs/:id/summary', authenticateToken, isAdmin, async (req, res) => {
  try {
    const blogId = req.params.id;
    const summary = await AiSummaryService.generateSummary(blogId);
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error generating summary:', error);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
});

// Get AI summary for a blog
router.get('/blogs/:id/summary', async (req, res) => {
  try {
    const blogId = req.params.id;
    const summary = await AiSummaryService.generateSummary(blogId);
    
    res.status(200).json({ summary });
  } catch (error) {
    console.error('Error getting summary:', error);
    res.status(500).json({ message: 'Failed to get summary' });
  }
});

// Get related blogs for a blog
router.get('/blogs/:id/related', async (req, res) => {
  try {
    const blogId = req.params.id;
    const limit = parseInt(req.query.limit) || 3;
    
    const relatedBlogs = await AiSummaryService.generateRelatedBlogs(blogId, limit);
    
    res.status(200).json(relatedBlogs);
  } catch (error) {
    console.error('Error getting related blogs:', error);
    res.status(500).json({ message: 'Failed to get related blogs' });
  }
});

module.exports = router;
