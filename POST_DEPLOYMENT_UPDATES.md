# Post-Deployment Updates for VPConnect on AWS App Runner

## How to Make Changes After Deployment

### 1. Automatic Deployments (Recommended)
AWS App Runner monitors your GitHub repository and automatically deploys changes.

**Process:**
1. Make changes to your code locally
2. Commit and push to GitHub main branch
3. App Runner automatically detects changes
4. New deployment starts within 1-2 minutes
5. Zero-downtime deployment (users stay connected)

```bash
# Example workflow
git add .
git commit -m "Updated client registration form"
git push origin main
# AWS App Runner automatically deploys in ~3-5 minutes
```

### 2. Manual Deployments
You can trigger deployments manually from AWS Console.

**Steps:**
1. Go to AWS App Runner service
2. Click "Deploy" button
3. Choose specific commit or latest
4. Monitor deployment progress

### 3. Configuration Changes

#### Environment Variables
- Update through AWS Console → App Runner → Configuration
- No code changes needed
- Takes effect on next deployment

#### Scaling Settings
- Adjust auto-scaling parameters
- Change CPU/memory allocation
- Modify concurrency limits

### 4. Database Updates
Your app supports both storage types:

**Memory Storage:**
- Data persists in application memory
- Resets on each deployment
- Good for development/testing

**AWS Storage (DynamoDB + S3):**
- Data persists across deployments
- Production-ready
- Set `STORAGE_TYPE=aws` environment variable

### 5. Email Configuration Updates
Update SendGrid settings without code changes:
- Change `SENDGRID_API_KEY` in environment variables
- Modify email templates in code and redeploy
- Add new admin notification emails

## Deployment Strategies

### Hot Fixes (Urgent Changes)
1. Make minimal code change
2. Push to GitHub
3. Monitor App Runner deployment (3-5 minutes)
4. Verify fix in production

### Feature Updates
1. Test changes locally first
2. Commit with descriptive message
3. Push to GitHub
4. App Runner deploys automatically
5. Test new features on live site

### Database Schema Changes
1. Update schema in code
2. Test migration locally
3. Deploy to production
4. App Runner handles the update

## Rollback Options

### Quick Rollback
1. Go to App Runner → Deployments
2. Select previous successful deployment
3. Click "Redeploy"
4. Previous version restored in minutes

### Git Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin main
# App Runner deploys the reverted version
```

## Monitoring Changes

### Deployment Status
- Real-time logs in AWS Console
- Email notifications on deployment status
- CloudWatch metrics and alarms

### Application Health
- Built-in health checks
- Custom monitoring endpoints
- Error tracking and logging

## Best Practices

### Development Workflow
1. Make changes in development environment
2. Test locally with `npm run dev`
3. Commit with clear messages
4. Push to GitHub
5. Monitor deployment logs

### Environment Management
- Keep development and production environment variables separate
- Use AWS Parameter Store for sensitive data
- Test configuration changes in staging first

### Backup Strategy
- Regular database backups (if using AWS storage)
- Keep deployment history in App Runner
- Tag important releases in Git

## Common Update Scenarios

### Adding New Features
- Client registration enhancements
- New admin dashboard features
- Additional email templates
- UI/UX improvements

### Bug Fixes
- Form validation updates
- Authentication improvements
- Performance optimizations
- Security patches

### Configuration Updates
- Domain changes
- SSL certificate renewal (automatic)
- Scaling adjustments
- Environment variable updates

## Zero-Downtime Deployments
App Runner ensures your users experience no interruption:
- New version deployed alongside current version
- Traffic gradually shifted to new version
- Old version terminated after successful deployment
- Sessions maintained during updates

Your VPConnect app is designed for easy updates with minimal disruption to users.