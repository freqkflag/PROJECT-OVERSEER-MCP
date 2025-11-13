

0. Quick Mental Picture

Project: overseer-mcp
Role: A standalone MCP server that knows how you build projects, defines phases, and exposes tools like plan_project, run_phase, advance_phase, status, etc.

Clients: Cursor (first), but later anything that speaks MCP.
Lang stack suggestion: Node/TypeScript (changeable if you want, but all prompts assume TS/Node unless you alter them).

⸻

1. Tool Surface – “All Possible Tools To Make This Work”

You don’t have to implement all on day one, but this is the Overseer v1.0 dream surface.

1.1 Planning / Meta Tools
	1.	overseer.plan_project
	•	Inputs: repo_root, project_name, project_summary, overwrite_existing?
	•	Outputs: PHASES.md + initial PHASE-01.md, maybe more.
	•	Purpose: Turn raw description + existing files into a structured phase plan.
	2.	overseer.infer_phases
	•	Inputs: repo_root
	•	Outputs: suggested phase definitions, tasks, dependencies.
	•	Purpose: Auto-generate phases from existing codebase if no plan exists.
	3.	overseer.update_phases
	•	Inputs: repo_root, modifications (JSON patch or similar).
	•	Purpose: Programmatic updates to PHASES.md / PHASE-XX.md.

⸻

1.2 Execution / Phase Engine
	4.	overseer.run_phase
	•	Inputs: repo_root, phase_id, aggression_level (“bossmode”, “normal”).
	•	Outputs: completed_tasks, pending_tasks, changed_files, status.
	•	Purpose: Execute DevOps / Infra / Docs / Lint work for that specific phase.
	5.	overseer.advance_phase
	•	Inputs: repo_root, expected_current_phase.
	•	Outputs: new_phase, previous_phase, status, message.
	•	Purpose: Hard-check phase done criteria → lock phase → advance.
	6.	overseer.run_all_phases (optional future)
	•	Inputs: repo_root, aggression_level.
	•	Purpose: Loop through all phases 1→N until done or blocked.

⸻

1.3 Status / Introspection
	7.	overseer.status
	•	Inputs: repo_root.
	•	Outputs: current_phase, list of phases + status, blockers, summaries.
	•	Purpose: Quick “what’s going on with this project?” overview.
	8.	overseer.phase_status
	•	Inputs: repo_root, phase_id.
	•	Outputs: detailed status for one phase, checklist, missing pieces.
	9.	overseer.list_projects (if you store state centrally)
	•	Purpose: Overview of all tracked projects.

⸻

1.4 QA / Lint / Docs
	10.	overseer.lint_repo
	•	Inputs: repo_root, optional file patterns.
	•	Outputs: lint issues, recommended fixes.
	11.	overseer.sync_docs
	•	Inputs: repo_root.
	•	Outputs: doc files updated (README, BUILD, PHASES, PHASE-XX).
	12.	overseer.check_compliance
	•	Inputs: repo_root.
	•	Outputs: list of violations vs. sentinel.yml conventions (names, domains, structure).

⸻

1.5 Env / Infra Awareness (future-nice-to-haves)
	13.	overseer.env_map
	•	Purpose: Understand which node (vps.host, holo-cube, macmini) this project targets.
	14.	overseer.generate_ci
	•	Purpose: Add/update .github/workflows using your defaults.
	15.	overseer.secrets_template
	•	Purpose: Generate .env.example + Infisical/Vault mapping suggestions.

⸻

You can start with plan_project, run_phase, advance_phase, status, then grow into the rest.

⸻

2. Project Phases (End-to-End Roadmap)

We’ll do 6 phases, each with:
	•	Objective
	•	Key deliverables
	•	“Success looks like”
	•	A Master Prompt you can paste into Cursor.

Phases:
	1.	Foundation & Spec Lock
	2.	Repo & MCP Server Skeleton
	3.	Core Planning Tools (plan_project + status)
	4.	Phase Engine Tools (run_phase, advance_phase, QA helpers)
	5.	Config, Conventions, Docs & Integration
	6.	Final QA, Hardening & Ship Review

