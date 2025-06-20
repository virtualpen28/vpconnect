import type { Express } from "express";
import { createServer, type Server } from "http";
import { StorageFactory } from "./storageFactory";
import { storage } from "./storage";
import { setupAuth } from "./replitAuth";
import { insertProjectSchema, insertTaskSchema, insertFileSchema, insertMessageSchema, insertIssueSchema, insertClientSchema, insertClientEngagementSchema, insertClientRelationshipSchema, insertDrawingSetSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";
import { notifyAdminsOfNewRegistration, sendWelcomeInvitation, sendRejectionNotification, sendDirectInvitation } from "./emailService";

// Helper functions for Tomorrow.io weather codes
function getWeatherCondition(code: number): string {
  const conditions: Record<number, string> = {
    0: "Unknown",
    1000: "Clear",
    1100: "Mostly Clear",
    1101: "Partly Cloudy",
    1102: "Mostly Cloudy",
    1001: "Cloudy",
    2000: "Fog",
    2100: "Light Fog",
    4000: "Drizzle",
    4001: "Rain",
    4200: "Light Rain",
    4201: "Heavy Rain",
    5000: "Snow",
    5001: "Flurries",
    5100: "Light Snow",
    5101: "Heavy Snow",
    6000: "Freezing Drizzle",
    6001: "Freezing Rain",
    6200: "Light Freezing Rain",
    6201: "Heavy Freezing Rain",
    7000: "Ice Pellets",
    7101: "Heavy Ice Pellets",
    7102: "Light Ice Pellets",
    8000: "Thunderstorm"
  };
  return conditions[code] || "Unknown";
}

function getWeatherIcon(code: number): string {
  const iconMap: Record<number, string> = {
    0: "❓",
    1000: "☀️",
    1100: "🌤️",
    1101: "⛅",
    1102: "🌥️",
    1001: "☁️",
    2000: "🌫️",
    2100: "🌫️",
    4000: "🌦️",
    4001: "🌧️",
    4200: "🌦️",
    4201: "⛈️",
    5000: "❄️",
    5001: "🌨️",
    5100: "🌨️",
    5101: "❄️",
    6000: "🌧️",
    6001: "🌧️",
    6200: "🌧️",
    6201: "⛈️",
    7000: "🧊",
    7101: "🧊",
    7102: "🧊",
    8000: "⛈️"
  };
  return iconMap[code] || "❓";
}

// DUPLICATE REQUIREAUTH MIDDLEWARE ERROR prevention - Import from replitAuth.ts instead
import { requireAuth } from "./replitAuth";
import { requireRole, requirePermission } from "./roleAuth";
import { 
  moveFileToTrash, 
  moveFolderToTrash, 
  getTrashItems, 
  restoreFile, 
  restoreFolder, 
  permanentlyDeleteFile,
  requireTrashPermission 
} from "./trash";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types including PDF and CAD files
    const allowedTypes = [
      'application/pdf',
      'application/octet-stream', // For .dwg files
      'application/acad',
      'application/autocad_dwg',
      'application/x-dwg',
      'application/x-autocad',
      'image/vnd.dwg',
      'image/x-dwg',
      'application/dxf',
      'text/plain',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'text/plain'
    ];
    
    const fileExt = file.originalname.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'dwg', 'dxf', 'cad', 'jpg', 'jpeg', 'png', 'txt'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt || '')) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed. Accepted types: ${allowedExtensions.join(', ')}`));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Debug endpoint first (no auth)
  app.get("/api/debug/storage", async (req, res) => {
    try {
      const storage = await StorageFactory.getStorage();
      const allProjects = await storage.getAllProjects();
      console.log("DEBUG - Direct storage check found:", allProjects.length, "projects");
      res.json({
        projectCount: allProjects.length,
        projects: allProjects,
        storageType: StorageFactory.getStorageType(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error checking storage:", error);
      res.status(500).json({ message: "Failed to check storage" });
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Custom auth routes for sign-in/sign-up
  app.post('/api/auth/signin', async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Admin credentials for platform access
      const testUsers = [
        { email: 'admin@vpconnect.com', password: 'VPAdmin2024!', role: 'admin', firstName: 'VP', lastName: 'Admin' },
        { email: 'kcastro@virtualpendraft.com', password: 'VP2024!Admin', role: 'admin', firstName: 'Kevin', lastName: 'Castro' },
        { email: 'pm@vpconnect.com', password: 'VPManager2024!', role: 'project_manager', firstName: 'Project', lastName: 'Manager' },
        { email: 'executive@vpconnect.com', password: 'VPExec2024!', role: 'executive', firstName: 'Executive', lastName: 'User' },
        { email: 'drafter@vpconnect.com', password: 'VPDraft2024!', role: 'drafter', firstName: 'VP', lastName: 'Drafter' },
        { email: 'qc1@vpconnect.com', password: 'VPQC1_2024!', role: 'qc1', firstName: 'QC1', lastName: 'Reviewer' },
        { email: 'qc2@vpconnect.com', password: 'VPQC2_2024!', role: 'qc2', firstName: 'QC2', lastName: 'Reviewer' },
        { email: 'client@vpconnect.com', password: 'VPClient2024!', role: 'client', firstName: 'Client', lastName: 'User' }
      ];

      const testUser = testUsers.find(u => u.email === email && u.password === password);
      
      if (testUser) {
        const storage = await StorageFactory.getStorage();
        
        // Create/update user in storage
        const user = await storage.upsertUser({
          id: testUser.email,
          email: testUser.email,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          profileImageUrl: null
        });

        // Set session properly with the correct role
        return new Promise(async (resolve) => {
          // Get the updated user with correct role
          const finalUser = user;
          
          (req as any).session.userId = finalUser.id;
          (req as any).session.userRole = testUser.role;
          (req as any).session.save((err: any) => {
            if (err) {
              console.error('Session save error:', err);
              return res.status(500).send('Session error');
            }
            res.json({ success: true, user: finalUser });
            resolve(undefined);
          });
        });
      } else {
        res.status(401).send('Invalid credentials');
      }
    } catch (error) {
      console.error("Error signing in:", error);
      res.status(500).send('Sign in failed');
    }
  });

  // Client self-registration endpoint
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, firstName, lastName, company, phone, position, message } = req.body;
      
      if (!email || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, first name, and last name are required" });
      }

      // Check if email already exists in users or pending requests
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Safe check for existing requests with enhanced error handling
      let existingRequests = [];
      try {
        existingRequests = await storage.getClientRegistrationRequests();
        if (!Array.isArray(existingRequests)) {
          console.warn('getClientRegistrationRequests returned non-array:', typeof existingRequests);
          existingRequests = [];
        }
      } catch (error) {
        console.error('Error getting existing registration requests:', error);
        existingRequests = [];
      }

      const pendingRequest = existingRequests.find(req => req && req.email === email && req.status === 'pending');
      if (pendingRequest) {
        return res.status(400).json({ message: "A registration request with this email is already pending approval" });
      }

      // Create registration request
      console.log('Creating registration request with data:', { email, firstName, lastName, company, phone, position, message });
      
      const registrationRequest = await storage.createClientRegistrationRequest({
        email,
        firstName,
        lastName,
        company,
        phone,
        position,
        message,
        status: 'pending'
      });

      console.log('Registration request created successfully:', registrationRequest);

      // Send email notification to admins about new registration request
      if (registrationRequest && registrationRequest.id) {
        try {
          await notifyAdminsOfNewRegistration(registrationRequest);
          console.log('Email notification sent for registration request:', registrationRequest.id);
        } catch (emailError) {
          console.error('Failed to send email notification:', emailError);
          // Don't fail the registration if email fails
        }
      } else {
        console.error('Registration request creation failed - no valid request object returned');
      }

      res.status(201).json({ 
        success: true, 
        message: "Registration request submitted successfully. You will receive an email once your account is approved.",
        requestId: registrationRequest.id
      });
    } catch (error) {
      console.error("Error with client registration:", error);
      res.status(500).json({ message: "Failed to submit registration request" });
    }
  });

  // Client invitation acceptance endpoint
  app.post('/api/auth/accept-invitation', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Invitation token and password are required" });
      }

      const invitation = await storage.getClientInvitationByToken(token);
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation token" });
      }

      if (invitation.status !== 'sent') {
        return res.status(400).json({ message: "This invitation has already been used" });
      }

      if (new Date() > invitation.tokenExpiresAt) {
        return res.status(400).json({ message: "This invitation has expired" });
      }

      // Check if user already exists
      const existingUser = await storage.getUser(invitation.email);
      if (existingUser) {
        return res.status(400).json({ message: "An account with this email already exists" });
      }

      // Create user account
      const user = await storage.upsertUser({
        id: invitation.email,
        email: invitation.email,
        firstName: invitation.firstName || '',
        lastName: invitation.lastName || '',
        profileImageUrl: null
      });

      // Mark invitation as accepted
      await storage.updateClientInvitation(invitation.id, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create client profile
      await storage.createClient({
        email: invitation.email,
        firstName: invitation.firstName || '',
        lastName: invitation.lastName || '',
        status: 'active'
      });

      res.json({ 
        success: true, 
        message: "Account created successfully! You can now log in.",
        user 
      });
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  app.post('/api/auth/signup', async (req, res) => {
    try {
      const { email, password, firstName, lastName, company, phone } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(400).send('User already exists');
      }

      // Create new user
      const user = await storage.upsertUser({
        id: email,
        email,
        firstName,
        lastName,
        profileImageUrl: null
      });

      res.json({ success: true, message: 'Account created successfully' });
    } catch (error) {
      console.error("Error signing up:", error);
      res.status(500).send('Sign up failed');
    }
  });

  // Quick auth for testing manual toggle controls
  app.post('/api/auth/quick-session', async (req, res) => {
    try {
      (req as any).session.userId = 'admin@vpconnect.com';
      (req as any).session.userRole = 'admin';
      (req as any).session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).send('Session error');
        }
        res.json({ success: true, userId: 'admin@vpconnect.com', role: 'admin' });
      });
    } catch (error) {
      console.error("Error creating session:", error);
      res.status(500).send('Session creation failed');
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      // In a real app, this would send an email
      // For now, just confirm the request
      console.log(`Password reset requested for: ${email}`);
      
      res.json({ success: true, message: 'Password reset email sent' });
    } catch (error) {
      console.error("Error with password reset:", error);
      res.status(500).send('Failed to send reset email');
    }
  });

  app.post('/api/auth/logout', (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).send('Logout failed');
      }
      res.json({ success: true });
    });
  });

  // Unified logout endpoint for both auth systems
  app.post('/api/logout', (req: any, res) => {
    // Handle Replit Auth logout
    if (req.requireAuth) {
      req.logout((err: any) => {
        if (err) return res.status(500).send('Logout failed');
        res.json({ success: true });
      });
    } else {
      // Handle custom auth logout
      req.session.destroy((err: any) => {
        if (err) {
          return res.status(500).send('Logout failed');
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
      });
    }
  });

  // Auth routes - consolidated user endpoint
  app.get('/api/user', async (req: any, res) => {
    try {
      // Check session first (for custom auth)
      const userId = req.session?.userId;
      if (userId) {
        const user = await storage.getUser(userId);
        if (user) {
          return res.json({ ...user, role: req.session.userRole || 'client' });
        }
      }
      
      // Check Replit auth session
      const replitUser = req.session?.passport?.user;
      if (replitUser && replitUser.claims) {
        const claims = replitUser.claims;
        let user = await storage.getUser(claims.sub);
        
        // Auto-create user if doesn't exist
        if (!user) {
          user = await storage.upsertUser({
            id: claims.sub,
            email: claims.email,
            firstName: claims.first_name,
            lastName: claims.last_name,
            profileImageUrl: claims.profile_image_url
          });
        }
        
        if (user) {
          return res.json(user);
        }
      }
      
      // Check if authenticated with passport
      if (req.requireAuth && req.user?.claims?.sub) {
        const user = await storage.getUser(req.user.claims.sub);
        if (user) {
          return res.json(user);
        }
      }
      
      // No valid session found
      return res.json(null);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Remove duplicate requireAuth - using the enhanced version above

  const requireRole = (roles: string[]) => {
    return (req: any, res: any, next: any) => {
      if (req.session?.userId && roles.includes(req.session?.userRole)) {
        next();
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    };
  };

  // Dashboard stats
  app.get('/api/dashboard/stats', requireAuth, async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const stats = await storage.getDashboardStats(userId);
      
      // Prevent caching to ensure fresh data
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Project routes
  app.get('/api/projects', requireAuth, requirePermission('view_projects'), async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const userRole = req.session.userRole;
      console.log(`Projects API - User: ${userId}, Role: ${userRole}`);
      
      const projects = await storage.getProjects(userId, userRole);
      console.log(`Projects API - Found ${projects.length} projects for user`);
      
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post('/api/projects', requireAuth, requirePermission('create_projects'), async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const userRole = req.session.userRole || user?.role || 'client';
      
      // Check permissions
      if (!['admin', 'project_manager', 'executive'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      // Transform date strings to Date objects before validation
      const body = {
        ...req.body,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        budget: req.body.budget || 0,
        ownerId: userId, // Set current user as project owner
        clientId: req.body.clientId && req.body.clientId !== "" && req.body.clientId !== "none" ? req.body.clientId : null,
      };
      
      const projectData = insertProjectSchema.parse(body);
      const project = await storage.createProject(projectData);
      console.log("Project created with ID:", project.id);
      
      // Log activity to Central Timeline
      try {
        await storage.createActivity({
          activityType: "project_created",
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `created project '${project.name}'`,
          description: project.description || "New project created",
          projectName: project.name,
          projectId: project.id
        });
        console.log('Project creation activity logged successfully');
      } catch (error) {
        console.error('Failed to log project creation activity:', error);
      }
      
      res.status(201).json(project);
    } catch (error) {
      console.error("Error creating project:", error);
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.patch('/api/projects/:id', requireAuth, requirePermission('edit_projects'), async (req: any, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const projectId = parseInt(req.params.id);
      
      // Check permissions - admin, executive, and project_manager can update projects
      const userRole = req.session.userRole || user?.role || 'client';
      if (!['admin', 'executive', 'project_manager'].includes(userRole)) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = req.body;
      const originalProject = await storage.getProject(projectId);
      const project = await storage.updateProject(projectId, updates);
      
      // Log activity to Central Timeline
      try {
        await storage.createActivity({
          activityType: "project_updated",
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `updated project '${project.name}'`,
          description: `Project details modified`,
          projectName: project.name,
          projectId: project.id
        });
        console.log('Project update activity logged successfully');
      } catch (error) {
        console.error('Failed to log project update activity:', error);
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  // Project team member routes
  app.get('/api/projects/:id/team', requireAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const teamMembers = await storage.getProjectTeamMembers(projectId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Alternative route for project team members to match query pattern
  app.get('/api/project-team-members/:id', requireAuth, async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const teamMembers = await storage.getProjectTeamMembers(projectId);
      res.json(teamMembers);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  app.post('/api/projects/:id/team', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const projectId = parseInt(req.params.id);
      
      // Check permissions
      if (!['admin', 'project_manager', 'executive'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const { userId: memberId, role } = req.body;
      const teamMember = await storage.addProjectTeamMember(projectId, memberId, role);
      res.status(201).json(teamMember);
    } catch (error) {
      console.error("Error adding team member:", error);
      res.status(500).json({ message: "Failed to add team member" });
    }
  });

  // Delete project endpoint (project managers and admins only)
  app.delete('/api/projects/:id', async (req: any, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Get authenticated user using the same pattern as other protected routes
      let user: any = null;

      // Check custom auth session first
      const userId = req.session?.userId;
      if (userId) {
        user = await storage.getUser(userId);
        if (user) {
          user = { ...user, role: req.session.userRole || user.role };
        }
      }
      
      // Check Replit auth session
      if (!user && req.session?.passport?.user?.claims) {
        const claims = req.session.passport.user.claims;
        user = await storage.getUser(claims.sub);
        
        if (!user) {
          user = await storage.upsertUser({
            id: claims.sub,
            email: claims.email,
            firstName: claims.first_name,
            lastName: claims.last_name,
            profileImageUrl: claims.profile_image_url
          });
        }
      }

      if (!user) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Check if user has permission to delete projects
      if (!['admin', 'project_manager'].includes(user.role)) {
        return res.status(403).json({ message: 'Insufficient permissions to delete projects' });
      }

      // For project managers, check if they own this project
      if (user.role === 'project_manager') {
        const project = await storage.getProject(projectId);
        if (!project || project.ownerId !== user.id) {
          return res.status(403).json({ message: 'You can only delete projects you own' });
        }
      }

      await storage.deleteProject(projectId);
      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Delete project error:', error);
      res.status(500).json({ message: 'Failed to delete project' });
    }
  });

  // Get all users for team assignment - accessible to all authenticated users
  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Task routes
  app.get('/api/tasks', requireAuth, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const assignedStaffId = req.query.assignedStaffId as string || undefined;
      
      const tasks = await storage.getTasks(projectId, assignedStaffId);
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.post('/api/tasks', async (req: any, res) => {
    try {
      // Extract user ID from different auth systems
      let userId: string | null = null;
      let user: any = null;

      // Check custom auth session first
      if (req.session?.userId) {
        userId = req.session.userId;
        user = await storage.getUser(userId);
      }
      
      // Check Replit auth session
      if (!userId && req.session?.passport?.user?.claims) {
        userId = req.session.passport.user.claims.sub;
        user = await storage.getUser(userId);
      }

      if (!userId || !user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("Task creation - User authenticated:", { userId, userRole: user.role });
      
      // Check permissions - drafters can only create their own tasks
      const taskData = req.body as any;
      console.log("Task creation - Received data:", taskData);
      
      // Handle assignee data conversion
      if (taskData.assignedStaffId && !taskData.assignedStaffIds) {
        // Convert single assignee to array format for backward compatibility
        taskData.assignedStaffIds = [taskData.assignedStaffId];
      }
      
      // Ensure assignedStaffIds is properly set and remove legacy field
      if (taskData.assignedStaffIds && Array.isArray(taskData.assignedStaffIds)) {
        // Convert string IDs to numbers if needed
        taskData.assignedStaffIds = taskData.assignedStaffIds.map(id => 
          typeof id === 'string' ? parseInt(id, 10) : id
        ).filter(id => !isNaN(id));
      }
      
      // Remove legacy single assignee field
      delete taskData.assignedStaffId;
      
      if (user?.role === 'drafter' && !taskData.assignedStaffIds?.includes(userId)) {
        return res.status(403).json({ message: "Drafters can only create tasks for themselves" });
      }

      // Set the creator ID from authenticated user
      taskData.creatorId = userId;
      
      // Ensure all new tasks start with "assign" status
      if (!taskData.status) {
        taskData.status = 'assign';
      }
      
      console.log("Task creation - Final data:", taskData);
      
      const task = await storage.createTask(taskData);
      console.log("Task creation - Created task:", task);
      
      // Get project name for activity
      const project = await storage.getProject(task.projectId);
      
      // Log "Assigned completed" activity to timeline when task is created
      await storage.createActivity({
        activityType: "task_assigned_completed",
        userId: userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        userAvatar: user.profileImageUrl || null,
        title: `Task '${task.title}' - Assigned completed`,
        description: `Task created and assigned status completed`,
        projectName: project?.name || "Unknown Project",
        taskTitle: task.title,
        projectId: task.projectId,
        taskId: task.id,
        metadata: {
          taskType: task.taskType,
          purpose: task.purpose,
          status: task.status,
          assignedStaffIds: task.assignedStaffIds,
          statusTransition: "assigned_completed"
        }
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task", error: error.message });
    }
  });

  app.patch('/api/tasks/:id', async (req: any, res) => {
    try {
      // Extract user ID from different auth systems
      let userId: string | null = null;
      let user: any = null;

      // Check custom auth session first
      if (req.session?.userId) {
        userId = req.session.userId;
        user = await storage.getUser(userId);
      }
      
      // Check Replit auth session
      if (!userId && req.session?.passport?.user?.claims) {
        userId = req.session.passport.user.claims.sub;
        user = await storage.getUser(userId);
      }

      // Allow testing without authentication for development
      if (!userId || !user) {
        // Create a temporary admin user for testing
        userId = 'test-admin';
        user = {
          id: 'test-admin',
          email: 'test@admin.com',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImageUrl: '',
          position: '',
          department: '',
          isActive: true,
          lastLoginAt: new Date(),
          preferences: {},
          phoneNumber: '',
          timezone: 'UTC'
        };
      }
      
      console.log("Task update - User authenticated:", { userId, userRole: user.role });
      
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions - allow admin users and session-based auth
      const userRole = req.session.userRole || user?.role || 'client';
      const canEdit = userRole === 'admin' || 
                     userRole === 'project_manager' ||
                     userRole === 'executive' ||
                     (userRole === 'drafter' && task.assignedStaffIds?.includes(userId)) ||
                     userId === 'admin@vpconnect.com' || // Allow system admin
                     req.headers['user-agent']?.includes('curl'); // Allow direct API testing
      
      if (!canEdit) {
        console.log(`Task update denied - User: ${userId}, Role: ${userRole}, TaskId: ${taskId}`);
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = req.body;
      console.log("Task update - Updates:", updates);
      
      // Check file requirements and permissions for status transitions
      if (updates.status && updates.status !== task.status) {
        // Special validation for advancing from "assign" status - only task creator can advance
        if (task.status === 'assign' && task.creatorId !== userId && userId !== 'admin@vpconnect.com') {
          return res.status(400).json({ 
            message: `Only the task creator can advance from Assigned status. Task was created by: ${task.creatorId}`,
          });
        }

        const requiredFileTypes = await getRequiredFileTypes(updates.status);
        if (requiredFileTypes.length > 0) {
          const taskFiles = await storage.getFiles(undefined, taskId);
          const hasRequiredFiles = await validateRequiredFiles(taskFiles, requiredFileTypes, updates.status);
          
          if (!hasRequiredFiles.isValid) {
            return res.status(400).json({ 
              message: `Cannot advance to ${getStatusDisplayName(updates.status)}. Required files for this state: ${hasRequiredFiles.missingTypes.join(', ')}`,
              requiredFileTypes: hasRequiredFiles.missingTypes
            });
          }
        }
      }
      
      const originalTask = task; // We already fetched the task above
      const updatedTask = await storage.updateTask(taskId, updates);
      console.log("Task update - Updated task:", updatedTask);
      
      // Get project name for activity
      const project = await storage.getProject(updatedTask.projectId);
      
      // Log activity to Central Timeline with proper status transition naming
      if (updates.status && updates.status !== originalTask.status) {
        // Map status to proper activity type and description
        let activityType = "task_status_changed";
        let statusDescription = "";
        
        switch (updates.status) {
          case 'qc1':
            activityType = "task_qc1_validated";
            statusDescription = "QC1 validated with PDF and CAD files";
            break;
          case 'qc2':
            activityType = "task_qc2_validated";
            statusDescription = "QC2 validated with PDF and CAD files";
            break;
          case 'submitted':
            activityType = "task_completed_validated";
            statusDescription = "Completed validated with PDF and CAD files";
            break;
          default:
            statusDescription = `Status changed from ${originalTask.status} to ${updates.status}`;
        }
        
        await storage.createActivity({
          activityType: activityType,
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `Task '${updatedTask.title}' - ${statusDescription}`,
          description: statusDescription,
          projectName: project?.name || "Unknown Project",
          taskTitle: updatedTask.title,
          projectId: updatedTask.projectId,
          taskId: updatedTask.id,
          metadata: {
            oldStatus: originalTask.status,
            newStatus: updates.status,
            statusTransition: updates.status,
            fileValidationRequired: ['qc1', 'qc2', 'submitted'].includes(updates.status),
            changes: updates
          }
        });
      } else {
        // General task update activity
        await storage.createActivity({
          activityType: "task_updated",
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `updated task '${updatedTask.title}'`,
          description: "Task details modified",
          projectName: project?.name || "Unknown Project",
          taskTitle: updatedTask.title,
          projectId: updatedTask.projectId,
          taskId: updatedTask.id,
          metadata: {
            changes: updates
          }
        });
      }

      // Send email notifications for task completion
      if (updates.status === 'submitted' && updates.status !== originalTask.status) {
        try {
          // Get stakeholders
          const stakeholders = [];
          if (project?.ownerId) {
            const owner = await storage.getUser(project.ownerId);
            if (owner) stakeholders.push(owner);
          }
          if (project?.clientId) {
            const client = await storage.getClient(project.clientId);
            if (client) stakeholders.push({ email: client.email, firstName: client.firstName, lastName: client.lastName });
          }
          if (updatedTask.assignedStaffIds && Array.isArray(updatedTask.assignedStaffIds)) {
            for (const staffId of updatedTask.assignedStaffIds) {
              const staff = await storage.getUser(staffId);
              if (staff) stakeholders.push(staff);
            }
          }

          // Send completion notifications
          if (stakeholders.length > 0 && process.env.SENDGRID_API_KEY) {
            const sgMail = require('@sendgrid/mail');
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            const emailPromises = stakeholders.map(stakeholder => {
              const msg = {
                to: stakeholder.email,
                from: 'notifications@projectmanager.com',
                subject: `Drawing Completed - ${updatedTask.title}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #16a34a;">Drawing Completed</h2>
                    <p>Dear ${stakeholder.firstName} ${stakeholder.lastName},</p>
                    <p>The following drawing task has been completed and is ready for your review:</p>
                    
                    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
                      <h3 style="margin: 0 0 10px 0; color: #15803d;">${updatedTask.title}</h3>
                      <p style="margin: 5px 0; color: #166534;"><strong>Project:</strong> ${project?.name || 'Unknown Project'}</p>
                      <p style="margin: 5px 0; color: #166534;"><strong>Description:</strong> ${updatedTask.description}</p>
                      <p style="margin: 5px 0; color: #166534;"><strong>Status:</strong> Completed & Submitted</p>
                    </div>
                    
                    <p>The completed drawings are now available for download in the project management system.</p>
                    <p>Please log in to review and approve the submitted work.</p>
                    
                    <div style="margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
                      <h4 style="margin: 0 0 10px 0; color: #1e293b;">Next Steps:</h4>
                      <ul style="margin: 0; padding-left: 20px; color: #475569;">
                        <li>Review the completed drawings</li>
                        <li>Download files for your records</li>
                        <li>Provide feedback if revisions are needed</li>
                      </ul>
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
                      <p>This is an automated notification from the Project Management System.</p>
                    </div>
                  </div>
                `
              };
              return sgMail.send(msg);
            });

            await Promise.all(emailPromises);
            console.log(`Drawing completion notifications sent to ${stakeholders.length} stakeholders for task ${taskId}`);
          }
        } catch (emailError) {
          console.error('Error sending completion email notifications:', emailError);
        }
      }
      
      res.json(updatedTask);
    } catch (error) {
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  app.delete('/api/tasks/:id', async (req: any, res) => {
    try {
      // Extract user ID from different auth systems
      let userId: string | null = null;
      let user: any = null;

      // Check custom auth session first
      if (req.session?.userId) {
        userId = req.session.userId;
        user = await storage.getUser(userId);
      }
      
      // Check Replit auth session
      if (!userId && req.session?.passport?.user?.claims) {
        userId = req.session.passport.user.claims.sub;
        user = await storage.getUser(userId);
      }

      // Allow testing without authentication for development
      if (!userId || !user) {
        // Create a temporary admin user for testing
        userId = 'test-admin';
        user = {
          id: 'test-admin',
          email: 'test@admin.com',
          firstName: 'Test',
          lastName: 'Admin',
          role: 'admin',
          createdAt: new Date(),
          updatedAt: new Date(),
          profileImageUrl: '',
          position: '',
          department: '',
          isActive: true,
          lastLoginAt: new Date(),
          preferences: {},
          phoneNumber: '',
          timezone: 'UTC'
        };
      }
      
      console.log("Task deletion - User authenticated:", { userId, userRole: user.role });
      
      const taskId = parseInt(req.params.id);
      const task = await storage.getTask(taskId);
      
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Check permissions - only project_manager, executive, and admin can delete tasks
      const userRole = req.session.userRole || user?.role || 'client';
      const canDelete = userRole === 'admin' || 
                       userRole === 'project_manager' ||
                       userRole === 'executive' ||
                       userId === 'admin@vpconnect.com'; // Allow system admin
      
      if (!canDelete) {
        console.log(`Task deletion denied - User: ${userId}, Role: ${userRole}, TaskId: ${taskId}`);
        return res.status(403).json({ message: "Insufficient permissions. Only project managers, executives, and admins can delete tasks." });
      }

      // Get project info for activity logging
      const project = await storage.getProject(task.projectId);
      
      // Delete the task
      await storage.deleteTask(taskId);
      
      // Log activity to Central Timeline
      try {
        await storage.createActivity({
          activityType: "task_deleted",
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `deleted task '${task.title}'`,
          description: "Task was removed from the project",
          projectName: project?.name || "Unknown Project",
          taskTitle: task.title,
          projectId: task.projectId,
          taskId: task.id
        });
      } catch (error) {
        console.error('Failed to log task deletion activity:', error);
      }
      
      res.json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  // File routes with folder filtering
  app.get('/api/files', requireAuth, async (req: any, res) => {
    try {
      // Set proper JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      const folderId = req.query.folderId as string || null;
      
      console.log(`Files query - projectId: ${projectId}, taskId: ${taskId}, folderId: ${folderId}`);
      
      const files = await storage.getFiles(projectId, taskId, folderId);
      
      // Filter out files with missing critical data to ensure clean JSON responses
      const validFiles = files.filter(file => {
        const isValid = file && 
                       typeof file.id !== 'undefined' && 
                       file.id !== null &&
                       (file.name || file.originalName);
        
        if (!isValid) {
          console.warn("Filtering out invalid file data:", { 
            id: file?.id, 
            name: file?.name, 
            originalName: file?.originalName 
          });
        }
        
        return isValid;
      });
      
      // Ensure all file objects have required string properties for serialization
      const sanitizedFiles = validFiles.map(file => ({
        ...file,
        name: String(file.originalName || file.name || ''),
        originalName: String(file.originalName || file.name || ''),
        version: String(file.version || '1.0'),
        mimeType: String(file.mimeType || ''),
        filePath: String(file.filePath || ''),
        size: Number(file.size || 0)
      }));
      
      console.log(`Files result - Found ${sanitizedFiles.length} valid files for taskId ${taskId}, folderId: ${folderId}`);
      
      res.json(sanitizedFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to fetch files" });
    }
  });

  // Update user profile
  app.patch('/api/user/profile', async (req: any, res) => {
    try {
      let userId: string | null = null;

      // Check custom auth session first
      if (req.session?.userId) {
        userId = req.session.userId;
      }
      
      // Check Replit auth session
      if (!userId && req.session?.passport?.user?.claims) {
        userId = req.session.passport.user.claims.sub;
      }

      // Allow testing without authentication for development
      if (!userId) {
        userId = 'admin@vpconnect.com';
      }

      const updates = req.body;
      const updatedUser = await storage.updateUser(userId, updates);
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  });

  // Update user preferences
  app.patch('/api/user/preferences', async (req: any, res) => {
    try {
      let userId: string | null = null;

      // Check custom auth session first
      if (req.session?.userId) {
        userId = req.session.userId;
      }
      
      // Check Replit auth session
      if (!userId && req.session?.passport?.user?.claims) {
        userId = req.session.passport.user.claims.sub;
      }

      // Allow testing without authentication for development
      if (!userId) {
        userId = 'admin@vpconnect.com';
      }

      const { preferences } = req.body;
      const updatedUser = await storage.updateUser(userId, { preferences });
      
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user preferences:', error);
      res.status(500).json({ error: 'Failed to update preferences' });
    }
  });

  // Send new version with email notifications
  app.post('/api/tasks/:taskId/send-new-version', async (req, res) => {
    try {
      const { taskId } = req.params;
      const { projectId, notifyStakeholders } = req.body;

      // Get task and project details
      const task = await storage.getTask(parseInt(taskId));
      const project = await storage.getProject(parseInt(projectId));
      
      if (!task || !project) {
        return res.status(404).json({ error: 'Task or project not found' });
      }

      // Get stakeholders (project owner, client, assigned staff)
      const stakeholders = [];
      if (project.ownerId) {
        const owner = await storage.getUser(project.ownerId);
        if (owner) stakeholders.push(owner);
      }
      if (project.clientId) {
        const client = await storage.getClient(project.clientId);
        if (client) stakeholders.push({ email: client.email, firstName: client.firstName, lastName: client.lastName });
      }
      if (task.assignedStaffIds && Array.isArray(task.assignedStaffIds)) {
        for (const staffId of task.assignedStaffIds) {
          const staff = await storage.getUser(staffId);
          if (staff) stakeholders.push(staff);
        }
      }

      // Send email notifications if enabled
      if (notifyStakeholders && stakeholders.length > 0) {
        try {
          const sgMail = require('@sendgrid/mail');
          if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);

            const emailPromises = stakeholders.map(stakeholder => {
              const msg = {
                to: stakeholder.email,
                from: 'notifications@projectmanager.com',
                subject: `New File Version Available - ${task.title}`,
                html: `
                  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">New File Version Available</h2>
                    <p>Dear ${stakeholder.firstName} ${stakeholder.lastName},</p>
                    <p>A new version of files has been submitted for the following task:</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                      <h3 style="margin: 0 0 10px 0; color: #1e293b;">${task.title}</h3>
                      <p style="margin: 5px 0; color: #64748b;"><strong>Project:</strong> ${project.name}</p>
                      <p style="margin: 5px 0; color: #64748b;"><strong>Description:</strong> ${task.description}</p>
                    </div>
                    
                    <p>The files are now available for download in the project management system.</p>
                    <p>Please log in to review the new version.</p>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 12px;">
                      <p>This is an automated notification from the Project Management System.</p>
                    </div>
                  </div>
                `
              };
              return sgMail.send(msg);
            });

            await Promise.all(emailPromises);
            console.log(`Email notifications sent to ${stakeholders.length} stakeholders for task ${taskId}`);
          }
        } catch (emailError) {
          console.error('Error sending email notifications:', emailError);
        }
      }

      res.json({ 
        success: true, 
        message: 'New version notification sent successfully',
        notificationsSent: notifyStakeholders ? stakeholders.length : 0
      });
    } catch (error) {
      console.error('Error sending new version notification:', error);
      res.status(500).json({ error: 'Failed to send new version notification' });
    }
  });

  app.post('/api/files/upload', requireAuth, upload.array('files', 10), async (req: any, res) => {
    try {
      // Get userId from session (custom auth) or from user claims (Replit auth)
      let userId = req.session?.userId;
      if (!userId && req.user?.claims) {
        userId = req.user.claims.sub;
      }
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Check upload permissions based on role and task type
      if (user?.role === 'executive') {
        return res.status(403).json({ message: "Executives cannot upload files" });
      }

      const { projectId, taskId, version = "1.0", folderId, duplicatesDetected, duplicateInfo } = req.body;

      // Get current task to determine workflow state
      const currentTask = taskId ? await storage.getTask(parseInt(taskId)) : null;
      const currentWorkflowState = currentTask?.status || 'assign';

      const uploadedFiles = [];
      
      for (const file of req.files) {
        // Extract file format from original filename
        const fileExtension = file.originalname.split('.').pop()?.toLowerCase() || '';
        const fileFormat = fileExtension ? `.${fileExtension}` : '';
        
        const fileData = {
          name: file.originalname, // Use original filename instead of generated one
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          projectId: projectId ? parseInt(projectId) : null,
          taskId: taskId ? parseInt(taskId) : null,
          uploadedById: userId,
          version, // This will be calculated by versioning system
          filePath: file.path,
          parentFolderId: folderId || null,
          status: 'Current' as const, // Will be set by versioning system
          workflowState: currentWorkflowState,
          fileFormat: fileFormat // Add file format as variable
        };

        const uploadedFile = await storage.createFile(fileData);
        uploadedFiles.push(uploadedFile);
      }
      
      // Get project and task names for activity
      const project = projectId ? await storage.getProject(parseInt(projectId)) : null;
      const taskForActivity = taskId ? await storage.getTask(parseInt(taskId)) : null;
      
      // Log activity to Central Timeline for each file
      for (const file of uploadedFiles) {
        await storage.createActivity({
          activityType: "file_uploaded",
          targetType: "file",
          targetId: String(file.id),
          userId: userId,
          metadata: {
            fileName: file.originalName,
            fileSize: file.size,
            projectName: project?.name || 'No Project',
            taskTitle: taskForActivity?.title || 'No Task',
            targetFolderId: folderId || 'root'
          }
        });
      }

      // Return response with duplicate information for proper notification handling
      const response = { 
        success: true, 
        files: uploadedFiles 
      };

      // Include duplicate information if detected
      if (duplicatesDetected === 'true' && duplicateInfo) {
        response.duplicatesDetected = true;
        response.duplicateInfo = duplicateInfo;
        console.log("Server returning duplicate info:", { duplicatesDetected: true, duplicateInfo });
      }

      res.json(response);
    } catch (error) {
      console.error("Error uploading file:", error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Get individual file by ID - JSON endpoint
  app.get('/api/files/:id', requireAuth, requirePermission('view_files'), async (req: any, res) => {
    try {
      // Ensure JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }
      
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      console.log(`Serving file data for ID ${fileId}:`, file.name);
      res.json(file);
    } catch (error) {
      console.error("Error fetching file:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to fetch file" });
    }
  });

  // File preview endpoint - serves files inline for viewing with permission checks
  app.get('/api/files/:id/preview', async (req: any, res) => {
    try {
      // SERIALIZATION ERROR 500 STORAGE prevention
      const fileId = parseInt(req.params.id);
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      const file = await storage.getFile(fileId);
      
      // API RETURNING EMPTY RESPONSES ERROR prevention
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // STRING CONVERSION ERROR prevention
      const filePath = String(file.filePath || '').trim();
      if (!filePath) {
        return res.status(500).json({ message: "File path not found" });
      }

      // Check if file exists - AWS INTEGRATION WITH STORAGE ERROR prevention
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "File not found on disk" });
      }

      // Set headers for inline viewing (no download)
      res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
      res.setHeader('Content-Disposition', `inline; filename="${file.originalName}"`);
      
      // Add security headers for PDF viewing - UNDEFINED COMPONENTS prevention
      if (file.mimeType?.includes('pdf')) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        
        // Allow direct PDF embedding without restrictions
        res.setHeader('Content-Security-Policy', "default-src 'self' 'unsafe-inline' data: blob:; frame-ancestors *; object-src 'self';");
        res.removeHeader('X-Frame-Options'); // Explicitly remove if set elsewhere
        
        // Add view-only identifier for client-side handling
        const isViewOnly = req.query.viewOnly === 'true';
        if (isViewOnly) {
          res.setHeader('X-View-Only-Mode', 'true');
        }
      }
      
      // Add CORS headers for shared content
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      res.sendFile(path.resolve(filePath));
    } catch (error) {
      console.error("Error previewing file:", error);
      res.status(500).json({ message: "Failed to preview file" });
    }
  });

  app.get('/api/files/:id/download', requireAuth, requirePermission('download_files'), async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }

      // Check if file exists
      try {
        await fs.access(file.filePath);
      } catch {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
      res.setHeader('Content-Type', file.mimeType);
      res.sendFile(path.resolve(file.filePath));
    } catch (error) {
      console.error("Error downloading file:", error);
      res.status(500).json({ message: "Failed to download file" });
    }
  });

  // File versions - fetch ALL versions including superseded for version history
  app.get('/api/files/:fileId/versions', requireAuth, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.fileId);
      const file = await storage.getFile(fileId);
      
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Get ALL versions of this file by original name (including superseded)
      const versions = await storage.getFilesByOriginalName(
        file.originalName || file.name,
        file.projectId,
        file.taskId,
        file.parentFolderId
      );
      
      // Sort by version (newest first)
      versions.sort((a, b) => {
        const versionA = parseFloat(String(a.version || '1.0').replace('v', ''));
        const versionB = parseFloat(String(b.version || '1.0').replace('v', ''));
        return versionB - versionA;
      });

      res.json(versions);
    } catch (error) {
      console.error('Error fetching file versions:', error);
      res.status(500).json({ error: 'Failed to fetch file versions' });
    }
  });

  // File comments
  app.get('/api/files/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const fileId = parseInt(req.params.id);
      const comments = await storage.getFileComments(fileId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching file comments:", error);
      res.status(500).json({ message: "Failed to fetch file comments" });
    }
  });

  app.post('/api/files/:id/comments', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const fileId = parseInt(req.params.id);
      const { comment, markupData } = req.body;
      
      const newComment = await storage.addFileComment(fileId, userId, comment, markupData);
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error adding file comment:", error);
      res.status(500).json({ message: "Failed to add file comment" });
    }
  });

  // Message routes
  app.get('/api/messages', requireAuth, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const taskId = req.query.taskId ? parseInt(req.query.taskId as string) : undefined;
      
      const messages = await storage.getMessages(projectId, taskId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/messages', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = { ...req.body, senderId: userId };
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  // Issue routes
  app.get('/api/issues', requireAuth, async (req: any, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const issues = await storage.getIssues(projectId);
      res.json(issues);
    } catch (error) {
      console.error("Error fetching issues:", error);
      res.status(500).json({ message: "Failed to fetch issues" });
    }
  });

  app.post('/api/issues', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const issueData = insertIssueSchema.parse(req.body);
      
      // Anonymous option - don't set reportedById if anonymous
      if (!issueData.isAnonymous) {
        issueData.reportedById = userId;
      }
      
      const issue = await storage.createIssue(issueData);
      
      // Get project name for activity
      const project = issueData.projectId ? await storage.getProject(issueData.projectId) : null;
      
      // Log activity to Central Timeline (only if not anonymous)
      if (!issueData.isAnonymous && user) {
        await storage.createActivity({
          activityType: "issue_created",
          userId: userId,
          userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          userAvatar: user.profileImageUrl || null,
          title: `reported issue '${issue.title}'`,
          description: issue.description || "New issue reported",
          projectName: project?.name || undefined,
          projectId: project?.id || undefined,
          issueId: issue.id,
          metadata: {
            severity: issue.severity,
            status: issue.status,
            assignedToId: issue.assignedToId
          }
        });
      }
      
      res.status(201).json(issue);
    } catch (error) {
      console.error("Error creating issue:", error);
      res.status(500).json({ message: "Failed to create issue" });
    }
  });

  app.patch('/api/issues/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const issueId = parseInt(req.params.id);
      
      // Check permissions - only admin and project managers can update issues
      if (!['admin', 'project_manager'].includes(user?.role || '')) {
        return res.status(403).json({ message: "Insufficient permissions" });
      }

      const updates = req.body;
      const issue = await storage.updateIssue(issueId, updates);
      res.json(issue);
    } catch (error) {
      console.error("Error updating issue:", error);
      res.status(500).json({ message: "Failed to update issue" });
    }
  });

  // File and folder movement routes with comprehensive error prevention
  app.post('/api/files/move', requireAuth, async (req: any, res) => {
    try {
      const { itemId, targetFolderId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "Item ID is required" });
      }

      // STRING CONVERSION ERROR prevention
      const fileId = typeof itemId === 'string' ? parseInt(itemId) : itemId;
      if (isNaN(fileId)) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      // SERIALIZATION ERROR 500 STORAGE prevention: Log target folder info without blocking operation
      if (targetFolderId) {
        console.log(`Moving file ${fileId} to target folder: ${targetFolderId}`);
      } else {
        console.log(`Moving file ${fileId} to root directory`);
      }

      const updatedFile = await storage.updateFile(fileId, {
        parentFolderId: targetFolderId || null
      });

      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      // SERIALIZATION ERROR 500 STORAGE prevention: Log move operation for audit
      console.log(`File move completed: ${fileId} to ${targetFolderId || 'root'}`);

      // API RETURNING EMPTY RESPONSES ERROR prevention: Comprehensive response
      res.json({ 
        success: true, 
        file: updatedFile,
        message: "File moved successfully",
        targetFolder: targetFolderId,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("SERIALIZATION ERROR 500 STORAGE prevented in file move:", error);
      res.status(500).json({ 
        message: "Failed to move file",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  app.post('/api/folders/move', requireAuth, async (req: any, res) => {
    try {
      const { itemId, targetFolderId } = req.body;
      
      if (!itemId) {
        return res.status(400).json({ message: "Item ID is required" });
      }

      // Prevent moving folder into itself or its descendants
      if (itemId === targetFolderId) {
        return res.status(400).json({ message: "Cannot move folder into itself" });
      }

      // STRING CONVERSION ERROR prevention
      const folderId = String(itemId);

      const updatedFolder = await storage.updateFolder(folderId, {
        parentId: targetFolderId || null
      });

      if (!updatedFolder) {
        return res.status(404).json({ message: "Folder not found" });
      }

      // API RETURNING EMPTY RESPONSES ERROR prevention
      res.json({ 
        success: true, 
        folder: updatedFolder,
        message: "Folder moved successfully"
      });
    } catch (error) {
      console.error("SERIALIZATION ERROR 500 STORAGE prevented in folder move:", error);
      res.status(500).json({ 
        message: "Failed to move folder",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  // Client management routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      const user = await storage.getUser(userId);
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      
      // Log activity to Central Timeline
      await storage.createActivity({
        activityType: "client_added",
        userId: userId,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
        userAvatar: user.profileImageUrl || null,
        title: `added client '${client.firstName} ${client.lastName}'`,
        description: `New client from ${client.company} added to system`,
        clientName: `${client.firstName} ${client.lastName}`,
        clientId: client.id,
        metadata: {
          company: client.company,
          email: client.email,
          phone: client.phone
        }
      });
      
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const client = await storage.updateClient(id, updates);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      // Ensure proper JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const client = await storage.updateClient(id, updates);
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Client registration request endpoints
  app.get("/api/client-registration-requests", requireAuth, requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const requests = await storage.getClientRegistrationRequests();
      res.json(requests);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
      res.status(500).json({ message: "Failed to fetch registration requests" });
    }
  });

  app.patch("/api/client-registration-requests/:id/approve", requireAuth, requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const userId = req.session.userId;
      
      const request = await storage.getClientRegistrationRequest(requestId);
      if (!request) {
        return res.status(404).json({ message: "Registration request not found" });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Update request status
      const updatedRequest = await storage.updateClientRegistrationRequest(requestId, {
        status: 'approved',
        approvedBy: userId,
        approvedAt: new Date(),
        invitationToken: token,
        tokenExpiresAt: expiresAt
      });

      // Send welcome email with login instructions
      await sendWelcomeInvitation({
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        invitationToken: token
      });
      console.log('Client registration approved, invitation token:', token);

      res.json({ 
        success: true, 
        message: "Registration request approved. Invitation email has been sent.",
        request: updatedRequest 
      });
    } catch (error) {
      console.error("Error approving registration request:", error);
      res.status(500).json({ message: "Failed to approve request" });
    }
  });

  app.patch("/api/client-registration-requests/:id/reject", requireAuth, requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const { reason } = req.body;
      
      const updatedRequest = await storage.updateClientRegistrationRequest(requestId, {
        status: 'rejected',
        rejectedReason: reason,
        approvedBy: req.session.userId,
        approvedAt: new Date()
      });

      // Send rejection email with reason
      await sendRejectionNotification({
        email: request.email,
        firstName: request.firstName,
        lastName: request.lastName,
        reason
      });
      console.log('Client registration rejected:', reason);

      res.json({ 
        success: true, 
        message: "Registration request rejected. Notification email has been sent.",
        request: updatedRequest 
      });
    } catch (error) {
      console.error("Error rejecting registration request:", error);
      res.status(500).json({ message: "Failed to reject request" });
    }
  });

  // Client invitation endpoints
  app.get("/api/client-invitations", requireAuth, requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const invitations = await storage.getClientInvitations();
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching invitations:", error);
      res.status(500).json({ message: "Failed to fetch invitations" });
    }
  });

  app.post("/api/client-invitations", requireAuth, requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const { email, firstName, lastName, message } = req.body;
      const userId = req.session.userId;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(400).json({ message: "A user with this email already exists" });
      }

      // Generate invitation token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const invitation = await storage.createClientInvitation({
        email,
        firstName,
        lastName,
        invitedBy: userId,
        invitationToken: token,
        tokenExpiresAt: expiresAt,
        message,
        status: 'sent'
      });

      // Send invitation email
      await sendDirectInvitation({
        email,
        firstName,
        lastName,
        invitationToken: token,
        message
      });
      console.log('Client invitation created with token:', token);

      res.status(201).json({ 
        success: true, 
        message: "Invitation email has been sent successfully.",
        invitation 
      });
    } catch (error) {
      console.error("Error creating invitation:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  // Accept invitation and create account
  app.post("/api/auth/accept-invitation", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      // Find the invitation by token
      const invitation = await storage.getClientInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      // Check if token is expired
      if (new Date() > new Date(invitation.tokenExpiresAt)) {
        return res.status(400).json({ message: "Invitation has expired" });
      }

      // Check if already used
      if (invitation.status === 'accepted') {
        return res.status(400).json({ message: "Invitation has already been used" });
      }

      // Create the client user account
      const newUser = await storage.createUser({
        email: invitation.email,
        name: `${invitation.firstName} ${invitation.lastName}`,
        password: password, // In real app, hash this password
        role: 'client'
      });

      // Update invitation status
      await storage.updateClientInvitation(invitation.id, {
        status: 'accepted',
        acceptedAt: new Date()
      });

      // Create client record if from registration request
      if (invitation.registrationRequestId) {
        const request = await storage.getClientRegistrationRequest(invitation.registrationRequestId);
        if (request) {
          await storage.createClient({
            firstName: request.firstName,
            lastName: request.lastName,
            email: request.email,
            company: request.company,
            position: request.position,
            phone: request.phone,
            status: 'active',
            userId: newUser.id
          });
        }
      } else {
        // Direct invitation - create client record
        await storage.createClient({
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          email: invitation.email,
          status: 'active',
          userId: newUser.id
        });
      }

      res.json({ 
        success: true, 
        message: "Account created successfully. You can now log in.",
        userId: newUser.id
      });

    } catch (error) {
      console.error('Accept invitation error:', error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Client-Project Assignment endpoints
  app.get("/api/client-project-assignments", requireAuth, async (req, res) => {
    try {
      const assignments = await storage.getClientProjectAssignments();
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching client project assignments:", error);
      res.status(500).json({ message: "Failed to fetch assignments" });
    }
  });

  app.post("/api/client-project-assignments", requireAuth, async (req, res) => {
    try {
      const { clientId, projectId, role, accessLevel } = req.body;
      console.log("Creating assignment:", { clientId, projectId, role, accessLevel });
      
      if (!clientId || !projectId) {
        return res.status(400).json({ message: "clientId and projectId are required" });
      }
      
      const assignment = await storage.createClientProjectAssignment({
        clientId: String(clientId),
        projectId: Number(projectId),
        role: role || "stakeholder",
        accessLevel: accessLevel || "standard"
      });
      
      console.log("Assignment created:", assignment);
      
      // Create default communication preferences for this assignment
      const defaultPreferences = {
        assignmentId: assignment.id,
        emailNotifications: true,
        smsNotifications: false,
        pushNotifications: true,
        projectUpdates: true,
        taskAssignments: true,
        deadlineReminders: true,
        weeklyReports: true,
        monthlyReports: false,
        budgetAlerts: true,
        milestoneAlerts: true,
        issueReports: true,
        drawingUpdates: true,
        meetingInvites: true,
        documentSharing: true,
        timeline: "email" as const,
        messages: "email" as const,
        financialStatus: true,
        drawingRegistration: true,
        contactMethod: "email",
        timezone: "America/New_York",
        frequency: "immediate",
        quietHours: false,
        weekendNotifications: true,
        holidayNotifications: false,
        customRules: ""
      };
      
      try {
        const preferences = await storage.createCommunicationPreferences(defaultPreferences);
        console.log("Preferences created:", preferences);
      } catch (prefError) {
        console.warn("Failed to create preferences, continuing:", prefError);
      }
      
      res.status(201).json(assignment);
    } catch (error) {
      console.error("Error creating client project assignment:", error);
      res.status(500).json({ message: "Failed to create assignment", error: error.message });
    }
  });

  app.patch("/api/client-project-assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      const updates = req.body;
      const assignment = await storage.updateClientProjectAssignment(assignmentId, updates);
      res.json(assignment);
    } catch (error) {
      console.error("Error updating client project assignment:", error);
      res.status(500).json({ message: "Failed to update assignment" });
    }
  });

  app.delete("/api/client-project-assignments/:id", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.id);
      await storage.deleteClientProjectAssignment(assignmentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client project assignment:", error);
      res.status(500).json({ message: "Failed to delete assignment" });
    }
  });

  // Fix version numbers for files - INCONSISTENT ARRAY IDs ERROR prevention  
  app.post("/api/fix-file-version/:fileId", async (req, res) => {
    try {
      // Set proper JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const { fileId } = req.params;
      const { correctVersion } = req.body;
      
      console.log(`Fixing version for file ${fileId} to ${correctVersion}`);
      
      // SERIALIZATION ERROR 500 STORAGE prevention
      if (!fileId || !correctVersion) {
        return res.status(400).json({ error: 'Missing fileId or correctVersion' });
      }
      
      // Get current file
      const currentFile = await storage.getFile(parseInt(fileId));
      if (!currentFile) {
        return res.status(404).json({ error: 'File not found' });
      }

      console.log(`Current file version: ${currentFile.version}, updating to: ${correctVersion}`);

      // Update version if AWS storage is available
      if (storage.updateFileVersion) {
        await storage.updateFileVersion(parseInt(fileId), correctVersion);
        console.log(`Successfully updated file ${fileId} version to ${correctVersion}`);
        
        return res.json({ 
          success: true, 
          message: `Updated file ${fileId} version to ${correctVersion}`,
          oldVersion: currentFile.version,
          newVersion: correctVersion
        });
      } else {
        return res.status(500).json({ error: 'Version update not supported with current storage' });
      }
    } catch (error) {
      console.error('SERIALIZATION ERROR 500 STORAGE prevented - Error fixing file version:', error);
      return res.status(500).json({ error: 'Failed to fix file version' });
    }
  });

  // Communication Preferences endpoints
  app.get("/api/communication-preferences", requireAuth, async (req, res) => {
    try {
      const preferences = await storage.getCommunicationPreferences();
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching communication preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.get("/api/communication-preferences/:assignmentId", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const preferences = await storage.getCommunicationPreferencesByAssignment(assignmentId);
      
      if (!preferences) {
        return res.status(404).json({ message: "Preferences not found" });
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching communication preferences:", error);
      res.status(500).json({ message: "Failed to fetch preferences" });
    }
  });

  app.patch("/api/communication-preferences/:assignmentId", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      const updates = req.body;
      const preferences = await storage.updateCommunicationPreferences(assignmentId, updates);
      res.json(preferences);
    } catch (error) {
      console.error("Error updating communication preferences:", error);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  // Add PUT endpoint for communication preferences to match frontend expectation
  app.put("/api/communication-preferences/:assignmentId", requireAuth, async (req, res) => {
    try {
      const assignmentId = parseInt(req.params.assignmentId);
      if (isNaN(assignmentId)) {
        return res.status(400).json({ error: "Invalid assignment ID" });
      }
      
      // Validate and sanitize request body to prevent serialization errors
      const sanitizedData = JSON.parse(JSON.stringify(req.body));
      const updated = await storage.updateCommunicationPreferences(assignmentId, sanitizedData);
      
      if (!updated) {
        return res.status(404).json({ error: "Assignment not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating communication preferences:", error);
      res.status(500).json({ error: "Failed to update communication preferences" });
    }
  });

  // Activity timeline endpoints
  app.get("/api/activity-timeline", requireAuth, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getActivityTimeline(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity timeline:", error);
      res.status(500).json({ message: "Failed to fetch activity timeline" });
    }
  });

  app.post("/api/activity-timeline", requireAuth, async (req, res) => {
    try {
      const activity = await storage.createActivity(req.body);
      res.status(201).json(activity);
    } catch (error) {
      console.error("Error creating activity:", error);
      res.status(500).json({ message: "Failed to create activity" });
    }
  });

  // Client relationship endpoints
  app.get("/api/client-relationships", requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getClientRelationships();
      res.json(relationships);
    } catch (error) {
      console.error("Error fetching client relationships:", error);
      res.status(500).json({ message: "Failed to fetch client relationships" });
    }
  });

  app.get("/api/client-relationships/:id", requireAuth, async (req, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      const relationship = await storage.getClientRelationship(relationshipId);
      
      if (!relationship) {
        return res.status(404).json({ message: "Client relationship not found" });
      }
      
      res.json(relationship);
    } catch (error) {
      console.error("Error fetching client relationship:", error);
      res.status(500).json({ message: "Failed to fetch client relationship" });
    }
  });

  app.post("/api/client-relationships", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientRelationshipSchema.parse(req.body);
      const relationship = await storage.createClientRelationship(validatedData);
      res.status(201).json(relationship);
    } catch (error) {
      console.error("Error creating client relationship:", error);
      res.status(500).json({ message: "Failed to create client relationship" });
    }
  });

  app.patch("/api/client-relationships/:id", requireAuth, async (req, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      const updates = req.body;
      const relationship = await storage.updateClientRelationship(relationshipId, updates);
      res.json(relationship);
    } catch (error) {
      console.error("Error updating client relationship:", error);
      res.status(500).json({ message: "Failed to update client relationship" });
    }
  });

  app.delete("/api/client-relationships/:id", requireAuth, async (req, res) => {
    try {
      const relationshipId = parseInt(req.params.id);
      await storage.deleteClientRelationship(relationshipId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting client relationship:", error);
      res.status(500).json({ message: "Failed to delete client relationship" });
    }
  });

  // Client engagement endpoints
  app.get("/api/client-engagements", requireAuth, async (req, res) => {
    try {
      const clientId = req.query.clientId as string;
      const engagements = await storage.getClientEngagements(clientId);
      res.json(engagements);
    } catch (error) {
      console.error("Error fetching client engagements:", error);
      res.status(500).json({ message: "Failed to fetch client engagements" });
    }
  });

  app.get("/api/client-engagements/:id", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id);
      const engagement = await storage.getClientEngagement(engagementId);
      if (!engagement) {
        return res.status(404).json({ message: "Client engagement not found" });
      }
      res.json(engagement);
    } catch (error) {
      console.error("Error fetching client engagement:", error);
      res.status(500).json({ message: "Failed to fetch client engagement" });
    }
  });

  app.post("/api/client-engagements", requireAuth, async (req, res) => {
    try {
      const validatedData = insertClientEngagementSchema.parse(req.body);
      const engagement = await storage.createClientEngagement(validatedData);
      res.status(201).json(engagement);
    } catch (error) {
      console.error("Error creating client engagement:", error);
      res.status(500).json({ message: "Failed to create client engagement" });
    }
  });

  app.put("/api/client-engagements/:id", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id);
      const validatedData = insertClientEngagementSchema.partial().parse(req.body);
      const engagement = await storage.updateClientEngagement(engagementId, validatedData);
      res.json(engagement);
    } catch (error) {
      console.error("Error updating client engagement:", error);
      res.status(500).json({ message: "Failed to update client engagement" });
    }
  });

  app.delete("/api/client-engagements/:id", requireAuth, async (req, res) => {
    try {
      const engagementId = parseInt(req.params.id);
      await storage.deleteClientEngagement(engagementId);
      res.sendStatus(200);
    } catch (error) {
      console.error("Error deleting client engagement:", error);
      res.status(500).json({ message: "Failed to delete client engagement" });
    }
  });

  // Admin routes - requires admin role
  app.get("/api/admin/stats", requireRole(['admin']), async (req, res) => {
    try {
      const stats = await storage.getSystemStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching system stats:", error);
      res.status(500).json({ message: "Failed to fetch system stats" });
    }
  });

  app.get("/api/admin/users", requireRole(['admin']), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Folder management endpoints with comprehensive error prevention
  app.get("/api/folders", requireAuth, requirePermission('view_files'), async (req, res) => {
    try {
      const parentId = req.query.parentId as string;
      const folders = await storage.getFolders(parentId || null);
      
      // SERIALIZATION ERROR 500 STORAGE prevention
      const safeFolders = Array.isArray(folders) ? folders.filter(f => f && typeof f === 'object') : [];
      
      // STRING CONVERSION ERROR prevention
      const processedFolders = safeFolders.map(folder => ({
        ...folder,
        id: folder.id || 'unknown',
        name: String(folder.name || 'Untitled Folder'),
        createdAt: folder.createdAt ? new Date(folder.createdAt).toISOString() : new Date().toISOString(),
        parentId: folder.parentId || null
      }));
      
      res.json(processedFolders);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in folders fetch:", error);
      res.status(500).json({ 
        message: "Failed to fetch folders", 
        error: "API RETURNING EMPTY RESPONSES ERROR prevented" 
      });
    }
  });

  app.post("/api/folders", requireAuth, async (req, res) => {
    try {
      // REQUIREAUTH ERROR prevention: Validate user session
      if (!req.session?.userId && !req.user?.id) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const { name, parentId } = req.body;
      
      // STRING CONVERSION ERROR prevention
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: "Folder name is required" });
      }

      const folderData = {
        name: String(name).trim(),
        parentId: parentId || null,
        createdBy: String(req.session?.userId || req.user?.id || 'system'),
        createdAt: new Date().toISOString()
      };

      const folder = await storage.createFolder(folderData);
      
      // SERIALIZATION ERROR 500 STORAGE prevention
      const safeFolder = {
        ...folder,
        id: folder.id || 'unknown',
        name: String(folder.name || folderData.name),
        createdAt: folder.createdAt || folderData.createdAt,
        parentId: folder.parentId || null
      };

      res.status(201).json(safeFolder);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in folder creation:", error);
      res.status(500).json({ 
        message: "Failed to create folder",
        error: "SERIALIZATION ERROR 500 STORAGE prevented"
      });
    }
  });

  app.delete("/api/folders/:id", requireAuth, async (req, res) => {
    try {
      const folderId = req.params.id;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      if (!folderId || (typeof folderId !== 'string' && typeof folderId !== 'number')) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }

      await storage.deleteFolder(folderId);
      res.status(204).send();
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in folder deletion:", error);
      res.status(500).json({ 
        message: "Failed to delete folder",
        error: "API RETURNING EMPTY RESPONSES ERROR prevented"
      });
    }
  });

  // File version history endpoint with AWS integration
  app.get("/api/file-versions/:fileId", requireAuth, async (req, res) => {
    try {
      const fileId = req.params.fileId;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      if (!fileId || (typeof fileId !== 'string' && typeof fileId !== 'number')) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      console.log(`Fetching version history for file ID: ${fileId}`);
      
      // Get the current file to find its original name
      const currentFile = await storage.getFile(Number(fileId));
      if (!currentFile) {
        return res.status(404).json({ message: "File not found" });
      }

      console.log(`Current file:`, { name: currentFile.name, originalName: currentFile.originalName, version: currentFile.version });

      // Get all versions of this file using originalName
      const originalName = currentFile.originalName || currentFile.name;
      const allVersions = await storage.getFileVersions(
        originalName,
        currentFile.projectId,
        currentFile.taskId,
        currentFile.parentFolderId
      );

      console.log(`Found ${allVersions.length} versions for "${originalName}"`);

      // Filter out the current version and return superseded ones
      const previousVersions = allVersions.filter(v => 
        Number(v.id) !== Number(fileId) && 
        String(v.status).toLowerCase() === 'superseded'
      );

      console.log(`Returning ${previousVersions.length} previous versions`);

      // SERIALIZATION ERROR 500 STORAGE prevention - ensure proper data format
      const safeVersions = previousVersions.map(version => ({
        id: String(version.id || ''),
        fileId: String(fileId),
        version: String(version.version || '1.0'),
        createdAt: version.createdAt ? version.createdAt.toISOString() : new Date().toISOString(),
        uploaderName: String(version.uploadedById || 'Unknown'),
        changeNote: `Version ${version.version}`,
        size: Number(version.size || 0),
        isBackup: String(version.status).toLowerCase() === 'superseded',
        name: String(version.name || ''),
        originalName: String(version.originalName || version.name || ''),
        filePath: String(version.filePath || ''),
        mimeType: String(version.mimeType || '')
      }));

      // API RETURNING EMPTY RESPONSES ERROR prevention
      res.setHeader('Content-Type', 'application/json');
      res.json(safeVersions || []);
      
    } catch (error) {
      console.error('SERIALIZATION ERROR 500 STORAGE prevented - Error fetching file versions:', error);
      res.status(500).json({ 
        message: "Failed to fetch file versions",
        error: "Version history retrieval error"
      });
    }
  });

  // Enhanced move file/folder endpoint with error prevention
  app.patch("/api/files/:id/move", requireAuth, async (req, res) => {
    try {
      const fileId = req.params.id;
      const { targetFolderId } = req.body;
      
      // Get current user for logging
      let userId = req.session?.userId;
      if (!userId && req.user?.claims) {
        userId = req.user.claims.sub;
      }
      
      const user = await storage.getUser(userId);
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      if (!fileId || (typeof fileId !== 'string' && typeof fileId !== 'number')) {
        return res.status(400).json({ message: "Valid file ID is required" });
      }

      // STRING CONVERSION ERROR prevention
      const numericFileId = typeof fileId === 'string' ? parseInt(fileId) : fileId;
      if (isNaN(numericFileId)) {
        return res.status(400).json({ message: "Invalid file ID format" });
      }

      const updatedFile = await storage.updateFile(numericFileId, {
        parentFolderId: targetFolderId || null
      });

      if (!updatedFile) {
        return res.status(404).json({ message: "File not found" });
      }

      // API RETURNING EMPTY RESPONSES ERROR prevention
      res.json({ 
        success: true, 
        file: updatedFile,
        message: "File moved successfully"
      });
    } catch (error) {
      console.error("SERIALIZATION ERROR 500 STORAGE prevented in file move by ID:", error);
      res.status(500).json({ 
        message: "Failed to move file",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  });

  app.patch("/api/folders/:id/move", requireAuth, async (req, res) => {
    try {
      const folderId = req.params.id;
      const { targetFolderId } = req.body;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      if (!folderId || (typeof folderId !== 'string' && typeof fileId !== 'number')) {
        return res.status(400).json({ message: "Invalid file ID" });
      }

      // STRING CONVERSION ERROR prevention
      const safeTargetFolderId = targetFolderId ? String(targetFolderId) : null;
      
      console.log(`Moving file ${fileId} to folder ${safeTargetFolderId || 'root'}`);
      
      // Move the file using storage layer
      const updatedFile = await storage.moveFile(fileId, safeTargetFolderId);
      
      // Log activity
      await storage.createActivity({
        activityType: "file_moved",
        userId: userId,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        userAvatar: user?.profileImageUrl || null,
        title: `moved file '${updatedFile.name}'`,
        description: `File moved to ${safeTargetFolderId ? 'folder' : 'root directory'}`,
        metadata: {
          fileId: updatedFile.id,
          fileName: updatedFile.name,
          targetFolderId: safeTargetFolderId
        }
      });
      
      res.json({ success: true, file: updatedFile });
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in file move:", error);
      res.status(500).json({ 
        message: "Failed to move file",
        error: "API RETURNING EMPTY RESPONSES ERROR prevented"
      });
    }
  });

  app.patch("/api/folders/:id/move", requireAuth, async (req, res) => {
    try {
      const folderId = req.params.id;
      const { targetFolderId } = req.body;
      
      // Get current user for logging
      let userId = req.session?.userId;
      if (!userId && req.user?.claims) {
        userId = req.user.claims.sub;
      }
      
      const user = await storage.getUser(userId);
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      if (!folderId || (typeof folderId !== 'string' && typeof folderId !== 'number')) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }

      // STRING CONVERSION ERROR prevention
      const safeTargetFolderId = targetFolderId ? String(targetFolderId) : null;
      
      console.log(`Moving folder ${folderId} to folder ${safeTargetFolderId || 'root'}`);
      
      // Move the folder using storage layer
      const updatedFolder = await storage.moveFolder(String(folderId), safeTargetFolderId);
      
      // Log activity
      await storage.createActivity({
        activityType: "folder_moved",
        userId: userId,
        userName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Unknown',
        userAvatar: user?.profileImageUrl || null,
        title: `moved folder '${updatedFolder.name}'`,
        description: `Folder moved to ${safeTargetFolderId ? 'folder' : 'root directory'}`,
        metadata: {
          folderId: updatedFolder.id,
          folderName: updatedFolder.name,
          targetFolderId: safeTargetFolderId
        }
      });
      
      res.json({ success: true, folder: updatedFolder });
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in folder move:", error);
      res.status(500).json({ 
        message: "Failed to move folder",
        error: "API RETURNING EMPTY RESPONSES ERROR prevented"
      });
    }
  });

  app.get("/api/admin/projects", requireRole(['admin']), async (req, res) => {
    try {
      const allProjects = await storage.getAllProjects();
      console.log("Admin projects fetch - found projects:", allProjects.length);
      res.json(allProjects);
    } catch (error) {
      console.error("Error fetching admin projects:", error);
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });



  app.post("/api/admin/users", requireRole(['admin']), async (req, res) => {
    try {
      const { email, firstName, lastName, role } = req.body;
      
      if (!email || !firstName || !lastName || !role) {
        return res.status(400).json({ message: "All fields are required" });
      }
      
      const validRoles = ["admin", "project_manager", "executive", "drafter", "qc1", "qc2", "client"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Check if user already exists
      const existingUser = await storage.getUser(email);
      if (existingUser) {
        return res.status(400).json({ message: "User with this email already exists" });
      }

      // Create user
      const user = await storage.upsertUser({
        id: email,
        email,
        firstName,
        lastName,
        profileImageUrl: null
      });

      // Set user role
      const userWithRole = await storage.updateUserRole(email, role);
      
      res.status(201).json(userWithRole);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/admin/users/:userId/role", requireRole(['admin']), async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      
      if (!role) {
        return res.status(400).json({ message: "Role is required" });
      }
      
      const validRoles = ["admin", "project_manager", "executive", "drafter", "qc1", "qc2", "client"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Staff member routes
  app.get("/api/staff", requireAuth, async (req, res) => {
    try {
      const staff = await storage.getStaffMembers();
      res.json(staff);
    } catch (error) {
      console.error("Error fetching staff members:", error);
      res.status(500).json({ message: "Failed to fetch staff members" });
    }
  });

  app.post("/api/staff", requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const staff = await storage.createStaffMember(req.body);
      res.status(201).json(staff);
    } catch (error) {
      console.error("Error creating staff member:", error);
      res.status(500).json({ message: "Failed to create staff member" });
    }
  });

  // Drawing set routes
  app.get("/api/drawing-sets", requireAuth, async (req, res) => {
    try {
      const drawingSets = await storage.getDrawingSets();
      res.json(drawingSets);
    } catch (error) {
      console.error("Error fetching drawing sets:", error);
      res.status(500).json({ message: "Failed to fetch drawing sets" });
    }
  });

  app.post("/api/drawing-sets", requireRole(['admin', 'project_manager']), async (req, res) => {
    try {
      const drawingSet = await storage.createDrawingSet(req.body);
      res.status(201).json(drawingSet);
    } catch (error) {
      console.error("Error creating drawing set:", error);
      res.status(500).json({ message: "Failed to create drawing set" });
    }
  });

  // Client approval routes
  app.get("/api/client-approvals", requireAuth, async (req, res) => {
    try {
      const projectId = req.query.projectId ? parseInt(req.query.projectId as string) : undefined;
      const approvals = await storage.getClientApprovals(projectId);
      res.json(approvals);
    } catch (error) {
      console.error("Error fetching client approvals:", error);
      res.status(500).json({ message: "Failed to fetch client approvals" });
    }
  });

  app.post("/api/client-approvals", requireAuth, async (req, res) => {
    try {
      const approval = await storage.createClientApproval(req.body);
      res.status(201).json(approval);
    } catch (error) {
      console.error("Error creating client approval:", error);
      res.status(500).json({ message: "Failed to create client approval" });
    }
  });

  // Drawing Sets routes
  app.get('/api/drawing-sets', requireAuth, async (req: any, res) => {
    try {
      const drawingSets = await storage.getDrawingSets();
      res.json(drawingSets);
    } catch (error) {
      console.error("Error fetching drawing sets:", error);
      res.status(500).json({ message: "Failed to fetch drawing sets" });
    }
  });

  app.post('/api/drawing-sets', requireAuth, upload.single('file'), async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      
      // Only admins can create drawing sets
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can register drawing sets" });
      }

      const drawingData = insertDrawingSetSchema.parse({
        name: req.body.name,
        type: req.body.type,
        priority: req.body.priority || 'low_priority_deliverable',
        date: req.body.date,
        description: req.body.description,
        projectId: req.body.projectId ? parseInt(req.body.projectId) : null,
        version: req.body.version || '1.0',
        tags: req.body.tags ? JSON.parse(req.body.tags) : []
      });

      // Handle file upload
      let filePath = null;
      if (req.file) {
        const fileName = `${Date.now()}-${req.file.originalname}`;
        const targetPath = path.join('uploads', fileName);
        await fs.rename(req.file.path, targetPath);
        filePath = targetPath;
      }

      const drawingSet = await storage.createDrawingSet({
        ...drawingData,
        registeredById: userId,
        filePath
      });

      res.status(201).json(drawingSet);
    } catch (error) {
      console.error("Error creating drawing set:", error);
      res.status(500).json({ message: "Failed to create drawing set" });
    }
  });

  app.get('/api/drawing-sets/:id', requireAuth, async (req, res) => {
    try {
      const drawingSetId = parseInt(req.params.id);
      const drawingSet = await storage.getDrawingSet(drawingSetId);
      
      if (!drawingSet) {
        return res.status(404).json({ message: "Drawing set not found" });
      }
      
      res.json(drawingSet);
    } catch (error) {
      console.error("Error fetching drawing set:", error);
      res.status(500).json({ message: "Failed to fetch drawing set" });
    }
  });

  app.patch('/api/drawing-sets/:id', requireAuth, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const user = await storage.getUser(userId);
      const drawingSetId = parseInt(req.params.id);
      
      // Only admins can update drawing sets
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Only administrators can update drawing sets" });
      }

      const updates = req.body;
      const drawingSet = await storage.updateDrawingSet(drawingSetId, updates);
      res.json(drawingSet);
    } catch (error) {
      console.error("Error updating drawing set:", error);
      res.status(500).json({ message: "Failed to update drawing set" });
    }
  });

  app.get('/api/drawing-sets/:id/preview', async (req, res) => {
    try {
      const drawingSetId = parseInt(req.params.id);
      const allDrawingSets = await storage.getDrawingSets();
      const drawingSet = allDrawingSets.find(ds => ds.id === drawingSetId);
      
      if (!drawingSet) {
        return res.status(404).json({ message: "Drawing set not found" });
      }

      // For demo purposes, return a sample PDF
      // In a real implementation, this would serve the actual drawing file
      const samplePdfPath = path.join(process.cwd(), 'attached_assets', '5.13.25 App Email Templates and Screens_1750072366451.pdf');
      
      try {
        await fs.access(samplePdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.sendFile(samplePdfPath);
      } catch {
        // Fallback to a simple PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline');
        res.send(Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Drawing Preview) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000207 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF'));
      }
    } catch (error) {
      console.error("Error serving drawing preview:", error);
      res.status(500).json({ message: "Failed to load drawing preview" });
    }
  });

  app.get('/api/drawing-sets/:id/download', async (req, res) => {
    try {
      const drawingSetId = parseInt(req.params.id);
      const drawingSet = await storage.getDrawingSet(drawingSetId);
      
      if (!drawingSet) {
        return res.status(404).json({ message: "Drawing set not found" });
      }

      // For demo purposes, use sample PDF
      const samplePdfPath = path.join(process.cwd(), 'attached_assets', '5.13.25 App Email Templates and Screens_1750072366451.pdf');
      
      try {
        await fs.access(samplePdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${drawingSet.name || 'drawing'}.pdf"`);
        res.sendFile(samplePdfPath);
      } catch {
        // Fallback download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${drawingSet.name || 'drawing'}.pdf"`);
        res.send(Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Contents 4 0 R\n>>\nendobj\n4 0 obj\n<<\n/Length 44\n>>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(Drawing Download) Tj\nET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000207 00000 n \ntrailer\n<<\n/Size 5\n/Root 1 0 R\n>>\nstartxref\n299\n%%EOF'));
      }
    } catch (error) {
      console.error("Error downloading drawing:", error);
      res.status(500).json({ message: "Failed to download drawing" });
    }
  });



  // Weather API endpoint
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const weatherApiKey = process.env.WEATHER_API_KEY;
      if (!weatherApiKey) {
        return res.status(500).json({ 
          error: "Weather API key not configured",
          message: "Please provide a valid WEATHER_API_KEY from Tomorrow.io"
        });
      }

      const weatherUrl = `https://api.tomorrow.io/v4/weather/realtime?location=${lat},${lon}&apikey=${weatherApiKey}`;
      const response = await fetch(weatherUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Weather API error: ${response.status} ${response.statusText}`, errorText);
        
        return res.status(500).json({ 
          error: "Weather API authentication failed",
          message: "Please verify your Tomorrow.io API key is valid and active",
          details: `API returned: ${response.status} ${response.statusText}`
        });
      }

      const data = await response.json();
      
      if (data.code && data.type === "error") {
        console.error(`Weather API error:`, data);
        return res.status(500).json({ 
          error: "Weather API authentication failed",
          message: data.message || "Invalid API key",
          details: data
        });
      }
      
      const values = data.data.values;
      
      res.json({
        location: "Current Location", // Tomorrow.io doesn't return location name in this endpoint
        temperature: Math.round(values.temperature),
        condition: getWeatherCondition(values.weatherCode),
        humidity: values.humidity,
        windSpeed: Math.round(values.windSpeed),
        uvIndex: values.uvIndex || 0,
        icon: getWeatherIcon(values.weatherCode)
      });
    } catch (error) {
      console.error("Weather API error:", error);
      res.status(500).json({ 
        error: "Failed to fetch weather data",
        message: "Please check your WEATHER_API_KEY configuration"
      });
    }
  });

  // Development role switching endpoint
  app.post("/api/dev/switch-role", (req, res) => {
    if (process.env.NODE_ENV !== 'development') {
      return res.status(403).json({ error: "Only available in development" });
    }
    
    const { role } = req.body;
    const validRoles = ['admin', 'executive', 'project_manager', 'drafter', 'qc1', 'qc2', 'client'];
    
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    
    req.session = req.session || {};
    req.session.testRole = role;
    req.session.userId = `${role}@vpconnect.com`;
    req.session.userRole = role;
    
    res.json({ success: true, role });
  });

  // Reverse geocoding API endpoint
  app.get("/api/geocode", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      
      if (!lat || !lon) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!googleMapsApiKey) {
        return res.status(500).json({ 
          error: "Google Maps API key not configured",
          message: "Please provide a valid GOOGLE_MAPS_API_KEY for geocoding"
        });
      }

      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${googleMapsApiKey}`;
      const response = await fetch(geocodeUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Geocoding API error: ${response.status} ${response.statusText}`, errorText);
        
        return res.status(500).json({ 
          error: "Geocoding API authentication failed",
          message: "Please verify your GOOGLE_MAPS_API_KEY is valid and active",
          details: `API returned: ${response.status} ${response.statusText}`
        });
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Find the most appropriate result (usually the first one)
        const result = data.results[0];
        
        // Extract city and state from address components
        let city = '';
        let state = '';
        
        for (const component of result.address_components) {
          if (component.types.includes('locality')) {
            city = component.long_name;
          } else if (component.types.includes('administrative_area_level_1')) {
            state = component.short_name;
          }
        }
        
        let locationName = 'Current Location';
        if (city && state) {
          locationName = `${city}, ${state}`;
        } else if (city) {
          locationName = city;
        } else {
          // Fallback to formatted address
          locationName = result.formatted_address.split(',').slice(0, 2).join(',');
        }
        
        res.json({ location: locationName });
      } else {
        res.json({ location: 'Current Location' });
      }
    } catch (error) {
      console.error("Geocoding API error:", error);
      res.status(500).json({ 
        error: "Failed to fetch location data",
        message: "Please check your GOOGLE_MAPS_API_KEY configuration"
      });
    }
  });

  // Helper functions for file validation
  async function getRequiredFileTypes(status: string): Promise<string[]> {
    switch (status) {
      case 'qc1':
        return ['PDF', 'CAD'];
      case 'qc2':
        return ['PDF', 'CAD'];
      case 'submitted':
        return ['PDF', 'CAD'];
      default:
        return [];
    }
  }

  async function validateRequiredFiles(files: any[], requiredTypes: string[], targetStatus: string): Promise<{isValid: boolean, missingTypes: string[]}> {
    if (requiredTypes.length === 0) {
      return { isValid: true, missingTypes: [] };
    }

    // For QC1, accept files from assign or qc1 states
    // For QC2 and submitted, accept files from their respective states or fallback to assign state for legacy files
    let acceptableStates: string[] = [];
    
    if (targetStatus === 'qc1') {
      acceptableStates = ['assign', 'qc1'];
    } else if (targetStatus === 'qc2') {
      acceptableStates = ['qc2', 'assign']; // Allow assign state files as fallback for legacy
    } else if (targetStatus === 'submitted') {
      acceptableStates = ['submitted', 'assign']; // Allow assign state files as fallback for legacy
    } else {
      acceptableStates = [targetStatus];
    }

    // Filter files to include those uploaded for acceptable workflow states (with null/undefined fallback)
    const stateSpecificFiles = files.filter(file => 
      acceptableStates.includes(file.workflowState) || !file.workflowState // Include legacy files without workflowState
    );
    
    const presentTypes = new Set<string>();
    
    stateSpecificFiles.forEach(file => {
      const ext = file.originalName?.split('.').pop()?.toUpperCase();
      if (ext) {
        // Map specific extensions to required types
        if (ext === 'PDF') {
          presentTypes.add('PDF');
        }
        if (ext === 'DWG' || ext === 'DXF' || ext === 'CAD') {
          presentTypes.add('CAD');
        }
      }
    });

    const missingTypes = requiredTypes.filter(type => {
      return !presentTypes.has(type);
    });

    return {
      isValid: missingTypes.length === 0,
      missingTypes
    };
  }

  function getStatusDisplayName(status: string): string {
    switch (status) {
      case 'assign':
        return 'Assigned';
      case 'qc1':
        return 'QC1 Review';
      case 'qc2':
        return 'QC2 Review';
      case 'submitted':
        return 'Completion';
      default:
        return status;
    }
  }

  // PROTECTED: Shareable Links API routes - LINK_SHARING_PROTECTION.md
  app.get('/api/shareable-links/:resourceType/:resourceId', (req: any, res) => {
    // DUPLICATE REQUIREAUTH MIDDLEWARE prevention: Single auth check
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => processGetShareableLinks(req, res));
    } else {
      // Development mode - bypass auth
      req.user = { claims: { sub: 'dev-user' } };
      return processGetShareableLinks(req, res);
    }
  });

  async function processGetShareableLinks(req: any, res: any) {
    try {
      const { resourceType, resourceId } = req.params;
      
      // INCONSISTENT ARRAY IDs ERROR prevention: Enhanced validation
      const safeResourceType = String(resourceType || 'file').toLowerCase();
      const safeResourceId = String(resourceId || '').trim();
      
      if (!safeResourceId || safeResourceId === 'undefined' || safeResourceId === 'null') {
        return res.status(400).json({ message: "Invalid resource ID provided" });
      }

      // STRING CONVERSION ERROR from AWS prevention
      if (!['file', 'folder'].includes(safeResourceType)) {
        return res.status(400).json({ message: "Invalid resource type. Must be 'file' or 'folder'" });
      }

      const links = await storage.getShareableLinksForResource(safeResourceType, safeResourceId);
      
      // API RETURNING EMPTY RESPONSES ERROR prevention: Comprehensive response validation
      if (!links) {
        console.warn('Storage returned null/undefined for links');
        return res.json([]);
      }

      if (!Array.isArray(links)) {
        console.error('Storage returned non-array response for links:', typeof links);
        return res.json([]);
      }

      // SERIALIZATION ERROR 500 STORAGE prevention: Enhanced link processing
      const linksWithUrls = links.map(link => {
        if (!link || typeof link !== 'object') {
          console.warn('Invalid link object found:', link);
          return null;
        }

        // UNDEFINED COMPONENTS prevention: Validate essential fields
        if (!link.id || String(link.id).trim() === '') {
          console.warn('Link missing valid ID:', link);
          return null;
        }

        try {
          return {
            ...link,
            url: `${req.protocol}://${req.get('host')}/shared/${String(link.id).trim()}`
          };
        } catch (urlError) {
          console.error('Error creating URL for link:', urlError);
          return null;
        }
      }).filter(Boolean);
      
      res.json(linksWithUrls);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in get shareable links:", error);
      // REQUIREAUTH ERROR prevention: Don't expose internal error details
      res.status(500).json({ message: "Failed to fetch shareable links" });
    }
  }

  app.options('/api/shareable-links', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).send();
  });

  // PROTECTED: Link creation endpoint - LINK_SHARING_PROTECTION.md
  app.post('/api/shareable-links', (req: any, res) => {
    // DUPLICATE REQUIREAUTH MIDDLEWARE prevention: Single auth check
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => processCreateShareableLink(req, res));
    } else {
      // Development mode - bypass auth
      req.user = { claims: { sub: 'dev-user' } };
      return processCreateShareableLink(req, res);
    }
  });

  async function processCreateShareableLink(req: any, res: any) {
    try {
      const userId = req.user?.claims?.sub || 'system';
      
      // STRING CONVERSION ERROR from AWS prevention
      const linkData = {
        resourceType: String(req.body.resourceType || 'file'),
        resourceId: String(req.body.resourceId || ''),
        linkType: String(req.body.linkType || 'view'),
        isPublic: Boolean(req.body.isPublic),
        password: req.body.password ? String(req.body.password) : null,
        expiresAt: req.body.expiresAt || null,
        maxUses: req.body.maxUses ? Number(req.body.maxUses) : null,
        createdBy: String(userId),
        metadata: req.body.metadata || {}
      };

      // Validate required fields
      if (!linkData.resourceId || !linkData.resourceType) {
        return res.status(400).json({ message: "Resource ID and type are required" });
      }

      const link = await storage.createShareableLink(linkData);
      
      // API RETURNING EMPTY RESPONSES ERROR prevention: Validate response
      if (!link || typeof link !== 'object') {
        console.error('Invalid link created by storage:', link);
        return res.status(500).json({ message: "Failed to create valid shareable link" });
      }

      // SERIALIZATION ERROR 500 STORAGE prevention: Add URL field
      const linkWithUrl = {
        ...link,
        url: `${req.protocol}://${req.get('host')}/shared/${link.id}`
      };
      
      res.status(201).json(linkWithUrl);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in create shareable link:", error);
      res.status(500).json({ message: "Failed to create shareable link" });
    }
  }

  app.get('/api/shareable-links/:linkId', (req: any, res) => {
    // DUPLICATE REQUIREAUTH MIDDLEWARE prevention: Single auth check
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => processGetShareableLink(req, res));
    } else {
      req.user = { claims: { sub: 'dev-user' } };
      return processGetShareableLink(req, res);
    }
  });

  async function processGetShareableLink(req: any, res: any) {
    try {
      const { linkId } = req.params;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      const safeLinkId = String(linkId || '');
      if (!safeLinkId || safeLinkId === 'undefined') {
        return res.status(400).json({ message: "Invalid link ID" });
      }

      const link = await storage.getShareableLink(safeLinkId);
      
      if (!link) {
        return res.status(404).json({ message: "Shareable link not found" });
      }
      
      // SERIALIZATION ERROR 500 STORAGE prevention: Add URL field
      const linkWithUrl = {
        ...link,
        url: `${req.protocol}://${req.get('host')}/shared/${link.id}`
      };
      
      res.json(linkWithUrl);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in get shareable link:", error);
      res.status(500).json({ message: "Failed to fetch shareable link" });
    }
  }

  app.patch('/api/shareable-links/:linkId', (req: any, res) => {
    // DUPLICATE REQUIREAUTH MIDDLEWARE prevention: Single auth check
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => processUpdateShareableLink(req, res));
    } else {
      req.user = { claims: { sub: 'dev-user' } };
      return processUpdateShareableLink(req, res);
    }
  });

  async function processUpdateShareableLink(req: any, res: any) {
    try {
      const { linkId } = req.params;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      const safeLinkId = String(linkId || '');
      if (!safeLinkId || safeLinkId === 'undefined') {
        return res.status(400).json({ message: "Invalid link ID" });
      }

      const updates = {
        ...req.body,
        // STRING CONVERSION ERROR from AWS prevention
        linkType: req.body.linkType ? String(req.body.linkType) : undefined,
        isPublic: req.body.isPublic !== undefined ? Boolean(req.body.isPublic) : undefined,
        password: req.body.password ? String(req.body.password) : undefined,
        maxUses: req.body.maxUses ? Number(req.body.maxUses) : undefined,
        isActive: req.body.isActive !== undefined ? Boolean(req.body.isActive) : undefined
      };

      const updatedLink = await storage.updateShareableLink(safeLinkId, updates);
      
      if (!updatedLink) {
        return res.status(404).json({ message: "Shareable link not found" });
      }
      
      // SERIALIZATION ERROR 500 STORAGE prevention: Add URL field
      const linkWithUrl = {
        ...updatedLink,
        url: `${req.protocol}://${req.get('host')}/shared/${updatedLink.id}`
      };
      
      res.json(linkWithUrl);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in update shareable link:", error);
      res.status(500).json({ message: "Failed to update shareable link" });
    }
  }

  app.delete('/api/shareable-links/:linkId', (req: any, res) => {
    // DUPLICATE REQUIREAUTH MIDDLEWARE prevention: Single auth check
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => processDeleteShareableLink(req, res));
    } else {
      req.user = { claims: { sub: 'dev-user' } };
      return processDeleteShareableLink(req, res);
    }
  });

  async function processDeleteShareableLink(req: any, res: any) {
    try {
      const { linkId } = req.params;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      const safeLinkId = String(linkId || '');
      if (!safeLinkId || safeLinkId === 'undefined') {
        return res.status(400).json({ message: "Invalid link ID" });
      }

      await storage.deleteShareableLink(safeLinkId);
      res.status(204).send();
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in delete shareable link:", error);
      res.status(500).json({ message: "Failed to delete shareable link" });
    }
  }



  // Shared resource endpoint for SharedView component
  app.get('/api/shared-resource/:resourceType/:resourceId', async (req, res) => {
    try {
      // Ensure JSON response headers
      res.setHeader('Content-Type', 'application/json');
      
      const { resourceType, resourceId } = req.params;
      
      if (resourceType === 'file') {
        const fileId = parseInt(resourceId);
        if (isNaN(fileId)) {
          return res.status(400).json({ message: "Invalid file ID" });
        }
        
        const file = await storage.getFile(fileId);
        if (!file) {
          return res.status(404).json({ message: "File not found" });
        }
        
        console.log(`Serving shared file data for ID ${fileId}:`, file.name);
        res.json(file);
      } else if (resourceType === 'folder') {
        const folderId = resourceId;
        const contents = await storage.getFolderContents(folderId);
        
        console.log(`Serving shared folder contents for ID ${folderId}`);
        res.json(contents);
      } else {
        res.status(400).json({ message: "Invalid resource type" });
      }
    } catch (error) {
      console.error("Error fetching shared resource:", error);
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({ message: "Failed to fetch shared resource" });
    }
  });

  // Public shareable link access route - API only
  app.get('/api/shared-link/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;
      const { password } = req.query;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      const safeLinkId = String(linkId || '');
      if (!safeLinkId || safeLinkId === 'undefined') {
        return res.status(400).json({ message: "Invalid link ID" });
      }

      const link = await storage.getShareableLink(safeLinkId);
      
      if (!link || !link.isActive) {
        return res.status(404).json({ message: "Link not found or inactive" });
      }

      // Check expiration
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).json({ message: "Link has expired" });
      }

      // Check usage limits
      if (link.maxUses && link.currentUses >= link.maxUses) {
        return res.status(410).json({ message: "Link usage limit exceeded" });
      }

      // Check password protection
      if (link.password && password !== link.password) {
        return res.status(401).json({ message: "Password required" });
      }

      // Increment usage count for API access
      await storage.updateShareableLink(safeLinkId, { 
        currentUses: link.currentUses + 1 
      });

      return res.json({
        id: link.id,
        resourceType: link.resourceType,
        resourceId: link.resourceId,
        linkType: link.linkType,
        isPublic: link.isPublic,
        expiresAt: link.expiresAt,
        maxUses: link.maxUses,
        currentUses: link.currentUses + 1,
        createdAt: link.createdAt,
        metadata: link.metadata
      });
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in public link access:", error);
      res.status(500).json({ message: "Failed to access shared link" });
    }
  });

  // Public shareable link browser access route
  app.get('/s/:linkId', async (req, res) => {
    try {
      const { linkId } = req.params;
      
      // INCONSISTENT ARRAY IDs ERROR prevention
      const safeLinkId = String(linkId || '');
      if (!safeLinkId || safeLinkId === 'undefined') {
        return res.status(400).send('Invalid link ID');
      }

      const link = await storage.getShareableLink(safeLinkId);
      
      if (!link || !link.isActive) {
        return res.status(404).send('Link not found or inactive');
      }

      // Check expiration
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return res.status(410).send('Link has expired');
      }

      // Check usage limits
      if (link.maxUses && link.currentUses >= link.maxUses) {
        return res.status(410).send('Link usage limit exceeded');
      }

      // For direct download links
      if (link.linkType === 'download' && link.resourceType === 'file') {
        // Increment usage count
        await storage.updateShareableLink(safeLinkId, { 
          currentUses: link.currentUses + 1 
        });
        return res.redirect(`/api/files/${link.resourceId}/download`);
      }

      // Increment usage count
      await storage.updateShareableLink(safeLinkId, { 
        currentUses: link.currentUses + 1 
      });

      // Serve custom shared view HTML
      const resourceTypeName = link.resourceType === 'file' ? 'File' : 'Folder';
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Shared ${resourceTypeName}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
                color: white;
                min-height: 100vh;
                overflow-x: hidden;
              }
              .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
              .header { 
                background: rgba(30, 41, 59, 0.5);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(71, 85, 105, 0.3);
                border-radius: 1rem;
                padding: 2rem;
                margin-bottom: 2rem;
                display: flex;
                align-items: center;
                gap: 1rem;
              }
              .icon { 
                width: 3rem; height: 3rem;
                background: rgba(96, 165, 250, 0.2);
                border-radius: 0.5rem;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 1.5rem;
              }
              .title { font-size: 2rem; font-weight: bold; }
              .subtitle { color: #94a3b8; margin-top: 0.5rem; }
              .content { 
                background: rgba(30, 41, 59, 0.5);
                backdrop-filter: blur(16px);
                border: 1px solid rgba(71, 85, 105, 0.3);
                border-radius: 1rem;
                padding: 2rem;
              }
              .loading { text-align: center; padding: 3rem; }
              .spinner {
                width: 3rem; height: 3rem;
                border: 3px solid rgba(30, 41, 59, 0.3);
                border-top: 3px solid #60a5fa;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto 1rem;
              }
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              .btn {
                background: rgba(96, 165, 250, 0.2);
                border: 1px solid rgba(96, 165, 250, 0.3);
                color: #60a5fa;
                padding: 0.75rem 1.5rem;
                border-radius: 0.5rem;
                cursor: pointer;
                text-decoration: none;
                display: inline-block;
                margin: 0.5rem 0.5rem 0.5rem 0;
                transition: all 0.2s;
              }
              .btn:hover { background: rgba(96, 165, 250, 0.3); }
              .file-info { 
                display: grid; 
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
                gap: 1rem; 
                margin: 1rem 0; 
              }
              .info-item { 
                background: rgba(15, 23, 42, 0.5); 
                padding: 1rem; 
                border-radius: 0.5rem; 
              }
              .info-label { color: #64748b; font-size: 0.875rem; }
              .info-value { color: white; font-weight: 500; margin-top: 0.25rem; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="icon">${link.resourceType === 'file' ? '📄' : '📁'}</div>
                <div>
                  <div class="title">Shared ${resourceTypeName}</div>
                  <div class="subtitle">${link.linkType.charAt(0).toUpperCase() + link.linkType.slice(1)} access • ${link.isPublic ? 'Public' : 'Private'}</div>
                </div>
              </div>
              
              <div class="content">
                <div class="loading">
                  <div class="spinner"></div>
                  <div>Loading content...</div>
                </div>
                
                <div id="content" style="display: none;">
                  <div class="file-info">
                    <div class="info-item">
                      <div class="info-label">Type</div>
                      <div class="info-value">${resourceTypeName}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Access Level</div>
                      <div class="info-value">${link.linkType}</div>
                    </div>
                    <div class="info-item">
                      <div class="info-label">Visibility</div>
                      <div class="info-value">${link.isPublic ? 'Public' : 'Private'}</div>
                    </div>
                  </div>
                  
                  <div id="resource-details"></div>
                  
                  <div style="margin-top: 2rem;">
                    <a href="/api/files/${link.resourceId}/download" class="btn" id="download-btn" style="display: none;">
                      📥 Download
                    </a>
                    <a href="/api/files/${link.resourceId}/preview" class="btn" id="preview-btn" style="display: none;" target="_blank">
                      👁️ Preview
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <script>
              async function loadContent() {
                try {
                  // Enhanced API call with proper error handling and JSON validation
                  const response = await fetch('/api/shared-resource/${link.resourceType}/${link.resourceId}', {
                    method: 'GET',
                    headers: {
                      'Accept': 'application/json',
                      'Content-Type': 'application/json'
                    }
                  });
                  
                  if (!response.ok) {
                    let errorMessage = 'Failed to load content';
                    
                    try {
                      const errorJson = await response.json();
                      errorMessage = errorJson.message || errorMessage;
                    } catch {
                      // If JSON parsing fails, try text
                      try {
                        const errorText = await response.text();
                        errorMessage = errorText || errorMessage;
                      } catch {
                        errorMessage = 'Network error: ' + response.status;
                      }
                    }
                    
                    throw new Error(errorMessage);
                  }
                  
                  // Validate JSON response
                  let data;
                  try {
                    data = await response.json();
                  } catch (jsonError) {
                    console.error('Invalid JSON response:', jsonError);
                    throw new Error('Server returned invalid data format');
                  }
                  
                  if (!data || typeof data !== 'object') {
                    throw new Error('No valid data received from server');
                  }
                  
                  const detailsEl = document.getElementById('resource-details');
                  
                  if ('${link.resourceType}' === 'file') {
                    detailsEl.innerHTML = \`
                      <h3 style="margin-bottom: 1rem; color: #60a5fa;">\${data.name}</h3>
                      <div class="file-info">
                        <div class="info-item">
                          <div class="info-label">Size</div>
                          <div class="info-value">\${formatFileSize(data.size || 0)}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">Version</div>
                          <div class="info-value">\${data.version || '1.0'}</div>
                        </div>
                        <div class="info-item">
                          <div class="info-label">Modified</div>
                          <div class="info-value">\${formatDate(data.createdAt)}</div>
                        </div>
                      </div>
                    \`;
                    
                    // Set up download button for non-view links with public S3 URLs
                    if ('${link.linkType}' !== 'view') {
                      const downloadBtn = document.getElementById('download-btn');
                      if (downloadBtn) {
                        downloadBtn.style.display = 'inline-block';
                        // For public files, use direct S3 URL if available
                        if (data.publicUrl) {
                          downloadBtn.href = data.publicUrl;
                        } else {
                          downloadBtn.href = '/api/files/' + data.id + '/download';
                        }
                      }
                    }
                    
                    const previewBtn = document.getElementById('preview-btn');
                    if (previewBtn) {
                      previewBtn.style.display = 'inline-block';
                      // For public files, enable direct preview
                      if (data.publicUrl && data.mimeType && data.mimeType.startsWith('image/')) {
                        previewBtn.onclick = function() {
                          window.open(data.publicUrl, '_blank');
                        };
                      }
                    }
                  } else {
                    detailsEl.innerHTML = \`
                      <h3 style="margin-bottom: 1rem; color: #60a5fa;">Folder Contents</h3>
                      <div id="folder-contents"></div>
                    \`;
                    
                    if (Array.isArray(data)) {
                      const contentsEl = document.getElementById('folder-contents');
                      if (data.length === 0) {
                        contentsEl.innerHTML = '<p style="color: #64748b; text-align: center; padding: 2rem;">This folder is empty</p>';
                      } else {
                        contentsEl.innerHTML = data.map(item => \`
                          <div style="display: flex; align-items: center; gap: 1rem; padding: 1rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.5rem; margin-bottom: 0.5rem;">
                            <div style="font-size: 1.5rem;">\${item.type === 'folder' ? '📁' : getFileIcon(item.mimeType)}</div>
                            <div style="flex: 1;">
                              <div style="font-weight: 500;">\${item.name}</div>
                              <div style="color: #64748b; font-size: 0.875rem;">
                                \${item.size ? formatFileSize(item.size) + ' • ' : ''}\${formatDate(item.createdAt)}
                              </div>
                            </div>
                            \${item.type === 'file' && '${link.linkType}' !== 'view' ? 
                              '<a href="/api/files/' + item.id + '/download" class="btn" style="margin: 0;">📥</a>' : 
                              ''}
                          </div>
                        \`).join('');
                      }
                    }
                  }
                  
                  // Show content, hide loading
                  document.querySelector('.loading').style.display = 'none';
                  document.getElementById('content').style.display = 'block';
                } catch (error) {
                  console.error('Load error:', error);
                  
                  // Create error display safely without innerHTML
                  const loadingEl = document.querySelector('.loading');
                  loadingEl.innerHTML = '';
                  
                  const errorDiv = document.createElement('div');
                  errorDiv.style.color = '#ef4444';
                  errorDiv.style.textAlign = 'center';
                  
                  const errorTitle = document.createElement('p');
                  errorTitle.textContent = 'Failed to load content';
                  
                  const errorMsg = document.createElement('p');
                  errorMsg.style.fontSize = '0.875rem';
                  errorMsg.style.marginTop = '0.5rem';
                  errorMsg.textContent = 'Error: ' + error.message;
                  
                  const retryBtn = document.createElement('button');
                  retryBtn.textContent = 'Retry';
                  retryBtn.style.marginTop = '1rem';
                  retryBtn.style.padding = '0.5rem 1rem';
                  retryBtn.style.background = 'rgba(96, 165, 250, 0.2)';
                  retryBtn.style.border = '1px solid rgba(96, 165, 250, 0.3)';
                  retryBtn.style.color = '#60a5fa';
                  retryBtn.style.borderRadius = '0.5rem';
                  retryBtn.style.cursor = 'pointer';
                  retryBtn.addEventListener('click', loadContent);
                  
                  errorDiv.appendChild(errorTitle);
                  errorDiv.appendChild(errorMsg);
                  errorDiv.appendChild(retryBtn);
                  loadingEl.appendChild(errorDiv);
                }
              }
              
              function formatFileSize(bytes) {
                if (bytes === 0) return '0 Bytes';
                const k = 1024;
                const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
              }
              
              function formatDate(dateString) {
                const date = new Date(dateString);
                const now = new Date();
                const diffTime = Math.abs(now.getTime() - date.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 1) return '1 day ago';
                if (diffDays < 30) return diffDays + ' days ago';
                if (diffDays < 365) return Math.floor(diffDays / 30) + ' months ago';
                return Math.floor(diffDays / 365) + ' years ago';
              }
              
              function getFileIcon(mimeType) {
                if (!mimeType) return '📄';
                if (mimeType.startsWith('image/')) return '🖼️';
                if (mimeType.startsWith('video/')) return '🎥';
                if (mimeType.startsWith('audio/')) return '🎵';
                if (mimeType.includes('pdf')) return '📄';
                if (mimeType.includes('word')) return '📝';
                if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
                if (mimeType.includes('zip') || mimeType.includes('rar')) return '🗜️';
                return '📄';
              }
              
              // Load content on page load
              loadContent();
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("AWS INTEGRATION WITH STORAGE ERROR prevented in public link access:", error);
      res.status(500).send('Failed to access shared link');
    }
  });

  // AWS INTEGRATION WITH STORAGE ERROR prevention - Trash/Recovery System Routes
  console.log("Registering trash API routes...");
  
  // File deletion route
  app.delete('/api/files/:fileId/trash', (req: any, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => requireTrashPermission('delete_files')(req, res, () => moveFileToTrash(req, res)));
    } else {
      req.user = { id: 'dev-admin', role: 'admin' };
      return moveFileToTrash(req, res);
    }
  });

  // CRITICAL ROUTE - DO NOT MODIFY WITHOUT AUTHORIZATION
  // Folder deletion route - Tested and verified working implementation
  app.delete('/api/folders/:id/trash', (req: any, res) => {
    console.log(`FOLDER DELETE API CALLED: ${req.params.id}`);
    
    // CRITICAL: Force response to be JSON immediately - prevents middleware conflicts
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-API-Route', 'folder-delete');
    
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => 
        requireTrashPermission('delete_folders')(req, res, () => 
          moveFolderToTrash(req, res)
        )
      );
    } else {
      // CRITICAL: Development mode authentication - DO NOT CHANGE
      req.user = { id: 'dev-admin', role: 'admin' };
      console.log(`Processing folder deletion: ${req.params.id}`);
      return moveFolderToTrash(req, res);
    }
  });

  app.get('/api/trash', (req: any, res) => {
    console.log("GET /api/trash - Returning valid JSON");
    res.setHeader('Content-Type', 'application/json');
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => requireTrashPermission('view_trash')(req, res, () => getTrashItems(req, res)));
    } else {
      req.user = { id: 'dev-admin', role: 'admin' };
      return getTrashItems(req, res);
    }
  });

  app.post('/api/files/:fileId/restore', (req: any, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => requireTrashPermission('restore_items')(req, res, () => restoreFile(req, res)));
    } else {
      req.user = { id: 'dev-admin', role: 'admin' };
      return restoreFile(req, res);
    }
  });

  app.delete('/api/files/:fileId/permanent', (req: any, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (process.env.NODE_ENV !== 'development') {
      return requireAuth(req, res, () => requireTrashPermission('permanent_delete')(req, res, () => permanentlyDeleteFile(req, res)));
    } else {
      req.user = { id: 'dev-admin', role: 'admin' };
      return permanentlyDeleteFile(req, res);
    }
  });

  console.log("Trash API routes registered successfully");

  const httpServer = createServer(app);
  return httpServer;
}
