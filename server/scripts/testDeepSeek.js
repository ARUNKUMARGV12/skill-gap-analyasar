require('dotenv').config();
const gemini = require('../services/geminiService');

async function runTest() {
  try {
    const resumeText = `Experienced software developer with 3 years building REST APIs in Node.js, MongoDB, and Express. Familiar with React basics.`;
    const jobRole = {
      title: 'Backend Engineer',
      description: 'Build and maintain backend services',
      requiredSkills: [
        { skill: 'Node.js', level: 'advanced', importance: 'high' },
        { skill: 'Express', level: 'intermediate', importance: 'medium' },
        { skill: 'MongoDB', level: 'intermediate', importance: 'high' },
        { skill: 'Docker', level: 'intermediate', importance: 'medium' }
      ]
    };

  console.log('Calling analyzeSkillGaps (Gemini)...');
  const res = await gemini.analyzeSkillGaps(resumeText, jobRole);
    console.log('Result:');
    console.log(JSON.stringify(res, null, 2));
  } catch (err) {
    console.error('Test failed:', err.message || err);
    if (err.response && err.response.data) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exitCode = 1;
  }
}

runTest();
