

“Create docs/OVERSEER_SELF_VALIDATION.md with the following content.”

⸻

1️⃣ Repo file: docs/OVERSEER_SELF_VALIDATION.md

# Overseer Self-Validation Suite

Purpose:  
This document defines how `overseer-mcp` validates itself as a deterministic, client-agnostic MCP server.

Overseer must be able to:

- Inspect its own code and docs
- Run a repeatable self-test suite
- Auto-repair common issues
- Update its own documentation and changelog
- Report status and remaining risks

This suite is intentionally client-agnostic. All flows are expressed in terms of tools and JSON structures, not IDE-specific UX.

---

## 1. Pre-Conditions

Before running the self-validation suite:

- `overseer-mcp` can start as an MCP server without runtime errors.
- The following files exist at minimum:
  - `README.md`
  - `DESIGN.md`
  - `TOOLS.md`
  - `PHASES.md`
- Core tools are registered:
  - `overseer.status`
  - `overseer.plan_project`
  - `overseer.infer_phases`
  - `overseer.run_phase`
  - `overseer.advance_phase`
  - `overseer.lint_repo`
  - `overseer.sync_docs`
  - `overseer.check_compliance`
  - `overseer.env_map`
  - `overseer.generate_ci`

Optional but recommended:

- `issues/PLAN_OF_ACTION.md`
- `CHANGELOG.md`

---

## 2. Self-Test Modes

The self-validation suite supports three modes:

- **Quick** – sanity checks for registry + minimal tool calls.
- **Full** – exercises all tools and validates cross-file consistency.
- **Deep** – full mode + optional expensive checks (e.g., large repo scans).

These map to a proposed tool `overseer.self_test` (see §7).

---

## 3. Test Categories

### 3.1 Boot & Registry

Goal: ensure the MCP server is reachable and exposes expected tools.

**Checks:**

1. Server starts without unhandled exceptions.
2. Registry lists all core tools.
3. Tool metadata matches `TOOLS.md` (names + categories).

**Failure modes:**

- Missing or renamed tools
- Registry out of sync with docs
- Startup exceptions

---

### 3.2 Status & Phases

Goal: confirm `overseer.status` and phase management behave as designed.

**Checks:**

1. Call `overseer.status` with:
   ```json
   {
     "projectName": "self",
     "repoRoot": "<repo root>"
   }

	2.	Validate:
	•	A phase set is returned (or a clear “untracked” response).
	•	Phase names match PHASES.md.
	•	Phase counts match known PHASE-XX.md files.

Failure modes:
	•	Status reports phases that don’t exist in PHASES.md.
	•	PHASES.md references files that do not exist.
	•	Inconsistent progress metrics.

⸻

3.3 Planning & Phase Engine

Goal: ensure planning and phase engine logic are coherent and idempotent.

Checks:
	1.	Call overseer.plan_project in dry-run mode for a known project:

{
  "projectName": "self",
  "repoRoot": "<repo root>",
  "dryRun": true
}


	2.	Validate the plan aligns with PHASES.md and does not propose destructive changes.
	3.	For a selected phase (e.g., Phase 1), call:

{
  "projectName": "self",
  "phaseId": "01",
  "mode": "dry-run"
}

via overseer.run_phase.

	4.	Confirm:
	•	Proposed changes match the phase deliverables.
	•	No out-of-phase work is scheduled.

Failure modes:
	•	Phase engine proposes edits outside its scope.
	•	Planning contradicts existing phase definitions.
	•	Dry-run mode mutates files (hard error).

⸻

3.4 Path Handling & Filesystem Safety

Goal: validate robust handling of repo paths, including spaces and nested structures.

Checks:

Test paths (examples):
	•	/Volumes/projects/Forge Panel/forgepanel
	•	/srv/projects/overseer-mcp
	•	Relative path .

For each path, run:
	•	overseer.status
	•	overseer.check_compliance
	•	overseer.infer_phases
	•	overseer.lint_repo

Success criteria:
	•	No unhandled exceptions.
	•	Paths with spaces are handled correctly.
	•	No destructive file operations are performed outside the target repo root.

⸻

3.5 Compliance & Lint

Goal: ensure repo health tools work and reports are structured.

Checks:
	1.	Call overseer.check_compliance for the self repo.
	2.	Call overseer.lint_repo.
	3.	Validate:
	•	JSON responses include severities, codes, and actionable messages.
	•	Results are stable across repeated runs when repo is unchanged.

Failure modes:
	•	Free-form strings instead of structured JSON.
	•	Non-deterministic output for identical inputs.
	•	Missing or ambiguous severity levels.

⸻

3.6 Documentation Sync & Changelog

Goal: ensure docs and changelog reflect actual behavior and changes.

Checks:
	1.	Call overseer.sync_docs for the self repo.
	2.	Confirm:
	•	README.md, DESIGN.md, TOOLS.md, PHASES.md are internally consistent.
	•	New tools added in code appear in TOOLS.md.
	3.	Ensure CHANGELOG.md:
	•	Follows Keep a Changelog style.
	•	Has latest entries that correspond to recent changes.

Failure modes:
	•	Tools missing from TOOLS.md.
	•	Phase changes not reflected in PHASES.md.
	•	Changelog not updated for significant changes.

⸻

3.7 Error Handling & Determinism

Goal: ensure all tools fail gracefully and predictably.

Checks:
	1.	Intentionally call tools with invalid inputs:
	•	Missing required fields
	•	Invalid types
	•	Nonexistent phases or projects
	2.	Confirm:
	•	Tools return structured error objects (code, message, details).
	•	No unhandled exceptions or stack traces leak into the output.

Failure modes:
	•	Raw stack traces in output.
	•	Inconsistent error shapes.
	•	Non-JSON error responses.

⸻

4. Expected Output Shape

All self-test runs should produce a JSON structure like:

{
  "mode": "full",
  "timestamp": "2025-01-01T12:00:00Z",
  "overallStatus": "pass | fail | degraded",
  "summary": {
    "testsTotal": 20,
    "testsPassed": 18,
    "testsFailed": 2,
    "categories": {
      "boot": "pass",
      "status": "pass",
      "phases": "degraded",
      "paths": "pass",
      "compliance": "fail"
    }
  },
  "failingTests": [
    {
      "id": "phases_03",
      "category": "phases",
      "description": "run_phase proposes out-of-phase work",
      "severity": "high",
      "suggestedFix": "Check phase filters when generating tasks."
    }
  ],
  "notes": [
    "Paths with spaces validated successfully.",
    "Compliance checks need better mapping to TOOLS.md."
  ]
}


⸻

5. Running the Suite Manually

From a generic MCP client:
	1.	Ensure overseer-mcp is running.
	2.	Call the appropriate tools in this order:
	1.	overseer.status (sanity)
	2.	overseer.check_compliance (self)
	3.	overseer.infer_phases (self)
	4.	overseer.lint_repo (self)
	5.	Optional project-specific checks for other repos
	3.	Compare results against this document’s expectations.

⸻

6. Proposed Tool: overseer.self_test

To automate this suite, implement a tool:

Name: overseer.self_test
Category: QA / meta

Input (high-level schema):

{
  "mode": "quick | full | deep",
  "target": "self",
  "repoRoot": "<optional override, default is self repo>",
  "includeProjects": ["optional", "project", "names"],
  "maxIterations": 1
}

Output:
	•	The self-test result object defined in §4.

Behavior:
	1.	Dispatches all relevant tests for the selected mode.
	2.	Aggregates results into the unified JSON report.
	3.	Does not mutate code or docs (pure read + analysis).

A separate tool (e.g. overseer.self_repair) may later use overseer.self_test results to apply fixes.

⸻

7. Usage With Automated Agents

Agents or IDE integrations should:
	1.	Call overseer.self_test in full mode.
	2.	If overallStatus != "pass", then:
	•	Inspect failingTests.
	•	Apply targeted fixes.
	•	Re-run overseer.self_test.
	3.	Repeat until:
	•	All tests pass, or
	•	Remaining issues require human decision.

This document is the contract that defines what “green” means for Overseer.

---

## 2️⃣ Cursor loop prompt: self-test → fix → retest until green

This is the thing you feed to Cursor’s agent in the `overseer-mcp` repo.

```text
You are working in the `overseer-mcp` repository.

