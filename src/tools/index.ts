import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { ConfigLoader } from '../core/config.js';
import { createPlanProjectTool, handlePlanProject } from './plan-project.js';
import { createRunPhaseTool, handleRunPhase } from './run-phase.js';
import { createAdvancePhaseTool, handleAdvancePhase } from './advance-phase.js';
import { createStatusTool, handleStatus } from './status.js';
import { createInferPhasesTool, handleInferPhases } from './infer-phases.js';
import { createUpdatePhasesTool, handleUpdatePhases } from './update-phases.js';
import { createLintRepoTool, handleLintRepo } from './lint-repo.js';
import { createSyncDocsTool, handleSyncDocs } from './sync-docs.js';
import { createCheckComplianceTool, handleCheckCompliance } from './check-compliance.js';
import { createEnvMapTool, handleEnvMap } from './env-map.js';
import { createGenerateCiTool, handleGenerateCi } from './generate-ci.js';
import { createSecretsTemplateTool, handleSecretsTemplate } from './secrets-template.js';

export interface ToolContext {
  phaseManager: PhaseManager;
  configLoader: ConfigLoader;
}

export function createTools(context: ToolContext): Tool[] {
  return [
    // Planning tools
    createPlanProjectTool(context.phaseManager),
    createInferPhasesTool(context.configLoader),
    createUpdatePhasesTool(context.phaseManager),
    // Execution tools
    createRunPhaseTool(context.phaseManager),
    createAdvancePhaseTool(context.phaseManager),
    createStatusTool(context.phaseManager),
    // QA tools
    createLintRepoTool(context.configLoader),
    createSyncDocsTool(context.phaseManager),
    createCheckComplianceTool(context.phaseManager),
    // Environment tools
    createEnvMapTool(context.phaseManager),
    createGenerateCiTool(context.phaseManager),
    createSecretsTemplateTool(context.phaseManager),
  ];
}

export async function handleToolCall(
  name: string,
  args: any,
  context: ToolContext
): Promise<any> {
  switch (name) {
    // Planning tools
    case 'overseer.plan_project':
      return await handlePlanProject(args, context.phaseManager);
    case 'overseer.infer_phases':
      return await handleInferPhases(args, context.configLoader);
    case 'overseer.update_phases':
      return await handleUpdatePhases(args, context.phaseManager);
    // Execution tools
    case 'overseer.run_phase':
      return await handleRunPhase(args, context.phaseManager);
    case 'overseer.advance_phase':
      return await handleAdvancePhase(args, context.phaseManager);
    case 'overseer.status':
      return await handleStatus(args, context.phaseManager);
    // QA tools
    case 'overseer.lint_repo':
      return await handleLintRepo(args, context.configLoader);
    case 'overseer.sync_docs':
      return await handleSyncDocs(args, context.phaseManager);
    case 'overseer.check_compliance':
      return await handleCheckCompliance(args, context.phaseManager);
    // Environment tools
    case 'overseer.env_map':
      return await handleEnvMap(args, context.phaseManager);
    case 'overseer.generate_ci':
      return await handleGenerateCi(args, context.phaseManager);
    case 'overseer.secrets_template':
      return await handleSecretsTemplate(args, context.phaseManager);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