⸻

PHASE 1 — Foundation & Spec Lock

Objective

Turn everything we’ve talked about into a living spec and base docs inside ~/dev/overseer-mcp.

Key Deliverables
	•	~/dev/overseer-mcp/README.md (high-level vision)
	•	~/dev/overseer-mcp/DESIGN.md (tool surface + behavior)
	•	~/dev/overseer-mcp/TOOLS.md (list of tools as above)
	•	~/dev/overseer-mcp/PHASES.md (project build phases for this MCP project)

Success Looks Like

You have a clear, committed blueprint. Any agent can read these files and know what to build.

⸻

🔹 Master Prompt 1 — “Start the Project & Lock the Spec”

GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.

You are my senior DevOps + systems architect. We are building a standalone MCP server called `overseer-mcp`.

Goal of this session:
- Take my existing design ideas for Overseer and turn them into a concrete, repo-local spec:
  - `README.md`
  - `DESIGN.md`
  - `TOOLS.md`
  - `PHASES.md` (for building this MCP project itself)

Repository root: `~/dev/overseer-mcp`

Follow these rules:
- Assume the MCP server will be written in TypeScript + Node.
- It will expose tools like:
  - overseer.plan_project
  - overseer.infer_phases
  - overseer.update_phases
  - overseer.run_phase
  - overseer.advance_phase
  - overseer.status
  - overseer.lint_repo
  - overseer.sync_docs
  - overseer.check_compliance
  - overseer.env_map
  - overseer.generate_ci
  - overseer.secrets_template
- Use the following high-level behavior as canonical:
  - Overseer defines and maintains build phases using PHASES.md and PHASE-XX.md files.
  - Overseer can plan a project from a description and/or existing repo structure.
  - Overseer can execute work for a given phase (code, infra, docs, lint) and validate completeness.
  - Overseer will later run as a standalone MCP server that IDEs like Cursor can call as a tool provider.

Tasks for this prompt:

1. Create `README.md`:
   - Problem statement: why Overseer exists.
   - High-level capabilities (planning, execution, enforcement).
   - Intended tech stack.
   - Example use cases (e.g., managing phases for a Phoenix + Supabase app or a WordPress infra repo).

2. Create `DESIGN.md`:
   - Overall architecture: 
     - MCP server layer
     - Tool layer
     - Core logic layer (phases, repo inspector, docs sync, QA).
   - Data model for PHASES.md and PHASE-XX.md.
   - Interaction diagrams (in text) for `plan_project`, `run_phase`, `advance_phase`, `status`.
   - How `sentinel.yml` config influences behavior.

3. Create `TOOLS.md`:
   - Enumerate each tool:
     - Name
     - Category (planning, execution, QA, env)
     - Inputs (JSON schema at a high level)
     - Outputs
     - Notes/edge cases.

4. Create project build `PHASES.md` (for the MCP project itself):
   - Phase 1: Foundation & Spec Lock (this phase).
   - Phase 2: Repo & MCP server skeleton.
   - Phase 3: Core planning tools (plan_project, status, infer_phases).
   - Phase 4: Phase engine tools (run_phase, advance_phase, lint/sync docs).
   - Phase 5: Config + conventions + IDE integration.
   - Phase 6: Final QA, packaging and ship.

For each phase in PHASES.md, include:
- Name
- Description
- Deliverables
- Done criteria

Output:
- Show me the generated file outlines and key sections so I can skim them.
- Then confirm that Phase 1’s “done criteria” are satisfied for spec creation.


⸻

PHASE 2 — Repo & MCP Server Skeleton

Objective

Set up a clean TypeScript MCP server skeleton with basic wiring, no heavy logic yet.

Key Deliverables
	•	package.json, tsconfig.json
	•	src/server.ts (MCP server entrypoint)
	•	src/tools/ directory with stub handlers for all tools
	•	config/sentinel.yml basic structure

Success Looks Like

