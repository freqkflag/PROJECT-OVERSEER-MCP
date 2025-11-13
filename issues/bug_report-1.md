# Overseer MCP Tool - Issues & Bug Report

**Report Date:** 2024-11-13  
**Tested Version:** Current MCP Implementation  
**Test Environment:** macOS (darwin 25.1.0)  
**Repository Path:** `/Volumes/projects/Forge Panel/forgepanel`

---

## Executive Summary

The Overseer MCP tool has several critical issues that prevent it from functioning correctly with paths containing spaces and existing project structures. The tool fails to recognize existing phase files, incorrectly reports permission errors, and has inconsistent behavior across different functions.

**Severity Breakdown:**
- 🔴 **Critical:** 4 issues
- 🟡 **High:** 3 issues
- 🟢 **Medium:** 2 issues
- ⚪ **Low/Info:** 2 issues

---

## Critical Issues

### 🔴 Issue #1: Path with Spaces Causes Permission Denied Errors

**Severity:** Critical  
**Function:** `overseer_plan_project`  
**Status:** Reproducible

**Description:**
The `plan_project` function fails with `EACCES: permission denied, mkdir` error when the repository path contains spaces, even though:
- The directory already exists
- The directory is writable (verified with `os.access('.', os.W_OK)`)
- Files can be read and written manually

**Error Message:**
```
Failed to plan project: EACCES: permission denied, mkdir '/Volumes/projects/Forge Panel/forgepanel'
```

**Reproduction Steps:**
1. Call `overseer_plan_project` with `repo_root: "/Volumes/projects/Forge Panel/forgepanel"`
2. Function returns `success: false` with permission denied error

**Expected Behavior:**
- Should recognize existing directory
- Should not attempt to create directory if it already exists
- Should work with paths containing spaces

**Actual Behavior:**
- Attempts to create directory that already exists
- Fails with permission error
- Cannot proceed with project planning

**Impact:**
- Blocks all project planning functionality
- Prevents use of Overseer with standard macOS paths
- Makes tool unusable for many real-world scenarios

---

### 🔴 Issue #2: Status Function Doesn't Recognize Existing Phase Files

**Severity:** Critical  
**Function:** `overseer_status`  
**Status:** Reproducible

**Description:**
The `status` function fails to recognize projects even when all required phase files exist:
- `PHASES.md` exists and is readable
- `PHASE-01.md` through `PHASE-07.md` exist
- Files are properly formatted

**Error Message:**
```
Project forgepanel not found. Run plan_project first.
```

**Reproduction Steps:**
1. Manually create `PHASES.md` and phase files
2. Call `overseer_status` with correct repo_root
3. Function returns "Project not found"

**Expected Behavior:**
- Should detect existing `PHASES.md` file
- Should parse phase files and return status
- Should work independently of `plan_project` if files exist

**Actual Behavior:**
- Requires `plan_project` to succeed first
- Doesn't check for existing phase files
- Returns empty status even when files exist

**Impact:**
- Cannot use Overseer with manually created phase files
- Forces dependency on buggy `plan_project` function
- Prevents status checking for existing projects

---

### 🔴 Issue #3: Compliance Check Reports Non-Existent Directory

**Severity:** Critical  
**Function:** `overseer_check_compliance`  
**Status:** Reproducible

**Description:**
The `check_compliance` function reports that the repository directory doesn't exist, even when:
- Directory exists (verified with `os.path.exists()`)
- Directory is accessible
- Files are readable

**Error Message:**
```
Repository directory does not exist
```

**Reproduction Steps:**
1. Verify directory exists: `os.path.exists('.')` returns `True`
2. Call `overseer_check_compliance` with correct repo_root
3. Function reports directory doesn't exist

**Expected Behavior:**
- Should check if directory exists before reporting
- Should work with paths containing spaces
- Should return actual compliance status

**Actual Behavior:**
- Always reports directory doesn't exist
- Doesn't perform actual compliance checks
- Returns false positive

**Impact:**
- Compliance checking is non-functional
- Cannot validate project structure
- Misleading error messages

---

### 🔴 Issue #4: Sync Docs Reports Missing Files That Exist

**Severity:** Critical  
**Function:** `overseer_sync_docs`  
**Status:** Reproducible

**Description:**
The `sync_docs` function reports that `PHASES.md` doesn't exist when it clearly does:
- File exists at `/Volumes/projects/Forge Panel/forgepanel/PHASES.md`
- File is readable and writable
- File contains valid content

**Error Message:**
```
PHASES.md not found - would be created
```

**Reproduction Steps:**
1. Verify `PHASES.md` exists: `ls -la PHASES.md` shows file
2. Call `overseer_sync_docs` with correct repo_root
3. Function reports file not found

