import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoAnalyzer } from '../core/repo-analyzer.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createPlanProjectTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.plan_project',
    description: 'Plan a new project by creating phase definitions. Creates PHASES.md and PHASE-*.md files in the repository. Can infer phases from project structure if not provided.',
    inputSchema: {
      type: 'object',
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository (absolute path or relative to ~/dev)',
        },
        project_name: {
          type: 'string',
          description: 'Name of the project',
        },
        project_summary: {
          type: 'string',
          description: 'Summary description of the project',
        },
        overwrite_existing: {
          type: 'boolean',
          default: false,
          description: 'If true, overwrite existing PHASES.md. If false, normalize and merge.',
        },
        phases: {
          type: 'array',
          items: {
            type: 'object',
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
            required: ['id', 'name', 'description'],
          },
          description: 'Optional: Explicit phase definitions. If not provided, phases will be inferred.',
        },
      },
      required: ['repo_root', 'project_name'],
    },
  };
}

export async function handlePlanProject(
  args: {
    repo_root: string;
    project_name: string;
    project_summary?: string;
    overwrite_existing?: boolean;
    phases?: Array<{
      id: string;
      name: string;
      description: string;
      deliverables?: string[];
      done_criteria?: string[];
    }>;
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  message: string;
  phases_discovered: number;
  phases_created: number;
  files_written: string[];
  files_updated: string[];
  errors: string[];
}> {
  const errors: string[] = [];
  const filesWritten: string[] = [];
  const filesUpdated: string[] = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      // Relative path - resolve from ~/dev
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    // Ensure repo exists
    FSUtils.ensureDir(repoPath);

    // Check if PHASES.md exists
    const phasesPath = join(repoPath, 'PHASES.md');
    const phasesExist = FSUtils.fileExists(phasesPath);

    let phases: Array<{
      id: string;
      name: string;
      description: string;
      deliverables?: string[];
      done_criteria?: string[];
    }> = [];

    // If phases provided explicitly, use them
    if (args.phases && args.phases.length > 0) {
      phases = args.phases;
    } else {
      // Infer phases from repo structure
      const analysis = RepoAnalyzer.analyzeRepo(repoPath, {
        detect_frameworks: true,
        detect_infrastructure: true,
      });

      if (analysis.suggested_phases.length > 0) {
        phases = analysis.suggested_phases.map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          deliverables: p.deliverables,
          done_criteria: p.done_criteria,
        }));
      } else {
        // Fallback to default phases
        phases = [
          {
            id: '01',
            name: 'foundation',
            description: 'Project foundation and setup',
            deliverables: ['Project structure', 'README.md', 'Basic configuration'],
            done_criteria: ['Project structure is in place', 'README.md exists'],
          },
        ];
      }
    }

    // Read existing phases if they exist and we're not overwriting
    let existingPhases: any = null;
    if (phasesExist && !args.overwrite_existing) {
      try {
        const existingContent = FSUtils.readFile(phasesPath);
        // Try to parse as markdown (we'll use a simple approach for now)
        // For full parsing, we'd use the RepoHandler
        existingPhases = { exists: true, content: existingContent };
      } catch (error) {
        errors.push(`Failed to read existing PHASES.md: ${error}`);
      }
    }

    // Generate PHASES.md content
    const now = new Date().toISOString();
    const phasesContent = generatePhasesMarkdown(
      args.project_name,
      phases,
      existingPhases ? now : now, // created_at
      now, // updated_at
      existingPhases ? 'updated' : 'created'
    );

    // Write PHASES.md
    try {
      FSUtils.writeFile(phasesPath, phasesContent);
      if (phasesExist) {
        filesUpdated.push(phasesPath);
      } else {
        filesWritten.push(phasesPath);
      }
    } catch (error) {
      errors.push(`Failed to write PHASES.md: ${error}`);
    }

    // Generate and write PHASE-XX.md files
    for (const phase of phases) {
      const phaseFilePath = join(repoPath, `PHASE-${phase.id.padStart(2, '0')}.md`);
      const phaseContent = generatePhaseFileContent(phase, args.project_name);

      try {
        const phaseExists = FSUtils.fileExists(phaseFilePath);
        FSUtils.writeFile(phaseFilePath, phaseContent);
        if (phaseExists) {
          filesUpdated.push(phaseFilePath);
        } else {
          filesWritten.push(phaseFilePath);
        }
      } catch (error) {
        errors.push(`Failed to write ${phaseFilePath}: ${error}`);
      }
    }

    const success = errors.length === 0;
    const message = success
      ? `${phasesExist ? 'Updated' : 'Created'} project "${args.project_name}" with ${phases.length} phase(s)`
      : `Partially ${phasesExist ? 'updated' : 'created'} project with ${errors.length} error(s)`;

    return {
      success,
      message,
      phases_discovered: phases.length,
      phases_created: phases.length,
      files_written: filesWritten,
      files_updated: filesUpdated,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to plan project: ${errorMessage}`,
      phases_discovered: 0,
      phases_created: 0,
      files_written: [],
      files_updated: [],
      errors: [errorMessage],
    };
  }
}

function generatePhasesMarkdown(
  projectName: string,
  phases: Array<{
    id: string;
    name: string;
    description: string;
    deliverables?: string[];
    done_criteria?: string[];
  }>,
  created_at: string,
  updated_at: string,
  action: 'created' | 'updated'
): string {
  const lines: string[] = [];

  lines.push(`# Project Phases: ${projectName}`);
  lines.push('');
  lines.push('This document tracks the phases of the project.');
  lines.push('');
  lines.push('## Metadata');
  lines.push('');
  lines.push(`- **Created**: ${created_at}`);
  lines.push(`- **Updated**: ${updated_at}`);
  lines.push(`- **Total Phases**: ${phases.length}`);
  lines.push('');
  lines.push('## Phases');
  lines.push('');

  phases.forEach((phase) => {
    lines.push(`### ${phase.id}. ${phase.name}`);
    lines.push('');
    lines.push(`**Status**: pending`);
    lines.push(`**Description**: ${phase.description}`);
    lines.push('');

    if (phase.deliverables && phase.deliverables.length > 0) {
      lines.push('**Deliverables**:');
      lines.push('');
      phase.deliverables.forEach(deliverable => {
        lines.push(`- ${deliverable}`);
      });
      lines.push('');
    }

    if (phase.done_criteria && phase.done_criteria.length > 0) {
      lines.push('**Done Criteria**:');
      lines.push('');
      phase.done_criteria.forEach(criterion => {
        lines.push(`- [ ] ${criterion}`);
      });
      lines.push('');
    }
  });

  lines.push('---');
  lines.push('');
  lines.push(`*This file is automatically managed by Overseer MCP.*`);
  lines.push(`*Last ${action}: ${updated_at}*`);

  return lines.join('\n');
}

