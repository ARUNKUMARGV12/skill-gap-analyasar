const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  resume: {
    text: String,
    fileName: String,
    uploadedAt: Date
  },
  selectedJobRole: {
    roleId: mongoose.Schema.Types.ObjectId,
    roleName: String,
    selectedAt: Date
  },
  skillGapAnalysis: {
    gaps: [{
      skill: String,
      currentLevel: String,
      requiredLevel: String,
      priority: String,
      description: String
    }],
    summary: String,
    jobRoleId: mongoose.Schema.Types.ObjectId,
    analyzedAt: Date
  },
  roadmap: {
    steps: [{
      skill: String,
      resources: [String],
      estimatedTime: String,
      description: String,
      status: {
        type: String,
        enum: ['not_started', 'in_progress', 'completed'],
        default: 'not_started'
      },
      completedAt: Date,
      quiz: {
        questions: [{
          question: String,
          options: {
            A: String,
            B: String,
            C: String,
            D: String
          },
          correctAnswer: String,
          explanation: String,
          userAnswer: String,
          isCorrect: Boolean
        }],
        generatedAt: Date,
        passed: Boolean,
        passedAt: Date
      },
      youtubePlaylists: [{
        title: String,
        channel: String,
        url: String,
        description: String,
        videoCount: String,
        duration: String
      }]
    }],
    createdAt: Date
  },
  progress: {
    overallCompletion: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    skillsCompleted: {
      type: Number,
      default: 0
    },
    totalSkills: {
      type: Number,
      default: 0
    },
    jobAccessibility: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    lastUpdated: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

