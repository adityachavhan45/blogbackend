const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  blog: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Blog',
    required: true
  },
  timeSpent: {
    type: Number, // Time spent in seconds
    default: 0
  },
  readPercentage: {
    type: Number, // Percentage of the blog read (0-100)
    default: 0
  },
  interactions: {
    liked: { type: Boolean, default: false },
    commented: { type: Boolean, default: false },
    shared: { type: Boolean, default: false }
  },
  visitCount: {
    type: Number,
    default: 1
  },
  lastVisited: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('UserActivity', userActivitySchema);
