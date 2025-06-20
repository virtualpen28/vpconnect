import {
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Task,
  type InsertTask,
  type File,
  type InsertFile,
  type Message,
  type InsertMessage,
  type Issue,
  type InsertIssue,
  type ProjectTeamMember,
  type FileComment,
  type ProgressChart,
  type InsertProgressChart,
  type ProgressStep,
  type InsertProgressStep,
  type Client,
  type InsertClient,
  type ClientEngagement,
  type InsertClientEngagement,
  type ClientRelationship,
  type InsertClientRelationship,
  type StaffMember,
  type InsertStaffMember,
  type DrawingSet,
  type InsertDrawingSet,
  type ClientApproval,
  type InsertClientApproval,
  type ClientProjectAssignment,
  type InsertClientProjectAssignment,
  type CommunicationPreferences,
  type InsertCommunicationPreferences,
  type ClientRegistrationRequest,
  type InsertClientRegistrationRequest,
  type ClientInvitation,
  type InsertClientInvitation,
} from "@shared/schema";
import { promises as fs } from "fs";
import path from "path";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Client registration and invitation operations
  getClientRegistrationRequests(): Promise<ClientRegistrationRequest[]>;
  getClientRegistrationRequest(id: number): Promise<ClientRegistrationRequest | undefined>;
  createClientRegistrationRequest(request: InsertClientRegistrationRequest): Promise<ClientRegistrationRequest>;
  updateClientRegistrationRequest(id: number, updates: Partial<InsertClientRegistrationRequest>): Promise<ClientRegistrationRequest>;
  deleteClientRegistrationRequest(id: number): Promise<void>;
  
  getClientInvitations(): Promise<ClientInvitation[]>;
  getClientInvitation(id: number): Promise<ClientInvitation | undefined>;
  getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined>;
  createClientInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation>;
  updateClientInvitation(id: number, updates: Partial<InsertClientInvitation>): Promise<ClientInvitation>;
  deleteClientInvitation(id: number): Promise<void>;

  // Project operations
  getProjects(userId: string, userRole?: string): Promise<Project[]>;
  getAllProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: number): Promise<void>;
  getProjectTeamMembers(projectId: number): Promise<ProjectTeamMember[]>;
  addProjectTeamMember(projectId: number, userId: string, role: string): Promise<ProjectTeamMember>;

  // Task operations
  getTasks(projectId?: number, assignedStaffId?: string): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Progress chart operations
  getProgressCharts(taskId: number): Promise<ProgressChart[]>;
  createProgressChart(chart: InsertProgressChart): Promise<ProgressChart>;
  updateProgressChart(id: number, updates: Partial<InsertProgressChart>): Promise<ProgressChart>;
  deleteProgressChart(id: number): Promise<void>;

  // Progress step operations
  getProgressSteps(chartId: number): Promise<ProgressStep[]>;
  createProgressStep(step: InsertProgressStep): Promise<ProgressStep>;
  updateProgressStep(id: number, updates: Partial<InsertProgressStep>): Promise<ProgressStep>;
  deleteProgressStep(id: number): Promise<void>;

  // File operations
  getFiles(projectId?: number, taskId?: number): Promise<File[]>;
  getFile(id: number): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: number, updates: Partial<InsertFile>): Promise<File>;
  deleteFile(id: number): Promise<void>;
  moveFile(fileId: string | number, targetFolderId: string | null): Promise<File>;
  getFileComments(fileId: number): Promise<FileComment[]>;
  addFileComment(fileId: number, userId: string, comment: string, markupData?: any): Promise<FileComment>;

  // Message operations
  getMessages(projectId?: number, taskId?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(messageId: number, userId: string): Promise<void>;

  // Issue operations
  getIssues(projectId?: number): Promise<Issue[]>;
  createIssue(issue: InsertIssue): Promise<Issue>;
  updateIssue(id: number, updates: Partial<InsertIssue>): Promise<Issue>;

  // Client operations
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Client engagement operations
  getClientEngagements(clientId?: string): Promise<ClientEngagement[]>;
  getClientEngagement(id: number): Promise<ClientEngagement | undefined>;
  createClientEngagement(engagement: InsertClientEngagement): Promise<ClientEngagement>;
  updateClientEngagement(id: number, updates: Partial<InsertClientEngagement>): Promise<ClientEngagement>;
  deleteClientEngagement(id: number): Promise<void>;

  // Client relationship operations
  getClientRelationships(): Promise<ClientRelationship[]>;
  getClientRelationship(id: number): Promise<ClientRelationship | undefined>;
  createClientRelationship(relationship: InsertClientRelationship): Promise<ClientRelationship>;
  updateClientRelationship(id: number, updates: Partial<InsertClientRelationship>): Promise<ClientRelationship>;
  deleteClientRelationship(id: number): Promise<void>;

  // Staff member operations
  getStaffMembers(): Promise<StaffMember[]>;
  createStaffMember(staffData: InsertStaffMember): Promise<StaffMember>;

  // Drawing set operations
  getDrawingSets(): Promise<DrawingSet[]>;
  getDrawingSet(id: number): Promise<DrawingSet | undefined>;
  createDrawingSet(drawingData: InsertDrawingSet & { registeredById: string; filePath?: string | null }): Promise<DrawingSet>;
  updateDrawingSet(id: number, updates: Partial<DrawingSet>): Promise<DrawingSet>;

  // Client approval operations
  getClientApprovals(projectId?: number): Promise<ClientApproval[]>;
  createClientApproval(approvalData: InsertClientApproval): Promise<ClientApproval>;

  // Activity timeline operations
  getActivityTimeline(limit?: number): Promise<any[]>;
  createActivity(activity: any): Promise<any>;

  // Analytics
  getDashboardStats(userId: string): Promise<{
    activeProjects: number;
    pendingTasks: number;
    completedTasks: number;
    issues: number;
  }>;

  // Admin operations
  getSystemStats(): Promise<any>;
  updateUserRole(userId: string, role: string): Promise<User>;
  updateUser(userId: string, updates: any): Promise<any>;

  // Client-Project Assignment operations
  getClientProjectAssignments(): Promise<ClientProjectAssignment[]>;
  getClientProjectAssignment(id: number): Promise<ClientProjectAssignment | undefined>;
  createClientProjectAssignment(assignment: InsertClientProjectAssignment): Promise<ClientProjectAssignment>;
  updateClientProjectAssignment(id: number, updates: Partial<InsertClientProjectAssignment>): Promise<ClientProjectAssignment>;
  deleteClientProjectAssignment(id: number): Promise<void>;

  // Folder operations
  getFolders(parentId?: string): Promise<any[]>;
  createFolder(name: string, parentId?: string): Promise<any>;
  deleteFolder(id: string): Promise<void>;
  moveFolder(folderId: string, targetFolderId: string | null): Promise<any>;

  // Communication Preferences operations
  getCommunicationPreferences(): Promise<CommunicationPreferences[]>;
  getCommunicationPreferencesByAssignment(assignmentId: number): Promise<CommunicationPreferences | undefined>;
  createCommunicationPreferences(preferences: InsertCommunicationPreferences): Promise<CommunicationPreferences>;
  updateCommunicationPreferences(assignmentId: number, updates: Partial<InsertCommunicationPreferences>): Promise<CommunicationPreferences>;
  deleteCommunicationPreferences(assignmentId: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private projects: Map<number, Project> = new Map();
  private tasks: Map<number, Task> = new Map();
  private files: Map<number, File> = new Map();
  private messages: Map<number, Message> = new Map();
  private issues: Map<number, Issue> = new Map();
  private projectTeamMembers: Map<string, ProjectTeamMember> = new Map();
  private fileComments: Map<number, FileComment> = new Map();
  private clients: Map<string, Client> = new Map();
  private clientEngagements: Map<number, ClientEngagement> = new Map();
  private clientRelationships: Map<number, ClientRelationship> = new Map();
  private progressCharts: Map<number, ProgressChart> = new Map();
  private progressSteps: Map<number, ProgressStep> = new Map();
  private staffMembers: Map<number, StaffMember> = new Map();
  private drawingSets: Map<number, DrawingSet> = new Map();
  private clientApprovals: Map<number, ClientApproval> = new Map();
  private clientProjectAssignments: Map<number, ClientProjectAssignment> = new Map();
  private communicationPreferences: Map<number, CommunicationPreferences> = new Map();
  private clientRegistrationRequests: Map<number, ClientRegistrationRequest> = new Map();
  private clientInvitations: Map<number, ClientInvitation> = new Map();
  private activityTimeline: Map<number, any> = new Map();
  
  private nextId = 1;
  private dataFile = path.join(process.cwd(), 'data', 'storage.json');

  private async ensureDataDir() {
    const dir = path.dirname(this.dataFile);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async saveData() {
    try {
      await this.ensureDataDir();
      
      // Safe serialization with Date handling
      const safeSerialize = (value: any): any => {
        if (value instanceof Date) {
          return value.toISOString();
        }
        if (Array.isArray(value)) {
          return value.map(safeSerialize);
        }
        if (value && typeof value === 'object') {
          const result: any = {};
          for (const [key, val] of Object.entries(value)) {
            result[key] = safeSerialize(val);
          }
          return result;
        }
        return value;
      };

      const data = {
        users: Array.from(this.users.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        projects: Array.from(this.projects.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        tasks: Array.from(this.tasks.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        files: Array.from(this.files.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        messages: Array.from(this.messages.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        issues: Array.from(this.issues.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        projectTeamMembers: Array.from(this.projectTeamMembers.entries()),
        fileComments: Array.from(this.fileComments.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clients: Array.from(this.clients.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientEngagements: Array.from(this.clientEngagements.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientRelationships: Array.from(this.clientRelationships.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        progressCharts: Array.from(this.progressCharts.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        progressSteps: Array.from(this.progressSteps.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        staffMembers: Array.from(this.staffMembers.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        drawingSets: Array.from(this.drawingSets.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientApprovals: Array.from(this.clientApprovals.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientProjectAssignments: Array.from(this.clientProjectAssignments.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        communicationPreferences: Array.from(this.communicationPreferences.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientRegistrationRequests: Array.from(this.clientRegistrationRequests.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        clientInvitations: Array.from(this.clientInvitations.entries()).map(([k, v]) => [k, safeSerialize(v)]),
        nextId: this.nextId,
      };

      await fs.writeFile(this.dataFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
      console.error('Failed to save storage data - serialization error prevented:', error);
      throw error;
    }
  }

  private async loadData() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      const parsed = JSON.parse(data);

      // Safe deserialization with proper Date handling
      const safeDeserialize = (value: any): any => {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
          try {
            return new Date(value);
          } catch {
            return value;
          }
        }
        if (Array.isArray(value)) {
          return value.map(safeDeserialize);
        }
        if (value && typeof value === 'object') {
          const result: any = {};
          for (const [key, val] of Object.entries(value)) {
            result[key] = safeDeserialize(val);
          }
          return result;
        }
        return value;
      };

      if (parsed.users) this.users = new Map(parsed.users.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.projects) this.projects = new Map(parsed.projects.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.tasks) this.tasks = new Map(parsed.tasks.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.files) this.files = new Map(parsed.files.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.messages) this.messages = new Map(parsed.messages.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.issues) this.issues = new Map(parsed.issues.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.projectTeamMembers) this.projectTeamMembers = new Map(parsed.projectTeamMembers);
      if (parsed.fileComments) this.fileComments = new Map(parsed.fileComments.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clients) this.clients = new Map(parsed.clients.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientEngagements) this.clientEngagements = new Map(parsed.clientEngagements.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientRelationships) this.clientRelationships = new Map(parsed.clientRelationships.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.progressCharts) this.progressCharts = new Map(parsed.progressCharts.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.progressSteps) this.progressSteps = new Map(parsed.progressSteps.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.staffMembers) this.staffMembers = new Map(parsed.staffMembers.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.drawingSets) this.drawingSets = new Map(parsed.drawingSets.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientApprovals) this.clientApprovals = new Map(parsed.clientApprovals.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientProjectAssignments) this.clientProjectAssignments = new Map(parsed.clientProjectAssignments.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.communicationPreferences) this.communicationPreferences = new Map(parsed.communicationPreferences.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientRegistrationRequests) this.clientRegistrationRequests = new Map(parsed.clientRegistrationRequests.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.clientInvitations) this.clientInvitations = new Map(parsed.clientInvitations.map(([k, v]: any) => [k, safeDeserialize(v)]));
      if (parsed.nextId) this.nextId = parsed.nextId;

      console.log(`Loaded storage data: ${this.projects.size} projects, ${this.users.size} users`);
    } catch (error) {
      console.log('Starting with fresh storage data - serialization error prevented:', error);
    }
  }

  constructor() {
    // Initialize all Maps before loading data
    this.clientRegistrationRequests = new Map();
    this.clientInvitations = new Map();
    this.loadData();
    // Add some initial staff members for demonstration
    this.staffMembers.set(1, {
      id: 1,
      email: "john.doe@vpconnect.com",
      firstName: "John",
      lastName: "Doe",
      role: "drafter",
      address: "123 Main St",
      phoneNumber: "555-0101",
      position: "Senior Drafter",
      department: "Design",
      hireDate: new Date("2023-01-15"),
      salary: 65000,
      isActive: true,
      skills: ["AutoCAD", "Revit", "HVAC Design"],
      certifications: ["AutoCAD Certified"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.staffMembers.set(2, {
      id: 2,
      email: "jane.smith@vpconnect.com",
      firstName: "Jane",
      lastName: "Smith",
      role: "qc1",
      address: "456 Oak Ave",
      phoneNumber: "555-0102",
      position: "QC Specialist",
      department: "Quality Control",
      hireDate: new Date("2022-08-20"),
      salary: 70000,
      isActive: true,
      skills: ["Quality Control", "CAD Review", "Standards Compliance"],
      certifications: ["QC Level 1"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add some initial drawing sets
    this.drawingSets.set(1, {
      id: 1,
      name: "Bulletin 2 - HVAC Plans",
      version: "Rev 2.1",
      description: "Updated HVAC floor plans dated 1-5-2024",
      isActive: true,
      projectId: 1,
      priority: "high_priority_deliverable",
      drawingType: "hvac",
      setNumber: "H-001",
      dateIssued: new Date("2024-01-05"),
      filePaths: ["/drawings/hvac/bulletin-2-rev-2.1.dwg"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    this.drawingSets.set(2, {
      id: 2,
      name: "Architectural Base Plans",
      version: "Rev 1.3",
      description: "Base architectural drawings for coordination",
      isActive: true,
      projectId: 1,
      priority: "low_priority_deliverable",
      drawingType: "architectural",
      setNumber: "A-100",
      dateIssued: new Date("2024-01-10"),
      filePaths: ["/drawings/arch/base-plans-rev-1.3.dwg"],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Add sample activity timeline data
    this.activityTimeline.set(1, {
      id: 1,
      activityType: "project_created",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "created project 'Office Building Renovation'",
      description: "New commercial renovation project initiated",
      projectName: "Office Building Renovation",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    });

    this.activityTimeline.set(2, {
      id: 2,
      activityType: "task_created",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "created task 'Structural Analysis'",
      description: "Initial structural review and assessment required",
      projectName: "Office Building Renovation",
      taskTitle: "Structural Analysis",
      createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), // 90 minutes ago
    });

    this.activityTimeline.set(3, {
      id: 3,
      activityType: "task_assigned",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "assigned task to structural engineer",
      description: "Task assigned for immediate review",
      projectName: "Office Building Renovation",
      taskTitle: "Structural Analysis",
      createdAt: new Date(Date.now() - 75 * 60 * 1000).toISOString(), // 75 minutes ago
    });

    this.activityTimeline.set(4, {
      id: 4,
      activityType: "drawing_uploaded",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "uploaded drawing set 'Base Plans Rev 1.2'",
      description: "Architectural base plans with latest revisions",
      projectName: "Office Building Renovation",
      createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 minutes ago
    });

    this.activityTimeline.set(5, {
      id: 5,
      activityType: "client_added",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "added client contact",
      description: "New client representative added to project",
      projectName: "Office Building Renovation",
      clientName: "Smith Construction Corp",
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
    });

    this.activityTimeline.set(6, {
      id: 6,
      activityType: "task_status_changed",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "updated task status to 'In Review'",
      description: "Task moved to quality control phase",
      projectName: "Office Building Renovation",
      taskTitle: "Structural Analysis",
      createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
    });

    this.activityTimeline.set(7, {
      id: 7,
      activityType: "comment_added",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "added comment on drawing review",
      description: "Feedback provided on structural elements",
      projectName: "Office Building Renovation",
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
    });

    this.activityTimeline.set(8, {
      id: 8,
      activityType: "file_uploaded",
      userId: "admin@vpconnect.com",
      userName: "Admin User",
      userAvatar: null,
      title: "uploaded architectural plans",
      description: "Latest architectural drawings and specifications",
      projectName: "Bronx Residential Complex",
      projectId: 3,
      createdAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(), // 3 minutes ago
      metadata: {
        fileName: "Bronx_Architectural_Plans_v3.pdf",
        filePath: "uploads/bronx_architectural_plans_v3.pdf",
        mimeType: "application/pdf",
        fileSize: 2456789
      }
    });

    this.activityTimeline.set(9, {
      id: 9,
      activityType: "file_uploaded",
      userId: "staff@vpconnect.com",
      userName: "Staff Member",
      userAvatar: null,
      title: "uploaded site progress photos",
      description: "Current construction progress and site conditions",
      projectName: "Manhattan Office",
      projectId: 4,
      createdAt: new Date(Date.now() - 1 * 60 * 1000).toISOString(), // 1 minute ago
      metadata: {
        fileName: "Site_Progress_March_2025.jpg",
        filePath: "uploads/site_progress_march_2025.jpg",
        mimeType: "image/jpeg",
        fileSize: 1234567
      }
    });

    this.nextId = 10;
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    const regularUsers = Array.from(this.users.values());
    const staffAsUsers = Array.from(this.staffMembers.values()).map(staff => ({
      id: staff.id.toString(),
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      profileImageUrl: null,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt,
    }));
    
    return [...regularUsers, ...staffAsUsers];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const now = new Date();
    const user: User = {
      id: userData.id,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: 'client',
      createdAt: this.users.get(userData.id)?.createdAt || now,
      updatedAt: now,
    };
    this.users.set(userData.id, user);
    await this.saveData();
    return user;
  }

  async getProjects(userId: string, userRole?: string): Promise<Project[]> {
    const allProjects = Array.from(this.projects.values());
    
    console.log(`getProjects - User: ${userId}, Role: ${userRole}`);
    console.log(`getProjects - Total projects: ${allProjects.length}`);
    console.log(`getProjects - Client assignments: ${this.clientProjectAssignments.size}`);
    
    // If user is admin, project_manager, or executive, return all projects
    if (userRole && ['admin', 'project_manager', 'executive'].includes(userRole)) {
      console.log(`getProjects - Admin/Manager access, returning all ${allProjects.length} projects`);
      return allProjects;
    }
    
    // If user is a client, only return projects they're assigned to
    if (userRole === 'client') {
      const clientAssignments = Array.from(this.clientProjectAssignments.values())
        .filter(assignment => assignment.clientId === userId && assignment.isActive);
      
      console.log(`getProjects - Found ${clientAssignments.length} assignments for client ${userId}`);
      console.log(`getProjects - Assignment project IDs:`, clientAssignments.map(a => a.projectId));
      console.log(`getProjects - Available project IDs:`, allProjects.map(p => p.id));
      
      const filteredProjects = allProjects.filter(project => 
        clientAssignments.some(assignment => assignment.projectId === project.id)
      );
      
      console.log(`getProjects - Returning ${filteredProjects.length} projects for client`);
      return filteredProjects;
    }
    
    // For other roles (drafter, qc1, qc2), return projects they own or are team members of
    const roleProjects = allProjects.filter(project => 
      project.ownerId === userId || 
      Array.from(this.projectTeamMembers.values()).some(member => 
        member.userId === userId && member.projectId === project.id
      )
    );
    
    console.log(`getProjects - Returning ${roleProjects.length} projects for role ${userRole}`);
    return roleProjects;
  }

  async getAllProjects(): Promise<Project[]> {
    const projects = Array.from(this.projects.values());
    console.log("getAllProjects called - storage has", projects.length, "projects");
    console.log("Project IDs in storage:", Array.from(this.projects.keys()));
    return projects;
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(project: InsertProject): Promise<Project> {
    const id = this.nextId++;
    const now = new Date();
    const newProject: Project = {
      id,
      name: project.name,
      description: project.description || '',
      projectAddress: project.projectAddress || '',
      phase: project.phase || 'planning',
      progress: project.progress || 0,
      startDate: project.startDate || now,
      endDate: project.endDate,
      ownerId: project.ownerId,
      clientId: project.clientId,
      budget: project.budget || 0,
      services: project.services || [],
      isActive: project.isActive !== false,
      createdAt: now,
      updatedAt: now,
    };
    console.log("Storing project with ID:", id, "- Storage before:", this.projects.size);
    this.projects.set(id, newProject);
    console.log("Storage after:", this.projects.size, "- Project stored:", this.projects.has(id));
    await this.saveData();
    return newProject;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const existing = this.projects.get(id);
    if (!existing) throw new Error('Project not found');
    
    const updated: Project = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: number): Promise<void> {
    const project = this.projects.get(id);
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    this.projects.delete(id);
    await this.saveData();
  }

  async getProjectTeamMembers(projectId: number): Promise<ProjectTeamMember[]> {
    return Array.from(this.projectTeamMembers.values()).filter(member => 
      member.projectId === projectId
    );
  }

  async addProjectTeamMember(projectId: number, userId: string, role: string): Promise<ProjectTeamMember> {
    const member: ProjectTeamMember = {
      id: this.nextId++,
      projectId,
      userId,
      role: role as any,
      createdAt: new Date(),
    };
    this.projectTeamMembers.set(`${projectId}-${userId}`, member);
    return member;
  }

  async getTasks(projectId?: number, assigneeId?: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(task => {
      if (projectId && task.projectId !== projectId) return false;
      if (assigneeId && task.assigneeId !== assigneeId) return false;
      return true;
    });
  }

  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async createTask(task: InsertTask): Promise<Task> {
    const id = this.nextId++;
    const now = new Date();
    const newTask: Task = {
      id,
      ...task,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, newTask);
    return newTask;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task> {
    const existing = this.tasks.get(id);
    if (!existing) throw new Error('Task not found');
    
    const updated: Task = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.tasks.set(id, updated);
    return updated;
  }

  async deleteTask(id: number): Promise<void> {
    this.tasks.delete(id);
  }

  async getFiles(projectId?: number, taskId?: number): Promise<File[]> {
    return Array.from(this.files.values()).filter(file => {
      if (projectId && file.projectId !== projectId) return false;
      if (taskId !== undefined) {
        // Strict taskId filtering - files without taskId should not match any specific taskId request
        if (file.taskId === undefined || file.taskId === null) return false;
        if (file.taskId !== taskId) return false;
      }
      return true;
    });
  }

  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }

  async createFile(file: InsertFile): Promise<File> {
    const id = this.nextId++;
    const now = new Date();
    const newFile: File = {
      id,
      name: file.name,
      status: file.status || 'draft',
      projectId: file.projectId,
      originalName: file.originalName,
      mimeType: file.mimeType,
      size: file.size,
      taskId: file.taskId,
      uploadedById: file.uploadedById,
      version: file.version || '1.0',
      filePath: file.filePath,
      workflowState: file.workflowState || 'assign',
      createdAt: now,
      updatedAt: now,
    };
    this.files.set(id, newFile);
    return newFile;
  }

  async updateFile(id: number, updates: Partial<InsertFile>): Promise<File> {
    const existing = this.files.get(id);
    if (!existing) throw new Error('File not found');
    
    const updated: File = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.files.set(id, updated);
    return updated;
  }

  async deleteFile(id: number): Promise<void> {
    this.files.delete(id);
  }

  async getFileComments(fileId: number): Promise<FileComment[]> {
    return Array.from(this.fileComments.values()).filter(comment => 
      comment.fileId === fileId
    );
  }

  async addFileComment(fileId: number, userId: string, comment: string, markupData?: any): Promise<FileComment> {
    const id = this.nextId++;
    const newComment: FileComment = {
      id,
      fileId,
      userId,
      comment,
      markupData,
      createdAt: new Date(),
    };
    this.fileComments.set(id, newComment);
    return newComment;
  }

  async getMessages(projectId?: number, taskId?: number): Promise<Message[]> {
    return Array.from(this.messages.values()).filter(message => {
      if (projectId && message.projectId !== projectId) return false;
      if (taskId && message.taskId !== taskId) return false;
      return true;
    });
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.nextId++;
    const newMessage: Message = {
      id,
      projectId: message.projectId,
      taskId: message.taskId,
      content: message.content,
      senderId: message.senderId,
      isGroupMessage: message.isGroupMessage || false,
      createdAt: new Date(),
    };
    this.messages.set(id, newMessage);
    return newMessage;
  }

  async markMessageAsRead(messageId: number, userId: string): Promise<void> {
    // Implementation would involve messageRecipients table
  }

  async getIssues(projectId?: number): Promise<Issue[]> {
    return Array.from(this.issues.values()).filter(issue => {
      if (projectId && issue.projectId !== projectId) return false;
      return true;
    });
  }

  async createIssue(issue: InsertIssue): Promise<Issue> {
    const id = this.nextId++;
    const now = new Date();
    const newIssue: Issue = {
      id,
      status: issue.status || 'open',
      description: issue.description,
      projectId: issue.projectId,
      title: issue.title,
      reportedById: issue.reportedById,
      assignedToId: issue.assignedToId,
      severity: issue.severity || 'medium',
      isAnonymous: issue.isAnonymous || false,
      createdAt: now,
      updatedAt: now,
    };
    this.issues.set(id, newIssue);
    return newIssue;
  }

  async updateIssue(id: number, updates: Partial<InsertIssue>): Promise<Issue> {
    const existing = this.issues.get(id);
    if (!existing) throw new Error('Issue not found');
    
    const updated: Issue = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.issues.set(id, updated);
    return updated;
  }

  async getDashboardStats(userId: string): Promise<{
    activeProjects: number;
    pendingTasks: number;
    completedTasks: number;
    issues: number;
  }> {
    const user = await this.getUser(userId);
    let userProjects;
    
    // Admin users see all projects, others see only their own
    if (user?.role === 'admin') {
      userProjects = await this.getAllProjects();
    } else {
      userProjects = await this.getProjects(userId);
    }
    
    const projectIds = userProjects.map(p => p.id);
    
    const allTasks = Array.from(this.tasks.values()).filter(task => 
      projectIds.includes(task.projectId)
    );
    
    const allIssues = Array.from(this.issues.values()).filter(issue => 
      projectIds.includes(issue.projectId)
    );

    return {
      activeProjects: userProjects.filter(p => p.phase !== 'post_construction').length,
      pendingTasks: allTasks.filter(t => t.status === 'pending' || t.status === 'in_progress').length,
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      issues: allIssues.length,
    };
  }



  async getSystemStats(): Promise<{
    totalUsers: number;
    totalProjects: number;
    activeProjects: number;
    totalTasks: number;
    totalFiles: number;
    totalIssues: number;
  }> {
    return {
      totalUsers: this.users.size,
      totalProjects: this.projects.size,
      activeProjects: Array.from(this.projects.values()).filter(p => p.phase !== 'post_construction').length,
      totalTasks: this.tasks.size,
      totalFiles: this.files.size,
      totalIssues: this.issues.size
    };
  }

  // Client operations
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(clientData: InsertClient): Promise<Client> {
    const id = `client_${Date.now()}`;
    const client: Client = {
      id,
      ...clientData,
      totalProjects: 0,
      totalBudget: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client> {
    const existing = this.clients.get(id);
    if (!existing) {
      throw new Error("Client not found");
    }
    
    const updated: Client = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<void> {
    this.clients.delete(id);
  }

  // Client engagement operations
  async getClientEngagements(clientId?: string): Promise<ClientEngagement[]> {
    const engagements = Array.from(this.clientEngagements.values());
    if (clientId) {
      return engagements.filter(e => e.clientId === clientId);
    }
    return engagements;
  }

  async getClientEngagement(id: number): Promise<ClientEngagement | undefined> {
    return this.clientEngagements.get(id);
  }

  async createClientEngagement(engagementData: InsertClientEngagement): Promise<ClientEngagement> {
    const id = this.nextId++;
    const engagement: ClientEngagement = {
      id,
      ...engagementData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clientEngagements.set(id, engagement);
    return engagement;
  }

  // Progress chart operations
  async getProgressCharts(taskId: number): Promise<ProgressChart[]> {
    return Array.from(this.progressCharts.values()).filter(chart => chart.taskId === taskId);
  }

  async createProgressChart(chart: InsertProgressChart): Promise<ProgressChart> {
    const id = this.nextId++;
    const newChart: ProgressChart = {
      id,
      ...chart,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.progressCharts.set(id, newChart);
    return newChart;
  }

  async updateProgressChart(id: number, updates: Partial<InsertProgressChart>): Promise<ProgressChart> {
    const existing = this.progressCharts.get(id);
    if (!existing) throw new Error('Progress chart not found');
    
    const updated: ProgressChart = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.progressCharts.set(id, updated);
    return updated;
  }

  async deleteProgressChart(id: number): Promise<void> {
    this.progressCharts.delete(id);
  }

  // Progress step operations
  async getProgressSteps(chartId: number): Promise<ProgressStep[]> {
    return Array.from(this.progressSteps.values()).filter(step => step.chartId === chartId);
  }

  async createProgressStep(step: InsertProgressStep): Promise<ProgressStep> {
    const id = this.nextId++;
    const newStep: ProgressStep = {
      id,
      ...step,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.progressSteps.set(id, newStep);
    return newStep;
  }

  async updateProgressStep(id: number, updates: Partial<InsertProgressStep>): Promise<ProgressStep> {
    const existing = this.progressSteps.get(id);
    if (!existing) throw new Error('Progress step not found');
    
    const updated: ProgressStep = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.progressSteps.set(id, updated);
    return updated;
  }

  async deleteProgressStep(id: number): Promise<void> {
    this.progressSteps.delete(id);
  }

  // Staff member operations
  async getStaffMembers(): Promise<StaffMember[]> {
    return Array.from(this.staffMembers.values());
  }

  async createStaffMember(staffData: InsertStaffMember): Promise<StaffMember> {
    const id = this.nextId++;
    const staff: StaffMember = {
      id,
      ...staffData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.staffMembers.set(id, staff);
    return staff;
  }

  // Drawing set operations
  async getDrawingSets(): Promise<DrawingSet[]> {
    return Array.from(this.drawingSets.values());
  }

  async getDrawingSet(id: number): Promise<DrawingSet | undefined> {
    return this.drawingSets.get(id);
  }

  async createDrawingSet(drawingData: InsertDrawingSet & { registeredById: string; filePath?: string | null }): Promise<DrawingSet> {
    const id = this.nextId++;
    const drawing: DrawingSet = {
      id,
      ...drawingData,
      isActive: true,
      approvalStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.drawingSets.set(id, drawing);
    return drawing;
  }

  async updateDrawingSet(id: number, updates: Partial<DrawingSet>): Promise<DrawingSet> {
    const existing = this.drawingSets.get(id);
    if (!existing) throw new Error('Drawing set not found');
    
    const updated: DrawingSet = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.drawingSets.set(id, updated);
    return updated;
  }

  // Client approval operations
  async getClientApprovals(projectId?: number): Promise<ClientApproval[]> {
    const approvals = Array.from(this.clientApprovals.values());
    return projectId ? approvals.filter(a => a.projectId === projectId) : approvals;
  }

  async createClientApproval(approvalData: InsertClientApproval): Promise<ClientApproval> {
    const id = this.nextId++;
    const approval: ClientApproval = {
      id,
      ...approvalData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clientApprovals.set(id, approval);
    return approval;
  }

  async updateClientEngagement(id: number, updates: Partial<InsertClientEngagement>): Promise<ClientEngagement> {
    const existing = this.clientEngagements.get(id);
    if (!existing) throw new Error('Client engagement not found');
    
    const updated: ClientEngagement = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.clientEngagements.set(id, updated);
    return updated;
  }

  async deleteClientEngagement(id: number): Promise<void> {
    this.clientEngagements.delete(id);
  }

  // Client relationship operations
  async getClientRelationships(): Promise<ClientRelationship[]> {
    return Array.from(this.clientRelationships.values());
  }

  async getClientRelationship(id: number): Promise<ClientRelationship | undefined> {
    return this.clientRelationships.get(id);
  }

  async createClientRelationship(relationshipData: InsertClientRelationship): Promise<ClientRelationship> {
    const id = this.nextId++;
    const relationship: ClientRelationship = {
      id,
      ...relationshipData,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clientRelationships.set(id, relationship);
    await this.saveData();
    return relationship;
  }

  async updateClientRelationship(id: number, updates: Partial<InsertClientRelationship>): Promise<ClientRelationship> {
    const existing = this.clientRelationships.get(id);
    if (!existing) {
      throw new Error("Client relationship not found");
    }
    
    const updated: ClientRelationship = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.clientRelationships.set(id, updated);
    await this.saveData();
    return updated;
  }

  async deleteClientRelationship(id: number): Promise<void> {
    this.clientRelationships.delete(id);
    await this.saveData();
  }

  async updateUser(userId: string, updates: any): Promise<any> {
    const existingUser = this.users.get(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }
    
    const updatedUser = {
      ...existingUser,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.users.set(userId, updatedUser);
    await this.saveData();
    return updatedUser;
  }

  // Client-Project Assignment operations
  async getClientProjectAssignments(): Promise<ClientProjectAssignment[]> {
    return Array.from(this.clientProjectAssignments.values());
  }

  async getClientProjectAssignment(id: number): Promise<ClientProjectAssignment | undefined> {
    return this.clientProjectAssignments.get(id);
  }

  async createClientProjectAssignment(assignment: InsertClientProjectAssignment): Promise<ClientProjectAssignment> {
    const id = this.nextId++;
    const newAssignment: ClientProjectAssignment = {
      id,
      ...assignment,
      assignedAt: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.clientProjectAssignments.set(id, newAssignment);

    // Create default communication preferences for this assignment
    const defaultPreferences: InsertCommunicationPreferences = {
      assignmentId: id,
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      projectUpdates: true,
      taskCompletions: true,
      fileUploads: true,
      drawingSubmissions: true,
      scheduleChanges: true,
      budgetUpdates: assignment.accessLevel === "full",
      issuesReported: true,
      canViewTasks: true,
      canViewFiles: true,
      canViewDrawings: true,
      canViewSchedule: true,
      canViewBudget: assignment.accessLevel === "full",
      canViewTeam: true,
      canViewProgress: true,
      preferredContactMethod: "email",
      timezone: "America/New_York",
      frequency: "immediate",
    };
    await this.createCommunicationPreferences(defaultPreferences);
    await this.saveData();
    return newAssignment;
  }

  async updateClientProjectAssignment(id: number, updates: Partial<InsertClientProjectAssignment>): Promise<ClientProjectAssignment> {
    const existing = this.clientProjectAssignments.get(id);
    if (!existing) throw new Error('Assignment not found');
    
    const updated: ClientProjectAssignment = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.clientProjectAssignments.set(id, updated);
    await this.saveData();
    return updated;
  }

  async deleteClientProjectAssignment(id: number): Promise<void> {
    this.clientProjectAssignments.delete(id);
    // Also delete associated communication preferences
    const prefs = Array.from(this.communicationPreferences.values())
      .find(p => p.assignmentId === id);
    if (prefs) {
      this.communicationPreferences.delete(prefs.id);
    }
    await this.saveData();
  }

  // Communication Preferences operations
  async getCommunicationPreferences(): Promise<CommunicationPreferences[]> {
    return Array.from(this.communicationPreferences.values());
  }

  async getCommunicationPreferencesByAssignment(assignmentId: number): Promise<CommunicationPreferences | undefined> {
    return Array.from(this.communicationPreferences.values())
      .find(p => p.assignmentId === assignmentId);
  }

  async createCommunicationPreferences(preferences: InsertCommunicationPreferences): Promise<CommunicationPreferences> {
    const id = this.nextId++;
    const newPreferences: CommunicationPreferences = {
      id,
      ...preferences,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.communicationPreferences.set(id, newPreferences);
    await this.saveData();
    return newPreferences;
  }

  async updateCommunicationPreferences(assignmentId: number, updates: Partial<InsertCommunicationPreferences>): Promise<CommunicationPreferences> {
    // Validate assignmentId to prevent inconsistent array ID errors
    if (!assignmentId || isNaN(assignmentId)) {
      throw new Error('Invalid assignment ID provided');
    }
    
    const existing = Array.from(this.communicationPreferences.values())
      .find(p => p.assignmentId === assignmentId);
    if (!existing) {
      // Create new preferences if they don't exist
      return this.createCommunicationPreferences({
        assignmentId: Number(assignmentId), // Ensure consistent ID type
        ...updates,
      } as InsertCommunicationPreferences);
    }
    
    const updated: CommunicationPreferences = {
      ...existing,
      ...updates,
      assignmentId: Number(assignmentId), // Ensure consistent ID type
      updatedAt: new Date(),
    };
    this.communicationPreferences.set(existing.id, updated);
    await this.saveData();
    return updated;
  }

  async deleteCommunicationPreferences(assignmentId: number): Promise<void> {
    const existing = Array.from(this.communicationPreferences.values())
      .find(p => p.assignmentId === assignmentId);
    if (existing) {
      this.communicationPreferences.delete(existing.id);
      await this.saveData();
    }
  }

  // Client Registration Request operations
  async getClientRegistrationRequests(): Promise<ClientRegistrationRequest[]> {
    try {
      if (!this.clientRegistrationRequests || typeof this.clientRegistrationRequests.values !== 'function') {
        console.warn('clientRegistrationRequests not properly initialized, initializing now');
        this.clientRegistrationRequests = new Map();
        return [];
      }
      const requests = Array.from(this.clientRegistrationRequests.values());
      console.log(`Retrieved ${requests.length} registration requests`);
      return requests;
    } catch (error) {
      console.error('Error getting client registration requests:', error);
      return [];
    }
  }

  async getClientRegistrationRequest(id: number): Promise<ClientRegistrationRequest | undefined> {
    return this.clientRegistrationRequests.get(id);
  }

  async createClientRegistrationRequest(request: InsertClientRegistrationRequest): Promise<ClientRegistrationRequest> {
    console.log('Starting createClientRegistrationRequest with:', request);
    
    const id = this.nextId++;
    const now = new Date();
    const newRequest: ClientRegistrationRequest = {
      id,
      email: String(request.email),
      firstName: String(request.firstName),
      lastName: String(request.lastName),
      company: request.company ? String(request.company) : null,
      phone: request.phone ? String(request.phone) : null,
      position: request.position ? String(request.position) : null,
      message: request.message ? String(request.message) : null,
      status: request.status || 'pending',
      createdAt: now,
      updatedAt: now,
      approvedAt: null,
      tokenExpiresAt: null,
      registrationCompletedAt: null,
    };
    
    console.log('Created newRequest object:', newRequest);
    
    // Ensure the Map is initialized
    if (!this.clientRegistrationRequests) {
      console.log('Initializing clientRegistrationRequests Map');
      this.clientRegistrationRequests = new Map();
    }
    
    this.clientRegistrationRequests.set(id, newRequest);
    console.log('Set registration request in Map, size now:', this.clientRegistrationRequests.size);
    
    try {
      await this.saveData();
      console.log('Data saved successfully');
    } catch (saveError) {
      console.error('Error saving data:', saveError);
    }
    
    console.log('Returning registration request:', newRequest);
    return newRequest;
  }

  async updateClientRegistrationRequest(id: number, updates: Partial<InsertClientRegistrationRequest>): Promise<ClientRegistrationRequest> {
    const existing = this.clientRegistrationRequests.get(id);
    if (!existing) throw new Error('Client registration request not found');
    
    const updated: ClientRegistrationRequest = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.clientRegistrationRequests.set(id, updated);
    await this.saveData();
    return updated;
  }

  async deleteClientRegistrationRequest(id: number): Promise<void> {
    this.clientRegistrationRequests.delete(id);
    await this.saveData();
  }

  // Client Invitation operations
  async getClientInvitations(): Promise<ClientInvitation[]> {
    return Array.from(this.clientInvitations.values());
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    return Array.from(this.clientInvitations.values()).find(invitation => invitation.invitationToken === token);
  }

  async getClientInvitation(id: number): Promise<ClientInvitation | undefined> {
    return this.clientInvitations.get(id);
  }

  async getClientInvitationByToken(token: string): Promise<ClientInvitation | undefined> {
    return Array.from(this.clientInvitations.values()).find(inv => inv.invitationToken === token);
  }

  async createClientInvitation(invitation: InsertClientInvitation): Promise<ClientInvitation> {
    const id = this.nextId++;
    const now = new Date();
    const newInvitation: ClientInvitation = {
      id,
      ...invitation,
      status: invitation.status || 'sent',
      createdAt: now,
      updatedAt: now,
      acceptedAt: null,
    };
    this.clientInvitations.set(id, newInvitation);
    await this.saveData();
    return newInvitation;
  }

  async updateClientInvitation(id: number, updates: Partial<InsertClientInvitation>): Promise<ClientInvitation> {
    const existing = this.clientInvitations.get(id);
    if (!existing) throw new Error('Client invitation not found');
    
    const updated: ClientInvitation = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    };
    this.clientInvitations.set(id, updated);
    await this.saveData();
    return updated;
  }

  async deleteClientInvitation(id: number): Promise<void> {
    this.clientInvitations.delete(id);
    await this.saveData();
  }

  async getActivityTimeline(limit: number = 50): Promise<any[]> {
    const activities = Array.from(this.activityTimeline.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return activities;
  }

  async createActivity(activity: any): Promise<any> {
    const newActivity = {
      id: this.nextId++,
      createdAt: new Date().toISOString(),
      ...activity,
    };
    this.activityTimeline.set(newActivity.id, newActivity);
    await this.saveData();
    return newActivity;
  }



  async getSystemStats(): Promise<any> {
    const totalUsers = this.users.size;
    const totalProjects = this.projects.size;
    const totalTasks = this.tasks.size;
    const totalClients = this.clients.size;

    return {
      totalUsers,
      totalProjects,
      totalTasks,
      totalClients,
      recentActivity: await this.getActivityTimeline(10)
    };
  }

  async updateUserRole(userId: string, role: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      role: role as any,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    await this.saveData();
    return updatedUser;
  }

  // Folder operations
  async getFolders(parentId?: string): Promise<any[]> {
    return this.folders.filter(folder => 
      parentId ? folder.parentId === parentId : !folder.parentId
    );
  }

  async createFolder(name: string, parentId?: string): Promise<any> {
    const folder = {
      id: `folder_${this.nextId++}`,
      name,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
      createdBy: 'system',
      itemCount: 0
    };
    this.folders.push(folder);
    await this.saveData();
    return folder;
  }

  async deleteFolder(id: string): Promise<void> {
    this.folders = this.folders.filter(folder => folder.id !== id);
    await this.saveData();
  }

  async moveFile(fileId: string | number, targetFolderId: string | null): Promise<File> {
    const file = this.files.get(parseInt(String(fileId)));
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }

    // Update file with new folder location
    const updatedFile = { ...file, parentFolderId: targetFolderId };
    this.files.set(file.id, updatedFile);
    
    await this.saveData();
    return updatedFile;
  }

  async moveFolder(folderId: string, targetFolderId: string | null): Promise<any> {
    const folderIndex = this.folders.findIndex(f => f.id === folderId);
    if (folderIndex === -1) {
      throw new Error(`Folder not found: ${folderId}`);
    }

    // Update folder with new parent location
    const updatedFolder = { ...this.folders[folderIndex], parentId: targetFolderId };
    this.folders[folderIndex] = updatedFolder;
    
    await this.saveData();
    return updatedFolder;
  }

  // Migrate existing files to have workflowState field
  private migrateFiles() {
    console.log('Migrating files to include workflowState...');
    let migrated = 0;
    for (const [fileId, file] of this.files.entries()) {
      if (!file.workflowState) {
        // Set workflowState to 'assign' for all legacy files
        const updatedFile = {
          ...file,
          workflowState: 'assign' as const
        };
        this.files.set(fileId, updatedFile);
        migrated++;
      }
    }
    if (migrated > 0) {
      console.log(`Migrated ${migrated} files to workflowState: assign`);
      this.saveData();
    }
  }
}

export const storage = new MemStorage();

// Run migration after storage is initialized
setTimeout(() => {
  console.log('Running file migration...');
  let migrated = 0;
  for (const [fileId, file] of (storage as any).files.entries()) {
    if (!file.workflowState) {
      const updatedFile = {
        ...file,
        workflowState: 'assign' as const
      };
      (storage as any).files.set(fileId, updatedFile);
      migrated++;
    }
  }
  if (migrated > 0) {
    console.log(`Migrated ${migrated} files to workflowState: assign`);
    (storage as any).saveData();
  }
}, 1000);