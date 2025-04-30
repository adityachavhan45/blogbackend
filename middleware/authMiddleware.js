const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

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

        // Check if admin exists
        const admin = await Admin.findById(decoded.id).select('-password');
        if (!admin) {
            return res.status(401).json({ success: false, message: 'Token is not valid' });
        }

        // Add admin to request object
        req.admin = admin;
        next();
    } catch (err) {
        res.status(401).json({ success: false, message: 'Token is not valid' });
    }
};

module.exports = authMiddleware;
