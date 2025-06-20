# Essential Files for GitHub Upload

## Upload ONLY These Files/Folders

### Root Configuration Files:
- `package.json`
- `apprunner.yaml`
- `Dockerfile`
- `drizzle.config.ts`
- `vite.config.ts`
- `tailwind.config.ts`
- `postcss.config.js`
- `tsconfig.json`
- `components.json`

### Documentation Files:
- `AWS_APP_RUNNER_DEPLOYMENT.md`
- `GITHUB_SETUP_GUIDE.md`
- `POST_DEPLOYMENT_UPDATES.md`
- `MANUAL_GITHUB_SETUP.md`
- `GITHUB_WEBSITE_UPLOAD_GUIDE.md`
- `GITHUB_UPLOAD_SOLUTION.md`

### Code Folders (Complete):
- `client/` (entire folder with all subfolders)
- `server/` (entire folder with all subfolders)  
- `shared/` (entire folder with all subfolders)

### DO NOT Upload:
- `node_modules/` (AWS installs automatically)
- `attached_assets/` (too many files)
- `uploads/` (runtime uploads)
- `data/` (runtime data)
- `.git/` (version control)
- Any `.log` files
- Any `.env` files

## Total File Count: ~150 files
This avoids GitHub's upload limit while including everything AWS App Runner needs.

## Quick Checklist:
- ✅ `package.json` (dependencies)
- ✅ `apprunner.yaml` (AWS config)
- ✅ `client/` folder (frontend)
- ✅ `server/` folder (backend)
- ✅ `shared/` folder (types)
- ✅ Config files (TypeScript, Vite, etc.)
- ❌ `node_modules/` (excluded)
- ❌ `attached_assets/` (excluded)

AWS App Runner will automatically install dependencies and build your application.