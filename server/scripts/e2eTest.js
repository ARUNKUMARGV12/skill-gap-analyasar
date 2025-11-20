require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function run() {
  try {
    console.log('Starting E2E test...');

    // Register a new user
    const random = Math.floor(Math.random() * 100000);
    const email = `e2e_test_${random}@example.com`;
    const password = 'password123';

    console.log('Registering user:', email);
    const reg = await axios.post(`${API_URL}/auth/register`, { name: 'E2E Tester', email, password });
    console.log('Register response:', reg.status);

    // Login
    console.log('Logging in...');
    const login = await axios.post(`${API_URL}/auth/login`, { email, password });
    const token = login.data.token;
    console.log('Login token received length:', token?.length);

    const client = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${token}` } });

    // Set resume text
    console.log('Updating resume text...');
    await client.put('/resume/text', { text: 'Sample resume content: Node.js, Express, MongoDB experience' });
    console.log('Resume updated');

    // Get job roles
    console.log('Fetching job roles...');
    const jobsRes = await client.get('/jobs');
    const jobs = jobsRes.data;
    console.log('Found jobs:', jobs.length);
    if (!jobs.length) throw new Error('No job roles available');
    const jobId = jobs[0]._id;

    // Run analysis
    console.log('Running analysis for jobId:', jobId);
    const analysisRes = await client.post('/analysis', { jobRoleId: jobId });
    console.log('Analysis status:', analysisRes.status);
    console.log('Analysis summary:', analysisRes.data.summary || 'no summary');

    // Fetch analysis
    const getAnalysis = await client.get('/analysis');
    console.log('Get analysis status:', getAnalysis.status);

    // Try to generate roadmap
    console.log('Generating roadmap...');
    const roadmapRes = await client.post('/roadmap');
    console.log('Roadmap generated, steps:', roadmapRes.data.steps?.length || 0);

    console.log('E2E test completed successfully');
  } catch (err) {
    console.error('E2E test failed');
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else {
      console.error(err.message || err);
    }
    process.exitCode = 1;
  }
}

run();
