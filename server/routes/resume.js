const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Upload and parse resume
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    let resumeText = '';

    if (req.file.mimetype === 'application/pdf') {
      const pdfData = await pdfParse(req.file.buffer);
      resumeText = pdfData.text;
    } else if (req.file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
               req.file.mimetype === 'application/msword') {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      resumeText = result.value;
    } else if (req.file.mimetype === 'text/plain') {
      resumeText = req.file.buffer.toString('utf-8');
    } else {
      return res.status(400).json({ message: 'Unsupported file type' });
    }

    // Update user's resume
    const user = await User.findById(req.user._id);
    user.resume = {
      text: resumeText,
      fileName: req.file.originalname,
      uploadedAt: new Date()
    };
    await user.save();

    res.json({
      message: 'Resume uploaded successfully',
      resume: {
        text: resumeText.substring(0, 500) + '...',
        fileName: user.resume.fileName,
        uploadedAt: user.resume.uploadedAt
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    res.status(500).json({ message: 'Error processing resume' });
  }
});

// Get user's resume
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user.resume || !user.resume.text) {
      return res.status(404).json({ message: 'No resume found' });
    }

    res.json({
      text: user.resume.text,
      fileName: user.resume.fileName,
      uploadedAt: user.resume.uploadedAt
    });
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update resume text manually
router.put('/text', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Resume text is required' });
    }

    const user = await User.findById(req.user._id);
    user.resume = {
      text: text,
      fileName: user.resume?.fileName || 'manual-entry.txt',
      uploadedAt: new Date()
    };
    await user.save();

    res.json({ message: 'Resume updated successfully' });
  } catch (error) {
    console.error('Update resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

