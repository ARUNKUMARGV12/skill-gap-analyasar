const express = require('express');
const auth = require('../middleware/auth');
const { getLearningResources } = require('../services/geminiService');
const router = express.Router();

// Get learning resources for a skill
router.get('/:skill', auth, async (req, res) => {
  try {
    const { skill } = req.params;
    const { level } = req.query;

    if (!skill) {
      return res.status(400).json({ message: 'Skill name is required' });
    }

    const resources = await getLearningResources(skill, level || 'intermediate');
    res.json(resources);
  } catch (error) {
    console.error('Get resources error:', error);
    res.status(500).json({ message: 'Error fetching resources', error: error.message });
  }
});

module.exports = router;

