import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoHandler, PhaseInfo } from '../core/repo.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createUpdatePhasesTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.update_phases',
    description: 'Updates existing phase definitions (rename, modify description, add/remove steps, deliverables, done criteria).',
    inputSchema: {
      type: 'object',
      required: ['repo_root', 'modifications'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
        modifications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              operation: {
                type: 'string',
                enum: ['add', 'update', 'remove'],
                description: 'Operation to perform',
              },
              phase_id: {
                type: 'string',
                description: 'Phase ID to update or remove (required for update/remove)',
              },
              phase: {
                type: 'object',
                description: 'Phase data (required for add/update)',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  deliverables: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  done_criteria: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                },
              },
            },
            required: ['operation'],
          },
          description: 'List of modifications to apply',
        },
      },
    },
  };
}

export async function handleUpdatePhases(
  args: {
    repo_root: string;
    modifications: Array<{
      operation: 'add' | 'update' | 'remove';
      phase_id?: string;
      phase?: {
        id: string;
        name: string;
        description: string;
        deliverables?: string[];
        done_criteria?: string[];
      };
    }>;
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  message: string;
  changes_applied: {
    added: string[];
    updated: string[];
    removed: string[];
  };
  files_written: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const added: string[] = [];
  const updated: string[] = [];
  const removed: string[] = [];
  const filesWritten: string[] = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    // Extract repo name from path
    const repoName = repoPath.split('/').pop() || 'unknown';

    // Read existing phases
    // We need to create a RepoHandler that can read from the absolute path
    // For now, let's read directly and parse
    const phasesPath = join(repoPath, 'PHASES.md');
    if (!FSUtils.fileExists(phasesPath)) {
      return {
        success: false,
        message: 'Project not found. Run plan_project first.',
        changes_applied: { added: [], updated: [], removed: [] },
        files_written: [],
        errors: ['PHASES.md not found'],
      };
    }

    // Use RepoHandler with absolute path (handles paths with spaces)
    const repoHandler = new RepoHandler();
    let projectPhases = repoHandler.readPhasesIndexFromPath(repoPath);
    
    if (!projectPhases) {
      return {
        success: false,
        message: 'Project not found. Run plan_project first.',
        changes_applied: { added: [], updated: [], removed: [] },
        files_written: [],
        errors: ['PHASES.md not found'],
      };
    }

    // Apply modifications
    for (const mod of args.modifications) {
      try {
        if (mod.operation === 'add') {
          if (!mod.phase) {
            errors.push('Phase data required for add operation');
            continue;
          }

          // Validate required fields
          if (!mod.phase.id || !mod.phase.name || !mod.phase.description) {
            errors.push('Phase must have id, name, and description');
            continue;
          }

          // Check if phase ID already exists
          if (projectPhases.phases.some(p => p.id === mod.phase!.id)) {
            errors.push(`Phase ID ${mod.phase.id} already exists`);
            continue;
          }

          // Add phase
          const newPhase: PhaseInfo = {
            id: mod.phase.id,
            name: mod.phase.name,
            status: 'pending',
            description: mod.phase.description,
            deliverables: mod.phase.deliverables,
            done_criteria: mod.phase.done_criteria,
          };

          projectPhases.phases.push(newPhase);
          added.push(mod.phase.id);

        } else if (mod.operation === 'update') {
          if (!mod.phase_id) {
            errors.push('phase_id required for update operation');
            continue;
          }

          const phaseIndex = projectPhases.phases.findIndex(p => p.id === mod.phase_id);
          if (phaseIndex === -1) {
            errors.push(`Phase ID ${mod.phase_id} not found`);
            continue;
          }

          if (!mod.phase) {
            errors.push('Phase data required for update operation');
            continue;
          }

          // Update phase
          const existingPhase = projectPhases.phases[phaseIndex];
          projectPhases.phases[phaseIndex] = {
            ...existingPhase,
            name: mod.phase.name || existingPhase.name,
            description: mod.phase.description || existingPhase.description,
            deliverables: mod.phase.deliverables !== undefined ? mod.phase.deliverables : existingPhase.deliverables,
            done_criteria: mod.phase.done_criteria !== undefined ? mod.phase.done_criteria : existingPhase.done_criteria,
          };

          updated.push(mod.phase_id);

        } else if (mod.operation === 'remove') {
          if (!mod.phase_id) {
            errors.push('phase_id required for remove operation');
            continue;
          }

          const phaseIndex = projectPhases.phases.findIndex(p => p.id === mod.phase_id);
          if (phaseIndex === -1) {
            errors.push(`Phase ID ${mod.phase_id} not found`);
            continue;
          }

          projectPhases.phases.splice(phaseIndex, 1);
          removed.push(mod.phase_id);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to apply modification: ${errorMsg}`);
      }
    }

    // Write updated PHASES.md
    if (added.length > 0 || updated.length > 0 || removed.length > 0) {
      try {
        repoHandler.writePhasesIndexToPath(repoPath, projectPhases);
        filesWritten.push(join(repoPath, 'PHASES.md'));
      } catch (error) {
        errors.push(`Failed to write PHASES.md: ${error}`);
      }
    }

    const success = errors.length === 0;
    const message = success
      ? `Applied ${added.length} additions, ${updated.length} updates, ${removed.length} removals`
      : `Partially applied changes with ${errors.length} error(s)`;

    return {
      success,
      message,
      changes_applied: {
        added,
        updated,
        removed,
      },
      files_written: filesWritten,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to update phases: ${errorMessage}`,
      changes_applied: { added: [], updated: [], removed: [] },
      files_written: [],
      errors: [errorMessage],
    };
  }
}
