const express = require('express');
const router = express.Router();
const ComposedActivity = require('../models/ComposedActivity');

// Get all activities (public, non-draft only)
router.get('/', async (req, res) => {
  try {
    const activities = await ComposedActivity.find({ status: { $ne: 'draft' } })
      .select('id title urlName description status createdAt')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activities' });
  }
});

// Get all activities including drafts (admin)
router.get('/admin/all', async (req, res) => {
  try {
    const activities = await ComposedActivity.find()
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activities' });
  }
});

// Get single activity by URL name
router.get('/by-url/:urlName', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ urlName: req.params.urlName });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// Get single activity by ID
router.get('/:id', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch activity' });
  }
});

// Create new activity
router.post('/', async (req, res) => {
  try {
    const activityData = req.body;

    // Validate required fields
    if (!activityData.title || !activityData.urlName) {
      return res.status(400).json({
        success: false,
        error: 'Title and URL name are required'
      });
    }

    // Check if URL name already exists
    const existing = await ComposedActivity.findOne({ urlName: activityData.urlName });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'An activity with this URL name already exists'
      });
    }

    const activity = new ComposedActivity(activityData);
    await activity.save();

    res.status(201).json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to create activity' });
  }
});

// Update activity
router.put('/:id', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    // Don't allow editing published activities (must duplicate instead)
    if (activity.status === 'published' && req.body.status !== 'closed') {
      return res.status(400).json({
        success: false,
        error: 'Cannot edit published activities. Please duplicate to create a new version.'
      });
    }

    Object.assign(activity, req.body);
    await activity.save();

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to update activity' });
  }
});

// Publish activity
router.post('/:id/publish', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    await activity.publish();

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error publishing activity:', error);
    res.status(500).json({ success: false, error: 'Failed to publish activity' });
  }
});

// Close activity
router.post('/:id/close', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    await activity.close();

    res.json({
      success: true,
      data: activity
    });
  } catch (error) {
    console.error('Error closing activity:', error);
    res.status(500).json({ success: false, error: 'Failed to close activity' });
  }
});

// Submit response to activity
router.post('/:id/response', async (req, res) => {
  try {
    const { userId, moduleInstanceId, responseData } = req.body;

    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    if (activity.status === 'closed' || activity.status === 'archived') {
      return res.status(400).json({
        success: false,
        error: 'This activity is no longer accepting responses'
      });
    }

    const response = await activity.saveResponse(userId, moduleInstanceId, responseData);

    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error saving response:', error);
    res.status(500).json({ success: false, error: 'Failed to save response' });
  }
});

// Duplicate activity
router.post('/:id/duplicate', async (req, res) => {
  try {
    const original = await ComposedActivity.findOne({ id: req.params.id });

    if (!original) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    const duplicate = new ComposedActivity({
      ...original.toObject(),
      id: require('crypto').randomUUID().substring(0, 8),
      title: `${original.title} (Copy)`,
      urlName: `${original.urlName}-copy-${Date.now()}`,
      status: 'draft',
      responses: [],
      aggregateData: {},
      createdAt: new Date(),
      publishedAt: null,
      closedAt: null
    });

    await duplicate.save();

    res.json({
      success: true,
      data: duplicate
    });
  } catch (error) {
    console.error('Error duplicating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to duplicate activity' });
  }
});

// Delete activity (only drafts)
router.delete('/:id', async (req, res) => {
  try {
    const activity = await ComposedActivity.findOne({ id: req.params.id });

    if (!activity) {
      return res.status(404).json({ success: false, error: 'Activity not found' });
    }

    if (activity.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Only draft activities can be deleted'
      });
    }

    await activity.deleteOne();

    res.json({
      success: true,
      message: 'Activity deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting activity:', error);
    res.status(500).json({ success: false, error: 'Failed to delete activity' });
  }
});

module.exports = router;