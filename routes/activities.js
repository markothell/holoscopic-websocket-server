const express = require('express');
const { v4: uuidv4 } = require('uuid');
const Activity = require('../models/Activity');

module.exports = function(io) {
  const router = express.Router();

// Get all activities (admin endpoint - includes drafts)
router.get('/admin', async (req, res) => {
  try {
    const activities = await Activity.find({})
      .sort({ createdAt: -1 })
      .select('-__v');
    
    // Transform _id to id for frontend compatibility and ensure quadrants exist
    const transformedActivities = activities.map(activity => {
      const activityObj = activity.toObject();
      return {
        ...activityObj,
        id: activity._id.toString(),
        // Ensure isDraft field exists with default false for existing activities
        isDraft: activityObj.isDraft !== undefined ? activityObj.isDraft : false,
        // Ensure quadrants field exists with defaults if missing
        quadrants: activityObj.quadrants || {
          q1: 'Q1 (++)',
          q2: 'Q2 (-+)',
          q3: 'Q3 (--)',
          q4: 'Q4 (+-)'
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        activities: transformedActivities
      }
    });
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
});

// Get all activities (public endpoint - excludes drafts)
router.get('/', async (req, res) => {
  try {
    // Only show non-draft activities to public (treat missing isDraft as false)
    const activities = await Activity.find({ $or: [{ isDraft: { $ne: true } }, { isDraft: { $exists: false } }] })
      .sort({ createdAt: -1 })
      .select('-__v');
    
    // Transform _id to id for frontend compatibility and ensure quadrants exist
    const transformedActivities = activities.map(activity => {
      const activityObj = activity.toObject();
      return {
        ...activityObj,
        id: activity._id.toString(),
        // Ensure isDraft field exists with default false for existing activities
        isDraft: activityObj.isDraft !== undefined ? activityObj.isDraft : false,
        // Ensure quadrants field exists with defaults if missing
        quadrants: activityObj.quadrants || {
          q1: 'Q1 (++)',
          q2: 'Q2 (-+)',
          q3: 'Q3 (--)',
          q4: 'Q4 (+-)'
        }
      };
    });
    
    res.json({
      success: true,
      data: {
        activities: transformedActivities,
        total: transformedActivities.length
      }
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activities'
    });
  }
});

// Get activity by URL name
router.get('/by-url/:urlName', async (req, res) => {
  try {
    const activity = await Activity.findOne({ urlName: req.params.urlName }).select('-__v');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Transform _id to id for frontend compatibility
    const activityObj = activity.toObject();
    const transformedActivity = {
      ...activityObj,
      id: activity._id.toString()
    };
    
    res.json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error fetching activity by URL name:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity'
    });
  }
});

// Get single activity
router.get('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id).select('-__v');
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Transform _id to id for frontend compatibility
    const activityObj = activity.toObject();
    const transformedActivity = {
      ...activityObj,
      id: activity._id.toString()
    };
    
    res.json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch activity'
    });
  }
});

// Create new activity
router.post('/', async (req, res) => {
  try {
    const {
      title,
      urlName,
      mapQuestion,
      mapQuestion2,
      objectNameQuestion,
      xAxis,
      yAxis,
      commentQuestion,
      starterData
    } = req.body;
    
    // Validate required fields
    if (!title || !urlName || !mapQuestion || !commentQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Title, URL name, map question, and comment question are required'
      });
    }
    
    if (!objectNameQuestion) {
      return res.status(400).json({
        success: false,
        error: 'Object name question is required'
      });
    }
    
    if (!xAxis || !xAxis.label || !xAxis.min || !xAxis.max) {
      return res.status(400).json({
        success: false,
        error: 'X-axis configuration is required'
      });
    }
    
    if (!yAxis || !yAxis.label || !yAxis.min || !yAxis.max) {
      return res.status(400).json({
        success: false,
        error: 'Y-axis configuration is required'
      });
    }
    
    // Create new activity
    const activity = new Activity({
      title: title.trim(),
      urlName: urlName.trim(),
      mapQuestion: mapQuestion.trim(),
      mapQuestion2: mapQuestion2 ? mapQuestion2.trim() : '',
      objectNameQuestion: objectNameQuestion ? objectNameQuestion.trim() : 'Name something that represents your perspective',
      xAxis: {
        label: xAxis.label.trim(),
        min: xAxis.min.trim(),
        max: xAxis.max.trim()
      },
      yAxis: {
        label: yAxis.label.trim(),
        min: yAxis.min.trim(),
        max: yAxis.max.trim()
      },
      commentQuestion: commentQuestion.trim(),
      starterData: starterData ? starterData.trim() : '',
      status: 'active',
      participants: [],
      ratings: [],
      comments: []
    });
    
    const savedActivity = await activity.save();
    
    // Transform _id to id for frontend compatibility and ensure quadrants exist
    const activityObj = savedActivity.toObject();
    const transformedActivity = {
      ...activityObj,
      id: savedActivity._id.toString(),
      // Ensure quadrants field exists with defaults if missing
      quadrants: activityObj.quadrants || {
        q1: 'Q1 (++)',
        q2: 'Q2 (-+)',
        q3: 'Q3 (--)',
        q4: 'Q4 (+-)'
      }
    };
    
    res.status(201).json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create activity'
    });
  }
});

