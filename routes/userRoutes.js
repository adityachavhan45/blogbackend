const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Get all users (protected route, only for admins)
router.get('/all', authMiddleware, async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
    }
});

// Add user (protected route, only for admins)
router.post('/add', authMiddleware, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email or username already exists' 
            });
        }

        const user = new User({ username, email, password });
        await user.save();

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully',
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error creating user', error: error.message });
    }
});

// Delete user (protected route, only for admins)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error deleting user', error: error.message });
    }
});

// Update user (protected route, only for admins)
// Change password
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

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { password: hashedPassword },
            { new: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'Password updated successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating password', error: error.message });
    }
});

// Update user details
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { username, email, status } = req.body;
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { username, email, status },
            { new: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        res.json({ success: true, message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error updating user', error: error.message });
    }
});

module.exports = router;
