const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

// Ensure dotenv is loaded (in case routes are loaded before server/index.js)
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
  require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
} catch (e) {
  // dotenv already loaded or .env doesn't exist
}

// API Key Management with rotation support
let currentKeyIndex = 0;
let apiKeys = [];
let genAIClients = [];

// Initialize API keys from environment
function initializeApiKeys() {
  apiKeys = [];
  
  // Support single key (GEMINI_API_KEY)
  if (process.env.GEMINI_API_KEY) {
    const singleKey = process.env.GEMINI_API_KEY.trim();
    if (singleKey) apiKeys.push(singleKey);
  }
  
  // Support multiple keys (GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.)
  let keyIndex = 1;
  while (true) {
    const key = process.env[`GEMINI_API_KEY_${keyIndex}`];
    if (!key || !key.trim()) break;
    apiKeys.push(key.trim());
    keyIndex++;
  }
  
  // Support comma-separated keys in GEMINI_API_KEYS
  if (process.env.GEMINI_API_KEYS) {
    const keys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(k => k);
    apiKeys.push(...keys);
  }
  
  // Remove duplicates
  apiKeys = [...new Set(apiKeys)];
  
  // Initialize clients
  genAIClients = apiKeys.map(key => new GoogleGenerativeAI(key));
  
  if (apiKeys.length > 0) {
    console.log(`✅ Initialized ${apiKeys.length} Gemini API key(s)`);
  } else {
    console.warn('⚠️  No Gemini API keys found. Set GEMINI_API_KEY or GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc.');
  }
  
  return apiKeys.length > 0;
}

// Initialize on module load
initializeApiKeys();

// Get current API key with rotation
function getCurrentApiKey() {
  if (apiKeys.length === 0) {
    // Try to reinitialize
    initializeApiKeys();
  }
  
  if (apiKeys.length === 0) {
    return null;
  }
  
  return apiKeys[currentKeyIndex];
}

// Rotate to next API key
function rotateApiKey() {
  if (apiKeys.length > 1) {
    currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
    console.log(`🔄 Rotated to API key ${currentKeyIndex + 1} of ${apiKeys.length}`);
  }
}

// Get GenAI client with current key
function getGenAI() {
  if (apiKeys.length === 0) {
    return null;
  }
  return genAIClients[currentKeyIndex];
}

// Update fetchSupportedModels to handle missing listModels
async function fetchSupportedModels() {
  const genAI = getGenAI();
  if (!genAI) {
    throw new Error('Failed to initialize Gemini AI. Please check your API key.');
  }

  try {
    if (typeof genAI.listModels === 'function') {
      const models = await genAI.listModels();
      return models.map(model => model.modelName);
    } else {
      console.warn('⚠️ listModels function is not available. Falling back to hardcoded models.');
      return ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    }
  } catch (error) {
    console.error('❌ Failed to fetch supported models:', error.message);
    throw new Error('Unable to fetch supported models. Please check your API key and network connection.');
  }
}

async function getModel() {
  const supportedModels = await fetchSupportedModels();
  const fallbackModels = ['gemini-2.0-flash-exp', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];

  const validModels = fallbackModels.filter(model => supportedModels.includes(model));
  if (validModels.length === 0) {
    throw new Error('No valid models available. Please check model availability.');
  }

  const genAI = getGenAI();
  for (const model of validModels) {
    try {
      const generativeModel = await genAI.getGenerativeModel({ model });
      console.log(`✅ Using model: ${model}`);
      return generativeModel;
    } catch (error) {
      console.warn(`⚠️ Model ${model} failed: ${error.message}`);
    }
  }

  throw new Error('All models failed. Please check model availability and API key configuration.');
}

