# MASTER‑OVERSEER‑PLAN.md

## 0. High‑Level Concept

**Project:** `overseer‑mcp`

**Role:** A standalone, client‑agnostic MCP server that defines, plans, executes, enforces and advances multi‑phase software projects.  Overseer knows how you build systems.  It reads and writes project files, generates phase definitions, executes work, validates completion, locks and advances phases 1 → N.  It remains 100 % client‑agnostic and deterministic.

Overseer does **not** depend on Cursor, Claude, Nova, VS Code or any IDE.  The only requirement is a client that speaks the Model Context Protocol (MCP) and exchanges JSON payloads.  All state and enforcement lives inside Overseer.

---

## 1. Global Constraints

The following rules apply to all components, code, tooling and prompts:

1. **No client dependence** – Overseer must never assume a specific IDE or chat client.  Client integrations are documented as examples only.
2. **Pure JSON contracts** – All tools accept structured JSON inputs and return structured JSON outputs.  Human‑readable explanations live in the response body.
3. **Internal enforcement** – Phase tracking and locking are entirely internal.  Clients do not enforce phase progression.
4. **Deterministic behaviour** – Given the same inputs and repository state, tools must produce the same outputs.
5. **Client integrations as examples** – README may demonstrate usage with various MCP clients, but core logic must remain client‑agnostic.
6. **Strict phase integrity** – Overseer itself plans, executes, validates, locks and advances phases.  No skipping or partial completion is allowed.

---

## 2. Tool Surface (Full API)

This section defines every tool exposed by `overseer‑mcp` version 1.0.  All tools use the MCP protocol and operate on a project rooted at `repo_root`.

### 2.1 Planning / Meta Tools

**1. `overseer.plan_project`**

- **Inputs:**
  - `repo_root`: absolute or MCP‑resolved root of the project
  - `project_name`: display name of the project
  - `project_summary`: short description used to infer phases
  - `overwrite_existing?`: boolean flag controlling whether to regenerate existing phase plans
- **Outputs:**
  - A structured `PHASES.md` file in the repo root
  - `PHASE‑01.md` (and other phase files if necessary)
  - A JSON summary describing phases created/updated and files written
- **Purpose:** Create an initial multi‑phase plan by analysing the repo and using the provided summary.

**2. `overseer.infer_phases`**

- **Inputs:** `repo_root`
- **Outputs:** A list of suggested phases with names, descriptions, deliverables and dependencies
- **Purpose:** Auto‑generate a phase plan when none exists by inspecting repo structure, languages and frameworks.

**3. `overseer.update_phases`**

- **Inputs:**
  - `repo_root`
  - `modifications`: patch operations (JSON Patch or structured list) representing desired changes to phase definitions
- **Outputs:** Updated `PHASES.md` and affected `PHASE‑XX.md` files, plus a JSON summary of changes applied
- **Purpose:** Programmatically update phase definitions while preserving formatting and validating structure.

### 2.2 Execution / Phase Engine

These tools perform and enforce the work required for each phase.

**4. `overseer.run_phase`**

Inputs and outputs are defined using TypeScript interfaces:

```ts
interface RunPhaseInput {
  repo_root: string;
  phase_id: number;
  aggression_level?: 'normal' | 'bossmode';
}

type PhaseStatus = 'in_progress' | 'potentially_complete' | 'blocked';

interface RunPhaseOutput {
  repo_root: string;
  phase_id: number;
  status: PhaseStatus;
  completed_tasks: string[];
  pending_tasks: string[];
  changed_files: string[];
  notes?: string[];
}
```

**Purpose:** Read the phase plan, inspect repo contents, generate missing files and TODOs, update phase checklists and return a summary of completed and pending tasks.  Does **not** lock the phase.

**5. `overseer.advance_phase`**

Inputs and outputs:

```ts
interface AdvancePhaseInput {
  repo_root: string;
  expected_current_phase?: number;
}

type AdvanceStatus = 'advanced' | 'incomplete' | 'no_more_phases';

interface AdvancePhaseOutput {
  repo_root: string;
  previous_phase: number | null;
  new_phase: number | null;
  status: AdvanceStatus;
  message: string;
  missing_requirements?: string[];
}
```

**Purpose:** Validate that all deliverables for the current phase are complete; if so, mark the phase as locked and advance to the next.  Otherwise, return an incomplete status with a list of missing requirements.

**6. `overseer.run_all_phases`** (future)

This tool orchestrates a complete run across phases 1 → N.  Its contract is documented for completeness but may be stubbed initially.

```ts
interface RunAllPhasesInput {
  repo_root: string;
  aggression_level?: 'normal' | 'bossmode';
  max_iterations?: number;
}

type RunAllStatus = 'complete' | 'blocked' | 'partial';

interface RunAllPhasesOutput {
  repo_root: string;
  status: RunAllStatus;
  last_phase_attempted: number | null;
  completed_phases: number[];
  blocked_phase: number | null;
  reason?: string;
  phase_summaries: {
    phase_id: number;
    status: PhaseStatus | 'locked';
    completed_tasks: string[];
    pending_tasks: string[];
  }[];
}
```

### 2.3 Status / Introspection

**7. `overseer.status`** – Returns the project name, current phase and a list of phases with their statuses and blockers.

**8. `overseer.phase_status`** – Returns detailed status for a single phase.

**9. `overseer.list_projects`** – (optional) Provide an overview of all projects managed if global state is supported.

### 2.4 QA / Docs Tools

**10. `overseer.lint_repo`** – Detect languages, run appropriate lints and return issues and fixes.