**Expected Behavior:**
- Should detect existing `PHASES.md`
- Should validate and sync existing files
- Should only create if truly missing

**Actual Behavior:**
- Always reports files as missing
- Doesn't read existing files
- Cannot sync existing documentation

**Impact:**
- Documentation syncing is non-functional
- Cannot maintain consistency of existing docs
- May overwrite existing files incorrectly

---

## High Priority Issues

### 🟡 Issue #5: Infer Phases Returns Empty Results

**Severity:** High  
**Function:** `overseer_infer_phases`  
**Status:** Reproducible

**Description:**
The `infer_phases` function returns empty results even when the repository has:
- Clear project structure (backend/, frontend/, agents/, deploy/)
- Multiple Dockerfiles
- Documentation files
- Multiple programming languages (Go, Node.js, Ruby)

**Result:**
```json
{
  "success": false,
  "suggested_phases": [],
  "detected_frameworks": [],
  "detected_patterns": []
}
```

**Expected Behavior:**
- Should detect project structure
- Should identify frameworks (Docker, Node.js, Go, etc.)
- Should suggest phases based on structure

**Actual Behavior:**
- Returns empty arrays for all detections
- Doesn't analyze repository structure
- Provides no useful information

**Impact:**
- Phase inference is non-functional
- Cannot auto-generate phases from existing projects
- Manual phase creation required

---

### 🟡 Issue #6: Phase Operations Fail Due to Project Not Found

**Severity:** High  
**Functions:** `overseer_update_phases`, `overseer_run_phase`, `overseer_advance_phase`  
**Status:** Reproducible

**Description:**
All phase operation functions fail with "Project not found" error, even when phase files exist. This is a cascading failure from Issue #2.

**Affected Functions:**
- `overseer_update_phases` - Cannot add/update/remove phases
- `overseer_run_phase` - Cannot execute phase tasks
- `overseer_advance_phase` - Cannot advance to next phase

**Error Pattern:**
```
Project not found. Run plan_project first.
```

**Impact:**
- Cannot modify phases after creation
- Cannot execute phase workflows
- Cannot advance through phases
- All phase management is blocked

---

### 🟡 Issue #7: Lint Repo Doesn't Detect Languages

**Severity:** High  
**Function:** `overseer_lint_repo`  
**Status:** Reproducible

**Description:**
The `lint_repo` function doesn't detect any languages even when the repository contains:
- Go files (`*.go`, `go.mod`)
- Node.js files (`package.json`, `*.js`)
- Ruby files (for GitLab CE)
- Docker files (`Dockerfile`, `docker-compose.yml`)

**Result:**
```json
{
  "detected_languages": [],
  "recommended_commands": [],
  "files_checked": 0
}
```

**Expected Behavior:**
- Should detect Go, JavaScript, Ruby, YAML
- Should recommend appropriate linting commands
- Should check relevant files

**Actual Behavior:**
- Detects no languages
- Provides no recommendations
- Checks no files

**Impact:**
- Linting functionality is non-functional
- Cannot get language-specific linting recommendations
- Missing valuable development tooling

---

## Medium Priority Issues

### 🟢 Issue #8: Inconsistent Error Handling

**Severity:** Medium  
**Status:** Reproducible

**Description:**
Different functions handle errors inconsistently:
- Some return `success: false` with detailed messages
- Some return `success: false` with minimal context
- Some functions return `success: true` but with empty results

**Examples:**
- `plan_project`: Returns detailed error in `errors` array
- `status`: Returns simple "not found" message
- `infer_phases`: Returns `success: false` but no error details

**Impact:**
- Difficult to debug issues
- Inconsistent developer experience
- Hard to programmatically handle errors

---

### 🟢 Issue #9: Path Handling Issues

**Severity:** Medium  
**Status:** Reproducible

**Description:**
The tool has consistent issues with paths containing spaces:
- All functions fail with paths like `/Volumes/projects/Forge Panel/forgepanel`
- May be related to improper path escaping or quoting
- Affects all major functions

**Impact:**
- Cannot use with standard macOS paths
- Limits tool usability
- Requires workarounds (symlinks, etc.)

---

## Low Priority / Informational Issues

### ⚪ Issue #10: Future Features Return Success

**Severity:** Low  
**Functions:** `overseer_generate_ci`, `overseer_secrets_template`, `overseer_env_map`  
**Status:** Informational

**Description:**
Some functions return `success: true` but indicate features are "planned for v1.1.0":
- `generate_ci`: Returns success but doesn't generate CI
- `secrets_template`: Returns success but doesn't create templates
- `env_map`: Returns success but returns empty map

**Example:**
```json
{
  "success": true,
  "message": "CI/CD generation for github-actions is planned for v1.1.0..."
}
```