// Force skip unsupported models in getModelWithRetry
async function getModelWithRetry(maxRetries = apiKeys.length) {
  let lastError = null;
  const supportedModels = await fetchSupportedModels();

  // Remove unsupported models explicitly
  const validModels = supportedModels.filter(model => model !== 'gemini-2.0-flash-exp');

  for (let attempt = 0; attempt < maxRetries && attempt < apiKeys.length; attempt++) {
    for (const model of validModels) {
      try {
        const genAI = getGenAI();
        const generativeModel = await genAI.getGenerativeModel({ model });
        console.log(`✅ Using model: ${model}`);
        return generativeModel;
      } catch (error) {
        console.warn(`⚠️ Model ${model} failed: ${error.message}`);
        lastError = error;
      }
    }
    console.warn('⚠️ Rotating API key...');
    rotateApiKey();
  }

  console.error('❌ All models failed. Please check model availability and API key configuration.');
  throw lastError || new Error('All API keys and models failed');
}

function hasApiKey() {
  return apiKeys.length > 0;
}

function defaultCurrentLevel(requiredLevel, mentioned) {
  if (!mentioned) return 'not_mentioned';
  switch (requiredLevel) {
    case 'expert':
      return 'advanced';
    case 'advanced':
      return 'intermediate';
    case 'intermediate':
      return 'beginner';
    default:
      return 'beginner';
  }
}

function fallbackSummary(gaps, jobRoleTitle) {
  if (!gaps.length) {
    return `Great job! Your resume already covers the key skills for ${jobRoleTitle}.`;
  }
  const critical = gaps.filter(gap => gap.priority === 'critical' || gap.priority === 'high').length;
  if (critical > 0) {
    return `Focus on the ${critical} highest-priority skills first to become job-ready for ${jobRoleTitle}.`;
  }
  return `Keep strengthening the listed skills to align fully with the ${jobRoleTitle} role requirements.`;
}

function isKeyError(error) {
  return error.message && error.message.toLowerCase().includes('api key is not configured');
}

function isRecoverableError(error) {
  if (isKeyError(error)) return true;
  // Gemini API errors that we can recover from
  const errorMessage = error.message?.toLowerCase() || '';
  return errorMessage.includes('quota') || 
         errorMessage.includes('rate limit') || 
         errorMessage.includes('429') ||
         errorMessage.includes('resource exhausted') ||
         errorMessage.includes('unavailable');
}

