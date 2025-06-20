import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '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';

if (!apiKey) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
} else {
  sgMail.setApiKey(apiKey);
  console.log('SendGrid API key configured successfully');
}

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  const apiKey = process.env.SENDGRID_API_KEY || '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';
  
  if (!apiKey) {
    console.log('SendGrid not configured, email would have been sent:', params.subject);
    return false;
  }

  try {
    await sgMail.send({
      to: params.to,
      from: 'noreply@em1778.virtualpentech.com', // Use your verified SendGrid domain
      subject: params.subject,
      html: params.html,
      text: params.text || stripHtml(params.html),
    });
    console.log(`Email sent successfully to ${params.to}: ${params.subject}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

// Helper function to strip HTML for text version
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

// Email templates
export const emailTemplates = {
  // New client registration notification to admins
  newRegistrationNotification: (requestData: any) => ({
    subject: 'New Client Registration Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Client Registration Request</h2>
        <p>A new client has requested access to the VPConnect platform:</p>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Client Information</h3>
          <p><strong>Name:</strong> ${requestData.firstName} ${requestData.lastName}</p>
          <p><strong>Email:</strong> ${requestData.email}</p>
          ${requestData.company ? `<p><strong>Company:</strong> ${requestData.company}</p>` : ''}
          ${requestData.position ? `<p><strong>Position:</strong> ${requestData.position}</p>` : ''}
          ${requestData.phone ? `<p><strong>Phone:</strong> ${requestData.phone}</p>` : ''}
        </div>
        
        ${requestData.message ? `
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Message from Client:</h4>
            <p style="font-style: italic;">"${requestData.message}"</p>
          </div>
        ` : ''}
        
        <p>Please review this request in your admin dashboard and approve or reject as appropriate.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'your-username'}.repl.co/client-registrations" 
             style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Registration Request
          </a>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated notification from VPConnect Client Management System.
        </p>
      </div>
    `
  }),

  // Welcome email with invitation link
  clientWelcomeInvitation: (invitationData: any) => ({
    subject: 'Welcome to VPConnect - Complete Your Account Setup',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">Welcome to VPConnect</h1>
          <p style="color: #6b7280; font-size: 18px;">Your client account has been approved!</p>
        </div>
        
        <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1e40af;">Account Approved</h2>
          <p>Hello ${invitationData.firstName || 'there'},</p>
          <p>Your request for access to the VPConnect client portal has been approved. You can now set up your account and access your project information.</p>
        </div>
        
        ${invitationData.message ? `
          <div style="background: #fef7cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Personal Message:</h4>
            <p style="font-style: italic;">"${invitationData.message}"</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'your-username'}.repl.co/accept-invitation?token=${invitationData.invitationToken}" 
             style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Complete Account Setup
          </a>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #dc2626; font-weight: bold;">Important:</p>
          <p style="margin: 5px 0 0 0; color: #dc2626;">This invitation link expires in 7 days. Please complete your account setup promptly.</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h3>What's Next?</h3>
          <ol style="color: #374151;">
            <li>Click the "Complete Account Setup" button above</li>
            <li>Create a secure password for your account</li>
            <li>Access your assigned projects and files</li>
            <li>Collaborate with the VPConnect team</li>
          </ol>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our support team.<br>
          This invitation was sent from VPConnect Client Management System.
        </p>
      </div>
    `
  }),

  // Registration rejection notification
  registrationRejection: (rejectionData: any) => ({
    subject: 'VPConnect Registration Request - Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Registration Request Update</h2>
        <p>Hello ${rejectionData.firstName} ${rejectionData.lastName},</p>
        
        <p>Thank you for your interest in accessing the VPConnect client portal. After reviewing your registration request, we are unable to approve access at this time.</p>
        
        ${rejectionData.reason ? `
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0; color: #dc2626;">Reason:</h4>
            <p style="margin: 0;">${rejectionData.reason}</p>
          </div>
        ` : ''}
        
        <p>If you believe this is an error or would like to provide additional information, please contact us directly.</p>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Thank you for your understanding.<br>
          VPConnect Team
        </p>
      </div>
    `
  }),

  // Direct invitation from admin
  directInvitation: (invitationData: any) => ({
    subject: 'You\'re Invited to Join VPConnect',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb;">You're Invited to VPConnect</h1>
          <p style="color: #6b7280; font-size: 18px;">Secure project collaboration platform</p>
        </div>
        
        <div style="background: #f0f9ff; padding: 25px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #1e40af;">Personal Invitation</h2>
          <p>Hello ${invitationData.firstName || 'there'},</p>
          <p>You have been invited to join VPConnect, our secure client collaboration platform where you can access project updates, files, and communicate with our team.</p>
        </div>
        
        ${invitationData.message ? `
          <div style="background: #fef7cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4 style="margin-top: 0;">Personal Message:</h4>
            <p style="font-style: italic;">"${invitationData.message}"</p>
          </div>
        ` : ''}
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://${process.env.REPL_SLUG || 'your-repl'}.${process.env.REPL_OWNER || 'your-username'}.repl.co/accept-invitation?token=${invitationData.invitationToken}" 
             style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
            Accept Invitation & Create Account
          </a>
        </div>
        
        <div style="background: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #dc2626; font-weight: bold;">Important:</p>
          <p style="margin: 5px 0 0 0; color: #dc2626;">This invitation expires in 7 days.</p>
        </div>
        
        <div style="margin: 30px 0;">
          <h3>What You'll Get Access To:</h3>
          <ul style="color: #374151;">
            <li>Real-time project updates and progress tracking</li>
            <li>Secure file sharing and document management</li>
            <li>Direct communication with project team</li>
            <li>Mobile-friendly dashboard for on-the-go access</li>
          </ul>
        </div>
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          If you have any questions, please contact our support team.<br>
          This invitation was sent from VPConnect Client Management System.
        </p>
      </div>
    `
  })
};

// Send notification to admins about new registration
export async function notifyAdminsOfNewRegistration(requestData: any): Promise<boolean> {
  const template = emailTemplates.newRegistrationNotification(requestData);
  
  // Configure admin emails for notifications
  const adminEmails = ['kcastro@virtualpendrafting.com'];
  
  const results = await Promise.all(
    adminEmails.map(email => 
      sendEmail({
        to: email,
        subject: template.subject,
        html: template.html
      })
    )
  );
  
  return results.some(result => result);
}

// Send welcome email with invitation link
export async function sendWelcomeInvitation(invitationData: any): Promise<boolean> {
  const template = emailTemplates.clientWelcomeInvitation(invitationData);
  
  return sendEmail({
    to: invitationData.email,
    subject: template.subject,
    html: template.html
  });
}

// Send rejection notification
export async function sendRejectionNotification(rejectionData: any): Promise<boolean> {
  const template = emailTemplates.registrationRejection(rejectionData);
  
  return sendEmail({
    to: rejectionData.email,
    subject: template.subject,
    html: template.html
  });
}

// Send direct invitation
export async function sendDirectInvitation(invitationData: any): Promise<boolean> {
  const template = emailTemplates.directInvitation(invitationData);
  
  return sendEmail({
    to: invitationData.email,
    subject: template.subject,
    html: template.html
  });
}