# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

#### Core Features
- **Project Planning**: `overseer.plan_project` tool for creating phase-based project structures
- **Phase Inference**: `overseer.infer_phases` tool that automatically detects project patterns and suggests phases
- **Phase Updates**: `overseer.update_phases` tool for modifying existing phase definitions
- **Phase Execution**: `overseer.run_phase` tool that executes phases, checks deliverables, and creates stub files
- **Phase Advancement**: `overseer.advance_phase` tool that validates completion and advances to next phase
- **Status Tracking**: `overseer.status` tool for real-time project and phase status visibility

#### Quality Assurance Tools
- **Repository Linting**: `overseer.lint_repo` tool that detects languages and recommends linting commands
- **Documentation Sync**: `overseer.sync_docs` tool that ensures consistent documentation formatting
- **Compliance Checking**: `overseer.check_compliance` tool that validates repository structure against conventions

#### Configuration & Environment
- **Sentinel Configuration**: Comprehensive `config/sentinel.yml` with:
  - Project defaults and conventions
  - Multiple environment support (development, vps.host, home.macmini, holo-cube)
  - Domain and container naming patterns
  - Extended coding standards (TypeScript, JavaScript, Python, Elixir, PHP, Go, Rust)
  - CI/CD workflow templates

#### Deployment
- **Docker Support**: `Dockerfile` and `docker-compose.yml` for containerized deployment
- **Production Ready**: Optimized build process and non-root user configuration

#### Documentation
- **README.md**: Comprehensive project overview, installation, and usage guide
- **RUNNING.md**: Detailed installation and deployment instructions
- **DEMO.md**: Complete workflow demonstration with examples
- **DESIGN.md**: Architecture and design documentation
- **TOOLS.md**: Complete tool reference with JSON schemas
- **LOGGING.md**: Logging conventions and best practices
- **PHASES.md**: Project build phases and progress tracking

#### Testing
- Basic test suite for core tools:
  - `plan_project` tests (happy path, existing files, error handling)
  - `status` tests (with and without PHASES.md)
  - `run_phase` tests (deliverable checking, missing files)
  - `advance_phase` tests (complete and incomplete phases)
  - `fsUtils` tests (file operations)

### Technical Details

- **Language**: TypeScript 5.3+
- **Runtime**: Node.js 18+ (ESM modules)
- **MCP SDK**: `@modelcontextprotocol/sdk` v0.5.0+
- **Transport**: stdio (standard MCP protocol)
- **Configuration**: YAML via `yaml` package

### Client-Agnostic Design

- All tools use pure JSON-compatible input/output structures
- No client-specific dependencies or assumptions
- Works with any MCP-compatible client (Cursor, Claude Desktop, Nova, etc.)
- Self-describing tool interfaces

### Known Limitations

- `overseer.env_map`: Planned for v1.1.0 (currently returns stub)
- `overseer.generate_ci`: Planned for v1.1.0 (currently returns stub)
- `overseer.secrets_template`: Planned for v1.1.0 (currently returns stub)
- Linting tools provide recommendations but don't execute linters yet
- Documentation sync focuses on phase files, not full API documentation extraction

### Future Enhancements (v1.1+)

- Real linter integration and execution
- Environment variable mapping across phases
- CI/CD pipeline generation for multiple providers
- Secrets template generation (env-file, Vault, AWS Secrets Manager)
- Advanced repository analysis
- Custom compliance rules
- Performance optimizations
- Extended language support

## [0.1.0] - 2024-01-15

### Added
- Initial project structure
- MCP server skeleton
- Basic tool stubs
- Configuration loader
- Phase manager foundation