The project runs as a bare MCP server with stub tools returning “not implemented yet” but wired correctly.

⸻

🔹 Master Prompt 2 — “Build the MCP Skeleton”
GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.
You are now my implementation lead for `overseer-mcp`.

Context:
- The repo `~/dev/overseer-mcp` already contains:
  - README.md
  - DESIGN.md
  - TOOLS.md
  - PHASES.md

Goal of this phase:
- Implement the MCP server skeleton in TypeScript with stubbed tools and a basic `sentinel.yml` config.

Assumptions:
- We are targeting a Node + TypeScript stack.
- We will refine logic later; for now, stubs and wiring MUST be clean, typed, and ready to extend.

Tasks:

1. Project Scaffolding:
   - Create `package.json` with:
     - TypeScript
     - MCP-related dependencies (assume a generic MCP server implementation; we will refine later).
     - Scripts:
       - `dev` (ts-node or nodemon)
       - `build`
       - `start`
   - Create `tsconfig.json` for a modern Node target.

2. Server Entry:
   - Create `src/server.ts`:
     - Set up an MCP-compatible server.
     - Register tools declared in TOOLS.md.
     - Load `config/sentinel.yml` at startup and provide it to tool handlers.

3. Tool Stubs:
   - Create `src/tools/planProject.ts`, `runPhase.ts`, `advancePhase.ts`, `status.ts`, `inferPhases.ts`, `updatePhases.ts`, `lintRepo.ts`, `syncDocs.ts`, `checkCompliance.ts`, `envMap.ts`, `generateCi.ts`, `secretsTemplate.ts`.
   - Each should:
     - Define a typed input and output interface matching the TOOLS.md spec.
     - Log a message like “TODO: implement logic” plus any input fields.
     - Return safe stubbed output that proves the wiring works.

4. Core Utilities (skeleton only):
   - Create `src/core/config.ts` to load `config/sentinel.yml`.
   - Create `src/core/fsUtils.ts` for repo path resolution and basic file read/write utilities (stubbed out).

5. Config:
   - Add `config/sentinel.yml` with:
     - Basic structure:
       - project_defaults
       - phase_templates (foundation, core_features, etc.)
       - conventions (domains, names)
       - ci_cd defaults.

6. Validation:
   - Ensure the project builds and that the server can start.
   - Return a summary of:
     - Tools registered
     - Paths for key files
     - Any TODOs we should tackle in Phase 3.

Output:
- Show me the final file tree.
- Summarize the behavior of the server and stubs.
- Confirm that Phase 2’s done criteria in PHASES.md are satisfied.


⸻

PHASE 3 — Core Planning Tools (plan_project, status, infer_phases)

Objective

Make Overseer actually able to plan: generate PHASES.md + PHASE-XX.md and report status.

Key Deliverables
	•	plan_project fully implemented
	•	infer_phases implemented (even if simple)
	•	status implemented for “overseer-mcp” itself
	•	Stable PHASES.md + first PHASE-01.md behavior

Success Looks Like

You can call plan_project on any repo and it writes a clean PHASES.md + initial phase file. status tells you where a project is at.

⸻

🔹 Master Prompt 3 — “Teach Overseer to Plan & Reflect”
GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.
You are now responsible for implementing the core planning tools in `overseer-mcp`.

Repository: `~/dev/overseer-mcp`

Goal of this phase:
- Implement real logic for:
  - overseer.plan_project
  - overseer.infer_phases
  - overseer.status

Use TOOLS.md and DESIGN.md as the source of truth.

Tasks:

1. Implement `overseer.plan_project`:
   - Inputs:
     - repo_root
     - project_name
     - project_summary
     - overwrite_existing (boolean)
   - Behavior:
     - If PHASES.md exists and overwrite_existing is false:
       - Read and normalize it (apply consistent structure).
     - Else:
       - Infer a set of phases based on the project_summary and any obvious hints from the repo structure (src/, docker-compose.yml, etc.).
     - Create or update:
       - PHASES.md (with structured phases: id, name, description, deliverables, done criteria).
       - PHASE-01.md (initial detailed phase file).
   - Return a JSON payload summarizing:
     - phases discovered/created
     - files written/updated.