// Update activity
router.patch('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Update allowed fields
    const allowedUpdates = ['title', 'urlName', 'mapQuestion', 'mapQuestion2', 'xAxis', 'yAxis', 'commentQuestion', 'quadrants', 'status'];
    const updates = {};
    
    for (const key of allowedUpdates) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }
    
    console.log('Update request body:', req.body);
    console.log('Updates to apply:', updates);
    console.log('Activity before update:', activity.toObject());
    
    // Apply updates
    Object.assign(activity, updates);
    console.log('Activity after Object.assign:', activity.toObject());
    
    // If quadrants were updated, update quadrantName in existing comments
    if (updates.quadrants) {
      activity.comments.forEach(comment => {
        if (comment.quadrant) {
          comment.quadrantName = activity.quadrants[comment.quadrant];
        }
      });
    }
    
    const updatedActivity = await activity.save();
    console.log('Activity after save:', updatedActivity.toObject());
    
    // Transform _id to id for frontend compatibility and ensure quadrants exist
    const activityObj = updatedActivity.toObject();
    const transformedActivity = {
      ...activityObj,
      id: updatedActivity._id.toString(),
      // Ensure quadrants field exists with defaults if missing
      quadrants: activityObj.quadrants || {
        q1: 'Q1 (++)',
        q2: 'Q2 (-+)',
        q3: 'Q3 (--)',
        q4: 'Q4 (+-)'
      }
    };
    
    res.json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update activity'
    });
  }
});

// Delete activity
router.delete('/:id', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    await Activity.findByIdAndDelete(req.params.id);
    
    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete activity'
    });
  }
});

// Toggle draft status
router.patch('/:id/draft', async (req, res) => {
  try {
    const { isDraft } = req.body;
    
    if (typeof isDraft !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'isDraft must be a boolean value'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    activity.isDraft = isDraft;
    const updatedActivity = await activity.save();
    
    // Transform _id to id for frontend compatibility
    const activityObj = updatedActivity.toObject();
    const transformedActivity = {
      ...activityObj,
      id: updatedActivity._id.toString(),
      quadrants: activityObj.quadrants || {
        q1: 'Q1 (++)',
        q2: 'Q2 (-+)',
        q3: 'Q3 (--)',
        q4: 'Q4 (+-)'
      }
    };
    
    res.json({
      success: true,
      data: transformedActivity
    });
  } catch (error) {
    console.error('Error toggling draft status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle draft status'
    });
  }
});

