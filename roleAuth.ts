import type { Request, Response, NextFunction } from "express";

// Define role hierarchy and permissions
export const ROLES = {
  admin: {
    level: 100,
    permissions: ['*'] // All permissions
  },
  executive: {
    level: 90,
    permissions: [
      'view_dashboard', 'view_financials', 'view_reports', 'view_projects',
      'view_clients', 'view_tasks', 'view_files', 'download_files',
      'view_analytics', 'view_settings', 'create_projects', 'edit_projects',
      'delete_projects', 'manage_team', 'approve_tasks', 'escalate_issues',
      'delete_files', 'delete_folders', 'view_trash', 'restore_items', 'permanent_delete'
    ]
  },
  project_manager: {
    level: 80,
    permissions: [
      'view_dashboard', 'view_projects', 'view_clients', 'view_tasks',
      'view_files', 'upload_files', 'download_files', 'view_analytics',
      'create_projects', 'edit_projects', 'create_tasks', 'edit_tasks',
      'assign_tasks', 'manage_team', 'approve_tasks', 'comment_files',
      'direct_messaging', 'group_conversations', 'escalate_issues'
    ]
  },
  drafter: {
    level: 60,
    permissions: [
      'view_dashboard', 'view_projects', 'view_tasks', 'view_files',
      'upload_files', 'download_files', 'access_file_history',
      'mark_task_complete', 'comment_files', 'direct_messaging',
      'group_conversations', 'receive_notifications'
    ]
  },
  qc1: {
    level: 50,
    permissions: [
      'view_dashboard', 'view_projects', 'view_tasks', 'view_files',
      'upload_files', 'download_files', 'access_file_history',
      'mark_task_complete', 'submit_qc_review', 'comment_files',
      'direct_messaging', 'group_conversations', 'escalate_issues'
    ]
  },
  qc2: {
    level: 45,
    permissions: [
      'view_dashboard', 'view_projects', 'view_tasks', 'view_files',
      'upload_files', 'download_files', 'access_file_history',
      'mark_task_complete', 'submit_qc_review', 'comment_files',
      'direct_messaging', 'group_conversations', 'escalate_issues'
    ]
  },
  client: {
    level: 20,
    permissions: [
      'view_dashboard', 'view_projects', 'view_tasks', 'view_files',
      'download_files', 'comment_files', 'direct_messaging',
      'receive_notifications'
    ]
  }
} as const;

export type UserRole = keyof typeof ROLES;

// Role-based access control middleware
export function requireRole(requiredRoles: UserRole[] | UserRole) {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
      
      // Get user role from session
      const userRole = req.session?.userRole || 'client';
      
      // Check if user has required role
      if (roles.includes(userRole)) {
        return next();
      }
      
      // Check role hierarchy (higher level roles can access lower level permissions)
      const userLevel = ROLES[userRole as UserRole]?.level || 0;
      const hasAccess = roles.some(role => {
        const requiredLevel = ROLES[role]?.level || 0;
        return userLevel >= requiredLevel;
      });
      
      if (hasAccess) {
        return next();
      }
      
      // Return proper JSON error response
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${roles.join(' or ')}. Current role: ${userRole}`,
        requiredRoles: roles,
        currentRole: userRole,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Role authorization error:', error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        error: 'Authorization system error',
        message: 'Internal server error during role verification',
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Permission-based access control
export function requirePermission(requiredPermissions: string[] | string) {
  return (req: any, res: Response, next: NextFunction) => {
    try {
      const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
      const userRole = req.session?.userRole || 'client';
      const roleConfig = ROLES[userRole as UserRole];
      
      if (!roleConfig) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(403).json({
          error: 'Invalid user role',
          message: `User role '${userRole}' is not recognized`,
          timestamp: new Date().toISOString()
        });
      }
      
      // Admin has all permissions
      if (roleConfig.permissions.includes('*')) {
        return next();
      }
      
      // Check specific permissions
      const hasPermission = permissions.every(permission => 
        roleConfig.permissions.includes(permission)
      );
      
      if (hasPermission) {
        return next();
      }
      
      res.setHeader('Content-Type', 'application/json');
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `Access denied. Missing permissions: ${permissions.join(', ')}`,
        requiredPermissions: permissions,
        userPermissions: roleConfig.permissions,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Permission authorization error:', error);
      res.setHeader('Content-Type', 'application/json');
      return res.status(500).json({
        error: 'Authorization system error',
        message: 'Internal server error during permission verification',
        timestamp: new Date().toISOString()
      });
    }
  };
}

// Utility function to check if user has permission
export function hasPermission(userRole: string, permission: string): boolean {
  const roleConfig = ROLES[userRole as UserRole];
  if (!roleConfig) return false;
  
  return roleConfig.permissions.includes('*') || roleConfig.permissions.includes(permission);
}

// Utility function to get user permissions
export function getUserPermissions(userRole: string): string[] {
  const roleConfig = ROLES[userRole as UserRole];
  return roleConfig?.permissions || [];
}