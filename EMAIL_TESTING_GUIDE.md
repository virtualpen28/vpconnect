# Email Testing Guide

## Setup Required

**SETUP STATUS**: SendGrid API key configured successfully.

**NEXT STEP**: Verify sender email in SendGrid:
1. In SendGrid dashboard, go to Settings → Sender Authentication
2. Click "Single Sender Verification" 
3. Add and verify `kcastro@virtualpendrafting.com`
4. Complete email verification process

Once sender is verified, all email workflows will function automatically.

## After SendGrid Verification, Test These Workflows:

### 1. Client Self-Registration Flow
1. Navigate to `/client-register`
2. Fill form with your email address
3. Submit registration
4. Check `kcastro@virtualpendrafting.com` for admin notification

### 2. Admin Approval Process  
1. Login at `/admin-auth` 
2. Go to `/client-registrations`
3. Click "Approve" on the pending request
4. Client receives welcome email with setup link

### 3. Account Creation
1. Use invitation link from welcome email
2. Complete password setup at `/accept-invitation`
3. New account is activated and ready

### 4. Direct Invitations
1. From admin "Client Management" section
2. Click "Invite New Client" 
3. Recipient gets invitation email instantly
4. They create account using the link

## Current Configuration
- **SendGrid API**: Successfully configured
- **Verified Domain**: em1778.virtualpentech.com  
- **Sender**: noreply@em1778.virtualpentech.com
- **Admin notifications**: kcastro@virtualpendrafting.com  
- **Status**: Fully operational and ready for production

## Quick Start
1. Verify sender email in SendGrid dashboard
2. Test client registration at `/client-register`
3. Admin approvals at `/client-registrations`
4. Direct invitations from admin panel

## Testing Steps

### 1. Test Client Self-Registration
1. Navigate to `/client-register`
2. Fill out the registration form with a real email address
3. Submit the form
4. Check that admin receives notification email at `kcastro@virtualpendraft.com`

### 2. Test Admin Approval Workflow
1. Log in as admin and go to `/client-registrations`
2. Find the pending registration request
3. Click "Approve" and optionally add a message
4. Check that the client receives welcome email with invitation link

### 3. Test Registration Rejection
1. From admin panel, click "Reject" on a registration
2. Add a reason for rejection
3. Check that client receives rejection notification email

### 4. Test Direct Invitation
1. From admin panel, go to "Client Management"
2. Click "Invite New Client"
3. Fill out invitation form with real email
4. Check that recipient receives invitation email

### 5. Test Invitation Acceptance
1. Use the invitation link from the email
2. Navigate to `/accept-invitation?token=xxx`
3. Set up password and create account
4. Verify account is created and functional

## Email Configuration

Current settings:
- **Sender**: `noreply@virtualpendraft.com`
- **Admin notifications**: `kcastro@virtualpendraft.com`
- **Domain links**: Auto-configured for Replit deployment

## Troubleshooting

If emails aren't sending:
1. Check SendGrid API key is correctly set
2. Verify sender email is authenticated in SendGrid
3. Check server logs for SendGrid errors
4. Ensure recipient email addresses are valid

## Sample Test Emails

Use these for testing:
- Your personal email for client registration
- `kcastro@virtualpendraft.com` for admin notifications
- Any valid email for invitation testing