// Analyze skill gaps
async function analyzeSkillGaps(resumeText, jobRole) {
  try {
    if (!hasApiKey()) {
      throw new Error('Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file.');
    }
    
    const model = await getModelWithRetry();

    // Build skills list for prompt
    let skillsText = '';
    if (jobRole.requiredSkills && jobRole.requiredSkills.length > 0) {
      const skillsList = jobRole.requiredSkills.map(s => {
        if (typeof s === 'string') return s;
        return s.skill || s;
      }).join(', ');
      skillsText = `Required Skills: ${skillsList}`;
    } else {
      skillsText = 'Required Skills: (Extract key skills from the job description below)';
    }

    const prompt = `You are a career advisor and skill gap analyzer. Analyze the following resume and compare it with the required job role.

Resume:
${resumeText}

Job Role: ${jobRole.title}
Description: ${jobRole.description}
${skillsText}

${jobRole.requiredSkills && jobRole.requiredSkills.length > 0 
  ? 'Analyze each required skill listed above and determine:'
  : 'Based on the job description, identify the key skills needed for this role and analyze each one. For each skill, determine:'}
1. If the skill is mentioned in the resume
2. The current level of proficiency based on resume content
3. The required level for the job role
4. Priority level (critical/high/medium/low) based on importance
5. A brief description explaining the gap

Return ONLY a valid JSON object in this exact format (no markdown, no code blocks, no extra text):
{
  "gaps": [
    {
      "skill": "skill name",
      "currentLevel": "beginner/intermediate/advanced/expert/not_mentioned",
      "requiredLevel": "beginner/intermediate/advanced/expert",
      "priority": "low/medium/high/critical",
      "description": "brief explanation of the gap"
    }
  ],
  "summary": "overall assessment of the candidate's readiness for this role"
}

Return ONLY the JSON object, nothing else.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Extract JSON from response - handle markdown code blocks
    let jsonText = text;
    
    // Remove markdown code blocks if present
    jsonText = jsonText.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    
    // Find JSON object
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Gemini analysis completed successfully');
        return parsed;
      } catch (parseError) {
        console.error('JSON parse error:', parseError.message);
        console.error('Attempted to parse:', jsonMatch[0].substring(0, 200));
        throw new Error('Failed to parse JSON response: ' + parseError.message);
      }
    }
    
    console.error('No JSON found in response. Full response:', text);
    throw new Error('Invalid response format - no JSON found');
  } catch (error) {
    // Only use fallback for truly recoverable errors (rate limits, quota, etc.)
    // Don't use fallback for parsing errors - we want to see the real issue
    if (isRecoverableError(error) && !error.message.includes('parse') && !error.message.includes('JSON')) {
      console.warn('Gemini API unavailable, using fallback analysis');
      console.warn('Error type:', error.message);
      const resumeTextLower = (resumeText || '').toLowerCase();
      
      // Handle both array of objects and array of strings for requiredSkills
      let skillsToAnalyze = [];
      if (jobRole.requiredSkills && jobRole.requiredSkills.length > 0) {
        skillsToAnalyze = jobRole.requiredSkills.map(skillReq => {
          if (typeof skillReq === 'string') {
            return { skill: skillReq, level: 'intermediate', importance: 'medium' };
          }
          return {
            skill: skillReq.skill || skillReq,
            level: skillReq.level || 'intermediate',
            importance: skillReq.importance || 'medium'
          };
        });
      } else {
        // If no skills provided, extract common tech skills from description
        const commonSkills = ['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'SQL', 'Docker', 'AWS', 'Git'];
        skillsToAnalyze = commonSkills
          .filter(skill => resumeTextLower.includes(skill.toLowerCase()) || jobRole.description?.toLowerCase().includes(skill.toLowerCase()))
          .slice(0, 5)
          .map(skill => ({ skill, level: 'intermediate', importance: 'medium' }));
      }
      
      const gaps = skillsToAnalyze.map(skillReq => {
        const skillName = typeof skillReq === 'string' ? skillReq : skillReq.skill;
        const mentioned = resumeTextLower.includes(skillName.toLowerCase());
        return {
          skill: skillName,
          currentLevel: defaultCurrentLevel(skillReq.level, mentioned),
          requiredLevel: skillReq.level || 'intermediate',
          priority: skillReq.importance || 'medium',
          description: mentioned
            ? `Strengthen your proficiency in ${skillName} to reach the ${skillReq.level} level expected for this role.`
            : `Your resume does not mention ${skillName}. Start learning the fundamentals and highlight relevant experience.`
        };
      });

      return {
        gaps: gaps.length > 0 ? gaps : [{
          skill: 'General Skills',
          currentLevel: 'intermediate',
          requiredLevel: 'advanced',
          priority: 'medium',
          description: 'Review the job description and identify key skills to develop.'
        }],
        summary: fallbackSummary(gaps, jobRole.title)
      };
    }

    console.error('Gemini analyzeSkillGaps error:', error.message);
    console.error('Error stack:', error.stack);
    // Re-throw to let the route handle it properly
    throw error;
  }
}

// Generate roadmap
async function generateRoadmap(skillGaps, jobRole) {
  try {
    const model = await getModelWithRetry();

    const prompt = `Create a personalized learning roadmap to bridge skill gaps for the following job role.

Job Role: ${jobRole.title}
Skill Gaps: ${JSON.stringify(skillGaps)}

Provide a detailed roadmap in JSON format:
{
  "steps": [
    {
      "skill": "skill name",
      "resources": ["resource 1", "resource 2", "resource 3"],
      "estimatedTime": "X weeks/months",
      "description": "what to learn",
      "order": 1
    }
  ],
  "totalDuration": "estimated total time"
}

Only return valid JSON, no additional text.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format');
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback roadmap');
      const steps = (skillGaps || []).map((gap, index) => ({
        skill: gap.skill,
        resources: [
          `Complete a beginner-friendly ${gap.skill} course on Coursera or Udemy`,
          `Work through official ${gap.skill} documentation and tutorials`,
          `Build a small project highlighting your ${gap.skill} proficiency`
        ],
        estimatedTime: gap.priority === 'critical' || gap.priority === 'high' ? '3-4 weeks' : '1-2 weeks',
        description: `Focus on ${gap.skill} to move from ${gap.currentLevel} to ${gap.requiredLevel}.`,
        order: index + 1
      }));

      return {
        steps,
        totalDuration: steps.length ? `${steps.length * 2}-week plan (estimated)` : 'Up to date'
      };
    }

    console.error('Gemini generateRoadmap error:', error.message);
    throw error;
  }
}