Your job is to run a self-test → fix → retest loop until Overseer is green or you hit a hard limit.

Use `docs/OVERSEER_SELF_VALIDATION.md` as the contract for what “passing” means.

Loop algorithm:

1. **Run self-test**
   - If the tool `overseer.self_test` exists, call it with:
     {
       "mode": "full",
       "target": "self"
     }
   - Otherwise, emulate the suite manually by calling at least:
     - overseer.status
     - overseer.check_compliance
     - overseer.infer_phases
     - overseer.lint_repo
   - Collect and summarize all failures into a list of concrete issues.

2. **Decide whether to stop**
   - If there are **no failing tests** and all categories are “pass”:
     - Stop the loop.
     - Produce a final summary of passing state and changed files.
   - If there ARE failing tests but they require unclear business rules or human choice:
     - Stop the loop.
     - Report what’s blocked and why.
   - Otherwise, continue.

3. **Plan targeted fixes**
   - Group failures by category (boot, phases, paths, compliance, docs, errors).
   - For the next iteration, pick the smallest set of changes that:
     - Fix 1–3 failing tests.
     - Do NOT cause large refactors.
   - Write a short plan:
     - Files to modify
     - Functions to adjust
     - Expected outcome

4. **Apply fixes**
   - Edit only the necessary files (src, docs, CHANGELOG, etc.).
   - Keep changes minimal and cohesive.
   - Update docs as needed:
     - TOOLS.md if tool behavior/schema changes
     - PHASES.md if phase logic changes
     - DESIGN.md if architecture changes
     - CHANGELOG.md with a new entry for this iteration

5. **Re-run tests**
   - Re-run `overseer.self_test` (full) or the equivalent manual suite.
   - Compare results against the previous run.
   - Confirm failingTests decreased or severity improved.

6. **Repeat**
   - Repeat steps 1–5 for up to **5 iterations** or until:
     - All tests pass, or
     - You determine further changes are too risky or ambiguous.

Execution rules:

- Never introduce breaking changes without documenting them.
- Never delete files unless the validation doc clearly marks them as deprecated.
- All changes must be deterministic and justifiable by the failures observed.
- At the end, always:
  - List all files modified
  - Show the latest self-test summary
  - Call out any remaining failures with suggestions for human follow-up.


⸻
