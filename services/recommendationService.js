const UserActivity = require('../models/UserActivity');
const Blog = require('../models/Blog');

/**
 * Recommendation service that uses user activity data to generate personalized blog recommendations
 */
class RecommendationService {
  /**
   * Track user activity on a blog post
   * @param {Object} activityData - User activity data
   * @returns {Promise} - The saved activity
   */
  static async trackActivity(activityData) {
    try {
      // Check if activity record exists
      let activity = await UserActivity.findOne({
        user: activityData.userId,
        blog: activityData.blogId
      });

      if (activity) {
        // Update existing activity
        activity.timeSpent += activityData.timeSpent || 0;
        activity.readPercentage = Math.max(activity.readPercentage, activityData.readPercentage || 0);
        activity.visitCount += 1;
        activity.lastVisited = new Date();
        
        // Update interaction flags if they occurred
        if (activityData.commented) activity.interactions.commented = true;
        if (activityData.liked) activity.interactions.liked = true;
        if (activityData.shared) activity.interactions.shared = true;
        
        return await activity.save();
      } else {
        // Create new activity record
        const newActivity = new UserActivity({
          user: activityData.userId,
          blog: activityData.blogId,
          timeSpent: activityData.timeSpent || 0,
          readPercentage: activityData.readPercentage || 0,
          interactions: {
            liked: activityData.liked || false,
            commented: activityData.commented || false,
            shared: activityData.shared || false
          }
        });
        
        return await newActivity.save();
      }
    } catch (error) {
      console.error('Error tracking user activity:', error);
      throw error;
    }
  }

  /**
   * Generate personalized recommendations for a user
   * @param {String} userId - The user ID
   * @param {Number} limit - Maximum number of recommendations to return
   * @returns {Promise<Array>} - Array of recommended blog posts
   */
  static async getPersonalizedRecommendations(userId, limit = 5) {
    try {
      // Get user's reading history
      const userActivities = await UserActivity.find({ user: userId })
        .sort({ lastVisited: -1 })
        .populate('blog', 'category tags');
      
      if (!userActivities.length) {
        // If no history, return trending blogs
        return this.getTrendingBlogs(limit);
      }
      
      // Extract categories and tags the user has shown interest in
      const userInterests = this.extractUserInterests(userActivities);
      
      // Find blogs with matching interests that user hasn't read yet
      const readBlogIds = userActivities.map(activity => activity.blog._id);
      
      // Find recommendations based on categories and tags
      const recommendations = await Blog.find({
        _id: { $nin: readBlogIds },
        $or: [
          { category: { $in: userInterests.categories } },
          { tags: { $in: userInterests.tags } }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('author', 'name');
      
      // If we don't have enough recommendations, add some trending blogs
      if (recommendations.length < limit) {
        const additionalCount = limit - recommendations.length;
        const trendingBlogs = await this.getTrendingBlogs(additionalCount, readBlogIds);
        return [...recommendations, ...trendingBlogs];
      }
      
      return recommendations;
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }

  /**
   * Extract user interests from their activity history
   * @param {Array} activities - User activity records
   * @returns {Object} - Object containing categories and tags of interest
   */
  static extractUserInterests(activities) {
    const categories = new Map();
    const tags = new Map();
    
    activities.forEach(activity => {
      // Weight by engagement level (read percentage + interactions)
      const engagementScore = activity.readPercentage / 100 + 
        (activity.interactions.liked ? 0.3 : 0) + 
        (activity.interactions.commented ? 0.5 : 0) + 
        (activity.interactions.shared ? 0.7 : 0);
      
      // Add category weight
      const category = activity.blog.category;
      categories.set(category, (categories.get(category) || 0) + engagementScore);
      
      // Add tag weights
      if (activity.blog.tags && activity.blog.tags.length) {
        activity.blog.tags.forEach(tag => {
          tags.set(tag, (tags.get(tag) || 0) + engagementScore);
        });
      }
    });
    
    // Sort by weight and take top interests
    const topCategories = [...categories.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0]);
      
    const topTags = [...tags.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(entry => entry[0]);
    
    return {
      categories: topCategories,
      tags: topTags
    };
  }

  /**
   * Get trending blogs based on user activity
   * @param {Number} limit - Maximum number of blogs to return
   * @param {Array} excludeIds - Blog IDs to exclude
   * @returns {Promise<Array>} - Array of trending blog posts
   */
  static async getTrendingBlogs(limit = 5, excludeIds = []) {
    try {
      // Aggregate user activity to find trending blogs
      const trendingBlogIds = await UserActivity.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
          }
        },
        {
          $group: {
            _id: '$blog',
            totalVisits: { $sum: '$visitCount' },
            avgReadPercentage: { $avg: '$readPercentage' },
            commentCount: { $sum: { $cond: [{ $eq: ['$interactions.commented', true] }, 1, 0] } },
            likeCount: { $sum: { $cond: [{ $eq: ['$interactions.liked', true] }, 1, 0] } },
            shareCount: { $sum: { $cond: [{ $eq: ['$interactions.shared', true] }, 1, 0] } }
          }
        },
        {
          $addFields: {
            engagementScore: {
              $add: [
                { $multiply: ['$totalVisits', 1] },
                { $multiply: ['$avgReadPercentage', 0.5] },
                { $multiply: ['$commentCount', 5] },
                { $multiply: ['$likeCount', 3] },
                { $multiply: ['$shareCount', 4] }
              ]
            }
          }
        },
        { $sort: { engagementScore: -1 } },
        { $limit: limit * 2 } // Get more than needed to account for excluded IDs
      ]);
      
      // Convert ObjectIds to strings for comparison
      const excludeIdsStr = excludeIds.map(id => id.toString());
      const filteredTrendingIds = trendingBlogIds
        .filter(item => !excludeIdsStr.includes(item._id.toString()))
        .slice(0, limit)
        .map(item => item._id);
      
      // If we don't have enough trending blogs, get the most recent ones
      if (filteredTrendingIds.length < limit) {
        return Blog.find({
          _id: { $nin: excludeIds }
        })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('author', 'name');
      }
      
      // Get the full blog documents for the trending IDs
      return Blog.find({
        _id: { $in: filteredTrendingIds }
      })
      .populate('author', 'name');
    } catch (error) {
      console.error('Error getting trending blogs:', error);
      // Fallback to recent blogs if there's an error
      return Blog.find()
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('author', 'name');
    }
  }
}

module.exports = RecommendationService;
