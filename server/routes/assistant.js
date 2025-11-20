const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { chatWithAssistantEnhanced } = require('../services/geminiService');
const router = express.Router();

// Chat with AI assistant (enhanced)
router.post('/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    const user = await User.findById(req.user._id);
    
    // Build comprehensive context
    const context = {
      jobRole: user.selectedJobRole?.roleName || null,
      progress: user.progress?.overallCompletion || 0,
      skillGaps: user.skillGapAnalysis?.gaps?.length || 0
    };

    // Build user progress for enhanced assistant
    const completedSteps = user.roadmap?.steps?.filter(s => s.status === 'completed') || [];
    const inProgressSteps = user.roadmap?.steps?.filter(s => s.status === 'in_progress') || [];
    
    const userProgress = {
      completedSkills: completedSteps.map(s => s.skill),
      inProgressSkills: inProgressSteps.map(s => s.skill),
      roadmapSteps: user.roadmap?.steps || [],
      skillGaps: user.skillGapAnalysis?.gaps || []
    };

    const response = await chatWithAssistantEnhanced(message, context, userProgress);
    
    res.json({ response });
  } catch (error) {
    console.error('Assistant chat error:', error);
    res.status(500).json({ message: 'Error communicating with assistant', error: error.message });
  }
});

module.exports = router;

