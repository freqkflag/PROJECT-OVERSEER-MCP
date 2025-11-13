# Overseer MCP Server

**Version**: 1.0.0

A standalone Model Context Protocol (MCP) server that implements Overseer multi-agent behavior for structured project management. Overseer provides planning, execution, and enforcement capabilities for managing software projects through well-defined phases.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

See [RUNNING.md](./RUNNING.md) for detailed installation and deployment instructions.

## Problem Statement

Modern software development involves complex workflows with multiple phases: planning, implementation, testing, deployment, and maintenance. Without structured oversight, projects can:

- **Lose track of progress** across multiple workstreams
- **Skip critical steps** in development lifecycle
- **Lack visibility** into what's been completed vs. what's pending
- **Struggle with consistency** across team members and projects
- **Miss documentation** and artifact requirements

Overseer exists to solve these problems by:

1. **Enforcing structure** through phase-based project management
2. **Tracking progress** with clear status indicators and artifacts
3. **Validating completeness** before advancing to next phases
4. **Maintaining documentation** automatically as projects evolve
5. **Providing tooling** that works with any MCP-compatible client

## High-Level Capabilities

### Planning
- **Project Planning**: Create phase definitions from templates or custom specifications
- **Phase Inference**: Automatically detect phases from existing project structure
- **Template Management**: Use predefined phase templates or create custom ones

### Execution
- **Phase Execution**: Run specific phases with validation and artifact tracking
- **Phase Advancement**: Move phases through lifecycle (pending → active → completed)
- **Status Tracking**: Real-time visibility into project and phase status

### Enforcement
- **Compliance Checking**: Validate that phases meet completion criteria
- **Linting**: Ensure code and documentation meet standards
- **Documentation Sync**: Keep project docs in sync with actual implementation

### Environment & Configuration
- **Environment Mapping**: Track and manage environment variables across phases
- **CI/CD Generation**: Generate CI/CD pipelines from phase definitions
- **Secrets Management**: Create templates for secure credential management

## Intended Tech Stack

- **Runtime**: Node.js 18+ (ESM modules)
- **Language**: TypeScript 5.3+
- **MCP SDK**: `@modelcontextprotocol/sdk` (v0.5.0+)
- **Configuration**: YAML (via `yaml` package)
- **File System**: Native Node.js `fs/promises`
- **Transport**: stdio (standard MCP transport)

## Architecture Overview

Overseer operates as a **pure MCP server** with no client-specific dependencies:

```
┌─────────────────┐
│  MCP Client     │  (Cursor, Claude, Nova, or any MCP client)
│  (any client)   │
└────────┬────────┘
         │ MCP Protocol (stdio/SSE/HTTP)
         │
┌────────▼─────────────────────────────┐
│     Overseer MCP Server              │
│  ┌─────────────────────────────────┐ │
│  │  Tool Layer                     │ │
│  │  (plan_project, run_phase, etc)│ │
│  └────────────┬────────────────────┘ │
│  ┌────────────▼────────────────────┐ │
│  │  Core Logic Layer               │ │
│  │  - PhaseManager                 │ │
│  │  - RepoHandler                  │ │
│  │  - ConfigLoader                 │ │
│  └────────────┬────────────────────┘ │
└───────────────┼──────────────────────┘
                │
┌───────────────▼──────────────────────┐
│  File System                         │
│  - ~/dev/{repo}/PHASES.md           │
│  - ~/dev/{repo}/PHASE-*.md          │
│  - config/sentinel.yml              │
└──────────────────────────────────────┘
```

## Example Use Cases

### Use Case 1: Phoenix + Supabase Application

**Scenario**: Building a full-stack web application with Elixir/Phoenix backend and Supabase frontend.

```json
{
  "repo_name": "phoenix-supabase-app",
  "phases": [
    "planning",
    "database-design",
    "backend-api",
    "frontend-integration",
    "testing",
    "deployment"
  ]
}
```

**Workflow**:
1. `overseer.plan_project` creates phase structure
2. `overseer.run_phase` executes each phase sequentially
3. `overseer.status` tracks progress across all phases
4. `overseer.check_compliance` validates before deployment
5. `overseer.generate_ci` creates CI/CD pipeline

### Use Case 2: WordPress Infrastructure Repository

**Scenario**: Managing infrastructure-as-code for WordPress hosting.

```json
{
  "repo_name": "wordpress-infra",
  "phases": [
    "infrastructure-planning",
    "terraform-setup",
    "kubernetes-config",
    "monitoring-setup",
    "security-hardening",
    "documentation"
  ]
}
```

