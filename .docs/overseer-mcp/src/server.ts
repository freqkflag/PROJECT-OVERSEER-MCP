/*
 * Entry point for the Overseer MCP server.
 *
 * This file sets up the transport layer for the Model Context Protocol (MCP),
 * registers all available tools and exposes a single endpoint for handling
 * JSON requests.  The implementation here is intentionally minimal; real
 * network handling should be added in later phases.
 */

import { readFileSync } from 'fs';
import * as path from 'path';

// Type definitions for tools
import { planProject } from './tools/planProject';
import { runPhase } from './tools/runPhase';
import { advancePhase } from './tools/advancePhase';
import { status } from './tools/status';
import { inferPhases } from './tools/inferPhases';
import { updatePhases } from './tools/updatePhases';
import { lintRepo } from './tools/lintRepo';
import { syncDocs } from './tools/syncDocs';
import { checkCompliance } from './tools/checkCompliance';
import { envMap } from './tools/envMap';
import { generateCi } from './tools/generateCi';
import { secretsTemplate } from './tools/secretsTemplate';

// Load sentinel.yml at startup.  In a real implementation this should be
// parsed once and cached.  For now we read it synchronously.
const sentinelPath = path.resolve(__dirname, '../config/sentinel.yml');
const sentinelContents = readFileSync(sentinelPath, 'utf8');

/**
 * Main function that would initialise the MCP server.  At this stage we
 * simply log the available tools and exit.  Real network handling will be
 * added in future phases.
 */
function startServer() {
  // List of tool names for demonstration purposes
  const tools = [
    'overseer.plan_project',
    'overseer.infer_phases',
    'overseer.update_phases',
    'overseer.run_phase',
    'overseer.advance_phase',
    'overseer.status',
    'overseer.lint_repo',
    'overseer.sync_docs',
    'overseer.check_compliance',
    'overseer.env_map',
    'overseer.generate_ci',
    'overseer.secrets_template'
  ];
  console.log('Sentinel config loaded from:', sentinelPath);
  console.log('Available tools:', tools.join(', '));
  console.log('TODO: Implement MCP server transport and request dispatching.');
}

// If this module is the entry point, start the server.
if (require.main === module) {
  startServer();
}

export { startServer };