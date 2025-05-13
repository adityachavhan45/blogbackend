const express = require('express');
const router = express.Router();
const sitemapController = require('../controllers/sitemapController');

// Route to generate and serve the sitemap
router.get('/sitemap.xml', sitemapController.generateSitemap);

module.exports = router;
