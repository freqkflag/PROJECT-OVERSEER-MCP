# Changelog

All notable changes to the Overseer MCP project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### 🔴 Critical Fixes

#### Fixed: Path Handling with Spaces
- **Issue:** Tools failed when repository paths contained spaces (e.g., `/Volumes/projects/Forge Panel/forgepanel`)
- **Impact:** All tools now work correctly with paths containing spaces
- **Changes:**
  - Added `readPhasesIndexFromPath()`, `writePhasesIndexToPath()`, and `getPhaseFileByIdFromPath()` methods to `RepoHandler` class
  - Updated all tools to use absolute paths directly instead of reconstructing paths from repo names
  - Fixed path resolution to properly handle spaces and special characters
- **Files Modified:**
  - `src/core/repo.ts` - Added absolute path methods
  - `src/tools/status.ts` - Uses `readPhasesIndexFromPath()`
  - `src/tools/advance-phase.ts` - Uses absolute path methods
  - `src/tools/run-phase.ts` - Uses absolute path methods
  - `src/tools/sync-docs.ts` - Uses absolute path methods
  - `src/tools/update-phases.ts` - Uses absolute path methods
- **Breaking Changes:** None
- **Migration:** No migration needed - backward compatible

#### Fixed: Status Function Recognition
- **Issue:** `overseer.status` failed to recognize existing phase files, always returning "Project not found"
- **Impact:** Status function now correctly detects and parses existing `PHASES.md` and phase files
- **Changes:**
  - Updated `status` tool to use `readPhasesIndexFromPath()` for absolute path resolution
  - Enhanced `parsePhasesMarkdown()` to support multiple markdown formats:
    - Format 1: `### 1. phase-name\n\n**Status**: status`
    - Format 2: `### Phase 01: phase-name\n- **Status:** status`
    - Format 3: `### Phase 01: phase-name\n- **Status**: status`
  - Improved status detection to handle both `- **Status:**` and `**Status**:` patterns
  - Made phase ID extraction more flexible (handles "01", "1", "Phase 01", etc.)
  - Status function now works independently of `plan_project` if phase files exist
- **Files Modified:**
  - `src/tools/status.ts`
  - `src/core/repo.ts` - Enhanced markdown parser
- **Breaking Changes:** None
- **Test Result:** ✅ Successfully parses 7 phases from real-world PHASES.md file

#### Fixed: Sync Docs File Detection
- **Issue:** `overseer.sync_docs` reported files as missing when they existed
- **Impact:** Sync docs now correctly detects and validates existing phase files
- **Changes:**
  - Updated to use absolute path methods
  - Improved file existence checking
- **Files Modified:**
  - `src/tools/sync-docs.ts`
- **Breaking Changes:** None

#### Fixed: Phase Operations Project Detection
- **Issue:** All phase operations (`update_phases`, `run_phase`, `advance_phase`) failed with "Project not found"
- **Impact:** Phase operations now work correctly with existing phase files
- **Changes:**
  - Updated all phase operation tools to use absolute path methods
  - Removed dependency on `plan_project` for existing projects
- **Files Modified:**
  - `src/tools/advance-phase.ts`
  - `src/tools/run-phase.ts`
  - `src/tools/update-phases.ts`
- **Breaking Changes:** None

### 🟡 High Priority Improvements

#### Enhanced: Environment Variable Support
- **Issue:** `OVERSEER_BASE_PATH` environment variable was not being used
- **Impact:** Base path can now be configured via environment variable
- **Changes:**
  - Updated `RepoHandler` constructor to read `OVERSEER_BASE_PATH` from environment
  - Environment variable takes precedence over constructor parameter and default `~/dev` path
  - Priority order: `OVERSEER_BASE_PATH` (env var) > `basePath` (constructor) > `~/dev` (default)
- **Files Modified:**
  - `src/core/repo.ts`
- **Breaking Changes:** None
- **Fix Date:** 2024-11-13 - Corrected precedence order to give environment variable highest priority

### 🟢 Medium Priority Improvements

#### Fixed: Directory Creation Logic
- **Issue:** `FSUtils.ensureDir()` attempted to create directories that already existed, causing permission errors
- **Impact:** Directory creation now checks if directory exists and validates it's actually a directory before attempting creation
- **Changes:**
  - Enhanced `ensureDir()` to check if path exists before creation
  - Added validation to ensure path is a directory, not a file
  - Improved error messages for file vs directory conflicts