**11. `overseer.sync_docs`** – Ensure documentation (README, BUILD, PHASES, PHASE‑XX) matches the current state of the repo.

**12. `overseer.check_compliance`** – Compare repo structure and naming against conventions defined in `sentinel.yml` and return violations.

### 2.5 Environment / Infra Tools (future)

**13. `overseer.env_map`** – Provide environment mappings (e.g. vps.host, macmini, holo‑cube) for the project.

**14. `overseer.generate_ci`** – Generate or update CI workflows based on defaults in `sentinel.yml`.

**15. `overseer.secrets_template`** – Generate `.env.example` and secret mappings for Infisical/Vault or similar systems.

---

## 3. Phase File Format Specification

Phases are defined in two types of files:

### PHASES.md

This file enumerates all phases, their statuses and high‑level definitions.  Example format:

```markdown
# Project Phases

## Phase 1 – Foundation / Bootstrap
id: 1
status: current
description: Set up the base project structure, docs and configuration.
deliverables:
  - README.md
  - DESIGN.md
  - TOOLS.md
  - PHASES.md
done_criteria:
  - All required files created with initial content
dependencies: []

## Phase 2 – Repo & MCP Server Skeleton
id: 2
status: pending
...
```

### PHASE‑XX.md

Each phase has a corresponding detailed file (e.g. `PHASE‑01.md`).  Example layout:

```markdown
# Phase 01 — Foundation & Spec Lock

## Summary
High‑level description of this phase.

## Tasks
- [ ] Create README.md
- [ ] Create DESIGN.md
- [ ] Create TOOLS.md
- [ ] Create PHASES.md

## Deliverables
- README.md
- DESIGN.md
- TOOLS.md
- PHASES.md

## Artifacts
List of produced files, scripts or configurations.

## Done Criteria
- All deliverables exist and are properly formatted
- Phase 1 locked in PHASES.md
```

---

## 4. End‑to‑End Project Roadmap

The development of `overseer‑mcp` itself is organised into six phases.  Each phase has its own objectives, deliverables and success criteria.

| Phase | Objectives & Deliverables |
|------|---------------------------|
| **Phase 1 – Foundation & Spec Lock** | Produce README.md, DESIGN.md, TOOLS.md and PHASES.md for this MCP project.  Define global constraints and tool surface.  **Use:** master_prompt_1.md |
| **Phase 2 – MCP Server Skeleton** | Scaffolding for a Node/TypeScript MCP server: package.json, tsconfig.json, server entrypoint, stub tool files and sentinel.yml.  **Use:** master_prompt_2.md |
| **Phase 3 – Core Planning Tools** | Implement `plan_project`, `infer_phases`, `update_phases` and `status`.  Update docs accordingly.  **Use:** master_prompt_3.md |
| **Phase 4 – Phase Engine Tools** | Implement functional versions of `run_phase`, `advance_phase` and early versions of lint_repo, sync_docs and check_compliance.  **Use:** master_prompt_4.md |
| **Phase 5 – Ecosystem Integration** | Expand sentinel.yml with conventions, add Dockerfile and docker‑compose, write docs on running Overseer and provide generic MCP client examples.  **Use:** master_prompt_5.md |
| **Phase 6 – Final QA & Ship Review** | Add tests, logging, final docs (CHANGELOG, RELEASE), lock phases and ensure the system is shippable.  **Use:** master_prompt_6.md |

---

## 5. Master Prompts Summary

Six master prompts drive the development process.  Each lives under `prompts/` as a separate file.  They are provided in this plan for easy reference and future updates.

1. **master_prompt_1.md** – Create the foundational spec and base documents.
2. **master_prompt_2.md** – Build the initial MCP server skeleton.
3. **master_prompt_3.md** – Teach Overseer how to plan projects (`plan_project`, `infer_phases`, `update_phases`, `status`).
4. **master_prompt_4.md** – Implement the phase execution engine (`run_phase`, `advance_phase`, early QA tools).
5. **master_prompt_5.md** – Connect Overseer to real‑world conventions via `sentinel.yml`, Docker and generic MCP client usage docs.
6. **master_prompt_6.md** – Perform final QA, write release notes, add tests and lock the project as v1.0.

For convenience the exact text of these prompts can be assembled from the specification in Section 4 and adjusted as needed.

---

## 6. Architecture Summary

The `overseer‑mcp` server is organised into several layers:

1. **MCP Transport Layer** – Handles the wire protocol, JSON parsing and tool registration.  No business logic lives here.
2. **Tool Layer** – Implements each MCP tool as an independent module receiving validated inputs and returning structured outputs.
3. **Core Logic Layer** – Contains reusable services for:
   - Parsing and normalising PHASES.md and PHASE‑XX.md
   - Inspecting repository structure and languages
   - Generating files, configs and documentation
   - Validating compliance with `sentinel.yml` conventions
   - Synchronising docs across files and phases
4. **Configuration** – All global conventions, defaults and environment mappings reside in `config/sentinel.yml`.  This YAML file influences planning, naming, CI generation and more.

---

## 7. Definition of “Complete” for v1.0

Version 1.0 of Overseer is considered complete when:

1. All tools defined in Section 2 are implemented and conform to their contracts.
2. All six phases in the roadmap are executed and locked in the MCP project itself.
3. The server can be run locally and via Docker, with no missing dependencies.
4. All behaviours are deterministic and client‑agnostic.
5. Documentation (README, DESIGN, TOOLS, PHASES, CHANGELOG) is comprehensive and up to date.
6. The system can plan, execute, advance and manage phases for any project under `~/dev` according to `sentinel.yml` conventions.
7. A basic test suite validates happy paths and common error conditions for planning and phase execution.
