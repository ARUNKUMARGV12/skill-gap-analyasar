// Validation script to check for errors
const path = require('path');
const fs = require('fs');

console.log('🔍 Validating project structure and code...\n');

let errors = [];
let warnings = [];

// Check .env file
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const hasApiKey = envContent.includes('GEMINI_API_KEY');
  if (hasApiKey) {
    const keyCount = (envContent.match(/GEMINI_API_KEY/g) || []).length;
    console.log(`✅ .env file found with ${keyCount} API key(s)`);
  } else {
    warnings.push('⚠️  No GEMINI_API_KEY found in .env file');
  }
} else {
  warnings.push('⚠️  .env file not found in root directory');
}

// Check required files
const requiredFiles = [
  'server/index.js',
  'server/models/User.js',
  'server/models/JobRole.js',
  'server/routes/auth.js',
  'server/routes/roadmap.js',
  'server/services/geminiService.js',
  'client/package.json',
  'package.json'
];

console.log('\n📁 Checking required files...');
requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file}`);
  } else {
    errors.push(`❌ Missing: ${file}`);
  }
});

// Check for syntax errors by requiring files
console.log('\n🔧 Checking for syntax errors...');
try {
  require('./index.js');
  console.log('✅ server/index.js - No syntax errors');
} catch (error) {
  if (error.message.includes('Cannot find module')) {
    console.log('⚠️  server/index.js - Dependencies may not be installed');
    warnings.push('Run: npm install');
  } else {
    errors.push(`❌ server/index.js - ${error.message}`);
  }
}

// Check routes
const routes = [
  'routes/auth.js',
  'routes/roadmap.js',
  'routes/assistant.js',
  'routes/analysis.js'
];

routes.forEach(route => {
  try {
    require(`./${route}`);
    console.log(`✅ server/${route} - No syntax errors`);
  } catch (error) {
    if (error.message.includes('Cannot find module')) {
      console.log(`⚠️  server/${route} - Dependencies may not be installed`);
    } else {
      errors.push(`❌ server/${route} - ${error.message}`);
    }
  }
});

// Check services
try {
  require('./services/geminiService.js');
  console.log('✅ server/services/geminiService.js - No syntax errors');
} catch (error) {
  if (error.message.includes('Cannot find module')) {
    console.log('⚠️  server/services/geminiService.js - Dependencies may not be installed');
  } else {
    errors.push(`❌ server/services/geminiService.js - ${error.message}`);
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('📊 VALIDATION SUMMARY');
console.log('='.repeat(50));

if (errors.length === 0 && warnings.length === 0) {
  console.log('✅ All checks passed! No errors found.');
  console.log('\n🚀 Ready to start the application!');
  console.log('   Run: npm run dev');
} else {
  if (errors.length > 0) {
    console.log('\n❌ ERRORS FOUND:');
    errors.forEach(err => console.log(`   ${err}`));
  }
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS:');
    warnings.forEach(warn => console.log(`   ${warn}`));
  }
}

console.log('\n');

