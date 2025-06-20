# GitHub Repository Setup for AWS App Runner

## Files Already Ready in Your Workspace

All necessary files are already created and configured:

- `apprunner.yaml` - AWS App Runner configuration
- `server/` - Your application code
- `client/` - Frontend code
- `package.json` - Dependencies and scripts
- `Dockerfile` - Container configuration (backup option)

## Setup Process (No Downloads Required)

### Step 1: Create GitHub Repository
1. Go to GitHub.com
2. Click "New repository"
3. Name: `vpconnect` (or your preferred name)
4. Set to Public or Private
5. Don't add README, .gitignore, or license (your project has these)

### Step 2: Push Your Code to GitHub
Run these commands in your Replit terminal:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "VPConnect ready for AWS App Runner deployment"

# Connect to GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/vpconnect.git

# Push to GitHub
git push -u origin main
```

### Step 3: AWS App Runner Setup
1. Go to AWS Console → App Runner
2. Click "Create service"
3. Choose "Source code repository"
4. Select GitHub as provider
5. Connect your GitHub account
6. Select your repository
7. Branch: main
8. Configuration: Use configuration file (apprunner.yaml)
9. Set environment variables
10. Create service

## Required Environment Variables for AWS

Set these in AWS App Runner configuration:

```
NODE_ENV=production
SENDGRID_API_KEY=your_sendgrid_key
SESSION_SECRET=your_32_character_secret
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
```

## What AWS App Runner Will Do Automatically

1. Clone your GitHub repository
2. Read `apprunner.yaml` configuration
3. Install dependencies with `npm ci`
4. Build application with `npm run build`
5. Start application with `npm start`
6. Provide HTTPS endpoint
7. Set up auto-scaling
8. Monitor health

## No File Downloads Needed

Everything is contained in your Replit workspace:
- Configuration files are already created
- Application code is ready
- Build scripts are configured
- Environment is production-ready

Just push to GitHub and configure AWS App Runner to use your repository.