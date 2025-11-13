import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoHandler } from '../core/repo.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createStatusTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.status',
    description: 'Get the current status of a project, including all phases and their states. Determines phase status from PHASES.md and PHASE-*.md files.',
    inputSchema: {
      type: 'object',
      required: ['repo_root'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
      },
    },
  };
}

export async function handleStatus(
  args: { repo_root: string },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  message: string;
  project_name: string;
  current_phase: string | null;
  phases: Array<{
    id: string;
    name: string;
    status: string;
    description?: string;
    started_at?: string;
    completed_at?: string;
  }>;
  summary: {
    total: number;
    pending: number;
    active: number;
    in_progress: number;
    completed: number;
    locked: number;
    blocked: number;
  };
}> {
  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    // Extract repo name from path (for display purposes)
    const repoName = repoPath.split('/').pop() || 'unknown';

    // Read PHASES.md using absolute path (handles paths with spaces)
    const repoHandler = new RepoHandler();
    const projectPhases = repoHandler.readPhasesIndexFromPath(repoPath);

    if (!projectPhases) {
      return {
        success: false,
        message: `Project ${repoName} not found. Run plan_project first.`,
        project_name: repoName,
        current_phase: null,
        phases: [],
        summary: {
          total: 0,
          pending: 0,
          active: 0,
          in_progress: 0,
          completed: 0,
          locked: 0,
          blocked: 0,
        },
      };
    }

    // Determine current phase (first non-completed phase)
    let currentPhase: string | null = null;
    for (const phase of projectPhases.phases) {
      if (phase.status !== 'completed') {
        currentPhase = phase.id;
        break;
      }
    }

    // Enhance phase status by checking PHASE-*.md files
    const enhancedPhases = projectPhases.phases.map(phase => {
      let enhancedStatus = phase.status;

      // Try to read phase file to get more accurate status (handles paths with spaces)
      const phaseFilePath = repoHandler.getPhaseFileByIdFromPath(repoPath, phase.id);
      if (FSUtils.fileExists(phaseFilePath)) {
        try {
          const phaseContent = FSUtils.readFile(phaseFilePath);
          
          // Check for status markers in the file
          if (phaseContent.includes('**Status**: locked')) {
            enhancedStatus = 'locked';
          } else if (phaseContent.includes('**Status**: in_progress')) {
            enhancedStatus = 'in_progress';
          } else if (phaseContent.includes('**Status**: active')) {
            enhancedStatus = 'active';
          } else if (phaseContent.includes('**Status**: completed')) {
            enhancedStatus = 'completed';
          } else if (phaseContent.includes('**Status**: blocked')) {
            enhancedStatus = 'blocked';
          }
        } catch {
          // If we can't read the file, use the status from PHASES.md
        }
      }

      return {
        id: phase.id,
        name: phase.name,
        status: enhancedStatus,
        description: phase.description,
        started_at: phase.started_at,
        completed_at: phase.completed_at,
      };
    });

    // Calculate summary
    const summary = {
      total: enhancedPhases.length,
      pending: enhancedPhases.filter(p => p.status === 'pending').length,
      active: enhancedPhases.filter(p => p.status === 'active').length,
      in_progress: enhancedPhases.filter(p => p.status === 'in_progress').length,
      completed: enhancedPhases.filter(p => p.status === 'completed').length,
      locked: enhancedPhases.filter(p => p.status === 'locked').length,
      blocked: enhancedPhases.filter(p => p.status === 'blocked').length,
    };

    return {
      success: true,
      message: `Status retrieved for project ${projectPhases.project_name}`,
      project_name: projectPhases.project_name,
      current_phase: currentPhase,
      phases: enhancedPhases,
      summary,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to get status: ${errorMessage}`,
      project_name: 'unknown',
      current_phase: null,
      phases: [],
      summary: {
        total: 0,
        pending: 0,
        active: 0,
        in_progress: 0,
        completed: 0,
        locked: 0,
        blocked: 0,
      },
    };
  }
}
