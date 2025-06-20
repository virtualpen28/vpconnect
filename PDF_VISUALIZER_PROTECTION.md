# PDF VISUALIZER PROTECTION

## CRITICAL SYSTEM PROTECTION - DO NOT MODIFY

This document protects the PDF Visualizer utility from unauthorized changes.

### PROTECTED COMPONENTS

The following PDF viewing components in `client/src/pages/SharedView.tsx` are **CRITICAL SYSTEM FUNCTIONS** and must not be modified without explicit authorization:

1. **PDF Permission-Based Viewer** - Lines 400-600
   - Handles public-private access controls
   - Implements view-only, view+download, view+edit+download permissions
   - Prevents unauthorized access and download restrictions
   - Context menu blocking for view-only mode

2. **PDF Security Layer** - Lines 500-550
   - Disables right-click context menus for view-only access
   - Blocks keyboard shortcuts (Ctrl+S, Ctrl+P, Ctrl+D) in restricted mode
   - Implements overlay protection for sensitive documents
   - Pointer events and user selection blocking

3. **Multi-Mode PDF Display** - Lines 450-500
   - Object tag implementation for view-only with toolbar=0&navpanes=0
   - Iframe implementation for full access with toolbar=1&navpanes=1
   - Fallback mechanisms for browser compatibility
   - Alternative viewer options

### SYSTEM VERIFICATION STATUS

- **Last Verified Working**: 2025-06-19
- **Test Status**: All permission levels verified functional
- **Security Features**: Context blocking and download restrictions active
- **Browser Compatibility**: Object tag and iframe fallbacks working

### PROTECTION SCOPE

These utilities successfully implement:
- Public-private access control
- View-only mode with download prevention
- View+download mode with controlled access
- View+edit+download mode with full permissions
- Cross-browser PDF viewing compatibility
- Security overlay protection
- Keyboard shortcut blocking
- Context menu prevention

### PERMISSION LEVELS

1. **View Only**: 
   - PDF displayed with toolbar=0&navpanes=0
   - Context menu blocked
   - Download buttons hidden
   - Keyboard shortcuts disabled

2. **View + Download**:
   - PDF displayed with basic toolbar
   - Download button available
   - Context menu partially enabled

3. **View + Edit + Download**:
   - PDF displayed with full toolbar=1&navpanes=1
   - All controls available
   - Full access permissions

### EMERGENCY PROTOCOLS

If modifications are required:
1. Document the specific need in this file
2. Create backup of current working version
3. Test all permission levels after changes
4. Verify security features remain intact
5. Update verification date upon successful testing

### MODIFICATION LOG

- 2025-06-19: Initial protection established
- 2025-06-19: Permission-based PDF viewing system protected
- 2025-06-19: Security layer and fallback mechanisms verified

**WARNING**: Changes to protected components may break the PDF viewing security system or permission controls.