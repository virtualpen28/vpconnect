# GitHub Upload Solution - Avoiding "Too Many Files" Error

## The Problem
GitHub website upload limit is hit because of:
- `node_modules/` folder (thousands of files)
- `.git/` folder 
- Large asset folders
- Temporary files

## Solution: Upload Only Essential Files

### Method 1: Selective Upload (Recommended)

**Create a new folder with only these files:**

**Root files:**
- `package.json`
- `apprunner.yaml`
- `Dockerfile`
- `drizzle.config.ts`
- `vite.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`
- `components.json`
- All `.md` files (deployment guides)

**Folders to include:**
- `client/` folder (entire folder)
- `server/` folder (entire folder)
- `shared/` folder (entire folder)

**Folders to EXCLUDE:**
- `node_modules/` (AWS will install this)
- `.git/` (not needed)
- `attached_assets/` (too many files)
- `uploads/` (user uploads)
- `data/` (runtime data)

### Method 2: Use .gitignore Approach

Create a `.gitignore` file with:
```
node_modules/
.git/
attached_assets/
uploads/
data/
*.log
.env
```

Then upload everything except ignored files.

### What AWS App Runner Needs

AWS only needs:
1. `package.json` - for dependencies
2. `apprunner.yaml` - for configuration
3. `server/`, `client/`, `shared/` - your code
4. Configuration files (tsconfig, vite, etc.)

AWS will automatically:
- Install `node_modules` with `npm ci`
- Build your application
- Start the server

## Quick Steps

1. Create new folder: `vpconnect-deploy`
2. Copy only essential files (listed above)
3. Upload this smaller folder to GitHub
4. AWS App Runner will handle the rest

This reduces upload from ~50,000 files to ~200 files.