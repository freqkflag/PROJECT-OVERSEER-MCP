# Design of Overseer MCP

This document explains the architecture and internal design of the `overseer‑mcp` server.  For a high‑level overview and project roadmap, see `MASTER‑OVERSEER‑PLAN.md`.

## Architecture Overview

The server is organised into four principal layers:

1. **MCP Transport Layer** – Handles the network protocol, JSON serialization/deserialization and tool registration.  It exposes the available tools via a single endpoint.  This layer has no business logic; it simply routes validated requests into the tool layer.

2. **Tool Layer** – Implements each MCP tool as an independent function or class.  Each tool:
   - Validates and normalises its inputs.
   - Invokes services in the core logic layer.
   - Returns structured JSON outputs defined in the tool contracts.
   Tools must be idempotent and deterministic.

3. **Core Logic Layer** – Contains shared services used by multiple tools:
   - **Phase parser** – Reads `PHASES.md` and `PHASE‑XX.md` files, normalises their structure and updates them.
   - **Repo inspector** – Determines the languages, frameworks and structural hints present in the repo; used by `infer_phases` and `run_phase`.
   - **Generator** – Creates new files (e.g. Docker configs, README stubs) according to phase definitions and sentinel conventions.
   - **Compliance checker** – Ensures naming conventions, domain patterns and directory structures defined in `sentinel.yml` are satisfied.
   - **Docs synchroniser** – Keeps documentation in sync across multiple files (README, BUILD, PHASES, phase docs).

4. **Configuration** – Global defaults and conventions are stored in `config/sentinel.yml`.  They are loaded at server startup and influence planning, naming, CI generation and other behaviours.

## Data Model

The primary data that Overseer reads and writes consists of two kinds of Markdown files:

### PHASES.md

`PHASES.md` is a canonical list of phases for a project.  Each phase has:

| Field          | Description                                                     |
|---------------|-----------------------------------------------------------------|
| `id`          | Numeric identifier (1‑based)                                     |
| `status`      | One of `current`, `pending` or `locked`                          |
| `description` | Short summary of the phase’s purpose                            |
| `deliverables`| YAML list of expected output files                              |
| `done_criteria` | YAML list of conditions that must be met before advancing     |
| `dependencies`| (Optional) list of phase IDs that must be locked before this one |

### PHASE‑XX.md

Each phase has a detailed companion file named `PHASE‑NN.md` (with a two‑digit identifier).  Typical sections include:

| Section     | Purpose                                                               |
|-------------|-----------------------------------------------------------------------|
| Summary     | Narrative description of what will be accomplished                    |
| Tasks       | Checkbox list of granular steps and TODOs                             |
| Deliverables| List of files expected at the end of the phase                        |
| Artifacts   | List of generated scripts or config fragments                         |
| Done Criteria | Conditions that must be met before the phase can be locked         |

The `run_phase` tool updates the “Tasks” section by marking checkboxes and appending TODO notes.  The `advance_phase` tool verifies that all checkboxes are ticked and that deliverables exist.

## Interaction Flows

### plan_project

1. Validate inputs and read `sentinel.yml` for conventions.
2. Inspect the repo to determine languages and structural hints.
3. If `PHASES.md` exists and `overwrite_existing` is false, normalise it.  Otherwise, create a new `PHASES.md` using templates from `sentinel.yml` and heuristics from the repo inspection.
4. Create `PHASE‑01.md` with the tasks and deliverables defined by the first phase template (typically “Foundation / Bootstrap”).
5. Return JSON summarising the created phases and files.

### infer_phases

1. Inspect the repo’s files, languages and frameworks.
2. Use heuristics to propose a sequence of phases, for example:
   - Foundation (bootstrap project structure)
   - Core Features (implement core business logic)
   - Integrations (add third‑party services)
   - Observability & Hardening (add monitoring and security)
   - Polish & Deployment
3. Return the suggested plan without writing files.

### run_phase

1. Read `PHASES.md` to determine the current phase ID and verify that the requested `phase_id` matches.
2. Parse the corresponding `PHASE‑NN.md` file to extract tasks and deliverables.
3. For each task, decide whether it is complete by checking for the existence of files or patterns in files.
4. If incomplete, generate stubs or append TODO comments to appropriate files.
5. Update `PHASE‑NN.md` with ticked checkboxes for completed tasks and additional notes for pending ones.
6. Return a JSON object listing completed tasks, pending tasks, files changed and the overall status.

### advance_phase

1. Verify that the requested `expected_current_phase` (if provided) matches the phase marked `current` in `PHASES.md`.
2. Re‑parse `PHASE‑NN.md` and ensure all tasks are checked off and deliverables exist.
3. If not complete, return `status: "incomplete"` with a list of missing requirements.
4. If complete, mark the phase as `locked` in `PHASES.md` and set the next phase as `current`.
5. Optionally append a summary or changelog entry to `PHASE‑NN.md` documenting what was achieved.

### status and phase_status

These tools provide read‑only insight into the project’s progress.  They parse `PHASES.md` and phase files to report the current phase, locked phases and outstanding tasks or blockers.

## Influence of sentinel.yml

The `config/sentinel.yml` file defines naming conventions, default deliverables for each phase template, coding standards, environment mappings and CI/CD defaults.  Tools consult this file to:

- Generate baseline file names and directory structures (e.g. container names, domain names)
- Choose language‑appropriate linting tools
- Determine the default list of phases and deliverables for new projects
- Apply environment‑specific variations (e.g. different base paths on VPS vs local machine)

Any changes to `sentinel.yml` will influence subsequent calls to planning or execution tools, making it the single source of truth for organisational conventions.