2. Implement `overseer.infer_phases`:
   - Input: repo_root.
   - Behavior:
     - Inspect repo structure:
       - Presence of src/, app, infra/, docker, etc.
       - Presence of framework markers (Phoenix, WordPress, Node, etc.).
     - Propose a list of phases (foundation, core features, integrations, observability, polish).
     - This can be heuristic and rule-based for now.
   - Output:
     - A list of phases with suggested names, descriptions, and a rough deliverable list.

3. Implement `overseer.status`:
   - For now, assume:
     - PHASES.md and zero or more PHASE-XX.md files exist.
   - Behavior:
     - Parse PHASES.md.
     - For each phase:
       - Determine status:
         - locked, in_progress, pending
         - Based on markers (we can start simple: special status markers in the file).
     - Return:
       - project_name (from README or a reasonable inference)
       - current_phase
       - list of phases with status.

4. Apply these tools to this very project:
   - Call plan_project for `~/dev/overseer-mcp`.
   - Ensure PHASES.md and PHASE-01.md reflect the actual plan we’re executing.

5. Update docs:
   - Make sure DESIGN.md and TOOLS.md are updated wherever behavior evolved from the initial spec.

Output:
- Show diffs for PHASES.md and PHASE-01.md.
- Show example JSON responses for plan_project, infer_phases, and status using this repo as an example.
- Confirm Phase 3’s done criteria from PHASES.md are satisfied.


⸻

PHASE 4 — Phase Engine Tools (run_phase, advance_phase, QA Helpers)

Objective

Make Overseer actually execute and enforce phases (even if in a “smart stub” style first, then gradually more powerful).

Key Deliverables
	•	run_phase implemented with real phase logic
	•	advance_phase enforcing done criteria & locking
	•	Skeletons or early implementations for lint_repo, sync_docs, check_compliance

Success Looks Like

You can:
	•	Ask run_phase to work Phase 1 of some repo
	•	Re-run until done
	•	Use advance_phase to lock and move to Phase 2

⸻

🔹 Master Prompt 4 — “Give Overseer a Phase Engine”
GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.
You are now upgrading `overseer-mcp` to actually execute phases, not just plan them.

Repository: `~/dev/overseer-mcp`

Goal of this phase:
- Implement functional versions of:
  - overseer.run_phase
  - overseer.advance_phase
- Add early logic for:
  - overseer.lint_repo
  - overseer.sync_docs
  - overseer.check_compliance

Constraints:
- Favor clarity, testability, and extensibility over extreme complexity.
- It is okay if some “execution” is suggestion + structured guidance at first, but it MUST read/write files and update PHASE-XX.md checklists.

Tasks:

1. Implement `overseer.run_phase`:
   - Inputs:
     - repo_root
     - phase_id
     - aggression_level (e.g., "bossmode", "normal").
   - Behavior (minimum viable version):
     - Read PHASES.md and the associated PHASE-XX.md for the given phase.
     - Parse tasks/deliverables from the file.
     - For each task:
       - Determine whether it appears complete:
         - Does the referenced file exist?
         - Does the doc section exist?
       - If incomplete:
         - For now, add detailed TODO notes or skeleton implementations to the appropriate files (e.g., create stub files, TODO comments).
         - Mark progress in PHASE-XX.md’s checklist.
     - Return:
       - completed_tasks
       - pending_tasks
       - changed_files
       - status ("in_progress" or "potentially_complete").

2. Implement `overseer.advance_phase`:
   - Inputs:
     - repo_root
     - expected_current_phase
   - Behavior:
     - Check PHASES.md and PHASE-XX.md for that phase.
     - Confirm all deliverables are marked done.
     - If anything is missing → return `status: "incomplete"` + a precise list.
     - If complete:
       - Mark the phase as "locked" in PHASES.md.
       - Optionally append a summary section in PHASE-XX.md.
       - Set next phase as "current".
       - Return `status: "advanced"` with new_phase info.

