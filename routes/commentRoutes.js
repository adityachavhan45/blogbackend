const express = require('express');
const router = express.Router();
const Comment = require('../models/Comment');
const Blog = require('../models/Blog');
const authMiddleware = require('../middleware/authMiddleware');

// Get all comments for a specific blog
router.get('/blog/:blogId', async (req, res) => {
  try {
    const comments = await Comment.find({ blog: req.params.blogId })
      .populate('user', 'username')
      .sort({ createdAt: -1 }); // Sort by newest first
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a new comment (requires authentication)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { blogId, content } = req.body;
    
    // Verify blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const comment = new Comment({
      blog: blogId,
      user: req.user.id, // Use the authenticated user's ID
      content
    });
    
    await comment.save();
    
    // Populate user info before sending response
    const populatedComment = await Comment.findById(comment._id).populate('user', 'username');
    
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
