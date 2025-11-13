# Overseer MCP Design Document

## Overall Architecture

Overseer follows a layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Server Layer                          │
│  - Handles MCP protocol (stdio transport)                   │
│  - Routes tool calls to appropriate handlers                 │
│  - Manages server lifecycle                                  │
└───────────────────────┬───────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                      Tool Layer                                │
│  - Tool definitions (MCP Tool schema)                        │
│  - Input validation                                           │
│  - Response formatting                                        │
│  - Error handling                                             │
└───────────────────────┬───────────────────────────────────────┘
                        │
┌───────────────────────▼───────────────────────────────────────┐
│                   Core Logic Layer                             │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ PhaseManager                                             │ │
│  │  - Phase lifecycle management                           │ │
│  │  - Template application                                 │ │
│  │  - Phase execution orchestration                        │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ RepoHandler                                              │ │
│  │  - File system operations                                │ │
│  │  - PHASES.md parsing/writing                             │ │
│  │  - PHASE-*.md management                                 │ │
│  │  - Repository structure validation                       │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ConfigLoader                                             │ │
│  │  - sentinel.yml loading                                  │ │
│  │  - Template resolution                                   │ │
│  │  - Convention application                                │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ DocSync (future)                                         │ │
│  │  - Documentation generation                              │ │
│  │  - Code-to-doc synchronization                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │ ComplianceChecker (future)                               │ │
│  │  - Phase completion validation                           │ │
│  │  - Artifact verification                                 │ │
│  └─────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

## Data Model

### PHASES.md Structure

The `PHASES.md` file serves as the project's phase index. It can be stored in two formats:

#### Markdown Format (Preferred)

```markdown
# Project Phases: {project_name}

This document tracks the phases of the project.

## Metadata

- **Created**: {ISO 8601 timestamp}
- **Updated**: {ISO 8601 timestamp}
- **Total Phases**: {number}

## Phases

### 1. {phase_name}

**Status**: {pending|active|completed}
**Description**: {description}
**Started**: {ISO 8601 timestamp | null}
**Completed**: {ISO 8601 timestamp | null}

### 2. {phase_name}
...
```

#### JSON Format (Legacy/Internal)

```json
{
  "project_name": "string",
  "created_at": "ISO 8601 timestamp",
  "updated_at": "ISO 8601 timestamp",
  "phases": [
    {
      "name": "string",
      "status": "pending|active|completed",
      "description": "string (optional)",
      "started_at": "ISO 8601 timestamp (optional)",
      "completed_at": "ISO 8601 timestamp (optional)"
    }
  ]
}
```

**TypeScript Interface**:
```typescript
interface ProjectPhases {
  project_name: string;
  created_at: string;  // ISO 8601
  updated_at: string;   // ISO 8601
  phases: PhaseInfo[];
}

interface PhaseInfo {
  name: string;
  status: 'pending' | 'active' | 'completed';
  description?: string;
  started_at?: string;    // ISO 8601
  completed_at?: string;   // ISO 8601
}
```

### PHASE-{name}.md Structure

Each phase has its own markdown file:

```markdown
# {Template Name}

**Phase**: {phase_name}
**Status**: {pending|active|completed}
**Created**: {ISO 8601 timestamp}

---

## Description

{template description}

## Steps

1. [ ] {step 1}
2. [ ] {step 2}
...

## Artifacts

- {artifact pattern 1}
- {artifact pattern 2}
...

## Progress

- [ ] Phase started
- [ ] Steps completed
- [ ] Artifacts created
- [ ] Phase completed

---

*This phase file is managed by Overseer MCP.*
*Template: {template_name}*
```

### sentinel.yml Structure

```yaml
phase_templates:
  {template_name}:
    name: "Human Readable Name"
    description: "Phase description"
    steps:
      - "Step 1 description"
      - "Step 2 description"
    artifacts:
      - "artifact/pattern/**"
      - "specific/file.ext"

conventions:
  phase_files:
    pattern: "PHASE-{name}.md"
    location: "project_root"
  phases_index:
    file: "PHASES.md"
    location: "project_root"
  naming:
    phase_names: "kebab-case"
    branch_names: "phase/{name}"

environments:
  development:
    base_path: "~/dev"
    auto_commit: false
    verbose_logging: true
  production:
    base_path: "~/dev"
    auto_commit: true
    verbose_logging: false

coding_standards:
  languages:
    {language}:
      formatter: "tool_name"
      linter: "tool_name"
      style_guide: "guide_name"
  general:
    max_line_length: 100
    indent_size: 2
    use_tabs: false
    trailing_commas: true
```

## Interaction Diagrams

### plan_project Flow

```
Client                    Tool Layer              PhaseManager          RepoHandler
  │                          │                         │                     │
  │── plan_project ──────────>│                         │                     │
  │  {repo, phases}         │                         │                     │
  │                          │── planProject() ───────>│                     │
  │                          │                         │                     │
  │                          │                         │── ensureRepo() ────>│
  │                          │                         │                     │── mkdir
  │                          │                         │<─── repo_path ──────│
  │                          │                         │                     │
  │                          │                         │── readPhasesIndex()─>│
  │                          │                         │<─── existing ───────│
  │                          │                         │                     │
  │                          │                         │── getPhaseTemplate()│
  │                          │                         │                     │
  │                          │                         │── createPhaseInfo() │
  │                          │                         │                     │
  │                          │                         │── writePhaseFile()─>│
  │                          │                         │                     │── write
  │                          │                         │                     │
  │                          │                         │── writePhasesIndex()>│
  │                          │                         │                     │── write
  │                          │                         │                     │
  │                          │<─── result ─────────────│                     │
  │<─── response ────────────│                         │                     │
  │  {success, phases, ...}  │                         │                     │
```