**Workflow**:
1. `overseer.plan_project` sets up infrastructure phases
2. `overseer.infer_phases` detects existing Terraform/K8s configs
3. `overseer.sync_docs` keeps infrastructure docs updated
4. `overseer.env_map` tracks environment variables
5. `overseer.secrets_template` generates secrets management structure

### Use Case 3: Multi-Phase Feature Development

**Scenario**: Adding a new feature to an existing project.

```json
{
  "repo_name": "existing-project",
  "phases": ["feature-planning", "implementation", "testing", "documentation"]
}
```

**Workflow**:
1. `overseer.plan_project` adds new phases to existing project
2. `overseer.run_phase` executes feature development
3. `overseer.advance_phase` moves through lifecycle
4. `overseer.lint_repo` ensures code quality
5. `overseer.status` provides visibility to team

## Installation

See `RUNNING.md` for detailed installation and setup instructions.

Quick start:

```bash
npm install
npm run build
npm start
```

## Configuration

The server reads configuration from `config/sentinel.yml`. See `DESIGN.md` for detailed configuration schema.

## MCP Client Integration

### Cursor IDE

Add to your Cursor MCP configuration (typically in Cursor settings or `~/.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "overseer": {
      "command": "node",
      "args": ["/absolute/path/to/overseer-mcp/dist/server.js"],
      "env": {
        "OVERSEER_BASE_PATH": "~/dev"
      }
    }
  }
}
```

**Using Docker:**

```json
{
  "mcpServers": {
    "overseer": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-v", "~/dev:/root/dev:ro",
        "-v", "/absolute/path/to/overseer-mcp/config:/app/config:ro",
        "freqkflag/overseer-mcp:latest"
      ]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "overseer": {
      "command": "node",
      "args": ["/absolute/path/to/overseer-mcp/dist/server.js"]
    }
  }
}
```

### Usage Example

Once configured, you can use Overseer tools in your MCP client:

**Plan a project:**
```json
{
  "repo_root": "~/dev/sample-project",
  "project_name": "sample-project",
  "project_summary": "A sample web application",
  "overwrite_existing": false
}
```

**Run a phase:**
```json
{
  "repo_root": "~/dev/sample-project",
  "phase_id": "01",
  "aggression_level": "normal"
}
```

**Advance phase:**
```json
{
  "repo_root": "~/dev/sample-project",
  "expected_current_phase": "01"
}
```

See `DEMO.md` for a complete walkthrough.

### Available Tools

See `TOOLS.md` for complete tool documentation.

## Project Structure

```
overseer-mcp/
├── config/
│   └── sentinel.yml          # Configuration file
├── src/
│   ├── core/
│   │   ├── config.ts        # Configuration loader
│   │   ├── phase-manager.ts # Phase management logic
│   │   ├── repo.ts          # Repository file operations
│   │   ├── repo-analyzer.ts # Repository structure analysis
│   │   └── fsUtils.ts       # File system utilities
│   ├── tools/
│   │   ├── plan-project.ts  # Project planning
│   │   ├── infer-phases.ts  # Phase inference
│   │   ├── update-phases.ts # Phase updates
│   │   ├── run-phase.ts     # Phase execution
│   │   ├── advance-phase.ts # Phase advancement
│   │   ├── status.ts         # Project status
│   │   ├── lint-repo.ts     # Repository linting
│   │   ├── sync-docs.ts     # Documentation sync
│   │   ├── check-compliance.ts # Compliance checking
│   │   ├── env-map.ts       # Environment mapping
│   │   ├── generate-ci.ts   # CI/CD generation
│   │   ├── secrets-template.ts # Secrets templates
│   │   └── index.ts         # Tool registration
│   └── server.ts            # MCP server entry point
├── config/
│   └── sentinel.yml         # Configuration
├── Dockerfile               # Docker image definition
├── docker-compose.yml      # Docker Compose configuration
├── package.json
├── tsconfig.json
├── README.md                # This file
├── RUNNING.md               # Installation and usage guide
├── DEMO.md                  # Demo scenario walkthrough
├── DESIGN.md                # Architecture and design
├── TOOLS.md                 # Tool documentation
└── PHASES.md                # Build phases for this project
```

## Development

See `RUNNING.md` for detailed instructions.

Quick commands:

```bash
# Build
npm run build

# Development mode with watch
npm run dev

# Run production server
npm start

# Docker
docker-compose up -d
```

## Client-Agnostic Design

Overseer is designed to work with **any MCP-compatible client**:

- **Cursor**: IDE integration via MCP
- **Claude Desktop**: Chat-based interaction
- **Nova**: Code editor integration
- **Custom clients**: Any tool that speaks MCP protocol

All tool interfaces use pure JSON-compatible structures. No client-specific features are required.

## License

MIT
