

1. What overseer-mcp is

A standalone MCP service that exposes tools to:
	•	Auto-plan phases for a project
	•	Run a specific phase
	•	Advance to the next phase only when done
	•	Report status and artifacts

Think of it as:

“Tell Overseer which repo + description, and it handles PHASES.md, PHASE-XX.md, infra, docs, and QA.”

⸻

2. MCP Tool Surface (API)

Namespace: overseer

2.1 plan_project

Goal: Create or update PHASES.md + base PHASE-01.md (and possibly more) from a description + repo scan.

Tool name: overseer.plan_project

Input (JSON):

{
  "repo_root": "~/dev/my-project",
  "project_name": "Twist3dKinkst3r Clubhouse",
  "project_summary": "Phoenix LiveView + Supabase + edge-proxy kinky clubhouse.",
  "overwrite_existing": false
}

Behavior:
	•	Look for existing PHASES.md / BUILD_PLAN.md.
	•	Normalize or create:
	•	PHASES.md with Phase 1 → N definitions
	•	PHASE-01.md with detailed tasks, deliverables, “Done” criteria

Output (JSON):

{
  "status": "ok",
  "phases_file": "PHASES.md",
  "initial_phases": [
    {"id": 1, "name": "Foundation / Bootstrap"},
    {"id": 2, "name": "Core Features"},
    {"id": 3, "name": "Integrations & Auth"},
    {"id": 4, "name": "Observability & Hardening"}
  ]
}


⸻

2.2 run_phase

Goal: Execute Overseer logic for a specific phase N.

Tool name: overseer.run_phase

Input:

{
  "repo_root": "~/dev/my-project",
  "phase_id": 1,
  "aggression_level": "bossmode"
}

Behavior:
	•	Read PHASES.md & PHASE-01.md.
	•	Generate/repair:
	•	Code
	•	Infra (Docker, Traefik, etc., per sentinel.yml)
	•	Docs
	•	CI/CD bits
	•	Run the DevOps / Infra / Docs / Linter cycle for that phase ONLY.
	•	Do NOT mark the phase complete yet — just attempt to complete tasks.

Output:

{
  "phase_id": 1,
  "status": "in_progress",
  "completed_tasks": ["create docker-compose.yml", "generate README skeleton"],
  "pending_tasks": ["wire CI/CD workflow", "update PHASE-01.md checklist"],
  "changed_files": [
    "docker-compose.yml",
    "README.md",
    "PHASE-01.md"
  ]
}


⸻

2.3 advance_phase

Goal: Hard-check a phase, lock it if done, then move to next.

Tool name: overseer.advance_phase

Input:

{
  "repo_root": "~/dev/my-project",
  "expected_current_phase": 1
}

Behavior:
	•	Validate all “Done” criteria for phase 1.
	•	If incomplete:
	•	Return status: "incomplete" + list of missing items.
	•	If complete:
	•	Mark phase 1 as locked in PHASES.md + PHASE-01.md.
	•	Set “current phase” to 2.
	•	No auto-work here; pure “lock + move” logic.

Output:

{
  "previous_phase": 1,
  "new_phase": 2,
  "status": "advanced",
  "message": "Phase 1 locked. Phase 2 is now current."
}


⸻

2.4 status

Goal: Get project phase + checklist summary.

Tool name: overseer.status

Input:

{
  "repo_root": "~/dev/my-project"
}

Output:

{
  "project_name": "Twist3dKinkst3r Clubhouse",
  "current_phase": 2,
  "phases": [
    {"id": 1, "name": "Foundation / Bootstrap", "status": "locked"},
    {"id": 2, "name": "Core Features", "status": "in_progress"},
    {"id": 3, "name": "Integrations & Auth", "status": "pending"}
  ]
}


⸻

2.5 (Optional) lint_repo & sync_docs

You can expose these as separate tools or keep them internal:
	•	overseer.lint_repo → run Linter/QA logic across repo.
	•	overseer.sync_docs → ensure READMEs & PHASE docs match actual structure.

⸻

3. sentinel.yml – Overseer Config Template

This lives in the MCP container or is mounted as config. It encodes your global rules.

# sentinel.yml :: Overseer global config

project_defaults:
  repo_root_base: "~/dev"
  phases_file: "PHASES.md"
  phase_file_pattern: "PHASE-%02d.md"
  aggression_level: "bossmode"

