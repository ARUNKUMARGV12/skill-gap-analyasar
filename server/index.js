const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load configuration based on the environment
const config = process.env.NODE_ENV === 'production' 
  ? require('./config/production')
  : require('dotenv').config();

// Load .env file from server directory or root directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();

// Middleware
// Allow CORS and explicitly permit Authorization header so browsers can send JWTs
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/resume', require('./routes/resume'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/analysis', require('./routes/analysis'));
app.use('/api/roadmap', require('./routes/roadmap'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/progress', require('./routes/progress'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillgap', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// Check Gemini API keys on startup
const checkGeminiKeys = () => {
  const keys = [];
  if (process.env.GEMINI_API_KEY) keys.push('GEMINI_API_KEY');
  
  let keyIndex = 1;
  while (process.env[`GEMINI_API_KEY_${keyIndex}`]) {
    keys.push(`GEMINI_API_KEY_${keyIndex}`);
    keyIndex++;
  }
  
  if (process.env.GEMINI_API_KEYS) {
    const commaKeys = process.env.GEMINI_API_KEYS.split(',').filter(k => k.trim());
    if (commaKeys.length > 0) keys.push('GEMINI_API_KEYS');
  }
  
  if (keys.length > 0) {
    console.log(`✅ ${keys.length} Gemini API key(s) configured`);
  } else {
    console.warn('⚠️  WARNING: No Gemini API keys found. AI features will use fallback responses.');
    console.warn('   Set GEMINI_API_KEY or GEMINI_API_KEY_1, GEMINI_API_KEY_2, etc. in your .env file');
    console.warn('   You can also use GEMINI_API_KEYS=key1,key2,key3 for multiple keys');
  }
};

checkGeminiKeys();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