// Get learning resources
async function getLearningResources(skill, level) {
  try {
    const model = await getModelWithRetry();

    const prompt = `Provide specific learning resources for learning "${skill}" at "${level}" level. Include:
- Online courses (with platform names)
- Books
- Tutorials
- Practice projects
- Communities

Return in JSON format:
{
  "resources": [
    {
      "type": "course/book/tutorial/project/community",
      "name": "resource name",
      "url": "if available",
      "description": "brief description"
    }
  ]
}

Only return valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('Invalid response format');
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback resources');
      return {
        resources: [
          {
            type: 'course',
            name: `${skill} fundamentals on Codecademy`,
            url: 'https://www.codecademy.com',
            description: `Interactive lessons to build ${skill} basics.`
          },
          {
            type: 'tutorial',
            name: `${skill} quickstart guide`,
            url: '',
            description: 'Follow a hands-on tutorial from official documentation or a reputable blog.'
          },
          {
            type: 'project',
            name: `${skill} portfolio project`,
            url: '',
            description: `Create a mini project applying ${skill} at a ${level} level.`
          }
        ]
      };
    }

    console.error('Gemini getLearningResources error:', error.message);
    throw error;
  }
}

// AI Assistant chat
async function chatWithAssistant(userMessage, context) {
  try {
    const model = await getModelWithRetry();

    const prompt = `You are a helpful career and upskilling assistant. The user is working on upskilling for a job role.

Context:
- Job Role: ${context.jobRole || 'Not selected'}
- Current Progress: ${context.progress || 0}%
- Skill Gaps: ${context.skillGaps || 'Not analyzed yet'}

User Question: ${userMessage}

Provide a helpful, encouraging, and actionable response. Be concise but thorough.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback response');
      return `You're currently focusing on ${context.jobRole || 'exploring roles'}. ` +
        `You've completed about ${context.progress || 0}% of your roadmap. ` +
        `Start by reviewing your highest priority skill gaps and choose one to work on today. ` +
        `Let me know which skill you want resources for!`;
    }

    console.error('Gemini chatWithAssistant error:', error.message);
    throw error;
  }
}

// Get YouTube playlists for a skill
async function getYouTubePlaylists(skill, level = 'intermediate') {
  try {
    const model = await getModelWithRetry();

    const prompt = `Find the best FREE YouTube playlists and video series for learning "${skill}" at "${level}" level. 

Return a JSON object with this exact format:
{
  "playlists": [
    {
      "title": "Playlist title",
      "channel": "Channel name",
      "url": "YouTube playlist URL (full URL starting with https://www.youtube.com)",
      "description": "Brief description of what this playlist covers",
      "videoCount": "Number of videos (if known)",
      "duration": "Total estimated duration (if known)"
    }
  ]
}

Focus on:
- Free, high-quality playlists
- Popular channels with good teaching
- Complete series/playlists (not single videos)
- Recent content (if possible)

Return ONLY valid JSON, no markdown, no code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let jsonText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback YouTube playlists');
      // Fallback: Return search suggestions
      return {
        playlists: [
          {
            title: `${skill} Tutorial Playlist`,
            channel: 'Search on YouTube',
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(skill + ' tutorial playlist ' + level)}`,
            description: `Search YouTube for "${skill} ${level} tutorial playlist"`,
            videoCount: 'Various',
            duration: 'Varies'
          }
        ]
      };
    }
    
    console.error('Gemini getYouTubePlaylists error:', error.message);
    throw error;
  }
}

