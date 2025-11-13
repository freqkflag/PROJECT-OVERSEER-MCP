# Overseer MCP Server

Overseer MCP (`overseer‑mcp`) is a standalone Model Context Protocol (MCP) server that automates planning, execution, validation and advancement of multi‑phase software projects.  It reads your repository, generates phase plans, executes missing work (code, configuration, documentation and QA), locks completed phases and moves forward until the entire project is delivered.

Unlike many assistants or IDE plugins, Overseer is deliberately **client‑agnostic**.  It exposes a set of JSON‑based tools over the MCP protocol.  Any capable client—whether a chat model like Cursor or Claude, a CLI, or your own integration—can call these tools to drive a project from concept to completion.

## Why Overseer?

Modern development often involves multiple iterations, distributed teams and evolving architectures.  Coordinating tasks across infrastructure, application code, documentation and QA is tedious and error‑prone.  Overseer provides a structured framework that:

- **Plans** projects into clearly defined phases (`PHASES.md` and `PHASE‑XX.md` files).
- **Executes** missing work by generating files, scripts and docs.
- **Validates** that phase deliverables meet defined “done” criteria.
- **Locks** completed phases and prevents incomplete work from advancing.
- **Advances** through phases automatically when ready.

Because Overseer is independent of any single IDE or assistant, you can integrate it anywhere MCP tools are supported.

## High‑Level Capabilities

- **Planning tools** – `plan_project`, `infer_phases`, `update_phases` and `status` allow you to generate and manage phase plans from scratch or by analysing existing codebases.
- **Execution engine** – `run_phase` and `advance_phase` coordinate work on a per‑phase basis, enforce done criteria and lock phases when complete.
- **QA and documentation** – Tools like `lint_repo`, `sync_docs` and `check_compliance` help ensure your code and docs meet your conventions defined in `sentinel.yml`.
- **Future enhancements** – Tools for environment mapping, CI/CD generation and secret templating are planned for later versions.

## Tech Stack

Overseer is built in **Node.js** with **TypeScript** for type safety.  It communicates exclusively via the MCP protocol, exchanging JSON payloads.  Configuration lives in a YAML file (`config/sentinel.yml`), which controls naming conventions, environments, CI defaults and coding standards.

## Usage Examples

Below are conceptual usage flows.  Replace `client` with your MCP client or integration.

1. **Planning a new project**

   ```json
   {
     "tool": "overseer.plan_project",
     "args": {
       "repo_root": "~/dev/twist3dkinkst3r",
       "project_name": "Twist3dKinkst3r Clubhouse",
       "project_summary": "Phoenix LiveView + Supabase + edge‑proxy kinky clubhouse.",
       "overwrite_existing": false
     }
   }
   ```
   This generates `PHASES.md` and `PHASE‑01.md` with a foundation plan for your new repo.

2. **Advancing through phases**

   ```json
   {
     "tool": "overseer.run_phase",
     "args": { "repo_root": "~/dev/twist3dkinkst3r", "phase_id": 1, "aggression_level": "bossmode" }
   }
   
   {
     "tool": "overseer.advance_phase",
     "args": { "repo_root": "~/dev/twist3dkinkst3r", "expected_current_phase": 1 }
   }
   ```
   The first call populates missing files and updates the checklist.  When ready, the second call validates and locks the phase.

See the `MASTER‑OVERSEER‑PLAN.md` for a comprehensive specification and the `prompts/` directory for guiding prompts to develop this project.
