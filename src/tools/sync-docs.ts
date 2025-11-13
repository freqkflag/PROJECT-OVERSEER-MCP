import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoHandler } from '../core/repo.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createSyncDocsTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.sync_docs',
    description: 'Ensures documentation consistency. Validates that PHASES.md and PHASE-XX.md files follow consistent formatting with required sections.',
    inputSchema: {
      type: 'object',
      required: ['repo_root'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
        options: {
          type: 'object',
          properties: {
            update_readme: {
              type: 'boolean',
              default: true,
              description: 'Update README.md formatting',
            },
            update_api_docs: {
              type: 'boolean',
              default: true,
              description: 'Update API documentation',
            },
            dry_run: {
              type: 'boolean',
              default: false,
              description: 'Show what would be changed without making changes',
            },
          },
        },
      },
    },
  };
}

export async function handleSyncDocs(
  args: {
    repo_root: string;
    options?: {
      update_readme?: boolean;
      update_api_docs?: boolean;
      dry_run?: boolean;
    };
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  files_updated: string[];
  files_created: string[];
  changes: Array<{
    file: string;
    change_type: 'created' | 'updated' | 'deleted';
    description: string;
  }>;
}> {
  const changes: Array<{ file: string; change_type: 'created' | 'updated' | 'deleted'; description: string }> = [];
  const filesUpdated: string[] = [];
  const filesCreated: string[] = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    const dryRun = args.options?.dry_run || false;

    // Read PHASES.md using absolute path (handles paths with spaces)
    const repoName = repoPath.split('/').pop() || 'unknown';
    const repoHandler = new RepoHandler();
    const projectPhases = repoHandler.readPhasesIndexFromPath(repoPath);

    if (!projectPhases) {
      return {
        success: false,
        files_updated: [],
        files_created: [],
        changes: [{ file: 'PHASES.md', change_type: 'created', description: 'PHASES.md not found - would be created' }],
      };
    }

    // Check and fix PHASES.md formatting
    const phasesPath = join(repoPath, 'PHASES.md');
    let phasesContent = FSUtils.readFile(phasesPath);
    const phasesChanges = ensurePhasesFormatting(phasesContent);

    if (phasesChanges.needsUpdate) {
      if (!dryRun) {
        FSUtils.writeFile(phasesPath, phasesChanges.updatedContent);
        filesUpdated.push(phasesPath);
      }
      changes.push({
        file: 'PHASES.md',
        change_type: 'updated',
        description: phasesChanges.description,
      });
    }

    // Check and fix each PHASE-XX.md file
    for (const phase of projectPhases.phases) {
      const phaseId = phase.id.padStart(2, '0');
      const phaseFilePath = join(repoPath, `PHASE-${phaseId}.md`);

      if (FSUtils.fileExists(phaseFilePath)) {
        let phaseContent = FSUtils.readFile(phaseFilePath);
        const phaseChanges = ensurePhaseFileFormatting(phaseContent, phase);

        if (phaseChanges.needsUpdate) {
          if (!dryRun) {
            FSUtils.writeFile(phaseFilePath, phaseChanges.updatedContent);
            filesUpdated.push(phaseFilePath);
          }
          changes.push({
            file: `PHASE-${phaseId}.md`,
            change_type: 'updated',
            description: phaseChanges.description,
          });
        }
      } else {
        // Phase file missing - would create it
        if (!dryRun) {
          const newPhaseContent = generatePhaseFileContent(phase);
          FSUtils.writeFile(phaseFilePath, newPhaseContent);
          filesCreated.push(phaseFilePath);
        }
        changes.push({
          file: `PHASE-${phaseId}.md`,
          change_type: 'created',
          description: 'Phase file missing - would be created',
        });
      }
    }

    return {
      success: true,
      files_updated: filesUpdated,
      files_created: filesCreated,
      changes,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      files_updated: [],
      files_created: [],
      changes: [{ file: 'unknown', change_type: 'updated', description: `Error: ${errorMessage}` }],
    };
  }
}

