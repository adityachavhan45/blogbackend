const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const adminRoutes = require('./routes/adminRoutes');
const userRoutes = require('./routes/userRoutes');
const blogRoutes = require('./routes/blogRoutes');
const commentRoutes = require('./routes/commentRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');
const interactionRoutes = require('./routes/interactionRoutes');
const aiRoutes = require('./routes/aiRoutes');
const sitemapRoutes = require('./routes/sitemapRoutes');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const emailExistence = require('email-existence');
const { generateSitemap } = require('./services/sitemapService');
require('dotenv').config();

const app = express();
const User = require('./models/User');

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB (you'll need to provide the URL)
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log(err));

// Register endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      username,
      email,
      password: hashedPassword
    });

    await user.save();

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Email verification endpoint
app.post('/api/verify-email', (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }
  
  // Verify email existence
  emailExistence.check(email, (error, response) => {
    if (error) {
      return res.status(500).json({ success: false, message: 'Error checking email', error: error.message });
    }
    
    // response is a boolean (true/false) indicating if the email exists
    res.json({ success: true, exists: response });
  });
});

// Routes
app.use('/api/admin', adminRoutes);
app.use('/api/users', userRoutes);
app.use('/api/blogs', blogRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/interactions', interactionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/', sitemapRoutes);

// Sitemap generation route (protected with a simple API key for security)
app.get('/api/generate-sitemap', async (req, res) => {
  const apiKey = req.query.key;
  
  // Simple API key check - in production, use a more secure approach
  if (apiKey !== process.env.SITEMAP_API_KEY && apiKey !== 'likhoverse-sitemap-key') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  try {
    const result = await generateSitemap();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Generate sitemap on server startup
  try {
    await generateSitemap();
    console.log('Initial sitemap generated successfully');
  } catch (error) {
    console.error('Error generating initial sitemap:', error);
  }
});
