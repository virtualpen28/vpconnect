# AWS Deployment Guide for VPConnect

## AWS Deployment Options

### Option 1: AWS App Runner (Recommended for Node.js)
**Pros:** Fully managed, auto-scaling, easy setup
**Cost:** Pay per use, scales to zero

1. **Prepare Source Code**
   ```bash
   # Add production start script
   "scripts": {
     "start": "NODE_ENV=production node dist/index.js"
   }
   ```

2. **Create apprunner.yaml**
   ```yaml
   version: 1.0
   runtime: nodejs18
   build:
     commands:
       build:
         - npm install
         - npm run build
   run:
     runtime-version: 18
     command: npm start
     network:
       port: 5000
       env-vars:
         - NODE_ENV=production
   ```

3. **Deploy Steps**
   - Push code to GitHub
   - Create App Runner service in AWS Console
   - Connect GitHub repository
   - Configure environment variables
   - Deploy and get your AWS URL

### Option 2: AWS Elastic Beanstalk
**Pros:** Easy deployment, managed infrastructure
**Cost:** EC2 + ALB costs

1. **Install EB CLI**
   ```bash
   pip install awsebcli
   ```

2. **Initialize and Deploy**
   ```bash
   eb init vpconnect --platform node.js-18
   eb create vpconnect-prod
   eb deploy
   ```

### Option 3: AWS ECS with Fargate
**Pros:** Container-based, highly scalable
**Cost:** Based on CPU/memory usage

Create Dockerfile:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

## Environment Variables for AWS
Set these in your AWS deployment:

```
NODE_ENV=production
SENDGRID_API_KEY=[your-sendgrid-key]
SESSION_SECRET=[random-string]
AWS_ACCESS_KEY_ID=[your-aws-key]
AWS_SECRET_ACCESS_KEY=[your-aws-secret]
AWS_REGION=us-east-1
DATABASE_URL=[your-db-url]
```

## Domain Configuration
1. **Route 53 Hosted Zone**
   - Create hosted zone for vpconnect.app
   - Update nameservers at your domain registrar

2. **SSL Certificate**
   - Request certificate in AWS Certificate Manager
   - Validate domain ownership

3. **CloudFront Distribution** (Optional)
   - Create distribution pointing to your app
   - Attach SSL certificate
   - Configure custom domain

## Database Options
- **RDS PostgreSQL** (managed database)
- **DynamoDB** (your app already supports this)
- Keep existing Neon database and connect via URL

## Cost Estimation
- **App Runner:** ~$25-100/month depending on usage
- **Elastic Beanstalk:** ~$15-50/month for small instance
- **ECS Fargate:** ~$20-80/month based on resources