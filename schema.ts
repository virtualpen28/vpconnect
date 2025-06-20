import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  boolean,
  pgEnum,
  bigserial,
  bigint,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User roles enum
export const userRoleEnum = pgEnum("user_role", [
  "client",
  "drafter", 
  "qc1",
  "qc2",
  "admin",
  "project_manager",
  "executive"
]);

// Project phases enum
export const projectPhaseEnum = pgEnum("project_phase", [
  "planning", 
  "design_development",
  "pre_construction",
  "construction",
  "post_construction"
]);

// Services enum - organized by construction phases
export const serviceEnum = pgEnum("service", [
  // Planning Phase
  "gpr_scanning",
  "laser_scan_services", 
  "environmental_services",
  
  // Design Development Phase
  "mep_design_services",
  "prefabrication_consulting",
  "bim_vdc",
  "mep_coordination",
  "lean_modeling",
  "cad_services",
  "car_access_surveillance",
  
  // Pre-Construction Phase
  "cost_estimation",
  "value_engineering", 
  "constructability_review",
  "permit_coordination",
  "contractor_selection",
  
  // Construction Phase
  "site_progress_tracking",
  
  // Post-Construction Phase
  "commissioning",
  "as_built_plans",
  
  // Service Categories (from first image)
  "architectural",
  "structural", 
  "mechanical",
  "electrical",
  "plumbing"
]);

// Activity type enum for timeline
export const activityTypeEnum = pgEnum("activity_type", [
  "project_created",
  "project_updated", 
  "task_created",
  "task_assigned",
  "task_status_changed",
  "task_completed",
  "client_added",
  "client_updated",
  "drawing_uploaded",
  "drawing_approved",
  "issue_created",
  "issue_resolved",
  "file_uploaded",
  "comment_added"
]);

// Task status enum - Four phase system
export const taskStatusEnum = pgEnum("task_status", [
  "assign",
  "qc1", 
  "qc2",
  "submitted"
]);

// Task priority enum
export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);

// Task type enum
export const taskTypeEnum = pgEnum("task_type", [
  "one_off",
  "repetitive"
]);

// Task purpose enum
export const taskPurposeEnum = pgEnum("task_purpose", [
  "coordination",
  "review",
  "for_record"
]);

// Progress step status enum
export const progressStepStatusEnum = pgEnum("progress_step_status", [
  "pending",
  "in_progress",
  "completed",
  "blocked"
]);

// File version status enum
export const fileVersionStatusEnum = pgEnum("file_version_status", [
  "Current",
  "Superseded",
  "draft",
  "review",
  "approved",
  "rejected"
]);

// Item deletion status enum for trash system
export const deletionStatusEnum = pgEnum("deletion_status", [
  "active",
  "deleted",
  "permanently_deleted"
]);

// Drawing set type enum
export const drawingSetTypeEnum = pgEnum("drawing_set_type", [
  "initial_set",
  "change_set",
  "addition_set"
]);

// Drawing priority enum
export const drawingPriorityEnum = pgEnum("drawing_priority", [
  "low_priority_deliverable",
  "high_priority_deliverable",
  "urgent_deliverable"
]);

