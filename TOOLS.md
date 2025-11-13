# Overseer MCP Tools Reference

This document enumerates all tools exposed by the Overseer MCP server. All tools use pure JSON-compatible input/output structures and are client-agnostic.

## Tool Categories

- **Planning**: Tools for creating and managing project phases
- **Execution**: Tools for running and advancing phases
- **QA**: Tools for validation, linting, and compliance checking
- **Environment**: Tools for managing configuration and secrets

## Tool Reference

### Planning Tools

#### overseer.plan_project

**Category**: Planning

**Description**: Creates a new project structure with phase definitions. Can be used for new projects or to add phases to existing projects.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "phases"],
  "properties": {
    "repo_name": {
      "type": "string",
      "description": "Name of the repository (directory under base_path, typically ~/dev)"
    },
    "phases": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "List of phase names matching templates in sentinel.yml"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "description": "Whether the operation succeeded"
    },
    "message": {
      "type": "string",
      "description": "Human-readable status message"
    },
    "phases_created": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of phase names that were created"
    },
    "phases_skipped": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of phase names that were skipped (duplicates or invalid)"
    },
    "errors": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of error messages (empty if success)"
    },
    "repo_path": {
      "type": "string",
      "description": "Absolute path to the repository"
    },
    "files_created": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of file paths that were created"
    }
  }
}
```

**Example Input**:
```json
{
  "repo_name": "my-project",
  "phases": ["planning", "implementation", "testing"]
}
```

**Example Output**:
```json
{
  "success": true,
  "message": "Created new project \"my-project\" with 3 phase(s)",
  "phases_created": ["planning", "implementation", "testing"],
  "phases_skipped": [],
  "errors": [],
  "repo_path": "/Users/joe/dev/my-project",
  "files_created": [
    "/Users/joe/dev/my-project/PHASES.md",
    "/Users/joe/dev/my-project/PHASE-planning.md",
    "/Users/joe/dev/my-project/PHASE-implementation.md",
    "/Users/joe/dev/my-project/PHASE-testing.md"
  ]
}
```

**Notes**:
- Validates phase names against templates in `sentinel.yml`
- Creates repository directory if it doesn't exist
- Preserves existing phases when adding new ones
- Skips duplicate phases gracefully
- Returns partial success if some phases fail

**Edge Cases**:
- Empty `repo_name`: Returns error
- Empty `phases` array: Returns error
- Invalid phase names: Included in `phases_skipped` and `errors`
- Existing project: Adds phases to existing PHASES.md

---

#### overseer.infer_phases

**Category**: Planning

**Description**: Analyzes an existing repository structure to suggest phase definitions based on detected patterns (files, directories, configs).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": {
      "type": "string",
      "description": "Name of the repository to analyze"
    },
    "options": {
      "type": "object",
      "properties": {
        "detect_frameworks": {
          "type": "boolean",
          "default": true,
          "description": "Detect framework-specific patterns (Phoenix, Next.js, etc.)"
        },
        "detect_infrastructure": {
          "type": "boolean",
          "default": true,
          "description": "Detect infrastructure files (Docker, Terraform, K8s)"
        }
      }
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "suggested_phases": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
          "reason": { "type": "string" },
          "detected_patterns": {
            "type": "array",
            "items": { "type": "string" }
          }
        }
      }
    },
    "detected_frameworks": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 3)

---

#### overseer.update_phases

**Category**: Planning

**Description**: Updates existing phase definitions (rename, modify description, add/remove steps).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "phase_name", "updates"],
  "properties": {
    "repo_name": { "type": "string" },
    "phase_name": { "type": "string" },
    "updates": {
      "type": "object",
      "properties": {
        "description": { "type": "string" },
        "add_steps": {
          "type": "array",
          "items": { "type": "string" }
        },
        "remove_steps": {
          "type": "array",
          "items": { "type": "string" }
        }
      }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 3)

---

### Execution Tools

#### overseer.run_phase

**Category**: Execution

**Description**: Executes a specific phase, updating its status to "active" and tracking execution.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "phase_name"],
  "properties": {
    "repo_name": {
      "type": "string",
      "description": "Name of the repository"
    },
    "phase_name": {
      "type": "string",
      "description": "Name of the phase to execute"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "phase_name": {
      "type": "string"
    },
    "artifacts_created": {
      "type": "array",
      "items": { "type": "string" },
      "description": "List of artifact patterns expected for this phase"
    },
    "errors": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

**Example Input**:
```json
{
  "repo_name": "my-project",
  "phase_name": "implementation"
}
```

**Example Output**:
```json
{
  "success": true,
  "message": "Phase implementation execution started",
  "phase_name": "implementation",
  "artifacts_created": [
    "src/**/*.ts",
    "tests/**/*.test.ts"
  ]
}
```

**Notes**:
- Updates phase status from "pending" to "active"
- Sets `started_at` timestamp
- Returns expected artifacts from template
- Does not validate artifact existence (use `check_compliance` for that)

**Edge Cases**:
- Phase not found: Returns error
- Project not found: Returns error
- Phase already active: Updates timestamp, returns success
- Phase already completed: Returns error (cannot re-run completed phase)

---

#### overseer.advance_phase

**Category**: Execution

**Description**: Advances a phase to its next status in the lifecycle (pending → active → completed).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "phase_name"],
  "properties": {
    "repo_name": {
      "type": "string",
      "description": "Name of the repository"
    },
    "phase_name": {
      "type": "string",
      "description": "Name of the phase to advance"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "new_status": {
      "type": "string",
      "enum": ["pending", "active", "completed"]
    }
  }
}
```

