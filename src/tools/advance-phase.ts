import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoHandler } from '../core/repo.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createAdvancePhaseTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.advance_phase',
    description: 'Advance a phase to the next phase after validating all deliverables are complete. Marks current phase as "locked" and sets next phase as current.',
    inputSchema: {
      type: 'object',
      required: ['repo_root', 'expected_current_phase'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
        expected_current_phase: {
          type: 'string',
          description: 'Phase ID that should currently be active (e.g., "01", "02")',
        },
      },
    },
  };
}

export async function handleAdvancePhase(
  args: {
    repo_root: string;
    expected_current_phase: string;
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  message: string;
  status: 'advanced' | 'incomplete';
  current_phase: {
    id: string;
    name: string;
    status: string;
  } | null;
  next_phase: {
    id: string;
    name: string;
    status: string;
  } | null;
  missing_items: Array<{
    type: 'deliverable' | 'done_criterion';
    item: string;
    reason: string;
  }>;
  changes_applied: string[];
}> {
  const missingItems: Array<{ type: 'deliverable' | 'done_criterion'; item: string; reason: string }> = [];
  const changesApplied: string[] = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    const expectedPhaseId = args.expected_current_phase.padStart(2, '0');

    // Read PHASES.md
    const repoName = repoPath.split('/').pop() || 'unknown';
    const repoHandler = new RepoHandler();
    const projectPhases = repoHandler.readPhasesIndex(repoName);

    if (!projectPhases) {
      return {
        success: false,
        message: 'Project not found. Run plan_project first.',
        status: 'incomplete',
        current_phase: null,
        next_phase: null,
        missing_items: [],
        changes_applied: [],
      };
    }

    // Find the expected phase
    const currentPhase = projectPhases.phases.find(p => p.id === expectedPhaseId);
    if (!currentPhase) {
      return {
        success: false,
        message: `Phase ${expectedPhaseId} not found`,
        status: 'incomplete',
        current_phase: null,
        next_phase: null,
        missing_items: [],
        changes_applied: [],
      };
    }

    // Verify this is the current phase
    if (currentPhase.status !== 'in_progress' && currentPhase.status !== 'active') {
      return {
        success: false,
        message: `Phase ${expectedPhaseId} is not currently active (status: ${currentPhase.status})`,
        status: 'incomplete',
        current_phase: {
          id: currentPhase.id,
          name: currentPhase.name,
          status: currentPhase.status,
        },
        next_phase: null,
        missing_items: [],
        changes_applied: [],
      };
    }

    // Read PHASE-XX.md to check deliverables and done criteria
    const phaseFilePath = join(repoPath, `PHASE-${expectedPhaseId}.md`);
    if (!FSUtils.fileExists(phaseFilePath)) {
      return {
        success: false,
        message: `Phase file PHASE-${expectedPhaseId}.md not found`,
        status: 'incomplete',
        current_phase: {
          id: currentPhase.id,
          name: currentPhase.name,
          status: currentPhase.status,
        },
        next_phase: null,
        missing_items: [{ type: 'deliverable', item: 'Phase file', reason: 'PHASE-XX.md file missing' }],
        changes_applied: [],
      };
    }

    const phaseContent = FSUtils.readFile(phaseFilePath);

    // Extract deliverables and check completion
    const deliverablesMatch = phaseContent.match(/## Deliverables\s*\n((?:- \[[ x]\] .+\n?)+)/);
    if (deliverablesMatch) {
      const items = deliverablesMatch[1].match(/- \[([ x])\] (.+)/g);
      if (items) {
        items.forEach(item => {
          const checked = item.startsWith('- [x]');
          const text = item.replace(/- \[[ x]\] /, '').trim();
          if (!checked) {
            missingItems.push({
              type: 'deliverable',
              item: text,
              reason: 'Deliverable not marked as complete in checklist',
            });
          } else {
            // Verify the deliverable actually exists
            const verification = verifyDeliverableExists(text, repoPath);
            if (!verification.exists) {
              missingItems.push({
                type: 'deliverable',
                item: text,
                reason: verification.reason,
              });
            }
          }
        });
      }
    }

    // Extract done criteria and check completion
    const doneCriteriaMatch = phaseContent.match(/## Done Criteria\s*\n((?:- \[[ x]\] .+\n?)+)/);
    if (doneCriteriaMatch) {
      const items = doneCriteriaMatch[1].match(/- \[([ x])\] (.+)/g);
      if (items) {
        items.forEach(item => {
          const checked = item.startsWith('- [x]');
          const text = item.replace(/- \[[ x]\] /, '').trim();
          if (!checked) {
            missingItems.push({
              type: 'done_criterion',
              item: text,
              reason: 'Done criterion not marked as complete in checklist',
            });
          } else {
            // Verify the criterion is actually met
            const verification = verifyCriterionMet(text, repoPath);
            if (!verification.met) {
              missingItems.push({
                type: 'done_criterion',
                item: text,
                reason: verification.reason,
              });
            }
          }
        });
      }
    }

    // If there are missing items, return incomplete
    if (missingItems.length > 0) {
      return {
        success: true,
        message: `Phase ${expectedPhaseId} is incomplete. ${missingItems.length} item(s) missing.`,
        status: 'incomplete',
        current_phase: {
          id: currentPhase.id,
          name: currentPhase.name,
          status: currentPhase.status,
        },
        next_phase: null,
        missing_items: missingItems,
        changes_applied: [],
      };
    }

    // All items complete - advance the phase
    // Mark current phase as "locked" (completed)
    currentPhase.status = 'locked';
    currentPhase.completed_at = new Date().toISOString();
    changesApplied.push(join(repoPath, 'PHASES.md'));

    // Update phase file with completion summary
    const updatedPhaseContent = addCompletionSummary(phaseContent, currentPhase);
    FSUtils.writeFile(phaseFilePath, updatedPhaseContent);
    changesApplied.push(phaseFilePath);

    // Find and activate next phase
    const currentPhaseIndex = projectPhases.phases.findIndex(p => p.id === expectedPhaseId);
    let nextPhase = null;
    
    if (currentPhaseIndex < projectPhases.phases.length - 1) {
      nextPhase = projectPhases.phases[currentPhaseIndex + 1];
      nextPhase.status = 'in_progress';
      nextPhase.started_at = new Date().toISOString();
      changesApplied.push(join(repoPath, 'PHASES.md'));
    }

    // Write updated PHASES.md
    repoHandler.writePhasesIndex(repoName, projectPhases);

    return {
      success: true,
      message: `Phase ${expectedPhaseId} advanced successfully. ${nextPhase ? `Next phase ${nextPhase.id} activated.` : 'No more phases.'}`,
      status: 'advanced',
      current_phase: {
        id: currentPhase.id,
        name: currentPhase.name,
        status: currentPhase.status,
      },
      next_phase: nextPhase ? {
        id: nextPhase.id,
        name: nextPhase.name,
        status: nextPhase.status,
      } : null,
      missing_items: [],
      changes_applied: changesApplied,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to advance phase: ${errorMessage}`,
      status: 'incomplete',
      current_phase: null,
      next_phase: null,
      missing_items: [],
      changes_applied: [],
    };
  }
}

function verifyDeliverableExists(deliverable: string, repoPath: string): { exists: boolean; reason: string } {
  // Check for file references
  const filePattern = /([a-zA-Z0-9_\-./]+\.(md|ts|js|json|yml|yaml|txt|py|java|go|rs|php|rb|ex|exs))/g;
  const fileMatches = deliverable.match(filePattern);

  if (fileMatches) {
    for (const fileRef of fileMatches) {
      const filePath = join(repoPath, fileRef);
      if (!FSUtils.fileExists(filePath)) {
        return {
          exists: false,
          reason: `File ${fileRef} does not exist`,
        };
      }
    }
    return { exists: true, reason: '' };
  }

  // Check for directory references
  const dirPattern = /(src|app|lib|tests|docs|config|dist|build)\//;
  if (dirPattern.test(deliverable)) {
    const dirMatch = deliverable.match(dirPattern);
    if (dirMatch) {
      const dirPath = join(repoPath, dirMatch[1]);
      if (!FSUtils.dirExists(dirPath)) {
        return {
          exists: false,
          reason: `Directory ${dirMatch[1]}/ does not exist`,
        };
      }
    }
    return { exists: true, reason: '' };
  }

  // Generic deliverable - assume exists if we can't verify
  return { exists: true, reason: '' };
}

function verifyCriterionMet(criterion: string, repoPath: string): { met: boolean; reason: string } {
  // For now, we assume if it's checked in the checklist, it's met
  // In the future, we could add more sophisticated verification
  return { met: true, reason: '' };
}

function addCompletionSummary(content: string, phase: any): string {
  const now = new Date().toISOString();
  const summary = `\n## Completion Summary\n\n**Completed**: ${now}\n**Phase**: ${phase.name}\n\nAll deliverables and done criteria have been met. Phase is now locked.\n\n---\n\n`;

  // Insert before the final "---" if it exists, otherwise append
  const lastDashIndex = content.lastIndexOf('---');
  if (lastDashIndex > 0) {
    return content.slice(0, lastDashIndex) + summary + content.slice(lastDashIndex);
  }
  return content + summary;
}
