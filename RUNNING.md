# Running Overseer MCP

This guide explains how to install, build, and run the Overseer MCP server in different environments.

## Prerequisites

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js
- **TypeScript**: Installed as a dev dependency
- **Docker** (optional): For containerized deployment

## Installation

### From Source

1. **Clone or navigate to the repository:**
   ```bash
   cd ~/dev/overseer-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

   This compiles TypeScript to JavaScript in the `dist/` directory.

## Development Mode

Run the server in development mode with hot-reload:

```bash
npm run dev
```

This uses `tsx watch` to automatically rebuild when files change. The server will output logs to stderr (standard MCP convention).

## Production Mode

### Option 1: Direct Node.js

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

   Or directly:
   ```bash
   node dist/server.js
   ```

### Option 2: Docker

1. **Build the Docker image:**
   ```bash
   docker build -t freqkflag/overseer-mcp:latest .
   ```

2. **Run with docker-compose:**
   ```bash
   docker-compose up -d
   ```

3. **Or run directly:**
   ```bash
   docker run -it --rm \
     -v ~/dev:/root/dev:ro \
     -v $(pwd)/config:/app/config:ro \
     freqkflag/overseer-mcp:latest
   ```

## Configuration

The server reads configuration from `config/sentinel.yml`. This file defines:

- Phase templates
- Coding standards
- Environment settings
- CI/CD defaults
- Naming conventions

See `config/sentinel.yml` for the complete configuration schema.

## MCP Client Integration

### Cursor IDE

Add the following to your Cursor MCP configuration file (typically `~/.cursor/mcp.json` or in Cursor settings):

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

**For Docker deployment:**

```json
{
  "mcpServers": {
    "overseer": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-v", "~/dev:/root/dev:ro",
        "-v", "/absolute/path/to/overseer-mcp/config:/app/config:ro",
        "freqkflag/overseer-mcp:latest"
      ]
    }
  }
}
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent location:

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

### Nova Editor

Configure in Nova's MCP settings (if supported) or via command-line integration.

## Usage Examples

### Example 1: Plan a New Project

```json
{
  "repo_root": "~/dev/my-new-project",
  "project_name": "my-new-project",
  "project_summary": "A new web application",
  "overwrite_existing": false
}
```

This will:
1. Create `~/dev/my-new-project/PHASES.md`
2. Generate `PHASE-01.md`, `PHASE-02.md`, etc.
3. Infer phases from repository structure if not provided

### Example 2: Run a Phase

```json
{
  "repo_root": "~/dev/my-new-project",
  "phase_id": "01",
  "aggression_level": "normal"
}
```

This will:
1. Read `PHASE-01.md` and check deliverables
2. Verify file/directory existence
3. Create stub files for missing items (based on aggression_level)
4. Update checklists in `PHASE-01.md`

### Example 3: Advance Phase

```json
{
  "repo_root": "~/dev/my-new-project",
  "expected_current_phase": "01"
}
```

This will:
1. Validate all deliverables and done_criteria are complete
2. Mark phase as "locked" if complete
3. Activate next phase automatically
4. Return missing items if incomplete

### Example 4: Check Status

```json
{
  "repo_root": "~/dev/my-new-project"
}
```

Returns:
- Current phase
- All phases with status
- Summary statistics (pending/active/completed counts)

## Environment Variables

- `OVERSEER_BASE_PATH`: Base path for repositories (default: `~/dev`)
- `NODE_ENV`: Environment mode (`development` or `production`)
- `OVERSEER_CONFIG_PATH`: Path to sentinel.yml (default: `./config/sentinel.yml`)

## Troubleshooting

### Server won't start

1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Verify build:**
   ```bash
   npm run build
   ```

3. **Check config file:**
   ```bash
   cat config/sentinel.yml
   ```

### MCP client can't connect

1. **Verify server is running:**
   ```bash
   node dist/server.js
   ```
   You should see: "Overseer MCP server running on stdio"

2. **Check file paths in MCP config:**
   - Use absolute paths
   - Ensure paths are correct for your OS

3. **Check permissions:**
   - Ensure the server can read `config/sentinel.yml`
   - Ensure the server can access `~/dev` directory

### Docker issues

1. **Check volume mounts:**
   ```bash
   docker-compose config
   ```

2. **View logs:**
   ```bash
   docker-compose logs overseer-mcp
   ```

3. **Test container:**
   ```bash
   docker run -it --rm freqkflag/overseer-mcp:latest node --version
   ```

## Next Steps

- See `README.md` for tool documentation
- See `TOOLS.md` for complete tool reference
- See `DESIGN.md` for architecture details

