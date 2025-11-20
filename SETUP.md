# Skill Gap Analyzer - Setup Guide

## Step 1: Get Your Gemini API Key(s)

1. Obtain Gemini (or Google Generative AI) API key(s) from your provider.
2. Sign in or create an account with the provider and generate API key(s).
3. **Recommended**: Get 2-3 API keys for better reliability and rate limit handling.
4. Copy the generated API key(s) for use in the backend `.env` file.

## Step 2: Set Up Environment Variables

### Backend (.env file)

1. Create a `.env` file in the root directory or `server` directory.

2. Add your Gemini API key(s). You can use any of these methods:

   **Option 1: Single API key**
   ```
   GEMINI_API_KEY=your-gemini-api-key-here
   ```

   **Option 2: Multiple API keys (Recommended)**
   ```
   GEMINI_API_KEY_1=your-first-api-key
   GEMINI_API_KEY_2=your-second-api-key
   GEMINI_API_KEY_3=your-third-api-key
   ```

   **Option 3: Comma-separated keys**
   ```
   GEMINI_API_KEYS=key1,key2,key3
   ```

   **Note**: You can use any combination of the above. The system will automatically rotate between available keys for better reliability.

3. Add other required settings:
   ```
   MONGODB_URI=mongodb://localhost:27017/skillgap
   JWT_SECRET=your-secret-key-change-in-production
   PORT=5000
   CLIENT_URL=http://localhost:3000
   ```

### Frontend (.env.local file)

1. Create `client/.env.local`:
   ```bash
   echo NEXT_PUBLIC_API_URL=http://localhost:5000/api > client\.env.local
   ```

## Step 3: Install Dependencies

```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

Or use the combined command:
```bash
npm run install-all
```

## Step 4: Set Up Database

Make sure MongoDB is running on your system, then seed the database with job roles:

```bash
node server/scripts/seedJobs.js
```

This will create 6 sample job roles in your database.

## Step 5: Run the Application

### Option 1: Run both servers together
```bash
npm run dev
```

### Option 2: Run separately

Terminal 1 (Backend):
```bash
npm run server
```

Terminal 2 (Frontend):
```bash
npm run client
```

## Step 6: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## First Time Setup

1. Go to http://localhost:3000
2. Click "Sign up" to create an account
3. Upload your resume (PDF, DOCX, or TXT)
4. Select a job role (or enter a custom job role)
5. Run skill gap analysis
6. Generate your learning roadmap
7. **New Features**:
   - Click on any roadmap step to expand and see details
   - Click "Get YouTube Playlists" to see free learning resources
   - Click "Generate Quiz" to test your knowledge
   - Pass the quiz (80%+) before marking a step as completed
   - Use the AI Assistant for research questions and project recommendations
8. Start tracking your progress!

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is installed and running
- Check your `MONGODB_URI` in `.env`

### Gemini API Errors
- Verify your `GEMINI_API_KEY` (or `GEMINI_API_KEY_1`, etc.) is correct in `.env`
- Check that you have API access enabled with your Gemini provider
- Ensure the API key(s) have appropriate rate limits
- **Tip**: Use multiple API keys for better reliability - the system will automatically rotate between them
- If one key fails, the system will try the next one automatically
- Check server logs for API key rotation messages

### Port Already in Use
- Change `PORT` in `.env` to a different port
- Update `NEXT_PUBLIC_API_URL` in `client/.env.local` accordingly

## Security Notes

- **Never commit your `.env` file to version control**
- Keep your `GEMINI_API_KEY` secret
- Change `JWT_SECRET` to a strong random string in production
- Use environment variables for all sensitive data

