# VPConnect Domain Connection Guide

## Current Configuration
Your VPConnect app is configured for deployment with:
- Port: 5000 (internal) → 80 (external)
- Build command: `npm run build`
- Start command: `npm run start`
- Auto-scaling deployment target

## Option 1: Replit Deployments (Recommended)
1. Click the "Deploy" button in Replit
2. Choose "Autoscale" deployment
3. Your app will get a `.replit.app` domain initially
4. In deployment settings, add your custom domain: `vpconnect.app`
5. Configure DNS records (see DNS Setup below)

## Option 2: External Hosting
If you want to host elsewhere:
1. Export your code from Replit
2. Deploy to services like Vercel, Netlify, or DigitalOcean
3. Configure your domain DNS to point to the hosting service

## DNS Setup for vpconnect.app
Add these DNS records in your domain registrar:

### For Replit Deployments:
```
Type: CNAME
Name: @
Value: [your-replit-deployment-url]

Type: CNAME  
Name: www
Value: [your-replit-deployment-url]
```

### For External Hosting:
```
Type: A
Name: @
Value: [hosting-service-ip]

Type: CNAME
Name: www  
Value: vpconnect.app
```

## Environment Configuration
Ensure these environment variables are set in production:
- `NODE_ENV=production`
- `SENDGRID_API_KEY` (for email functionality)
- `SESSION_SECRET` (for secure sessions)
- Database credentials if using external database

## SSL/HTTPS
- Replit Deployments include automatic SSL
- External hosting may require SSL certificate setup

## Next Steps
1. Use Replit's Deploy button for easiest setup
2. Configure your domain DNS settings
3. Test the deployment with your custom domain
4. Update any hardcoded URLs in your app if needed

Your app is production-ready with all serialization issues resolved and email functionality operational.