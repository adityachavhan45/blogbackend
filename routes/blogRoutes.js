const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');

// Search blogs - must be defined before the :id route to avoid conflicts
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const searchRegex = new RegExp(q, 'i');
    const blogs = await Blog.find({
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { summary: searchRegex },
        { tags: searchRegex }
      ]
    })
    .populate('author', 'username email')
    .sort({ createdAt: -1 });
    
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all blogs
router.get('/', async (req, res) => {
  try {
    const blogs = await Blog.find()
      .populate('author', 'username email')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id).populate('author', 'username email');
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
