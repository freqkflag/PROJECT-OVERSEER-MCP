# Overseer MCP Demo Scenario

This document demonstrates a complete workflow using Overseer MCP to manage a project from planning through execution.

## Demo Project: `sample-web-app`

**Scenario**: Building a new TypeScript web application with React frontend and Node.js backend.

**Repository**: `~/dev/sample-web-app`

## Step 1: Plan the Project

### Tool Call: `overseer.plan_project`

**Input:**
```json
{
  "repo_root": "~/dev/sample-web-app",
  "project_name": "sample-web-app",
  "project_summary": "A modern web application with React frontend and Node.js API backend",
  "overwrite_existing": false
}
```

**What Happens:**
1. Overseer analyzes the repository structure (if it exists)
2. Infers appropriate phases based on detected patterns
3. Creates `PHASES.md` with structured phase definitions
4. Generates `PHASE-01.md`, `PHASE-02.md`, etc. with deliverables and done criteria

**Expected Output:**
```json
{
  "success": true,
  "message": "Created project \"sample-web-app\" with 5 phase(s)",
  "phases_discovered": 5,
  "phases_created": 5,
  "files_written": [
    "~/dev/sample-web-app/PHASES.md",
    "~/dev/sample-web-app/PHASE-01.md",
    "~/dev/sample-web-app/PHASE-02.md",
    "~/dev/sample-web-app/PHASE-03.md",
    "~/dev/sample-web-app/PHASE-04.md",
    "~/dev/sample-web-app/PHASE-05.md"
  ],
  "files_updated": [],
  "errors": []
}
```

### Generated PHASES.md

```markdown
# Project Phases: sample-web-app

This document tracks the phases of the project.

## Metadata

- **Created**: 2024-01-15T12:00:00.000Z
- **Updated**: 2024-01-15T12:00:00.000Z
- **Total Phases**: 5

## Phases

### 01. foundation

**Status**: pending
**Description**: Project foundation, setup, and initial structure

**Deliverables**:

- Project structure established
- Development environment configured
- Initial configuration files
- README.md

**Done Criteria**:

- [ ] Project structure is in place
- [ ] Development environment is set up
- [ ] Basic configuration files exist
- [ ] README.md is created

### 02. core_features

**Status**: pending
**Description**: Core feature development and implementation

**Deliverables**:

- Core functionality implemented
- Source code in src/ or app/
- Basic features working

**Done Criteria**:

- [ ] Core features are implemented
- [ ] Source code is organized
- [ ] Basic functionality works

### 03. testing

**Status**: pending
**Description**: Comprehensive testing and validation

**Deliverables**:

- Test suite implemented
- Test coverage report
- Integration tests

**Done Criteria**:

- [ ] Test suite passes
- [ ] Test coverage meets requirements
- [ ] Integration tests are working

### 04. infrastructure

**Status**: pending
**Description**: Infrastructure setup and deployment configuration

**Deliverables**:

- Docker configuration (if applicable)
- CI/CD pipeline
- Deployment scripts

**Done Criteria**:

- [ ] Infrastructure is configured
- [ ] Deployment scripts are ready
- [ ] CI/CD pipeline is set up

### 05. documentation

**Status**: pending
**Description**: Create and maintain project documentation

**Deliverables**:

- README.md updated
- API documentation

**Done Criteria**:

- [ ] Documentation is complete
- [ ] README.md is comprehensive
```

### Generated PHASE-01.md

```markdown
# Phase 01: foundation

**Project**: sample-web-app
**Phase ID**: 01
**Status**: pending
**Created**: 2024-01-15T12:00:00.000Z

---

## Description

Project foundation, setup, and initial structure

## Deliverables

- [ ] Project structure established
- [ ] Development environment configured
- [ ] Initial configuration files
- [ ] README.md

## Done Criteria

- [ ] Project structure is in place
- [ ] Development environment is set up
- [ ] Basic configuration files exist
- [ ] README.md is created

## Progress

- [ ] Phase started
- [ ] Deliverables completed
- [ ] Done criteria met
- [ ] Phase completed

---

*This phase file is managed by Overseer MCP.*
```

## Step 2: Run Phase 01

### Tool Call: `overseer.run_phase`

**Input:**
```json
{
  "repo_root": "~/dev/sample-web-app",
  "phase_id": "01",
  "aggression_level": "normal"
}
```

**What Happens:**
1. Overseer reads `PHASE-01.md`
2. Checks each deliverable and done criterion
3. Verifies file/directory existence
4. Creates stub files for missing items (if aggression_level allows)
5. Updates checklists in `PHASE-01.md`
6. Updates phase status to "in_progress"

