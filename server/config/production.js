module.exports = {
  mongodbUri: process.env.MONGODB_URI || process.env.COSMOSDB_CONNECTION_STRING,
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 8080,
  clientUrl: process.env.CLIENT_URL,
  geminiApiKeys: [
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].filter(Boolean)
};