function ensurePhasesFormatting(content: string): { needsUpdate: boolean; updatedContent: string; description: string } {
  let updated = content;
  let needsUpdate = false;
  const descriptions: string[] = [];

  // Ensure consistent heading style
  if (!content.match(/^# Project Phases:/m)) {
    updated = updated.replace(/^# .+$/m, '# Project Phases: {project_name}');
    needsUpdate = true;
    descriptions.push('Fixed main heading');
  }

  // Ensure Metadata section exists
  if (!content.match(/## Metadata/m)) {
    const metadata = '\n## Metadata\n\n- **Created**: {timestamp}\n- **Updated**: {timestamp}\n- **Total Phases**: {count}\n';
    updated = updated.replace(/^## Phases/m, metadata + '\n## Phases');
    needsUpdate = true;
    descriptions.push('Added Metadata section');
  }

  return {
    needsUpdate,
    updatedContent: updated,
    description: descriptions.join('; ') || 'No changes needed',
  };
}

function ensurePhaseFileFormatting(content: string, phase: any): { needsUpdate: boolean; updatedContent: string; description: string } {
  let updated = content;
  let needsUpdate = false;
  const descriptions: string[] = [];

  // Ensure required sections exist
  const requiredSections = ['Description', 'Deliverables', 'Done Criteria', 'Progress'];
  
  for (const section of requiredSections) {
    if (!content.match(new RegExp(`## ${section}`, 'm'))) {
      const sectionContent = getDefaultSectionContent(section, phase);
      // Insert before "---" or at end
      const insertPoint = updated.lastIndexOf('---');
      if (insertPoint > 0) {
        updated = updated.slice(0, insertPoint) + sectionContent + '\n' + updated.slice(insertPoint);
      } else {
        updated += '\n' + sectionContent;
      }
      needsUpdate = true;
      descriptions.push(`Added ${section} section`);
    }
  }

  // Ensure consistent heading format
  if (!content.match(/^# Phase \d+:/m)) {
    const phaseId = phase.id.padStart(2, '0');
    updated = updated.replace(/^# .+$/m, `# Phase ${phaseId}: ${phase.name}`);
    needsUpdate = true;
    descriptions.push('Fixed phase heading');
  }

  return {
    needsUpdate,
    updatedContent: updated,
    description: descriptions.join('; ') || 'No changes needed',
  };
}

function getDefaultSectionContent(section: string, phase: any): string {
  switch (section) {
    case 'Deliverables':
      return `## Deliverables\n\n${phase.deliverables?.map((d: string) => `- [ ] ${d}`).join('\n') || '- No deliverables defined'}\n`;
    case 'Done Criteria':
      return `## Done Criteria\n\n${phase.done_criteria?.map((c: string) => `- [ ] ${c}`).join('\n') || '- No done criteria defined'}\n`;
    case 'Progress':
      return `## Progress\n\n- [ ] Phase started\n- [ ] Deliverables completed\n- [ ] Done criteria met\n- [ ] Phase completed\n`;
    default:
      return `## ${section}\n\n*Section content*\n`;
  }
}

function generatePhaseFileContent(phase: any): string {
  const now = new Date().toISOString();
  const phaseId = phase.id.padStart(2, '0');

  return `# Phase ${phaseId}: ${phase.name}

**Project**: {project_name}
**Phase ID**: ${phaseId}
**Status**: ${phase.status || 'pending'}
**Created**: ${now}

---

## Description

${phase.description || 'No description provided'}

## Deliverables

${phase.deliverables?.map((d: string) => `- [ ] ${d}`).join('\n') || '- No deliverables defined'}

## Done Criteria

${phase.done_criteria?.map((c: string) => `- [ ] ${c}`).join('\n') || '- No done criteria defined'}

## Progress

- [ ] Phase started
- [ ] Deliverables completed
- [ ] Done criteria met
- [ ] Phase completed

---

*This phase file is managed by Overseer MCP.*
`;
}