**Expected Output:**
```json
{
  "success": true,
  "message": "Phase 01 execution completed. 2 tasks complete, 6 pending.",
  "phase_id": "01",
  "completed_tasks": [
    {
      "task": "README.md",
      "type": "deliverable",
      "evidence": "File exists: README.md"
    },
    {
      "task": "Project structure is in place",
      "type": "done_criterion",
      "evidence": "Directory exists: src/"
    }
  ],
  "pending_tasks": [
    {
      "task": "Development environment configured",
      "type": "deliverable",
      "action_taken": "File package.json not found. Needs to be created."
    },
    {
      "task": "Initial configuration files",
      "type": "deliverable",
      "action_taken": "Task needs manual verification"
    },
    {
      "task": "Development environment is set up",
      "type": "done_criterion",
      "action_taken": "Task needs manual verification"
    },
    {
      "task": "Basic configuration files exist",
      "type": "done_criterion",
      "action_taken": "Task needs manual verification"
    }
  ],
  "changed_files": [
    "~/dev/sample-web-app/PHASE-01.md",
    "~/dev/sample-web-app/PHASES.md"
  ],
  "status": "in_progress"
}
```

**Updated PHASE-01.md** (after run_phase):
- Checklists updated with completion status
- Status changed to "in_progress"
- Progress section updated

## Step 3: Complete Phase 01 Work

After running `run_phase`, you would:
1. Create missing files (package.json, tsconfig.json, etc.)
2. Set up the development environment
3. Mark items as complete in `PHASE-01.md` manually or via tools

## Step 4: Advance to Phase 02

### Tool Call: `overseer.advance_phase`

**Input:**
```json
{
  "repo_root": "~/dev/sample-web-app",
  "expected_current_phase": "01"
}
```

**What Happens:**
1. Overseer validates all deliverables are complete
2. Verifies all done criteria are met
3. Marks Phase 01 as "locked"
4. Activates Phase 02 automatically
5. Adds completion summary to `PHASE-01.md`

**Expected Output (if complete):**
```json
{
  "success": true,
  "message": "Phase 01 advanced successfully. Next phase 02 activated.",
  "status": "advanced",
  "current_phase": {
    "id": "01",
    "name": "foundation",
    "status": "locked"
  },
  "next_phase": {
    "id": "02",
    "name": "core_features",
    "status": "in_progress"
  },
  "missing_items": [],
  "changes_applied": [
    "~/dev/sample-web-app/PHASES.md",
    "~/dev/sample-web-app/PHASE-01.md"
  ]
}
```

**Expected Output (if incomplete):**
```json
{
  "success": true,
  "message": "Phase 01 is incomplete. 2 item(s) missing.",
  "status": "incomplete",
  "current_phase": {
    "id": "01",
    "name": "foundation",
    "status": "in_progress"
  },
  "next_phase": null,
  "missing_items": [
    {
      "type": "deliverable",
      "item": "Initial configuration files",
      "reason": "Deliverable not marked as complete in checklist"
    },
    {
      "type": "done_criterion",
      "item": "Basic configuration files exist",
      "reason": "Done criterion not marked as complete in checklist"
    }
  ],
  "changes_applied": []
}
```

## Step 5: Check Status

### Tool Call: `overseer.status`

**Input:**
```json
{
  "repo_root": "~/dev/sample-web-app"
}
```

**Expected Output:**
```json
{
  "success": true,
  "message": "Status retrieved for project sample-web-app",
  "project_name": "sample-web-app",
  "current_phase": "02",
  "phases": [
    {
      "id": "01",
      "name": "foundation",
      "status": "locked",
      "description": "Project foundation, setup, and initial structure",
      "started_at": "2024-01-15T12:00:00.000Z",
      "completed_at": "2024-01-15T12:30:00.000Z"
    },
    {
      "id": "02",
      "name": "core_features",
      "status": "in_progress",
      "description": "Core feature development and implementation",
      "started_at": "2024-01-15T12:30:00.000Z"
    },
    {
      "id": "03",
      "name": "testing",
      "status": "pending"
    },
    {
      "id": "04",
      "name": "infrastructure",
      "status": "pending"
    },
    {
      "id": "05",
      "name": "documentation",
      "status": "pending"
    }
  ],
  "summary": {
    "total": 5,
    "pending": 3,
    "active": 0,
    "in_progress": 1,
    "completed": 1,
    "locked": 1,
    "blocked": 0
  }
}
```

## Complete Workflow Summary

1. **Plan**: `overseer.plan_project` creates project structure with phases
2. **Execute**: `overseer.run_phase` executes phases and tracks progress
3. **Advance**: `overseer.advance_phase` validates completion and moves to next phase
4. **Monitor**: `overseer.status` provides real-time project visibility

## Additional Tools

### Check Compliance

```json
{
  "repo_root": "~/dev/sample-web-app",
  "phase_id": "01"
}
```

Validates repository structure against sentinel.yml conventions.

### Sync Documentation

```json
{
  "repo_root": "~/dev/sample-web-app",
  "options": {
    "dry_run": false
  }
}
```

Ensures all phase files have consistent formatting and required sections.

### Lint Repository

```json
{
  "repo_root": "~/dev/sample-web-app",
  "options": {
    "fix": false
  }
}
```

Detects languages and recommends linting commands based on coding standards.

## Next Steps

- Continue with Phase 02: `overseer.run_phase` with `phase_id: "02"`
- Use `overseer.check_compliance` to validate structure
- Use `overseer.sync_docs` to keep documentation consistent
- Repeat the cycle for each phase until project completion