// Client approval status enum
export const clientApprovalStatusEnum = pgEnum("client_approval_status", [
  "pending",
  "approved",
  "rejected",
  "expired"
]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: userRoleEnum("role").notNull().default("client"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Projects table
export const projects = pgTable("projects", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  projectAddress: text("project_address"),
  phase: projectPhaseEnum("phase").notNull().default("planning"),
  progress: integer("progress").notNull().default(0),
  clientId: varchar("client_id").references(() => users.id),
  ownerId: varchar("owner_id").references(() => users.id),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  budget: integer("budget"),
  services: serviceEnum("services").array(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project team members
export const projectTeamMembers = pgTable("project_team_members", {
  id: serial("id").primaryKey(),
  projectId: bigint("project_id", { mode: "number" }).references(() => projects.id),
  userId: varchar("user_id").references(() => users.id),
  role: userRoleEnum("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tasks table - Comprehensive task management
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 500 }).notNull(), // e.g., "1st Floor HVAC modeling"
  description: text("description"),
  projectId: bigint("project_id", { mode: "number" }).references(() => projects.id).notNull(),
  clientCompanyName: varchar("client_company_name", { length: 255 }), // Client's company name
  taskType: taskTypeEnum("task_type").notNull(), // one_off or repetitive
  purpose: taskPurposeEnum("purpose").notNull(), // coordination, review, for_record
  dueDate: timestamp("due_date"),
  drawingSetId: bigint("drawing_set_id", { mode: "number" }).references(() => drawingSets.id), // Reference to drawing set
  drawingRepository: text("drawing_repository"), // Legacy field for text descriptions
  comments: text("comments"),
  assignedStaffIds: text("assigned_staff_ids").array(), // Multiple staff members can be assigned
  creatorId: varchar("creator_id").references(() => users.id).notNull(),
  status: taskStatusEnum("status").notNull().default("assign"),
  priority: taskPriorityEnum("priority").notNull().default("medium"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Progress flow charts table - supports multiple charts for repetitive tasks
export const progressCharts = pgTable("progress_charts", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id).notNull(),
  chartName: varchar("chart_name", { length: 255 }).notNull(), // e.g., "Cycle 1", "Cycle 2" for repetitive
  orderIndex: integer("order_index").notNull().default(0), // For ordering multiple charts
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Progress steps table - individual steps within each progress chart
export const progressSteps = pgTable("progress_steps", {
  id: serial("id").primaryKey(),
  chartId: integer("chart_id").references(() => progressCharts.id).notNull(),
  stepName: varchar("step_name", { length: 255 }).notNull(), // e.g., "Modeling", "Review", "Approval"
  stepDescription: text("step_description"),
  orderIndex: integer("order_index").notNull(),
  status: progressStepStatusEnum("status").notNull().default("pending"),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  estimatedHours: integer("estimated_hours"),
  actualHours: integer("actual_hours"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Files table
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  originalName: varchar("original_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  size: integer("size").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  uploadedById: varchar("uploaded_by_id").references(() => users.id),
  version: varchar("version", { length: 20 }).notNull().default("1.0"),
  status: fileVersionStatusEnum("status").notNull().default("Latest"),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  workflowState: taskStatusEnum("workflow_state").notNull(), // Track which state this file was uploaded for
  parentFolderId: varchar("parent_folder_id"), // For folder organization
  fileFormat: varchar("file_format", { length: 10 }), // File extension like .pdf, .jpg, etc.
  deletionStatus: deletionStatusEnum("deletion_status").notNull().default("active"),
  deletedAt: timestamp("deleted_at"),
  deletedBy: varchar("deleted_by").references(() => users.id),
  scheduledDeletionAt: timestamp("scheduled_deletion_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// File comments/markups
export const fileComments = pgTable("file_comments", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").references(() => files.id),
  userId: varchar("user_id").references(() => users.id),
  comment: text("comment").notNull(),
  markupData: jsonb("markup_data"), // For storing markup coordinates/annotations
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  senderId: varchar("sender_id").references(() => users.id),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  isGroupMessage: boolean("is_group_message").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Message recipients (for direct messages)
export const messageRecipients = pgTable("message_recipients", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id),
  recipientId: varchar("recipient_id").references(() => users.id),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Issues/Escalations table
export const issues = pgTable("issues", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  projectId: integer("project_id").references(() => projects.id),
  reportedById: varchar("reported_by_id").references(() => users.id),
  assignedToId: varchar("assigned_to_id").references(() => users.id),
  severity: varchar("severity", { length: 20 }).notNull().default("medium"),
  status: varchar("status", { length: 20 }).notNull().default("open"),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});



// Clients table for CRM functionality
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().notNull(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 50 }),
  company: varchar("company", { length: 255 }),
  position: varchar("position", { length: 100 }), // role/position at company
  responsibility: varchar("responsibility", { length: 50 }), // project manager, estimator, facility manager, owner, executive, engineer, architect, consultant
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 20 }),
  industry: varchar("industry", { length: 100 }),
  clientType: varchar("client_type", { length: 20 }).notNull().default("individual"), // individual or business
  status: varchar("status", { length: 20 }).notNull().default("prospect"), // active, inactive, prospect, former
  totalProjects: integer("total_projects").notNull().default(0),
  totalBudget: integer("total_budget").notNull().default(0),
  lastContact: timestamp("last_contact"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client engagement tracking
export const clientEngagements = pgTable("client_engagements", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  engagementType: varchar("engagement_type", { length: 50 }).notNull(), // call, email, meeting, proposal, contract, followup
  subject: varchar("subject", { length: 255 }).notNull(),
  description: text("description"),
  contactMethod: varchar("contact_method", { length: 50 }), // phone, email, in_person, video_call
  duration: integer("duration"), // in minutes
  outcome: varchar("outcome", { length: 100 }), // successful, needs_followup, cancelled, completed
  nextAction: text("next_action"),
  nextActionDate: timestamp("next_action_date"),
  attachments: text("attachments").array(), // file paths or URLs
  engagedById: varchar("engaged_by_id").references(() => users.id).notNull(),
  participantEmails: text("participant_emails").array(), // other participants
  tags: text("tags").array(), // for categorization
  isComplete: boolean("is_complete").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client relationship tracker for personal information
export const clientRelationships = pgTable("client_relationships", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  birthday: timestamp("birthday"),
  spouseName: varchar("spouse_name", { length: 255 }),
  spouseBirthday: timestamp("spouse_birthday"),
  children: text("children").array(), // Array of children names/ages
  hobbies: text("hobbies").array(),
  interests: text("interests").array(),
  favoriteRestaurants: text("favorite_restaurants").array(),
  favoriteActivities: text("favorite_activities").array(),
  personalNotes: text("personal_notes"),
  communicationPreferences: text("communication_preferences").array(), // email, phone, text, in-person
  preferredContactTimes: varchar("preferred_contact_times", { length: 255 }),
  socialMediaProfiles: jsonb("social_media_profiles"), // {linkedin: "url", twitter: "handle", etc}
  anniversaryDate: timestamp("anniversary_date"),
  importantDates: jsonb("important_dates"), // {date: "description", date2: "description2"}
  giftPreferences: text("gift_preferences").array(),
  dietaryRestrictions: text("dietary_restrictions").array(),
  emergencyContact: varchar("emergency_contact", { length: 255 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }),
  referralSource: varchar("referral_source", { length: 255 }),
  connectionStrength: integer("connection_strength").default(1), // 1-5 scale
  lastPersonalContact: timestamp("last_personal_contact"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Project clients table
export const projectClients = pgTable("project_clients", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  clientId: varchar("client_id").references(() => users.id),
  role: varchar("role", { length: 100 }).notNull().default("primary_client"), // primary_client, secondary_client, consultant
  contactPerson: varchar("contact_person", { length: 255 }),
  contactEmail: varchar("contact_email", { length: 255 }),
  contactPhone: varchar("contact_phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Staff members table - separate from users for project assignment
export const staffMembers = pgTable("staff_members", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  email: varchar("email", { length: 255 }).unique(),
  role: userRoleEnum("role").notNull().default("drafter"),
  department: varchar("department", { length: 100 }),
  specialization: varchar("specialization", { length: 100 }),
  hourlyRate: integer("hourly_rate"), // stored in cents
  isActive: boolean("is_active").notNull().default(true),
  hireDate: timestamp("hire_date"),
  phoneNumber: varchar("phone_number", { length: 50 }),
  address: text("address"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Updated drawing repository table with proper fields
export const drawingSets = pgTable("drawing_sets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: drawingSetTypeEnum("type").notNull(),
  priority: drawingPriorityEnum("priority").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  description: text("description"),
  projectId: bigint("project_id", { mode: "number" }).references(() => projects.id),
  version: varchar("version", { length: 50 }).notNull().default("1.0"),
  revisionNotes: text("revision_notes"),
  registeredById: varchar("registered_by_id").references(() => users.id).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  filePath: varchar("file_path", { length: 500 }), // path to PDF file
  approvalStatus: clientApprovalStatusEnum("approval_status").notNull().default("pending"),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client registration requests table
export const clientRegistrationRequests = pgTable("client_registration_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  position: varchar("position", { length: 100 }),
  message: text("message"), // Why they want access
  status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectedReason: text("rejected_reason"),
  invitationToken: varchar("invitation_token", { length: 255 }).unique(),
  tokenExpiresAt: timestamp("token_expires_at"),
  registrationCompletedAt: timestamp("registration_completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client invitations table
export const clientInvitations = pgTable("client_invitations", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  invitationToken: varchar("invitation_token", { length: 255 }).notNull().unique(),
  tokenExpiresAt: timestamp("token_expires_at").notNull(),
  message: text("message"), // Personal message from admin
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, accepted, expired
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client project assignments table
export const clientProjectAssignments = pgTable("client_project_assignments", {
  id: serial("id").primaryKey(),
  clientId: varchar("client_id").references(() => clients.id).notNull(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("stakeholder"), // stakeholder, reviewer, decision_maker
  accessLevel: varchar("access_level", { length: 50 }).notNull().default("view_only"), // view_only, standard, full
  isActive: boolean("is_active").notNull().default(true),
  assignedAt: timestamp("assigned_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Communication preferences table
export const communicationPreferences = pgTable("communication_preferences", {
  id: serial("id").primaryKey(),
  assignmentId: integer("assignment_id").references(() => clientProjectAssignments.id).notNull(),
  
  // Notification preferences
  emailNotifications: boolean("email_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  
  // What to notify about
  projectUpdates: boolean("project_updates").notNull().default(true),
  taskCompletions: boolean("task_completions").notNull().default(true),
  fileUploads: boolean("file_uploads").notNull().default(true),
  drawingSubmissions: boolean("drawing_submissions").notNull().default(true),
  scheduleChanges: boolean("schedule_changes").notNull().default(true),
  budgetUpdates: boolean("budget_updates").notNull().default(false),
  issuesReported: boolean("issues_reported").notNull().default(true),
  
  // Visibility preferences
  canViewTasks: boolean("can_view_tasks").notNull().default(true),
  canViewFiles: boolean("can_view_files").notNull().default(true),
  canViewDrawings: boolean("can_view_drawings").notNull().default(true),
  canViewSchedule: boolean("can_view_schedule").notNull().default(true),
  canViewBudget: boolean("can_view_budget").notNull().default(false),
  canViewTeam: boolean("can_view_team").notNull().default(true),
  canViewProgress: boolean("can_view_progress").notNull().default(true),
  
  // Communication settings
  preferredContactMethod: varchar("preferred_contact_method", { length: 20 }).notNull().default("email"), // email, phone, sms, app
  contactTimeStart: varchar("contact_time_start", { length: 10 }), // HH:MM format
  contactTimeEnd: varchar("contact_time_end", { length: 10 }), // HH:MM format
  timezone: varchar("timezone", { length: 50 }).notNull().default("America/New_York"),
  frequency: varchar("frequency", { length: 20 }).notNull().default("immediate"), // immediate, daily, weekly
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Client approvals table
export const clientApprovals = pgTable("client_approvals", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id),
  drawingSetId: integer("drawing_set_id").references(() => drawingSets.id),
  clientId: varchar("client_id").references(() => users.id).notNull(),
  approvalStatus: clientApprovalStatusEnum("approval_status").notNull().default("pending"),
  disclaimerText: text("disclaimer_text").notNull(),
  disclaimerVersion: varchar("disclaimer_version", { length: 10 }).notNull().default("1.0"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  respondedAt: timestamp("responded_at"),
  approvedAt: timestamp("approved_at"),
  rejectedAt: timestamp("rejected_at"),
  rejectionReason: text("rejection_reason"),
  clientSignature: text("client_signature"), // base64 encoded signature
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  printedAt: timestamp("printed_at"),
  emailedAt: timestamp("emailed_at"),
  emailRecipients: text("email_recipients").array(),
  approvalToken: varchar("approval_token", { length: 255 }).unique(), // for secure approval links
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity timeline table
export const activityTimeline = pgTable("activity_timeline", {
  id: serial("id").primaryKey(),
  activityType: activityTypeEnum("activity_type").notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  projectId: integer("project_id").references(() => projects.id),
  taskId: integer("task_id").references(() => tasks.id),
  clientId: varchar("client_id").references(() => clients.id),
  drawingSetId: integer("drawing_set_id").references(() => drawingSets.id),
  issueId: integer("issue_id").references(() => issues.id),
  fileId: integer("file_id").references(() => files.id),
  title: text("title").notNull(),
  description: text("description"),
  metadata: jsonb("metadata"), // Additional data like old/new values
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  clientProjects: many(projects, { relationName: "client_projects" }),
  ownedProjects: many(projects, { relationName: "owned_projects" }),
  teamMemberships: many(projectTeamMembers),
  assignedTasks: many(tasks, { relationName: "assigned_tasks" }),
  createdTasks: many(tasks, { relationName: "created_tasks" }),
  uploadedFiles: many(files),
  sentMessages: many(messages),
  reportedIssues: many(issues, { relationName: "reported_issues" }),
  assignedIssues: many(issues, { relationName: "assigned_issues" }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(users, {
    fields: [projects.clientId],
    references: [users.id],
    relationName: "client_projects",
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
    relationName: "owned_projects",
  }),
  teamMembers: many(projectTeamMembers),
  tasks: many(tasks),
  files: many(files),
  messages: many(messages),
  issues: many(issues),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  // Note: assignedStaffIds is now an array, so we can't use direct relations
  // Multiple assignees will be handled in application logic
  creator: one(users, {
    fields: [tasks.creatorId],
    references: [users.id],
    relationName: "created_tasks",
  }),
  progressCharts: many(progressCharts),
  files: many(files),
  messages: many(messages),
}));

export const progressChartsRelations = relations(progressCharts, ({ one, many }) => ({
  task: one(tasks, {
    fields: [progressCharts.taskId],
    references: [tasks.id],
  }),
  progressSteps: many(progressSteps),
}));

export const progressStepsRelations = relations(progressSteps, ({ one }) => ({
  chart: one(progressCharts, {
    fields: [progressSteps.chartId],
    references: [progressCharts.id],
  }),
  assignedTo: one(users, {
    fields: [progressSteps.assignedToId],
    references: [users.id],
  }),
}));

export const filesRelations = relations(files, ({ one, many }) => ({
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [files.taskId],
    references: [tasks.id],
  }),
  uploadedBy: one(users, {
    fields: [files.uploadedById],
    references: [users.id],
  }),
  comments: many(fileComments),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFileSchema = createInsertSchema(files).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDrawingSetSchema = createInsertSchema(drawingSets).omit({
  id: true,
  registeredById: true,
  isActive: true,
  filePath: true,
  approvalStatus: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  projectId: z.number().optional().nullable(),
});

export const insertStaffMemberSchema = createInsertSchema(staffMembers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientApprovalSchema = createInsertSchema(clientApprovals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientProjectAssignmentSchema = createInsertSchema(clientProjectAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCommunicationPreferencesSchema = createInsertSchema(communicationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  totalProjects: true,
  totalBudget: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientEngagementSchema = createInsertSchema(clientEngagements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientRelationshipSchema = createInsertSchema(clientRelationships).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertActivityTimelineSchema = createInsertSchema(activityTimeline).omit({
  id: true,
  createdAt: true,
});

export const insertProjectClientSchema = createInsertSchema(projectClients).omit({
  id: true,
  createdAt: true,
});

export const insertProgressChartSchema = createInsertSchema(progressCharts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProgressStepSchema = createInsertSchema(progressSteps).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type definitions
export type ActivityTimeline = typeof activityTimeline.$inferSelect;
export type InsertActivityTimeline = z.infer<typeof insertActivityTimelineSchema>;

// Types
export type UpsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type File = typeof files.$inferSelect;
export type InsertFile = z.infer<typeof insertFileSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type ProjectTeamMember = typeof projectTeamMembers.$inferSelect;
export type FileComment = typeof fileComments.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientEngagement = typeof clientEngagements.$inferSelect;
export type InsertClientEngagement = z.infer<typeof insertClientEngagementSchema>;
export type ClientRelationship = typeof clientRelationships.$inferSelect;
export type InsertClientRelationship = z.infer<typeof insertClientRelationshipSchema>;
export type ProgressChart = typeof progressCharts.$inferSelect;
export type InsertProgressChart = z.infer<typeof insertProgressChartSchema>;
export type ProgressStep = typeof progressSteps.$inferSelect;
export type InsertProgressStep = z.infer<typeof insertProgressStepSchema>;
export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = z.infer<typeof insertStaffMemberSchema>;
export type DrawingSet = typeof drawingSets.$inferSelect;
export type InsertDrawingSet = z.infer<typeof insertDrawingSetSchema>;
export type ClientApproval = typeof clientApprovals.$inferSelect;
export type InsertClientApproval = z.infer<typeof insertClientApprovalSchema>;
export type ClientProjectAssignment = typeof clientProjectAssignments.$inferSelect;
export type InsertClientProjectAssignment = z.infer<typeof insertClientProjectAssignmentSchema>;
export type CommunicationPreferences = typeof communicationPreferences.$inferSelect;
export type InsertCommunicationPreferences = z.infer<typeof insertCommunicationPreferencesSchema>;

// Client registration and invitation schemas
export const insertClientRegistrationRequestSchema = createInsertSchema(clientRegistrationRequests);
export const insertClientInvitationSchema = createInsertSchema(clientInvitations);

export type ClientRegistrationRequest = typeof clientRegistrationRequests.$inferSelect;
export type InsertClientRegistrationRequest = z.infer<typeof insertClientRegistrationRequestSchema>;
export type ClientInvitation = typeof clientInvitations.$inferSelect;
export type InsertClientInvitation = z.infer<typeof insertClientInvitationSchema>;