- **Files Modified:**
  - `src/core/fsUtils.ts`
- **Breaking Changes:** None

#### Improved: Docker Build Process
- **Issue:** Docker build failed because dev dependencies were needed for TypeScript compilation
- **Impact:** Docker builds now succeed correctly
- **Changes:**
  - Updated Dockerfile to install all dependencies for build, then prune dev dependencies
  - Improved build process efficiency
- **Files Modified:**
  - `Dockerfile`
- **Breaking Changes:** None

#### Improved: Docker Compose Configuration
- **Issue:** Obsolete `version` field in docker-compose.yml caused warnings
- **Impact:** Cleaner Docker Compose configuration
- **Changes:**
  - Removed obsolete `version: '3.8'` field
- **Files Modified:**
  - `docker-compose.yml`
- **Breaking Changes:** None

---

## [1.0.0] - 2024-11-13

### Added

#### Core Features
- **MCP Server Implementation**
  - Full MCP protocol support via stdio transport
  - 12 tools for project phase management
  - Configuration via `sentinel.yml`

#### Planning Tools
- `overseer.plan_project` - Create project phase definitions
- `overseer.infer_phases` - Auto-detect phases from repository structure
- `overseer.update_phases` - Modify existing phase definitions

#### Execution Tools
- `overseer.run_phase` - Execute specific phase tasks
- `overseer.advance_phase` - Advance phases through lifecycle
- `overseer.status` - Get project and phase status

#### QA Tools
- `overseer.lint_repo` - Detect languages and recommend linting
- `overseer.sync_docs` - Synchronize documentation
- `overseer.check_compliance` - Validate repository structure

#### Environment Tools
- `overseer.env_map` - Map environment variables across phases
- `overseer.generate_ci` - Generate CI/CD pipeline configurations
- `overseer.secrets_template` - Create secrets management templates

#### Core Components
- `PhaseManager` - Manages project phases and lifecycle
- `RepoHandler` - Handles repository file operations
- `ConfigLoader` - Loads and manages configuration
- `RepoAnalyzer` - Analyzes repository structure
- `FSUtils` - File system utilities

#### Infrastructure
- Docker support with Dockerfile and docker-compose.yml
- TypeScript compilation and build process
- MCP client integration examples

### Documentation
- `README.md` - Project overview and quick start
- `RUNNING.md` - Installation and deployment guide
- `TOOLS.md` - Complete tool reference
- `DESIGN.md` - Architecture and design documentation
- `DEMO.md` - Usage examples and walkthroughs
- `PHASES.md` - Build phases for this project

---

## Change Categories

### 🔴 Critical
- Security vulnerabilities
- Data loss risks
- Complete feature failures
- Breaking changes

### 🟡 High Priority
- Significant bugs
- Performance issues
- Feature improvements
- Important enhancements

### 🟢 Medium Priority
- Minor bugs
- Usability improvements
- Code quality improvements
- Documentation updates

### ⚪ Low Priority
- Cosmetic changes
- Code refactoring
- Future feature planning
- Informational updates

---

## Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2024-11-13 | Initial release with full MCP tool suite |
| Unreleased | 2024-11-13 | Path handling fixes and improvements |

---

## Migration Guides

### From Pre-1.0.0

No migration needed - this is the initial release.

### Future Versions

Migration guides will be provided when breaking changes are introduced.

---

## Contributing

When adding entries to this changelog, please follow these guidelines:

1. **Group changes by type:** Added, Changed, Deprecated, Removed, Fixed, Security
2. **Use clear, concise language:** Write for users, not just developers
3. **Include impact:** Explain what the change means for users
4. **Reference issues:** Link to related issues or bug reports when applicable
5. **Categorize by priority:** Use emoji indicators (🔴🟡🟢⚪) for quick scanning

---

## Links

- [Bug Report #1](./issues/bug_report-1.md) - Comprehensive issue report
- [Plan of Action](./issues/PLAN_OF_ACTION.md) - Implementation plan
- [GitHub Issues](https://github.com/your-org/overseer-mcp/issues) - Issue tracker

---

**Last Updated:** 2024-11-13

