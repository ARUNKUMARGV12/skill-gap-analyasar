const mongoose = require('mongoose');
const JobRole = require('../models/JobRole');
require('dotenv').config();

const jobRoles = [
  {
    title: 'Full Stack Developer',
    description: 'Develop and maintain web applications using both frontend and backend technologies',
    category: 'Software Development',
    experienceLevel: 'mid',
    requiredSkills: [
      { skill: 'JavaScript', level: 'advanced', importance: 'critical' },
      { skill: 'React', level: 'intermediate', importance: 'high' },
      { skill: 'Node.js', level: 'intermediate', importance: 'high' },
      { skill: 'Database Design', level: 'intermediate', importance: 'medium' },
      { skill: 'RESTful APIs', level: 'intermediate', importance: 'high' },
      { skill: 'Git', level: 'intermediate', importance: 'medium' }
    ],
    averageSalary: { min: 70000, max: 120000, currency: 'USD' }
  },
  {
    title: 'Data Scientist',
    description: 'Analyze complex data sets to extract insights and build predictive models',
    category: 'Data Science',
    experienceLevel: 'mid',
    requiredSkills: [
      { skill: 'Python', level: 'advanced', importance: 'critical' },
      { skill: 'Machine Learning', level: 'intermediate', importance: 'critical' },
      { skill: 'Statistics', level: 'intermediate', importance: 'high' },
      { skill: 'SQL', level: 'intermediate', importance: 'high' },
      { skill: 'Data Visualization', level: 'intermediate', importance: 'medium' },
      { skill: 'TensorFlow/PyTorch', level: 'beginner', importance: 'medium' }
    ],
    averageSalary: { min: 90000, max: 150000, currency: 'USD' }
  },
  {
    title: 'DevOps Engineer',
    description: 'Manage infrastructure, CI/CD pipelines, and ensure system reliability',
    category: 'DevOps',
    experienceLevel: 'mid',
    requiredSkills: [
      { skill: 'Docker', level: 'intermediate', importance: 'critical' },
      { skill: 'Kubernetes', level: 'intermediate', importance: 'high' },
      { skill: 'AWS/Cloud Services', level: 'intermediate', importance: 'critical' },
      { skill: 'Linux', level: 'intermediate', importance: 'high' },
      { skill: 'CI/CD', level: 'intermediate', importance: 'high' },
      { skill: 'Monitoring Tools', level: 'beginner', importance: 'medium' }
    ],
    averageSalary: { min: 80000, max: 130000, currency: 'USD' }
  },
  {
    title: 'UI/UX Designer',
    description: 'Design user interfaces and create exceptional user experiences',
    category: 'Design',
    experienceLevel: 'mid',
    requiredSkills: [
      { skill: 'Figma', level: 'advanced', importance: 'critical' },
      { skill: 'User Research', level: 'intermediate', importance: 'high' },
      { skill: 'Prototyping', level: 'intermediate', importance: 'high' },
      { skill: 'Design Systems', level: 'intermediate', importance: 'medium' },
      { skill: 'HTML/CSS', level: 'beginner', importance: 'medium' },
      { skill: 'Accessibility', level: 'beginner', importance: 'low' }
    ],
    averageSalary: { min: 60000, max: 100000, currency: 'USD' }
  },
  {
    title: 'Cloud Architect',
    description: 'Design and implement cloud infrastructure solutions',
    category: 'Cloud Computing',
    experienceLevel: 'senior',
    requiredSkills: [
      { skill: 'AWS', level: 'advanced', importance: 'critical' },
      { skill: 'Azure', level: 'intermediate', importance: 'high' },
      { skill: 'Terraform', level: 'intermediate', importance: 'high' },
      { skill: 'System Design', level: 'advanced', importance: 'critical' },
      { skill: 'Security', level: 'intermediate', importance: 'high' },
      { skill: 'Networking', level: 'intermediate', importance: 'medium' }
    ],
    averageSalary: { min: 120000, max: 180000, currency: 'USD' }
  },
  {
    title: 'Mobile App Developer',
    description: 'Develop native or cross-platform mobile applications',
    category: 'Mobile Development',
    experienceLevel: 'mid',
    requiredSkills: [
      { skill: 'React Native', level: 'intermediate', importance: 'high' },
      { skill: 'Swift/Kotlin', level: 'intermediate', importance: 'medium' },
      { skill: 'Mobile UI/UX', level: 'intermediate', importance: 'high' },
      { skill: 'API Integration', level: 'intermediate', importance: 'high' },
      { skill: 'App Store Deployment', level: 'beginner', importance: 'medium' },
      { skill: 'Performance Optimization', level: 'beginner', importance: 'medium' }
    ],
    averageSalary: { min: 70000, max: 110000, currency: 'USD' }
  }
];

async function seedJobs() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/skillgap');
    console.log('Connected to MongoDB');

    // Clear existing jobs
    await JobRole.deleteMany({});
    console.log('Cleared existing job roles');

    // Insert new jobs
    await JobRole.insertMany(jobRoles);
    console.log(`Seeded ${jobRoles.length} job roles`);

    process.exit(0);
  } catch (error) {
    console.error('Error seeding jobs:', error);
    process.exit(1);
  }
}

seedJobs();