3. Early QA helpers:
   - `overseer.lint_repo`:
     - For now, just:
       - Detect language(s) based on files present.
       - Return a recommended set of commands or minimal checks.
     - Later, we can integrate actual linters.
   - `overseer.sync_docs`:
     - Ensure headings in PHASES.md and PHASE-XX.md follow a consistent style.
     - Ensure each phase file has sections for:
       - Summary
       - Tasks
       - Artifacts
       - Done criteria
   - `overseer.check_compliance`:
     - Compare basic repo structure against sentinel.yml conventions:
       - Are expected directories present?
       - Are expected key files present?

4. Dogfood on `overseer-mcp`:
   - Use `plan_project` (already implemented) for this repo if needed.
   - Run `run_phase` for Phase 1 or Phase 2 to simulate Overseer managing its own build.
   - Use `advance_phase` if the done criteria are satisfied.

5. Update docs:
   - Update DESIGN.md and TOOLS.md to match real tool behaviors and edge cases.

Output:
- Show me example JSON outputs for run_phase and advance_phase when invoked on this repo.
- Summarize how QA helpers currently work and where they will be extended in later phases.
- Confirm Phase 4’s done criteria in PHASES.md are satisfied.


⸻

PHASE 5 — Config, Conventions, Docs & IDE Integration

Objective

Connect Overseer to your world: sentinel.yml, your conventions (domains, nodes, naming), and basic Cursor integration.

Key Deliverables
	•	Rich config/sentinel.yml tuned for your ecosystem
	•	Docs on how to run Overseer in Docker
	•	Example MCP client config for Cursor
	•	Updated README with real usage examples

Success Looks Like

You can:
	•	Run the MCP server (dev or Docker).
	•	Point Cursor at it.
	•	Use plan_project and run_phase on another repo living under ~/dev.

⸻

🔹 Master Prompt 5 — “Wire Overseer to My Ecosystem & Cursor”
GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.
You are now responsible for integrating `overseer-mcp` with my real-world conventions and IDE.

Repository: `~/dev/overseer-mcp`

Goal of this phase:
- Flesh out sentinel.yml with realistic conventions for my environment.
- Document how to run Overseer (Node + Docker).
- Provide example MCP configuration for Cursor.
- Demo usage flow for a target repo in ~/dev.

Tasks:

1. Expand `config/sentinel.yml`:
   - Add:
     - project_defaults (repo_root_base: "~/dev", phases_file, phase_file_pattern).
     - environments:
       - vps.host (remote VPS)
       - home.macmini
       - holo-cube (local dev workstation)
     - conventions:
       - container naming patterns
       - domain patterns (freqkflag.co, cultofjoey.com, twist3dkinkst3r.com).
     - ci_cd defaults:
       - GitHub Actions workflow templates.
     - coding_standards:
       - Elixir, TypeScript, PHP, etc.

2. Docs for running Overseer:
   - In README.md or a new `RUNNING.md`, document:
     - How to install dependencies.
     - How to run in dev mode.
     - How to build + start in production mode.
   - Add a basic `Dockerfile` and `docker-compose.yml` for running overseer-mcp itself.

3. MCP client integration:
   - Add a section to README.md:
     - Example MCP config snippet for Cursor pointing at this server.
     - Example of invoking:
       - overseer.plan_project on `~/dev/sample-project`.
       - overseer.run_phase and overseer.advance_phase.

4. Demo scenario:
   - Choose a hypothetical or real repo in `~/dev` (describe it in the docs).
   - Walk through:
     - Call plan_project.
     - Inspect PHASES.md and PHASE-01.md.
     - Call run_phase for Phase 1.
     - Call advance_phase when done.

5. Ensure all docs are in sync:
   - README.md, DESIGN.md, TOOLS.md, PHASES.md should be up-to-date.

Output:
- Show me the updated sentinel.yml.
- Show Dockerfile and docker-compose.yml.
- Show the example MCP client config and usage flow.
- Confirm Phase 5’s done criteria are satisfied per PHASES.md.