### run_phase Flow

```
Client                    Tool Layer              PhaseManager          RepoHandler
  │                          │                         │                     │
  │── run_phase ────────────>│                         │                     │
  │  {repo, phase}           │                         │                     │
  │                          │── runPhase() ──────────>│                     │
  │                          │                         │                     │
  │                          │                         │── readPhasesIndex()─>│
  │                          │                         │<─── phases ─────────│
  │                          │                         │                     │
  │                          │                         │── find phase ───────│
  │                          │                         │                     │
  │                          │                         │── getPhaseTemplate()│
  │                          │                         │                     │
  │                          │                         │── update status ────│
  │                          │                         │  (pending→active)   │
  │                          │                         │                     │
  │                          │                         │── writePhasesIndex()>│
  │                          │                         │                     │── write
  │                          │                         │                     │
  │                          │<─── result ─────────────│                     │
  │<─── response ────────────│                         │                     │
  │  {success, artifacts}    │                         │                     │
```

### advance_phase Flow

```
Client                    Tool Layer              PhaseManager          RepoHandler
  │                          │                         │                     │
  │── advance_phase ────────>│                         │                     │
  │  {repo, phase}           │                         │                     │
  │                          │── advancePhase() ──────>│                     │
  │                          │                         │                     │
  │                          │                         │── readPhasesIndex()─>│
  │                          │                         │<─── phases ─────────│
  │                          │                         │                     │
  │                          │                         │── find phase ───────│
  │                          │                         │                     │
  │                          │                         │── transition status │
  │                          │                         │  pending→active     │
  │                          │                         │  active→completed   │
  │                          │                         │                     │
  │                          │                         │── writePhasesIndex()>│
  │                          │                         │                     │── write
  │                          │                         │                     │
  │                          │<─── result ─────────────│                     │
  │<─── response ────────────│                         │                     │
  │  {success, new_status}   │                         │                     │
```

### status Flow

```
Client                    Tool Layer              PhaseManager          RepoHandler
  │                          │                         │                     │
  │── status ───────────────>│                         │                     │
  │  {repo}                  │                         │                     │
  │                          │── getStatus() ─────────>│                     │
  │                          │                         │                     │
  │                          │                         │── readPhasesIndex()─>│
  │                          │                         │                     │── read
  │                          │                         │<─── phases ─────────│
  │                          │                         │                     │
  │                          │<─── phases ─────────────│                     │
  │<─── response ────────────│                         │                     │
  │  {project, phases}       │                         │                     │
```

## Configuration Influence (sentinel.yml)

### Phase Templates

- **Defines available phases**: Only phases listed in `phase_templates` can be used
- **Provides structure**: Each template defines steps and artifacts
- **Enables reuse**: Templates can be shared across projects

### Conventions

- **File naming**: `phase_files.pattern` determines how phase files are named
- **File location**: `phases_index.location` determines where PHASES.md lives
- **Naming standards**: `naming.phase_names` enforces naming conventions

### Environments

- **Base path**: `environments.{env}.base_path` determines where repos are stored
- **Auto-commit**: `environments.{env}.auto_commit` controls git integration (future)
- **Logging**: `environments.{env}.verbose_logging` controls log verbosity

### Coding Standards

- **Language-specific**: Defines formatters/linters per language
- **General rules**: Line length, indentation, etc.
- **Used by**: `lint_repo` and `check_compliance` tools (future)

## Phase Lifecycle

```
┌─────────┐
│ pending │  (initial state)
└────┬────┘
     │ run_phase() or advance_phase()
     ▼
┌─────────┐
│ active  │  (work in progress)
└────┬────┘
     │ advance_phase()
     ▼
┌──────────┐
│completed │  (done)
└──────────┘
```

## Error Handling Strategy

1. **Validation Errors**: Returned immediately with clear messages
2. **File System Errors**: Caught and returned as error responses
3. **Configuration Errors**: Logged and returned with guidance
4. **Partial Failures**: Some operations (like `plan_project`) can partially succeed

All errors are returned as JSON-compatible structures:

```typescript
{
  success: false,
  error: "Human-readable error message",
  details?: { ... }  // Optional additional context
}
```

## Extension Points

### Future Tools

- `overseer.infer_phases`: Analyze existing repo structure to suggest phases
- `overseer.update_phases`: Modify existing phase definitions
- `overseer.lint_repo`: Run linting based on coding standards
- `overseer.sync_docs`: Keep documentation in sync with code
- `overseer.check_compliance`: Validate phase completion
- `overseer.env_map`: Map environment variables across phases
- `overseer.generate_ci`: Generate CI/CD pipelines
- `overseer.secrets_template`: Create secrets management structure

### Plugin Architecture (Future)

- Custom phase templates per project
- Custom validators per phase
- Integration hooks (git, CI/CD, etc.)

