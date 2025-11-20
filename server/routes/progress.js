const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Get user progress
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.progress) {
      return res.json({
        overallCompletion: 0,
        skillsCompleted: 0,
        totalSkills: 0,
        jobAccessibility: 0
      });
    }

    // Calculate job accessibility based on completed skills
    let jobAccessibility = 0;
    if (user.roadmap && user.roadmap.steps && user.roadmap.steps.length > 0) {
      const criticalSkills = user.skillGapAnalysis?.gaps?.filter(g => g.priority === 'critical' || g.priority === 'high') || [];
      const completedCritical = user.roadmap.steps.filter((step, idx) => {
        const gap = user.skillGapAnalysis.gaps[idx];
        return step.status === 'completed' && (gap?.priority === 'critical' || gap?.priority === 'high');
      }).length;
      
      if (criticalSkills.length > 0) {
        jobAccessibility = Math.round((completedCritical / criticalSkills.length) * 100);
      } else {
        jobAccessibility = user.progress.overallCompletion;
      }
    }

    // Update job accessibility if changed
    if (user.progress.jobAccessibility !== jobAccessibility) {
      user.progress.jobAccessibility = jobAccessibility;
      user.progress.lastUpdated = new Date();
      await user.save();
    }

    res.json({
      overallCompletion: user.progress.overallCompletion,
      skillsCompleted: user.progress.skillsCompleted,
      totalSkills: user.progress.totalSkills,
      jobAccessibility: jobAccessibility,
      lastUpdated: user.progress.lastUpdated
    });
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get detailed progress with timeline data
router.get('/detailed', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    const roadmapSteps = user.roadmap?.steps || [];
    const skillGaps = user.skillGapAnalysis?.gaps || [];

    const progressData = {
      overall: user.progress?.overallCompletion || 0,
      skills: roadmapSteps.map((step, idx) => ({
        skill: step.skill,
        status: step.status,
        priority: skillGaps[idx]?.priority || 'medium',
        completedAt: step.completedAt
      })),
      timeline: []
    };

    // Generate timeline data (last 30 days)
    const timeline = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const completedOnDate = roadmapSteps.filter(step => {
        if (!step.completedAt) return false;
        const completedDate = new Date(step.completedAt);
        return completedDate.toDateString() === date.toDateString();
      }).length;
      timeline.push({
        date: date.toISOString().split('T')[0],
        completed: completedOnDate
      });
    }
    progressData.timeline = timeline;

    res.json(progressData);
  } catch (error) {
    console.error('Get detailed progress error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

