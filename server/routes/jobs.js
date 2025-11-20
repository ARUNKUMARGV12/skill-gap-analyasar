const express = require('express');
const JobRole = require('../models/JobRole');
const router = express.Router();

// Get all job roles
router.get('/', async (req, res) => {
  try {
    const jobs = await JobRole.find().sort({ title: 1 });
    res.json(jobs);
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get job role by ID
router.get('/:id', async (req, res) => {
  try {
    const job = await JobRole.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ message: 'Job role not found' });
    }
    res.json(job);
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create job role (admin function - can be protected)
router.post('/', async (req, res) => {
  try {
    const job = new JobRole(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

