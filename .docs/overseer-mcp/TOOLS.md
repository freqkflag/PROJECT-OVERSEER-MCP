# Overseer MCP Tools

This document enumerates the tools exposed by `overseer‑mcp`, categorised by purpose.  Each tool is defined by its input shape, output shape and high‑level behaviour.  Clients invoke these tools via the Model Context Protocol (MCP) using pure JSON payloads.

## Planning / Meta

| Tool | Category | Inputs | Outputs | Notes |
|-----|----------|--------|---------|------|
| **overseer.plan_project** | Planning | `repo_root`, `project_name`, `project_summary`, `overwrite_existing?` | `PHASES.md`, `PHASE‑01.md` and JSON summary | Generate or normalise a phase plan from scratch.  Infers phases based on the repository and summary. |
| **overseer.infer_phases** | Planning | `repo_root` | List of suggested phases | Analyse the repo to propose a set of phases when no plan exists.  Does not write files. |
| **overseer.update_phases** | Planning | `repo_root`, `modifications` | Updated `PHASES.md`/`PHASE‑XX.md` and JSON summary | Apply modifications to existing phase definitions.  Validates phase IDs and structure. |

## Execution / Phase Engine

| Tool | Category | Inputs | Outputs | Notes |
|-----|----------|--------|---------|------|
| **overseer.run_phase** | Execution | `repo_root`, `phase_id`, `aggression_level?` | Completed/pending tasks, changed files and status | Performs work for the specified phase.  Reads tasks from `PHASE‑NN.md`, generates missing files and updates the checklist. |
| **overseer.advance_phase** | Execution | `repo_root`, `expected_current_phase?` | New phase number, previous phase number, status and message | Validates completion of the current phase.  Locks it if complete and advances to the next. |
| **overseer.run_all_phases** | Execution (future) | `repo_root`, `aggression_level?`, `max_iterations?` | Composite summary of all phases | Automatically orchestrates `run_phase` and `advance_phase` across all phases. |

## Status / Introspection

| Tool | Category | Inputs | Outputs | Notes |
|-----|----------|--------|---------|------|
| **overseer.status** | Introspection | `repo_root` | Project name, current phase, list of phases, blockers | Provides a high‑level overview of project progress and outstanding tasks. |
| **overseer.phase_status** | Introspection | `repo_root`, `phase_id` | Detailed status of one phase | Useful for debugging or reporting on a single phase. |
| **overseer.list_projects** | Introspection | *(Optional)*  | List of tracked projects | Only relevant if Overseer manages multiple projects with persistent state. |

## QA / Documentation

| Tool | Category | Inputs | Outputs | Notes |
|-----|----------|--------|---------|------|
| **overseer.lint_repo** | QA | `repo_root`, `file_patterns?` | List of lint issues and suggested fixes | Detects languages present and runs appropriate linters.  For v1 it may simply return recommendations. |
| **overseer.sync_docs** | Docs | `repo_root` | Updated documentation files | Synchronises headings, tasks and deliverables across README, BUILD, PHASES and phase docs.  Ensures consistent style. |
| **overseer.check_compliance** | QA | `repo_root` | List of naming/structure violations | Compares the project against conventions defined in `sentinel.yml`.  Helps enforce naming patterns and directory structure. |

## Environment / Infrastructure (Future)

| Tool | Category | Inputs | Outputs | Notes |
|-----|----------|--------|---------|------|
| **overseer.env_map** | Environment | `repo_root` | Mapping of environment IDs to base paths and domain suffixes | Helps tools adapt to different deployment targets (e.g. local dev, VPS, home server). |
| **overseer.generate_ci** | CI/CD | `repo_root` | CI workflow files or updates | Generates or updates GitHub Actions or other CI workflows based on `sentinel.yml`. |
| **overseer.secrets_template** | Secrets | `repo_root` | `.env.example` and secret mappings | Generates a template for environment variables and external secret managers (Infisical, Vaultwarden, etc.). |

---

## Input/Output Conventions

All tool inputs and outputs are structured as JSON.  The precise schemas for each tool are defined in the codebase using TypeScript interfaces.  For example, `run_phase` and `advance_phase` follow the schemas defined in `MASTER‑OVERSEER‑PLAN.md` Section 2.2.

Clients should treat any optional fields as truly optional.  Tools will return error objects with descriptive messages and appropriate status codes in case of invalid input or other failures.

---

## Notes and Edge Cases

- **Overwriting Existing Plans:** `plan_project` will refuse to overwrite `PHASES.md` unless explicitly told to do so via `overwrite_existing`.  To normalise an existing plan, call it with `overwrite_existing: false` and it will re‑write the file with canonical formatting.
- **Idempotence:** Running `run_phase` multiple times with no changes to the repo should produce the same outcome on subsequent calls.  Use `aggression_level` to control how aggressively missing work is created.
- **Future Tools:** Tools such as `run_all_phases`, `env_map`, `generate_ci` and `secrets_template` are not fully implemented in v1.0.  They may return stubbed responses until implemented.