// Add participant to activity
router.post('/:id/participants', async (req, res) => {
  try {
    const { userId, username } = req.body;
    
    if (!userId || !username) {
      return res.status(400).json({
        success: false,
        error: 'User ID and username are required'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    await activity.addParticipant(userId, username);
    
    res.json({
      success: true,
      message: 'Participant added successfully'
    });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add participant'
    });
  }
});

// Submit rating
router.post('/:id/rating', async (req, res) => {
  try {
    const { userId, position, objectName } = req.body;
    
    if (!userId || !position || typeof position.x !== 'number' || typeof position.y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'User ID and valid position are required'
      });
    }
    
    if (position.x < 0 || position.x > 1 || position.y < 0 || position.y > 1) {
      return res.status(400).json({
        success: false,
        error: 'Position coordinates must be between 0 and 1'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    if (activity.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Activity is not active'
      });
    }
    
    // Find participant to get username
    const participant = activity.participants.find(p => p.id === userId);
    if (!participant) {
      return res.status(400).json({
        success: false,
        error: 'User is not a participant in this activity'
      });
    }
    
    const updatedActivity = await activity.addRating(userId, participant.username, position, objectName);
    
    // Return the new rating
    const newRating = updatedActivity.ratings.find(r => r.userId === userId);
    
    // Broadcast to WebSocket clients
    if (io && newRating) {
      io.to(req.params.id).emit('rating_added', {
        rating: newRating
      });
      
      // Also broadcast updated comment if user has one
      const updatedComment = updatedActivity.comments.find(c => c.userId === userId);
      if (updatedComment) {
        io.to(req.params.id).emit('comment_updated', {
          comment: updatedComment
        });
      }
    }
    
    res.json({
      success: true,
      data: newRating
    });
  } catch (error) {
    console.error('Error submitting rating:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit rating'
    });
  }
});

// Submit comment
router.post('/:id/comment', async (req, res) => {
  try {
    const { userId, text } = req.body;
    
    if (!userId || !text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'User ID and comment text are required'
      });
    }
    
    if (text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Comment text cannot be empty'
      });
    }
    
    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Comment must be less than 500 characters'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    if (activity.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Activity is not active'
      });
    }
    
    // Find participant to get username
    const participant = activity.participants.find(p => p.id === userId);
    if (!participant) {
      return res.status(400).json({
        success: false,
        error: 'User is not a participant in this activity'
      });
    }
    
    await activity.addComment(userId, participant.username, text.trim());
    
    // Return the new comment
    const newComment = activity.comments.find(c => c.userId === userId);
    
    // Broadcast to WebSocket clients
    if (io && newComment) {
      io.to(req.params.id).emit('comment_added', {
        comment: newComment
      });
    }
    
    res.json({
      success: true,
      data: newComment
    });
  } catch (error) {
    console.error('Error submitting comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit comment'
    });
  }
});

// Vote on comment
router.post('/:id/comment/:commentId/vote', async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'User ID is required'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    if (activity.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: 'Activity is not active'
      });
    }
    
    // Find participant to get username
    const participant = activity.participants.find(p => p.id === userId);
    if (!participant) {
      return res.status(400).json({
        success: false,
        error: 'User is not a participant in this activity'
      });
    }
    
    await activity.voteComment(req.params.commentId, userId, participant.username);
    
    // Return the updated comment
    const updatedComment = activity.comments.find(c => c.id === req.params.commentId);
    
    // Broadcast to WebSocket clients
    if (io && updatedComment) {
      io.to(req.params.id).emit('comment_voted', {
        comment: updatedComment
      });
    }
    
    res.json({
      success: true,
      data: updatedComment
    });
  } catch (error) {
    console.error('Error voting on comment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to vote on comment'
    });
  }
});

// Submit email
router.post('/:id/email', async (req, res) => {
  try {
    const { email, userId } = req.body;
    
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }
    
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    // Check if email already exists for this activity
    const existingEmail = activity.emails?.find(e => e.email === email.toLowerCase());
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: 'Email already submitted for this activity'
      });
    }
    
    // Initialize emails array if it doesn't exist
    if (!activity.emails) {
      activity.emails = [];
    }
    
    // Add email
    activity.emails.push({
      email: email.toLowerCase().trim(),
      userId: userId || null,
      timestamp: new Date()
    });
    
    await activity.save();
    
    res.json({
      success: true,
      message: 'Email submitted successfully'
    });
  } catch (error) {
    console.error('Error submitting email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit email'
    });
  }
});

// Analytics endpoints

// Get analytics stats for a specific activity
router.get('/:id/analytics', async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    const stats = {
      participants: activity.participants.length,
      completedMappings: activity.ratings.length,
      comments: activity.comments.length,
      emails: (activity.emails || []).length,
      votes: activity.comments.reduce((total, comment) => total + comment.votes.length, 0)
    };
    
    res.json(stats);
  } catch (error) {
    console.error('Error fetching activity analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch analytics'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Activity service is healthy',
    timestamp: new Date().toISOString()
  });
});

  return router;
};