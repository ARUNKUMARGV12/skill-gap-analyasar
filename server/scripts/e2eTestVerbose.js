require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function safeRequest(promise, label) {
  try {
    const res = await promise;
    console.log(`${label} -> ${res.status}`);
    // console.log(res.data);
    return res;
  } catch (err) {
    console.error(`${label} FAILED`);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Data:', JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error('No response received. Request:', err.request);
    } else {
      console.error('Error message:', err.message);
    }
    throw err;
  }
}

async function run() {
  console.log('E2E verbose starting. API_URL=', API_URL);
  try {
    const random = Math.floor(Math.random() * 100000);
    const email = `e2e_verbose_${random}@example.com`;
    const password = 'password123';

    console.log('Registering user:', email);
    await safeRequest(axios.post(`${API_URL}/auth/register`, { name: 'E2E Verbose', email, password }), 'REGISTER');

    console.log('Logging in...');
    const loginRes = await safeRequest(axios.post(`${API_URL}/auth/login`, { email, password }), 'LOGIN');
    const token = loginRes.data.token;
    if (!token) throw new Error('No token returned from login');
    console.log('Token length:', token.length);

    const client = axios.create({ baseURL: API_URL, headers: { Authorization: `Bearer ${token}` } });

    console.log('Updating resume text...');
    await safeRequest(client.put('/resume/text', { text: 'Sample resume content: Node.js, Express, MongoDB experience' }), 'PUT_RESUME');

    console.log('Fetching job roles...');
    const jobsRes = await safeRequest(client.get('/jobs'), 'GET_JOBS');
    const jobs = jobsRes.data;
    console.log('Jobs count:', Array.isArray(jobs) ? jobs.length : 'unexpected');
    if (!jobs || jobs.length === 0) throw new Error('No job roles available');
    const jobId = jobs[0]._id;

    console.log('Running analysis for jobId:', jobId);
    const analysisRes = await safeRequest(client.post('/analysis', { jobRoleId: jobId }), 'POST_ANALYSIS');
    console.log('Analysis summary:', analysisRes.data.summary);

    console.log('Fetching analysis...');
    await safeRequest(client.get('/analysis'), 'GET_ANALYSIS');

    console.log('Generating roadmap...');
    const roadmapRes = await safeRequest(client.post('/roadmap'), 'POST_ROADMAP');
    console.log('Roadmap steps:', Array.isArray(roadmapRes.data.steps) ? roadmapRes.data.steps.length : 'unexpected');

    console.log('E2E verbose completed successfully');
  } catch (err) {
    console.error('E2E verbose failed. See above for details.');
    process.exitCode = 1;
  }
}

run();