// Generate quiz questions for a skill/topic
async function generateQuiz(skill, topic, level = 'intermediate') {
  try {
    const model = await getModelWithRetry();

    const prompt = `Generate a quiz to test understanding of "${topic}" related to "${skill}" at "${level}" level.

Create 5 multiple-choice questions. Each question should have:
- A clear question
- 4 answer options (A, B, C, D)
- Only ONE correct answer
- Brief explanation for the correct answer

Return ONLY a valid JSON object in this exact format:
{
  "questions": [
    {
      "question": "Question text",
      "options": {
        "A": "Option A text",
        "B": "Option B text",
        "C": "Option C text",
        "D": "Option D text"
      },
      "correctAnswer": "A",
      "explanation": "Brief explanation of why this is correct"
    }
  ]
}

Make questions practical and relevant to real-world application. Return ONLY JSON, no markdown.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    let jsonText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '');
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback quiz');
      return {
        questions: [
          {
            question: `What is a key concept in ${topic}?`,
            options: {
              A: 'Basic understanding',
              B: 'Advanced technique',
              C: 'Common practice',
              D: 'All of the above'
            },
            correctAnswer: 'D',
            explanation: `All options are relevant to understanding ${topic}.`
          }
        ]
      };
    }
    
    console.error('Gemini generateQuiz error:', error.message);
    throw error;
  }
}

// Enhanced AI Assistant with research and project recommendations
async function chatWithAssistantEnhanced(userMessage, context, userProgress = {}) {
  try {
    const model = await getModelWithRetry();

    // Build comprehensive context
    const completedSkills = userProgress.completedSkills || [];
    const inProgressSkills = userProgress.inProgressSkills || [];
    const roadmapSteps = userProgress.roadmapSteps || [];
    
    const prompt = `You are an advanced AI career and upskilling assistant. You help users with research, learning, and career development.

User Context:
- Target Job Role: ${context.jobRole || 'Not selected'}
- Overall Progress: ${context.progress || 0}%
- Skill Gaps Identified: ${context.skillGaps || 0}
- Completed Skills: ${completedSkills.join(', ') || 'None yet'}
- Skills In Progress: ${inProgressSkills.join(', ') || 'None'}
- Current Roadmap Steps: ${roadmapSteps.length || 0} steps

User Question: ${userMessage}

Provide a comprehensive, helpful response that:
1. Directly answers the question
2. If research-related, provide detailed insights and current best practices
3. If asking about next steps, recommend specific projects based on completed skills
4. If asking about learning, suggest practical resources and hands-on projects
5. Be encouraging and actionable

For project recommendations, suggest:
- Projects that build on completed skills
- Projects that help learn new skills from the roadmap
- Real-world applicable projects
- Projects with clear learning outcomes

Format your response clearly with:
- Main answer
- Detailed explanation (if research question)
- Actionable next steps
- Project suggestions (if relevant)

Be conversational, helpful, and specific.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    if (isRecoverableError(error)) {
      console.warn('Gemini API unavailable, using fallback response');
      let response = `You're working on ${context.jobRole || 'your career goals'}. `;
      
      if (completedSkills.length > 0) {
        response += `You've completed: ${completedSkills.join(', ')}. `;
        response += `Great progress! Consider building a project combining these skills. `;
      }
      
      response += `Focus on your highest priority skill gaps. `;
      response += `Would you like project recommendations or learning resources?`;
      
      return response;
    }

    console.error('Gemini chatWithAssistantEnhanced error:', error.message);
    throw error;
  }
}

module.exports = {
  analyzeSkillGaps,
  generateRoadmap,
  getLearningResources,
  chatWithAssistant,
  getYouTubePlaylists,
  generateQuiz,
  chatWithAssistantEnhanced
};

