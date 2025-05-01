const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'No token, authorization denied' });
        }

        const token = authHeader.split(' ')[1];

        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Check if user exists (could be admin or regular user)
        if (decoded.userId) {
            // This is a regular user token
            const user = await User.findById(decoded.userId).select('-password');
            if (!user) {
                return res.status(401).json({ success: false, message: 'Token is not valid' });
            }
            
            // Add user to request object
            req.user = user;
            req.isAdmin = false;
        } else if (decoded.id) {
            // This is an admin token
            const admin = await Admin.findById(decoded.id).select('-password');
            if (!admin) {
                return res.status(401).json({ success: false, message: 'Token is not valid' });
            }
            
            // Add admin to request object
            req.admin = admin;
            req.user = admin; // For compatibility with routes that expect req.user
            req.isAdmin = true;
        } else {
            return res.status(401).json({ success: false, message: 'Invalid token format' });
        }
        
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token is not valid', error: err.message });
    }
};

module.exports = authMiddleware;
