const fs = require('fs');
const path = require('path');
const Blog = require('../models/Blog');

/**
 * Generate a sitemap XML file with all blog posts and static pages
 * This helps search engines discover and index your content faster
 */
async function generateSitemap() {
  try {
    console.log('Generating sitemap...');
    
    // Get all published blogs
    const blogs = await Blog.find().sort({ createdAt: -1 });
    
    // Frontend URL from environment variable or default
    const frontendUrl = process.env.FRONTEND_URL || 'https://likhoverse.in';
    
    // Start XML content
    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add static pages
    const staticPages = [
      { url: '/', priority: '1.0', changefreq: 'daily' },
      { url: '/blogs', priority: '0.9', changefreq: 'daily' },
      { url: '/about', priority: '0.7', changefreq: 'monthly' },
      { url: '/contact', priority: '0.7', changefreq: 'monthly' },
      { url: '/privacy-policy', priority: '0.5', changefreq: 'yearly' },
      { url: '/terms-of-service', priority: '0.5', changefreq: 'yearly' }
    ];
    
    staticPages.forEach(page => {
      sitemap += '  <url>\n';
      sitemap += `    <loc>${frontendUrl}${page.url}</loc>\n`;
      sitemap += `    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
      sitemap += `    <changefreq>${page.changefreq}</changefreq>\n`;
      sitemap += `    <priority>${page.priority}</priority>\n`;
      sitemap += '  </url>\n';
    });
    
    // Add blog posts
    blogs.forEach(blog => {
      // Create URL-friendly slug from title
      const slug = blog.title
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      
      sitemap += '  <url>\n';
      sitemap += `    <loc>${frontendUrl}/blogs/${blog._id}</loc>\n`;
      sitemap += `    <lastmod>${blog.updatedAt.toISOString().split('T')[0]}</lastmod>\n`;
      sitemap += '    <changefreq>weekly</changefreq>\n';
      sitemap += '    <priority>0.8</priority>\n';
      sitemap += '  </url>\n';
    });
    
    // Close XML
    sitemap += '</urlset>';
    
    // Write to public directory in frontend
    const sitemapPath = path.join(__dirname, '../../frontend/public/sitemap.xml');
    fs.writeFileSync(sitemapPath, sitemap);
    
    console.log(`Sitemap generated successfully at ${sitemapPath}`);
    return { success: true, message: 'Sitemap generated successfully' };
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { generateSitemap };
