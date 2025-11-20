// Quick test script to verify Gemini API integration
require('dotenv').config();
const { analyzeSkillGaps, generateRoadmap, chatWithAssistant } = require('./services/geminiService');

async function testGemini() {
  console.log('Testing Gemini API Integration...\n');
  
  // Check API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY is not set in environment variables');
    console.log('Please set it in your .env file: GEMINI_API_KEY=your_key_here');
    return;
  }
  console.log('✅ GEMINI_API_KEY is set');
  console.log(`   Key format: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 4)}\n`);

  // Test with sample data
  const sampleResume = `
    John Doe
    Software Developer
    
    Experience:
    - 2 years of JavaScript development
    - React and Node.js projects
    - Basic database knowledge
  `;

  const sampleJobRole = {
    title: 'Full Stack Developer',
    description: 'Develop web applications',
    requiredSkills: [
      { skill: 'JavaScript', level: 'advanced', importance: 'critical' },
      { skill: 'React', level: 'intermediate', importance: 'high' },
      { skill: 'Node.js', level: 'intermediate', importance: 'high' }
    ]
  };

  try {
    console.log('Testing analyzeSkillGaps...');
    const analysis = await analyzeSkillGaps(sampleResume, sampleJobRole);
    console.log('✅ Analysis successful!');
    console.log(`   Found ${analysis.gaps?.length || 0} skill gaps`);
    if (analysis.summary) {
      console.log(`   Summary: ${analysis.summary.substring(0, 100)}...\n`);
    }

    if (analysis.gaps && analysis.gaps.length > 0) {
      console.log('Testing generateRoadmap...');
      const roadmap = await generateRoadmap(analysis.gaps, sampleJobRole);
      console.log('✅ Roadmap generation successful!');
      console.log(`   Generated ${roadmap.steps?.length || 0} roadmap steps`);
      if (roadmap.totalDuration) {
        console.log(`   Total Duration: ${roadmap.totalDuration}\n`);
      }

      console.log('Testing chatWithAssistant...');
      const chatResponse = await chatWithAssistant(
        'What should I focus on first?',
        { jobRole: sampleJobRole.title, progress: 0, skillGaps: analysis.gaps.length }
      );
      console.log('✅ Chat assistant working!');
      console.log(`   Response: ${chatResponse.substring(0, 150)}...\n`);
    }

    console.log('✅ All Gemini API tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack.split('\n')[1]);
    }
  }
}

testGemini();

