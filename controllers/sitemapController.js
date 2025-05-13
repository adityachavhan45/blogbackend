const Blog = require('../models/Blog');
const { SitemapStream, streamToPromise } = require('sitemap');
const { createGzip } = require('zlib');
const fs = require('fs');
const path = require('path');

// Cache the sitemap for better performance
let sitemap;

/**
 * Generate a dynamic sitemap including all blog posts and static pages
 */
exports.generateSitemap = async (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.header('Content-Encoding', 'gzip');
  
  // If we have a cached sitemap and it's less than 1 hour old, serve that
  if (sitemap && (Date.now() - sitemap.lastModified) < 3600000) {
    res.send(sitemap.xml);
    return;
  }
  
  try {
    const smStream = new SitemapStream({ hostname: 'https://likhoverse.in' });
    const pipeline = smStream.pipe(createGzip());
    
    // Add static pages
    smStream.write({ url: '/', changefreq: 'daily', priority: 1.0 });
    smStream.write({ url: '/blogs', changefreq: 'daily', priority: 0.9 });
    smStream.write({ url: '/about', changefreq: 'monthly', priority: 0.7 });
    smStream.write({ url: '/contact', changefreq: 'monthly', priority: 0.7 });
    
    // Add all published blog posts
    const blogs = await Blog.find({ published: true }).sort({ updatedAt: -1 });
    
    blogs.forEach(blog => {
      smStream.write({
        url: `/blogs/${blog._id}`,
        changefreq: 'weekly',
        priority: 0.8,
        lastmod: blog.updatedAt.toISOString()
      });
    });
    
    // Mark the end of the stream
    smStream.end();
    
    // Cache the result
    const buffer = await streamToPromise(pipeline);
    sitemap = {
      xml: buffer,
      lastModified: Date.now()
    };
    
    // Write sitemap to public directory for static serving
    const publicPath = path.join(__dirname, '../../frontend/public/sitemap.xml');
    fs.writeFile(publicPath, buffer, (err) => {
      if (err) console.error('Error writing sitemap to disk:', err);
    });
    
    res.send(buffer);
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).end();
  }
};
