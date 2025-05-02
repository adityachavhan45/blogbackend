const Blog = require('../models/Blog');

/**
 * Service for generating AI summaries of blog content
 */
class AiSummaryService {
  /**
   * Generate a summary for a blog post using AI
   * @param {String} blogId - The ID of the blog to summarize
   * @returns {Promise<String>} - The generated summary
   */
  static async generateSummary(blogId) {
    try {
      // Fetch the blog post
      const blog = await Blog.findById(blogId);
      if (!blog) {
        throw new Error('Blog not found');
      }

      // If the blog already has a summary, return it
      if (blog.aiSummary) {
        return blog.aiSummary;
      }

      // Extract the main content from the blog
      // This assumes the content is in HTML format from a rich text editor
      const content = this.stripHtml(blog.content);
      
      // Generate a summary using a simple algorithm
      // In a production environment, you would use a proper NLP API like OpenAI's API
      const summary = this.createSimpleSummary(content, blog.title);
      
      // Save the summary to the blog
      blog.aiSummary = summary;
      await blog.save();
      
      return summary;
    } catch (error) {
      console.error('Error generating AI summary:', error);
      throw error;
    }
  }

  /**
   * Strip HTML tags from content
   * @param {String} html - HTML content
   * @returns {String} - Plain text content
   */
  static stripHtml(html) {
    // Simple regex to remove HTML tags
    return html.replace(/<[^>]*>?/gm, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Create a simple summary from text
   * @param {String} text - The text to summarize
   * @param {String} title - The blog title
   * @returns {String} - A simple summary
   */
  static createSimpleSummary(text, title) {
    // Split the content into sentences
    const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [];
    
    if (sentences.length === 0) {
      return `This is a blog post titled "${title}".`;
    }
    
    // For a simple summary, take the first 3-5 sentences
    const summaryLength = Math.min(sentences.length, Math.max(3, Math.ceil(sentences.length * 0.1)));
    let summary = sentences.slice(0, summaryLength).join(' ');
    
    // Ensure the summary isn't too long (max ~200 words)
    const words = summary.split(' ');
    if (words.length > 200) {
      summary = words.slice(0, 200).join(' ') + '...';
    }
    
    return summary;
  }

  /**
   * Generate related blog recommendations based on content similarity
   * @param {String} blogId - The ID of the blog to find related content for
   * @param {Number} limit - Maximum number of related blogs to return
   * @returns {Promise<Array>} - Array of related blog posts
   */
  static async generateRelatedBlogs(blogId, limit = 3) {
    try {
      // Fetch the source blog
      const blog = await Blog.findById(blogId);
      if (!blog) {
        throw new Error('Blog not found');
      }
      
      // If the blog already has related blogs, return them
      if (blog.relatedBlogs && blog.relatedBlogs.length >= limit) {
        return Blog.find({
          _id: { $in: blog.relatedBlogs }
        }).populate('author', 'name');
      }
      
      // Find blogs with the same category and tags
      const relatedBlogs = await Blog.find({
        _id: { $ne: blogId },
        $or: [
          { category: blog.category },
          { tags: { $in: blog.tags } }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'name');
      
      // Save the related blogs to the source blog
      blog.relatedBlogs = relatedBlogs.map(related => related._id);
      await blog.save();
      
      return relatedBlogs;
    } catch (error) {
      console.error('Error generating related blogs:', error);
      throw error;
    }
  }
}

module.exports = AiSummaryService;
