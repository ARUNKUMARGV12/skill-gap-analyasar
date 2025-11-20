const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const JobRole = require('../models/JobRole');
const { generateRoadmap, getYouTubePlaylists, generateQuiz } = require('../services/geminiService');
const router = express.Router();

// Generate roadmap
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.skillGapAnalysis || !user.skillGapAnalysis.gaps || user.skillGapAnalysis.gaps.length === 0) {
      return res.status(400).json({ message: 'Please run skill gap analysis first' });
    }

    const jobRoleId = user.selectedJobRole?.roleId || user.skillGapAnalysis?.jobRoleId;
    let jobRole = jobRoleId ? await JobRole.findById(jobRoleId) : null;

    if (!jobRole) {
      const fallbackRoleName = user.selectedJobRole?.roleName
        || (user.skillGapAnalysis ? 'Analyzed Role' : null);

      if (!fallbackRoleName) {
        return res.status(400).json({ message: 'Please select a job role first' });
      }

      jobRole = {
        _id: jobRoleId || null,
        title: fallbackRoleName,
        description: user.skillGapAnalysis?.summary || 'Personalized roadmap based on your analysis',
        requiredSkills: user.skillGapAnalysis?.gaps?.map(gap => ({
          skill: gap.skill,
          level: gap.requiredLevel,
          importance: gap.priority
        })) || []
      };
    }

    if (!user.selectedJobRole || !user.selectedJobRole.roleId) {
      user.selectedJobRole = {
        roleId: jobRole._id || jobRoleId || null,
        roleName: jobRole.title,
        selectedAt: new Date()
      };
    }

    // Generate roadmap using Gemini
    const roadmapData = await generateRoadmap(user.skillGapAnalysis.gaps, jobRole);

    // Update user's roadmap
    user.roadmap = {
      steps: roadmapData.steps.map(step => ({
        skill: step.skill,
        resources: step.resources,
        estimatedTime: step.estimatedTime,
        description: step.description,
        status: 'not_started'
      })),
      totalDuration: roadmapData.totalDuration || null,
      createdAt: new Date()
    };

    await user.save();

    res.json({
      steps: user.roadmap.steps,
      totalDuration: user.roadmap.totalDuration,
      createdAt: user.roadmap.createdAt
    });
  } catch (error) {
    console.error('Roadmap generation error:', error);
    console.error('Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(500).json({ 
      message: 'Error generating roadmap', 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.response?.data : undefined
    });
  }
});

