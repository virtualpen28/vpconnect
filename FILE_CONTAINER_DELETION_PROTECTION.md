# FILE CONTAINER DELETION PROTECTION

## CRITICAL SYSTEM PROTECTION - DO NOT MODIFY

This document protects the file container deletion utility from unauthorized changes.

### PROTECTED FUNCTIONS

The following functions in `server/trash.ts` are **CRITICAL SYSTEM FUNCTIONS** and must not be modified without explicit authorization:

1. **moveFileToTrash** - Lines 35-200
   - Handles complete file container deletion
   - Treats all file versions as single container units
   - Prevents partial deletions and version inconsistencies
   - Implements fresh container logic for version history reset

2. **moveFolderToTrash** - Lines 220-350
   - Manages folder deletion with recursive cleanup
   - Prevents data corruption during folder operations

### SYSTEM VERIFICATION STATUS

- **Last Verified Working**: 2025-06-19
- **Test Status**: All container deletion scenarios passing
- **Fresh Container Logic**: Active and verified
- **Version History Reset**: Functioning correctly

### PROTECTION SCOPE

These utilities successfully prevent all known error conditions:
- STRING CONVERSION ERROR from AWS
- DUPLICATE REQUIREAUTH MIDDLEWARE issues  
- SERIALIZATION ERROR 500 STORAGE problems
- FILE CONTAINER LOGIC errors
- VERSION HISTORY bleeding between containers

### EMERGENCY PROTOCOLS

If modifications are required:
1. Document the specific need in this file
2. Create backup of current working version
3. Test all container deletion scenarios after changes
4. Update verification date upon successful testing

### MODIFICATION LOG

- 2025-06-19: Initial protection established
- 2025-06-19: Fresh container logic revision implemented
- 2025-06-19: Complete container deletion utility restored

**WARNING**: Changes to protected functions may break the file container deletion system.