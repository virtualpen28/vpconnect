# AWS App Runner Deployment Guide for VPConnect

## Pre-Deployment Checklist
- ✅ Application is production-ready
- ✅ All serialization errors resolved
- ✅ SendGrid email system operational
- ✅ AWS integration configured
- ✅ Build scripts optimized

## Step 1: Prepare Your Code Repository

### 1.1 Push to GitHub
```bash
# Initialize git repository if not already done
git init
git add .
git commit -m "VPConnect production ready for AWS App Runner"

# Push to GitHub (create repository first)
git remote add origin https://github.com/yourusername/vpconnect.git
git push -u origin main
```

### 1.2 Repository Structure
Your repository should include:
- `apprunner.yaml` (configuration file - ✅ Created)
- `package.json` with build scripts (✅ Updated)
- All source code

## Step 2: AWS App Runner Setup

### 2.1 Access AWS Console
1. Go to AWS Console → App Runner
2. Click "Create service"
3. Choose "Source code repository"

### 2.2 Repository Configuration
1. **Repository provider**: GitHub
2. **Repository**: Select your VPConnect repository
3. **Branch**: main
4. **Deployment trigger**: Automatic
5. **Configuration file**: Use apprunner.yaml

### 2.3 Service Configuration
- **Service name**: vpconnect-production
- **Virtual CPU**: 1 vCPU
- **Virtual memory**: 2 GB
- **Auto scaling**: 
  - Min size: 1
  - Max size: 10
  - Max concurrency: 100

## Step 3: Environment Variables

Set these environment variables in App Runner:

### Required Variables:
```
NODE_ENV=production
SENDGRID_API_KEY=your_sendgrid_api_key
SESSION_SECRET=your_secure_random_string_min_32_chars
REPLIT_DOMAINS=vpconnect.app,www.vpconnect.app
```

### AWS Variables (if using AWS storage):
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
STORAGE_TYPE=aws
```

### Database Variables:
```
DATABASE_URL=your_database_connection_string
```

## Step 4: Custom Domain Setup

### 4.1 Configure Custom Domain in App Runner
1. Go to your App Runner service
2. Click "Custom domains" tab
3. Click "Link domain"
4. Enter: `vpconnect.app`
5. Add subdomain: `www.vpconnect.app`

### 4.2 DNS Configuration
Add these DNS records in your domain registrar:

```
Type: CNAME
Name: vpconnect.app
Value: [app-runner-generated-url]

Type: CNAME
Name: www
Value: [app-runner-generated-url]
```

## Step 5: SSL Certificate
App Runner automatically provisions SSL certificates for custom domains.
No additional configuration needed.

## Step 6: Health Checks
App Runner will automatically monitor your application at:
- Health check path: `/api/user`
- Healthy threshold: 3 successful requests
- Unhealthy threshold: 5 failed requests
- Timeout: 5 seconds
- Interval: 10 seconds

## Step 7: Deployment

### 7.1 Initial Deployment
1. Click "Create & deploy"
2. Wait for deployment (typically 5-10 minutes)
3. Monitor deployment logs

### 7.2 Verify Deployment
1. Test the App Runner URL
2. Test your custom domain
3. Verify email functionality
4. Test client registration workflow

## Cost Estimation
- **Base cost**: ~$7-10/month for minimal traffic
- **Scaling cost**: $0.064/vCPU-hour, $0.007/GB-hour
- **Data transfer**: $0.09/GB out
- **Expected monthly cost**: $25-75 for typical usage

## Monitoring & Logs
- App Runner provides built-in monitoring
- CloudWatch integration for detailed metrics
- Real-time deployment and application logs

## Troubleshooting

### Common Issues:
1. **Build fails**: Check Node.js version compatibility
2. **Environment variables**: Ensure all required variables are set
3. **Domain verification**: Check DNS propagation (24-48 hours)
4. **Email not working**: Verify SendGrid API key

### Support:
- AWS App Runner documentation
- CloudWatch logs for debugging
- AWS Support if needed

## Next Steps After Deployment:
1. Test all functionality on production domain
2. Set up monitoring alerts
3. Configure backup strategies
4. Update any hardcoded URLs in client applications
5. Inform users of the new domain

Your VPConnect application is now ready for production deployment on AWS App Runner!