conventions:
  service_prefix: "joey"
  default_time_zone: "America/Chicago"
  containers_network: "edge"
  domains:
    primary_infra_domain: "freqkflag.co"
    personal_site_domain: "cultofjoey.com"
    clubhouse_domain: "twist3dkinkst3r.com"

environments:
  - id: "vps.host"
    description: "Remote VPS production environment"
    base_path: "/srv"
    default_domain_suffix: ".freqkflag.co"
  - id: "home.macmini"
    description: "Mac Mini homelab node"
    base_path: "/srv"
    default_domain_suffix: ".freqkflag.co"
  - id: "holo-cube"
    description: "Local dev workstation"
    base_path: "~/dev"

phase_templates:
  foundation:
    name: "Foundation / Bootstrap"
    default_deliverables:
      - "docker-compose.yml"
      - ".env.example"
      - "README.md"
      - "PHASES.md"
      - "PHASE-01.md"
    done_criteria:
      - "All core services defined in docker-compose.yml"
      - "Service names and labels follow Joey conventions"
      - ".env.example covers all required env vars"
      - "README.md includes quickstart"
  core_features:
    name: "Core Features"
    default_deliverables:
      - "app main modules implemented"
      - "basic auth/sign-in flow"
      - "baseline tests for main flows"
    done_criteria:
      - "All features in PHASE-02.md implemented and tested"

coding_standards:
  language_defaults:
    "elixir":
      formatter: "mix format"
      style: "idiomatic"
    "typescript":
      formatter: "eslint+prettier"
    "php":
      formatter: "php-cs-fixer"
  docs_style:
    headings: "ATX"
    line_width: 100

ci_cd:
  default_provider: "github-actions"
  workflows:
    - name: "build-and-test"
      file: ".github/workflows/build-and-test.yml"
      required_in_phase: 1

This is what the Overseer uses to:
	•	Auto-create phase skeletons
	•	Decide what “done” looks like
	•	Pick infra patterns and naming

⸻

4. Example MCP Server Layout

Something like:

overseer-mcp/
  src/
    server.ts           # or server.py / server.rs / etc.
    tools/
      plan_project.ts
      run_phase.ts
      advance_phase.ts
      status.ts
      lint_repo.ts
      sync_docs.ts
    core/
      phases.ts
      repo_inspector.ts
      docs_writer.ts
      linter_runner.ts
  config/
    sentinel.yml
  package.json          # or pyproject.toml, etc.
  README.md

Server responsibilities:
	•	Load sentinel.yml
	•	Implement MCP protocol (over WebSocket/HTTP)
	•	Wire tools → core logic → repo FS

⸻

5. How Cursor Would Use It (Conceptually)

Once the MCP server is running (e.g. Docker container on mcp.freqkflag.co), Cursor will see it as a tool provider.

Then you can say things like, in Cursor:

“Use the overseer.plan_project tool on ~/dev/twist3dkinkst3r with this description, then run overseer.run_phase for phase 1 until all tasks are complete, then call overseer.advance_phase.”

Or turn that into a dedicated Cursor agent prompt later.

⸻

6. Tiny “build this server” prompt for Cursor

Here’s a short prompt you can paste into Cursor to start scaffolding overseer-mcp as a Node/TS project (or swap in your preferred stack):

You are building a standalone MCP server called `overseer-mcp`.

Goals:
- Implement the Overseer multi-agent behavior as MCP tools.
- Use TypeScript + Node.
- Expose tools: overseer.plan_project, overseer.run_phase, overseer.advance_phase, overseer.status.
- Load configuration from config/sentinel.yml.
- Operate on local repos under ~/dev.

Use the following design as your spec:
- Tool shapes, inputs, and outputs as described in my spec.
- sentinel.yml fields and behavior as described, including phase_templates, conventions, environments, and coding_standards.
- File layout:
  - src/server.ts
  - src/tools/*.ts
  - src/core/*.ts
  - config/sentinel.yml

First:
1. Scaffold the project (package.json, tsconfig.json, basic MCP server wiring).
2. Implement a stub version of each tool that:
   - Reads sentinel.yml
   - Locates PHASES.md and PHASE-*.md (or creates them for plan_project).
   - Logs what it would do (for now) rather than fully mutating the repo.
3. Then iterate to make the tools actually read/write files and apply the phase logic.

Assume repos live under ~/dev by default.
Use clean architecture and keep the core logic testable.