⸻

PHASE 6 — Final QA, Hardening & “Ship Review”

Objective

Do the “is this shippable?” pass:
	•	QA, logging, error handling, edge cases, docs
	•	Final polish on tools, responses, and structure

Key Deliverables
	•	Passing test suite (even partial)
	•	Logging strategy
	•	Clear error responses from tools
	•	Final docs: CHANGELOG, CONTRIBUTING (if desired), RELEASE notes

Success Looks Like

You could point a future-you or another dev at the repo and they could run Overseer without needing your brain at all.

⸻

🔹 Master Prompt 6 — “Final Review Before Ship”
GLOBAL CONSTRAINTS (DO NOT IGNORE):

- `overseer-mcp` MUST be fully client-agnostic.
- Assume only this: overseer-mcp is an MCP server exposing tools over a standard MCP transport.
- Do NOT bake in any assumptions about Cursor, Claude, Nova, or any specific IDE or chat client.
- Tool interfaces (inputs/outputs) MUST be:
  - Pure JSON-compatible structures.
  - Self-describing enough for any generic MCP client.
- All human-readable information must be part of tool responses, not relying on any client-specific UI features.
- Integration with specific clients (Cursor, Claude, etc.) should be documented only as examples in README, not as core logic.
- Never rely on client-side state or client-side workflows to enforce phases; Overseer itself must handle all phase logic.
This is your last paste before you call v1.0 done.

You are now acting as my release engineer and QA lead for `overseer-mcp`.

Repository: `~/dev/overseer-mcp`

Goal of this phase:
- Perform a final, end-to-end review of the project.
- Tighten anything that would block a v1.0 release.
- Ensure the server is shippable and understandable.

Tasks:

1. Test & QA:
   - Add or refine a basic test setup:
     - For at least: plan_project, status, run_phase, advance_phase.
   - Ensure tests cover:
     - Happy path
     - Missing PHASES.md
     - Incomplete phase
     - Attempting to advance when not complete.

2. Error Handling & Logging:
   - Ensure each tool:
     - Validates inputs and returns meaningful error messages.
     - Logs useful info for debugging without leaking secrets.
   - Document logging approach in DESIGN.md or a new LOGGING.md.

3. Code Cleanup:
   - Remove dead code.
   - Ensure consistent naming and file structure.
   - Confirm alignment with coding standards defined in sentinel.yml.

4. Docs & Release Notes:
   - Ensure:
     - README.md includes:
       - What Overseer is.
       - How to run it via Node and Docker.
       - How to connect via MCP (e.g., Cursor).
       - A simple “getting started” example.
     - DESIGN.md reflects the final architecture.
     - TOOLS.md reflects the final tools and their behaviors.
     - PHASES.md is updated to mark all phases complete.
     - Create a `CHANGELOG.md` with at least an entry for v1.0.0.

5. Sanity Check:
   - From a fresh perspective:
     - Could a capable engineer:
       - Clone the repo.
       - Run Overseer.
       - Call plan_project and run_phase on a repo in ~/dev.
       - Understand what’s happening using the docs?

6. Final Report:
   - Produce a final “ship review” summary including:
     - What works now (MVP capabilities).
     - Known limitations.
     - Ideas for v1.1+ (e.g., deeper language-specific logic, real linter integration, more advanced env-aware behavior).

Output:
- Summarize changes made during this final phase.
- Show the final PHASES.md with all phases marked complete/locked for this project.
- Present the “ship review” summary clearly so I can decide to tag v1.0.0.


⸻

How to Actually Use All This
	1.	Open Cursor in ~/dev/overseer-mcp (or create that folder first).
	2.	Paste Master Prompt 1 → let it run, commit results.
	3.	Paste Master Prompt 2 → skeleton.
	4.	Paste Master Prompt 3 → planning tools.
	5.	Paste Master Prompt 4 → phase engine.
	6.	Paste Master Prompt 5 → integration + real-world config.
	7.	Paste Master Prompt 6 → final QA & ship review.