// Get current roadmap
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (!user.roadmap || !user.roadmap.steps) {
      return res.status(404).json({ message: 'No roadmap found. Please generate roadmap first.' });
    }

    res.json({
      steps: user.roadmap.steps,
      totalDuration: user.roadmap.totalDuration,
      createdAt: user.roadmap.createdAt
    });
  } catch (error) {
    console.error('Get roadmap error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update roadmap step status
router.put('/step/:stepIndex', auth, async (req, res) => {
  try {
    const { stepIndex } = req.params;
    const { status } = req.body;

    if (!['not_started', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(req.user._id);
    if (!user.roadmap || !user.roadmap.steps) {
      return res.status(404).json({ message: 'No roadmap found' });
    }

    const index = parseInt(stepIndex);
    if (index < 0 || index >= user.roadmap.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }

    const step = user.roadmap.steps[index];

    // If trying to mark as completed, check if quiz is passed
    if (status === 'completed') {
      if (step.quiz && step.quiz.questions && step.quiz.questions.length > 0) {
        if (!step.quiz.passed) {
          return res.status(400).json({ 
            message: 'Please complete and pass the quiz before marking this step as completed',
            requiresQuiz: true
          });
        }
      }
      step.completedAt = new Date();
    }

    step.status = status;

    // Update progress
    const completedSteps = user.roadmap.steps.filter(s => s.status === 'completed').length;
    user.progress.skillsCompleted = completedSteps;
    user.progress.overallCompletion = Math.round((completedSteps / user.roadmap.steps.length) * 100);
    user.progress.lastUpdated = new Date();

    await user.save();

    res.json({ message: 'Step status updated', progress: user.progress });
  } catch (error) {
    console.error('Update step error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get YouTube playlists for a roadmap step
router.get('/step/:stepIndex/youtube', auth, async (req, res) => {
  try {
    const { stepIndex } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user.roadmap || !user.roadmap.steps) {
      return res.status(404).json({ message: 'No roadmap found' });
    }

    const index = parseInt(stepIndex);
    if (index < 0 || index >= user.roadmap.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }

    const step = user.roadmap.steps[index];
    
    // If playlists already exist, return them
    if (step.youtubePlaylists && step.youtubePlaylists.length > 0) {
      return res.json({ playlists: step.youtubePlaylists });
    }

    // Generate new playlists
    try {
      const playlistsData = await getYouTubePlaylists(step.skill, 'intermediate');
      
      // Save playlists to step
      step.youtubePlaylists = playlistsData.playlists || [];
      await user.save();
      
      res.json({ playlists: step.youtubePlaylists });
    } catch (error) {
      console.error('Error fetching YouTube playlists:', error);
      res.status(500).json({ message: 'Error fetching YouTube playlists', error: error.message });
    }
  } catch (error) {
    console.error('Get YouTube playlists error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Generate quiz for a roadmap step
router.post('/step/:stepIndex/quiz', auth, async (req, res) => {
  try {
    const { stepIndex } = req.params;
    const user = await User.findById(req.user._id);
    
    if (!user.roadmap || !user.roadmap.steps) {
      return res.status(404).json({ message: 'No roadmap found' });
    }

    const index = parseInt(stepIndex);
    if (index < 0 || index >= user.roadmap.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }

    const step = user.roadmap.steps[index];
    
    // If quiz already exists, return it
    if (step.quiz && step.quiz.questions && step.quiz.questions.length > 0 && !step.quiz.passed) {
      return res.json({ 
        questions: step.quiz.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      });
    }

    // Generate new quiz
    try {
      const quizData = await generateQuiz(step.skill, step.skill, 'intermediate');
      
      // Save quiz to step
      step.quiz = {
        questions: quizData.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          userAnswer: null,
          isCorrect: null
        })),
        generatedAt: new Date(),
        passed: false,
        passedAt: null
      };
      await user.save();
      
      res.json({ 
        questions: step.quiz.questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      });
    } catch (error) {
      console.error('Error generating quiz:', error);
      res.status(500).json({ message: 'Error generating quiz', error: error.message });
    }
  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit quiz answers
router.post('/step/:stepIndex/quiz/submit', auth, async (req, res) => {
  try {
    const { stepIndex } = req.params;
    const { answers } = req.body; // Array of { questionIndex, answer }

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({ message: 'Answers array is required' });
    }

    const user = await User.findById(req.user._id);
    
    if (!user.roadmap || !user.roadmap.steps) {
      return res.status(404).json({ message: 'No roadmap found' });
    }

    const index = parseInt(stepIndex);
    if (index < 0 || index >= user.roadmap.steps.length) {
      return res.status(400).json({ message: 'Invalid step index' });
    }

    const step = user.roadmap.steps[index];
    
    if (!step.quiz || !step.quiz.questions || step.quiz.questions.length === 0) {
      return res.status(400).json({ message: 'No quiz found for this step. Generate quiz first.' });
    }

    // Validate that all questions are answered
    if (answers.length !== step.quiz.questions.length) {
      return res.status(400).json({ 
        message: `Please answer all ${step.quiz.questions.length} questions. You provided ${answers.length} answers.` 
      });
    }

    // Validate answer format
    const validAnswers = ['A', 'B', 'C', 'D'];
    for (const { questionIndex, answer } of answers) {
      if (questionIndex < 0 || questionIndex >= step.quiz.questions.length) {
        return res.status(400).json({ message: `Invalid question index: ${questionIndex}` });
      }
      if (!validAnswers.includes(answer)) {
        return res.status(400).json({ message: `Invalid answer: ${answer}. Must be A, B, C, or D.` });
      }
    }

    // Check answers
    let correctCount = 0;
    answers.forEach(({ questionIndex, answer }) => {
      const question = step.quiz.questions[questionIndex];
      if (question) {
        question.userAnswer = answer;
        question.isCorrect = answer === question.correctAnswer;
        if (question.isCorrect) correctCount++;
      }
    });

    // Pass if 80% or more correct
    const totalQuestions = step.quiz.questions.length;
    const passThreshold = Math.ceil(totalQuestions * 0.8);
    const passed = correctCount >= passThreshold;

    step.quiz.passed = passed;
    if (passed) {
      step.quiz.passedAt = new Date();
    }

    await user.save();

    res.json({
      passed,
      correctCount,
      totalQuestions,
      score: totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
      questions: step.quiz.questions.map(q => ({
        question: q.question,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect: q.isCorrect,
        explanation: q.explanation
      }))
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

