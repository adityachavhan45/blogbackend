const express = require('express');
const router = express.Router();
const Blog = require('../models/Blog');
const authenticateToken = require('../middleware/authMiddleware');
const mongoose = require('mongoose');

// Toggle like on a blog
router.post('/blogs/:id/like', authenticateToken, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user.id;

    // Check if blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user has already liked the blog
    const userLikedIndex = blog.likes.indexOf(userId);
    
    if (userLikedIndex === -1) {
      // User hasn't liked the blog, add like
      blog.likes.push(userId);
    } else {
      // User already liked the blog, remove like
      blog.likes.splice(userLikedIndex, 1);
    }

    await blog.save();
    
    res.status(200).json({ 
      liked: userLikedIndex === -1, // true if like was added, false if removed
      likeCount: blog.likes.length 
    });
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ message: 'Failed to process like' });
  }
});

// Toggle bookmark on a blog
router.post('/blogs/:id/bookmark', authenticateToken, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user.id;

    // Check if blog exists
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    // Check if user has already bookmarked the blog
    const userBookmarkIndex = blog.bookmarks.indexOf(userId);
    
    if (userBookmarkIndex === -1) {
      // User hasn't bookmarked the blog, add bookmark
      blog.bookmarks.push(userId);
    } else {
      // User already bookmarked the blog, remove bookmark
      blog.bookmarks.splice(userBookmarkIndex, 1);
    }

    await blog.save();
    
    res.status(200).json({ 
      bookmarked: userBookmarkIndex === -1, // true if bookmark was added, false if removed
      bookmarkCount: blog.bookmarks.length 
    });
  } catch (error) {
    console.error('Error toggling bookmark:', error);
    res.status(500).json({ message: 'Failed to process bookmark' });
  }
});

// Get user's bookmarked blogs
router.get('/bookmarks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all blogs bookmarked by the user
    const bookmarkedBlogs = await Blog.find({
      bookmarks: userId
    })
    .populate('author', 'name')
    .sort({ createdAt: -1 });
    
    res.status(200).json(bookmarkedBlogs);
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    res.status(500).json({ message: 'Failed to fetch bookmarked blogs' });
  }
});

// Increment view count for a blog
router.post('/blogs/:id/view', async (req, res) => {
  try {
    const blogId = req.params.id;
    
    // Update view count
    const blog = await Blog.findByIdAndUpdate(
      blogId,
      { $inc: { viewCount: 1 } },
      { new: true }
    );
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.status(200).json({ viewCount: blog.viewCount });
  } catch (error) {
    console.error('Error updating view count:', error);
    res.status(500).json({ message: 'Failed to update view count' });
  }
});

// Get user interaction status with a blog (liked, bookmarked)
router.get('/blogs/:id/interaction', authenticateToken, async (req, res) => {
  try {
    const blogId = req.params.id;
    const userId = req.user.id;
    
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    const isLiked = blog.likes.includes(userId);
    const isBookmarked = blog.bookmarks.includes(userId);
    
    res.status(200).json({
      isLiked,
      isBookmarked
    });
  } catch (error) {
    console.error('Error getting interaction status:', error);
    res.status(500).json({ message: 'Failed to get interaction status' });
  }
});

module.exports = router;
