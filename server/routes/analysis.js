const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const JobRole = require('../models/JobRole');
const { analyzeSkillGaps } = require('../services/geminiService');
const router = express.Router();

// Analyze skill gaps
router.post('/', auth, async (req, res) => {
  try {
    const { jobRoleId, customJobRole } = req.body;
    
    const user = await User.findById(req.user._id);
    if (!user.resume || !user.resume.text) {
      return res.status(400).json({ message: 'Please upload your resume first' });
    }

    let jobRole;
    
    // Handle custom job role
    if (customJobRole) {
      if (!customJobRole.title || !customJobRole.description) {
        return res.status(400).json({ message: 'Custom job role must include title and description' });
      }
      
      // Create job role object from custom input
      jobRole = {
        title: customJobRole.title,
        description: customJobRole.description,
        requiredSkills: customJobRole.requiredSkills || []
      };
    } else {
      // Handle predefined job role
      if (!jobRoleId) {
        return res.status(400).json({ message: 'Please select a job role or provide custom job role' });
      }

      jobRole = await JobRole.findById(jobRoleId);
      if (!jobRole) {
        return res.status(404).json({ message: 'Job role not found' });
      }
    }

    // Analyze skill gaps using Gemini API
    const analysis = await analyzeSkillGaps(user.resume.text, jobRole);

    // Update user's skill gap analysis
    const analyzedAt = new Date();
    user.skillGapAnalysis = {
      gaps: analysis.gaps,
      summary: analysis.summary,
      jobRoleId: customJobRole ? null : jobRoleId,
      analyzedAt
    };
    user.selectedJobRole = {
      roleId: customJobRole ? null : jobRoleId,
      roleName: jobRole.title,
      selectedAt: new Date()
    };

    // Initialize progress
    user.progress = {
      overallCompletion: 0,
      skillsCompleted: 0,
      totalSkills: analysis.gaps.length,
      jobAccessibility: 0,
      lastUpdated: new Date()
    };

    await user.save();

    res.json({
      gaps: analysis.gaps,
      summary: analysis.summary,
      analyzedAt,
      jobRole: {
        id: customJobRole ? null : jobRole._id,
        title: jobRole.title,
        description: jobRole.description
      }
    });
  } catch (error) {
    console.error('Analysis error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
      stack: error.stack
    });
    
    // Provide user-friendly error messages
    let errorMessage = 'Error analyzing skill gaps';
    if (error.message.includes('API key') || error.message.includes('not configured')) {
      errorMessage = 'Gemini API key is not configured. Please restart the server after setting GEMINI_API_KEY in the .env file.';
      console.error('API Key Check:', {
        envKey: process.env.GEMINI_API_KEY ? 'Present' : 'Missing',
        keyLength: process.env.GEMINI_API_KEY?.length || 0
      });
    } else if (error.message.includes('parse') || error.message.includes('JSON')) {
      errorMessage = 'Failed to process AI response. Please try again.';
    } else if (error.message.includes('quota') || error.message.includes('rate limit')) {
      errorMessage = 'API rate limit reached. Please try again in a few moments.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? {
        fullError: error.message,
        stack: error.stack,
        response: error.response?.data
      } : undefined
    });
  }
});

// Get current analysis
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.skillGapAnalysis || !user.skillGapAnalysis.gaps) {
      return res.status(404).json({ message: 'No analysis found. Please run analysis first.' });
    }

    const jobRoleId = user.selectedJobRole?.roleId || user.skillGapAnalysis?.jobRoleId;
    const jobRole = jobRoleId
      ? await JobRole.findById(jobRoleId)
      : null;

    res.json({
      gaps: user.skillGapAnalysis.gaps,
      analyzedAt: user.skillGapAnalysis.analyzedAt,
      summary: user.skillGapAnalysis.summary,
      jobRole: jobRole ? {
        id: jobRole._id,
        title: jobRole.title,
        description: jobRole.description
      } : null
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

