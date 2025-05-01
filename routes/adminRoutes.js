const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Blog = require('../models/Blog');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');

// Configure multer for image upload
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, 'uploads/blog-images/');
  },
  filename: function(req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function(req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});
const authMiddleware = require('../middleware/authMiddleware');

// Create Admin (keep this route secure or remove after creating first admin)
router.post('/create', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists with this email' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new admin
        const admin = new Admin({
            username,
            email,
            password: hashedPassword
        });

        await admin.save();

        res.status(201).json({
            success: true,
            message: 'Admin created successfully',
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get all admins (protected route)
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const admins = await Admin.find().select('-password');
        res.json({ success: true, admins });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching admins', error: error.message });
    }
});

// Add new admin (protected route)
router.post('/add', authMiddleware, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if admin already exists
        const existingAdmin = await Admin.findOne({ $or: [{ email }, { username }] });
        if (existingAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Admin with this email or username already exists' 
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const admin = new Admin({
            username,
            email,
            password: hashedPassword
        });

        await admin.save();

        res.status(201).json({ 
            success: true, 
            message: 'Admin created successfully',
            admin: { id: admin._id, username: admin.username, email: admin.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating admin', error: error.message });
    }
});

// Update admin details (protected route)
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { username, email } = req.body;
        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            { username, email },
            { new: true }
        ).select('-password');
        
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        
        res.json({ success: true, message: 'Admin updated successfully', admin });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating admin', error: error.message });
    }
});

// Change admin password (protected route)
router.put('/:id/password', authMiddleware, async (req, res) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ 
                success: false, 
                message: 'Password must be at least 6 characters long' 
            });
        }

        // Hash the new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const admin = await Admin.findByIdAndUpdate(
            req.params.id,
            { password: hashedPassword },
            { new: true }
        ).select('-password');

        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }

        res.json({ success: true, message: 'Password updated successfully', admin });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating password', error: error.message });
    }
});

// Delete admin (protected route)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.admin.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
        }

        const admin = await Admin.findByIdAndDelete(req.params.id);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Admin not found' });
        }
        res.json({ success: true, message: 'Admin deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting admin', error: error.message });
    }
});

// Admin Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find admin by email
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = jwt.sign(
            { id: admin._id, email: admin.email },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            token,
            admin: {
                id: admin._id,
                username: admin.username,
                email: admin.email
            }
        });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Protected route example - Get admin profile
router.get('/profile', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        admin: {
            id: req.admin._id,
            username: req.admin.username,
            email: req.admin.email
        }
    });
});

// Blog Routes
router.post('/blogs', authMiddleware, upload.single('coverImage'), async (req, res) => {
  try {
    const { title, excerpt, content, category, readTime, tags } = req.body;
    const blog = new Blog({
      title,
      excerpt,
      content,
      category,
      readTime,
      author: req.admin.id,
      tags: tags ? JSON.parse(tags) : [],
      coverImage: req.file ? `/uploads/blog-images/${req.file.filename}` : null
    });
    await blog.save();
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/blogs', authMiddleware, async (req, res) => {
  try {
    const blogs = await Blog.find().populate('author', 'username email');
    res.json(blogs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get a single blog by ID
router.get('/blogs/:id', authMiddleware, async (req, res) => {
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

router.put('/blogs/:id', authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    if (blog.author.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    Object.assign(blog, req.body);
    await blog.save();
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/blogs/:id', authMiddleware, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    if (blog.author.toString() !== req.admin.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await Blog.deleteOne({ _id: blog._id });
    res.json({ message: 'Blog deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