**Impact:**
- Misleading success status
- Developers may expect functionality that doesn't exist
- Should return `success: false` with "not implemented" message

---

### ⚪ Issue #11: No Path Validation

**Severity:** Low  
**Status:** Informational

**Description:**
Functions don't validate that the provided `repo_root` path:
- Actually exists
- Is a directory
- Is accessible
- Contains expected files

**Impact:**
- Poor error messages
- Harder to debug issues
- Could provide better user experience with validation

---

## Test Results Summary

### Functions Tested: 11

| Function | Status | Notes |
|----------|--------|-------|
| `plan_project` | ❌ Failed | Permission denied with spaces in path |
| `status` | ❌ Failed | Doesn't recognize existing files |
| `check_compliance` | ❌ Failed | Reports directory doesn't exist |
| `sync_docs` | ❌ Failed | Reports files missing when they exist |
| `infer_phases` | ❌ Failed | Returns empty results |
| `update_phases` | ❌ Failed | Project not found |
| `run_phase` | ❌ Failed | Project not found |
| `advance_phase` | ❌ Failed | Project not found |
| `lint_repo` | ❌ Failed | Doesn't detect languages |
| `generate_ci` | ⚠️ Partial | Returns success but not implemented |
| `secrets_template` | ⚠️ Partial | Returns success but not implemented |
| `env_map` | ⚠️ Partial | Returns success but not implemented |

**Success Rate:** 0% (0/11 fully functional)

---

## Root Cause Analysis

### Primary Issues:

1. **Path Handling:** The tool doesn't properly handle paths with spaces, likely due to:
   - Improper path escaping in Node.js/JavaScript
   - Not using proper path quoting
   - Attempting to create directories that already exist

2. **File Detection:** The tool doesn't check for existing phase files before reporting "not found":
   - May be using a different path resolution method
   - May have a project registry that requires `plan_project` to succeed first
   - May not be reading filesystem directly

3. **Directory Validation:** Functions don't validate directory existence before operations:
   - Should check `fs.existsSync()` or equivalent
   - Should verify directory vs file
   - Should check permissions before operations

---

## Recommendations

### Immediate Fixes (Critical):

1. **Fix Path Handling:**
   - Properly escape/quote paths with spaces
   - Use absolute path resolution
   - Check if directory exists before attempting to create

2. **Fix File Detection:**
   - Check for existing `PHASES.md` before reporting "not found"
   - Read and parse existing phase files
   - Make `status` work independently of `plan_project`

3. **Add Directory Validation:**
   - Validate `repo_root` exists and is a directory
   - Check read/write permissions
   - Provide clear error messages

### Short-term Improvements (High Priority):

4. **Implement Language Detection:**
   - Scan for common file patterns (`go.mod`, `package.json`, etc.)
   - Detect frameworks and tools
   - Provide linting recommendations

5. **Fix Phase Operations:**
   - Make phase operations work with existing files
   - Don't require `plan_project` if files exist
   - Support manual phase file creation

### Long-term Enhancements (Medium/Low Priority):

6. **Consistent Error Handling:**
   - Standardize error response format
   - Include error codes and detailed messages
   - Provide actionable error messages

7. **Implement Planned Features:**
   - Complete CI/CD generation
   - Complete secrets template generation
   - Complete environment mapping

8. **Add Path Validation:**
   - Validate all input paths
   - Provide helpful error messages
   - Support relative and absolute paths

---

## Workarounds

Until these issues are fixed, users can:

1. **Use Symlinks:** Create symlinks without spaces:
   ```bash
   ln -s "/Volumes/projects/Forge Panel/forgepanel" ~/forgepanel
   ```

2. **Manual Phase Files:** Manually create `PHASES.md` and phase files, though Overseer won't recognize them

3. **Alternative Tools:** Use other project management tools until Overseer is fixed

---

## Testing Environment

- **OS:** macOS (darwin 25.1.0)
- **Shell:** /bin/zsh
- **Repository Path:** `/Volumes/projects/Forge Panel/forgepanel`
- **Path Contains Spaces:** Yes (1 space)
- **Directory Exists:** Yes
- **Directory Writable:** Yes
- **Phase Files Exist:** Yes (PHASES.md + 7 phase files)

---

## Conclusion

The Overseer MCP tool has critical issues that prevent it from functioning correctly with real-world project structures, especially those with paths containing spaces. The tool needs significant fixes to path handling, file detection, and directory validation before it can be reliably used.

**Recommendation:** Address critical issues (#1-#4) before using Overseer in production environments.

---

**Report Generated:** 2024-11-13  
**Tested By:** Cursor AI Agent  
**Repository:** forgepanel