**Example Input**:
```json
{
  "repo_name": "my-project",
  "phase_name": "planning"
}
```

**Example Output**:
```json
{
  "success": true,
  "message": "Phase planning advanced to active",
  "new_status": "active"
}
```

**Notes**:
- Transitions: `pending` → `active` → `completed`
- Sets appropriate timestamps (`started_at` or `completed_at`)
- Cannot advance beyond "completed"
- Cannot go backwards (use `update_phases` to modify)

**Edge Cases**:
- Phase already completed: Returns error
- Phase not found: Returns error
- Project not found: Returns error

---

#### overseer.status

**Category**: Execution

**Description**: Retrieves the current status of a project, including all phases and their states.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": {
      "type": "string",
      "description": "Name of the repository"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean"
    },
    "project": {
      "type": "object",
      "properties": {
        "name": { "type": "string" },
        "created_at": { "type": "string" },
        "updated_at": { "type": "string" },
        "total_phases": { "type": "number" },
        "phases": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": { "type": "string" },
              "status": {
                "type": "string",
                "enum": ["pending", "active", "completed"]
              },
              "description": { "type": "string" },
              "started_at": { "type": "string" },
              "completed_at": { "type": "string" }
            }
          }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "pending_count": { "type": "number" },
        "active_count": { "type": "number" },
        "completed_count": { "type": "number" }
      }
    }
  }
}
```

**Example Input**:
```json
{
  "repo_name": "my-project"
}
```

**Example Output**:
```json
{
  "success": true,
  "project": {
    "name": "my-project",
    "created_at": "2024-01-15T10:30:00.000Z",
    "updated_at": "2024-01-15T11:45:00.000Z",
    "total_phases": 3,
    "phases": [
      {
        "name": "planning",
        "status": "completed",
        "description": "Initial project planning",
        "started_at": "2024-01-15T10:30:00.000Z",
        "completed_at": "2024-01-15T11:00:00.000Z"
      },
      {
        "name": "implementation",
        "status": "active",
        "description": "Core feature development",
        "started_at": "2024-01-15T11:00:00.000Z"
      },
      {
        "name": "testing",
        "status": "pending"
      }
    ]
  },
  "summary": {
    "pending_count": 1,
    "active_count": 1,
    "completed_count": 1
  }
}
```

**Notes**:
- Returns `null` for project if not found (with `success: false`)
- Includes summary statistics
- All timestamps in ISO 8601 format

**Edge Cases**:
- Project not found: Returns `success: false`, `project: null`
- Empty project: Returns project with empty phases array

---

### QA Tools

#### overseer.lint_repo

**Category**: QA

**Description**: Runs linting and formatting checks on the repository based on coding standards in `sentinel.yml`.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": { "type": "string" },
    "options": {
      "type": "object",
      "properties": {
        "fix": {
          "type": "boolean",
          "default": false,
          "description": "Automatically fix issues where possible"
        },
        "languages": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Specific languages to lint (default: all detected)"
        }
      }
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "issues": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string" },
          "line": { "type": "number" },
          "column": { "type": "number" },
          "severity": {
            "type": "string",
            "enum": ["error", "warning", "info"]
          },
          "message": { "type": "string" },
          "rule": { "type": "string" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total_issues": { "type": "number" },
        "errors": { "type": "number" },
        "warnings": { "type": "number" },
        "files_checked": { "type": "number" }
      }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 4)

---

#### overseer.sync_docs

**Category**: QA

**Description**: Synchronizes documentation with actual code structure, ensuring README, API docs, etc. are up to date.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": { "type": "string" },
    "options": {
      "type": "object",
      "properties": {
        "update_readme": { "type": "boolean", "default": true },
        "update_api_docs": { "type": "boolean", "default": true },
        "dry_run": { "type": "boolean", "default": false }
      }
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "files_updated": {
      "type": "array",
      "items": { "type": "string" }
    },
    "files_created": {
      "type": "array",
      "items": { "type": "string" }
    },
    "changes": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "file": { "type": "string" },
          "change_type": {
            "type": "string",
            "enum": ["created", "updated", "deleted"]
          },
          "description": { "type": "string" }
        }
      }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 4)

---

#### overseer.check_compliance

**Category**: QA

**Description**: Validates that a phase meets its completion criteria (artifacts exist, steps completed, etc.).

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "phase_name"],
  "properties": {
    "repo_name": { "type": "string" },
    "phase_name": { "type": "string" },
    "strict": {
      "type": "boolean",
      "default": false,
      "description": "If true, all artifacts must exist. If false, warns about missing artifacts."
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "compliant": { "type": "boolean" },
    "phase_name": { "type": "string" },
    "checks": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "check_type": {
            "type": "string",
            "enum": ["artifact", "step", "status"]
          },
          "passed": { "type": "boolean" },
          "message": { "type": "string" },
          "details": { "type": "object" }
        }
      }
    },
    "summary": {
      "type": "object",
      "properties": {
        "total_checks": { "type": "number" },
        "passed": { "type": "number" },
        "failed": { "type": "number" }
      }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 4)

---

### Environment Tools

#### overseer.env_map

**Category**: Environment

**Description**: Maps and tracks environment variables across phases, identifying required vs. optional variables.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": { "type": "string" },
    "phase_name": {
      "type": "string",
      "description": "Optional: filter to specific phase"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "env_map": {
      "type": "object",
      "additionalProperties": {
        "type": "object",
        "properties": {
          "variable": { "type": "string" },
          "required_for_phases": {
            "type": "array",
            "items": { "type": "string" }
          },
          "description": { "type": "string" },
          "default_value": { "type": "string" }
        }
      }
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 5)

---

#### overseer.generate_ci

**Category**: Environment

**Description**: Generates CI/CD pipeline configuration (GitHub Actions, GitLab CI, etc.) based on phase definitions.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name", "ci_type"],
  "properties": {
    "repo_name": { "type": "string" },
    "ci_type": {
      "type": "string",
      "enum": ["github-actions", "gitlab-ci", "circleci", "jenkins"]
    },
    "options": {
      "type": "object",
      "properties": {
        "run_tests": { "type": "boolean", "default": true },
        "deploy_on_complete": { "type": "boolean", "default": false }
      }
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "files_created": {
      "type": "array",
      "items": { "type": "string" }
    },
    "pipeline_config": {
      "type": "object",
      "description": "Generated pipeline configuration (format depends on ci_type)"
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 5)

---

#### overseer.secrets_template

**Category**: Environment

**Description**: Creates a template structure for managing secrets and credentials securely.

**Input Schema**:
```json
{
  "type": "object",
  "required": ["repo_name"],
  "properties": {
    "repo_name": { "type": "string" },
    "template_type": {
      "type": "string",
      "enum": ["env-file", "vault", "aws-secrets-manager"],
      "default": "env-file"
    }
  }
}
```

**Output Schema**:
```json
{
  "type": "object",
  "properties": {
    "success": { "type": "boolean" },
    "files_created": {
      "type": "array",
      "items": { "type": "string" }
    },
    "secrets_structure": {
      "type": "object",
      "description": "Template structure for secrets"
    },
    "instructions": {
      "type": "string",
      "description": "Human-readable instructions for using the template"
    }
  }
}
```

**Status**: Not yet implemented (planned for Phase 5)

---

## Error Response Format

All tools return errors in a consistent format:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": {
    "code": "ERROR_CODE",
    "field": "field_name",  // If validation error
    "value": "invalid_value"  // If validation error
  }
}
```

## Tool Naming Convention

All tools use the prefix `overseer.` followed by a snake_case name:
- `overseer.plan_project`
- `overseer.run_phase`
- `overseer.advance_phase`
- etc.

This ensures no conflicts with other MCP servers and makes tool origin clear.

