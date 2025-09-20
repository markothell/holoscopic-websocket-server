const mongoose = require('mongoose');

const ComposedActivitySchema = new mongoose.Schema({
  id: {
    type: String,
    unique: true,
    default: function() {
      return require('crypto').randomUUID().substring(0, 8);
    }
  },

  title: {
    type: String,
    required: true,
    trim: true
  },

  urlName: {
    type: String,
    required: true,
    unique: true,
    match: /^[a-z0-9-]+$/
  },

  description: {
    type: String,
    maxlength: 500
  },

  schemaVersion: {
    type: String,
    default: '1.0.0'
  },

  // Array of modules that compose this activity
  modules: [{
    instanceId: {
      type: String,
      required: true
    },
    moduleId: {
      type: String,
      required: true
    },
    moduleVersion: {
      type: String,
      required: true
    },
    position: {
      type: Number,
      required: true
    },
    config: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Frozen module code at publish time
    moduleCode: {
      type: String,
      required: true
    }
  }],

  globalSettings: {
    theme: {
      type: String,
      default: 'default'
    },
    allowAnonymous: {
      type: Boolean,
      default: true
    },
    requireAllSteps: {
      type: Boolean,
      default: false
    },
    showProgress: {
      type: Boolean,
      default: true
    },
    customCSS: {
      type: String,
      default: ''
    }
  },

  status: {
    type: String,
    enum: ['draft', 'published', 'closed', 'archived'],
    default: 'draft'
  },

  publishedAt: Date,
  closedAt: Date,

  // Store responses in a flexible format
  responses: [{
    responseId: {
      type: String,
      default: function() {
        return require('crypto').randomUUID();
      }
    },
    userId: String,
    username: String,
    sessionId: String,

    // Module responses stored as key-value pairs
    // Key is the module instanceId, value is the response data
    moduleResponses: {
      type: Map,
      of: mongoose.Schema.Types.Mixed
    },

    submittedAt: {
      type: Date,
      default: Date.now
    },

    // Track completion
    completedModules: [String],
    isComplete: {
      type: Boolean,
      default: false
    }
  }],

  // Aggregate data for results display
  aggregateData: {
    // Store mapping positions for grid display
    mappings: {
      type: Map,
      of: [{
        userId: String,
        username: String,
        x: Number,
        y: Number,
        label: String,
        timestamp: Date
      }]
    },

    // Store other aggregated data
    statistics: mongoose.Schema.Types.Mixed
  },

  // Track template origin if created from template
  templateId: String,

  createdBy: String,

}, {
  timestamps: true
});

// Indexes
ComposedActivitySchema.index({ status: 1, createdAt: -1 });
ComposedActivitySchema.index({ urlName: 1 });
ComposedActivitySchema.index({ 'responses.userId': 1 });

// Method to add or update a response
ComposedActivitySchema.methods.saveResponse = async function(userId, moduleInstanceId, responseData) {
  try {
    let response = this.responses.find(r => r.userId === userId);

    if (!response) {
      response = {
        userId,
        username: responseData.username || `User_${userId.slice(-6)}`,
        moduleResponses: new Map(),
        completedModules: []
      };
      this.responses.push(response);
    }

    // Update the specific module response
    response.moduleResponses.set(moduleInstanceId, responseData);

    // Track completed modules
    if (!response.completedModules.includes(moduleInstanceId)) {
      response.completedModules.push(moduleInstanceId);
    }

    // Check if all required modules are complete
    const requiredModules = this.modules.filter(m =>
      m.config.required !== false
    ).map(m => m.instanceId);

    response.isComplete = requiredModules.every(modId =>
      response.completedModules.includes(modId)
    );

    // Update aggregate data if this is a mapping module
    if (responseData.x !== undefined && responseData.y !== undefined) {
      const layer = responseData.layer || 'primary';

      if (!this.aggregateData.mappings) {
        this.aggregateData.mappings = new Map();
      }

      let layerMappings = this.aggregateData.mappings.get(layer) || [];

      // Remove existing mapping for this user
      layerMappings = layerMappings.filter(m => m.userId !== userId);

      // Add new mapping
      layerMappings.push({
        userId,
        username: response.username,
        x: responseData.x,
        y: responseData.y,
        label: responseData.label || response.username,
        timestamp: new Date()
      });

      this.aggregateData.mappings.set(layer, layerMappings);
    }

    await this.save();
    return response;

  } catch (error) {
    console.error('Error saving response:', error);
    throw error;
  }
};

// Method to publish the activity (freeze the current module code)
ComposedActivitySchema.methods.publish = async function() {
  if (this.status === 'published') {
    throw new Error('Activity is already published');
  }

  this.status = 'published';
  this.publishedAt = new Date();

  // Note: Module code should already be frozen when modules are added
  // This ensures the activity always runs with the same code

  await this.save();
};

// Method to close the activity
ComposedActivitySchema.methods.close = async function() {
  this.status = 'closed';
  this.closedAt = new Date();
  await this.save();
};

// Static method to create from template
ComposedActivitySchema.statics.createFromTemplate = async function(template, overrides = {}) {
  const activity = new this({
    ...template,
    ...overrides,
    id: require('crypto').randomUUID().substring(0, 8),
    status: 'draft',
    responses: [],
    aggregateData: {}
  });

  return activity;
};

module.exports = mongoose.model('ComposedActivity', ComposedActivitySchema);