function generatePhaseFileContent(
  phase: {
    id: string;
    name: string;
    description: string;
    deliverables?: string[];
    done_criteria?: string[];
  },
  projectName: string
): string {
  const lines: string[] = [];
  const now = new Date().toISOString();

  lines.push(`# Phase ${phase.id}: ${phase.name}`);
  lines.push('');
  lines.push(`**Project**: ${projectName}`);
  lines.push(`**Phase ID**: ${phase.id}`);
  lines.push(`**Status**: pending`);
  lines.push(`**Created**: ${now}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## Description');
  lines.push('');
  lines.push(phase.description);
  lines.push('');

  if (phase.deliverables && phase.deliverables.length > 0) {
    lines.push('## Deliverables');
    lines.push('');
    phase.deliverables.forEach(deliverable => {
      lines.push(`- [ ] ${deliverable}`);
    });
    lines.push('');
  }

  if (phase.done_criteria && phase.done_criteria.length > 0) {
    lines.push('## Done Criteria');
    lines.push('');
    phase.done_criteria.forEach(criterion => {
      lines.push(`- [ ] ${criterion}`);
    });
    lines.push('');
  }

  lines.push('## Progress');
  lines.push('');
  lines.push('- [ ] Phase started');
  lines.push('- [ ] Deliverables completed');
  lines.push('- [ ] Done criteria met');
  lines.push('- [ ] Phase completed');
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('*This phase file is managed by Overseer MCP.*');

  return lines.join('\n');
}
