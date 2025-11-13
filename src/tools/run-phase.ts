import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { RepoHandler } from '../core/repo.js';
import { FSUtils } from '../core/fsUtils.js';
import { join, dirname } from 'path';
import { homedir } from 'os';

export function createRunPhaseTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.run_phase',
    description: 'Execute a specific phase of a project. Reads tasks from PHASE-XX.md, checks completion status, and creates TODOs/stubs for incomplete tasks.',
    inputSchema: {
      type: 'object',
      required: ['repo_root', 'phase_id'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
        phase_id: {
          type: 'string',
          description: 'Phase ID (e.g., "01", "02")',
        },
        aggression_level: {
          type: 'string',
          enum: ['bossmode', 'normal', 'conservative'],
          default: 'normal',
          description: 'How aggressively to create files and make changes',
        },
      },
    },
  };
}

export async function handleRunPhase(
  args: {
    repo_root: string;
    phase_id: string;
    aggression_level?: 'bossmode' | 'normal' | 'conservative';
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  message: string;
  phase_id: string;
  completed_tasks: Array<{
    task: string;
    type: 'deliverable' | 'done_criterion';
    evidence: string;
  }>;
  pending_tasks: Array<{
    task: string;
    type: 'deliverable' | 'done_criterion';
    action_taken: string;
  }>;
  changed_files: string[];
  status: 'in_progress' | 'potentially_complete';
}> {
  const completedTasks: Array<{ task: string; type: 'deliverable' | 'done_criterion'; evidence: string }> = [];
  const pendingTasks: Array<{ task: string; type: 'deliverable' | 'done_criterion'; action_taken: string }> = [];
  const changedFiles: string[] = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    const phaseId = args.phase_id.padStart(2, '0');
    const aggressionLevel = args.aggression_level || 'normal';

    // Read PHASES.md using absolute path (handles paths with spaces)
    const repoName = repoPath.split('/').pop() || 'unknown';
    const repoHandler = new RepoHandler();
    const projectPhases = repoHandler.readPhasesIndexFromPath(repoPath);

    if (!projectPhases) {
      return {
        success: false,
        message: 'Project not found. Run plan_project first.',
        phase_id: phaseId,
        completed_tasks: [],
        pending_tasks: [],
        changed_files: [],
        status: 'in_progress',
      };
    }

    // Find the phase
    const phase = projectPhases.phases.find(p => p.id === phaseId);
    if (!phase) {
      return {
        success: false,
        message: `Phase ${phaseId} not found`,
        phase_id: phaseId,
        completed_tasks: [],
        pending_tasks: [],
        changed_files: [],
        status: 'in_progress',
      };
    }

    // Read PHASE-XX.md (handles paths with spaces)
    const phaseFilePath = repoHandler.getPhaseFileByIdFromPath(repoPath, phaseId);
    if (!FSUtils.fileExists(phaseFilePath)) {
      return {
        success: false,
        message: `Phase file PHASE-${phaseId}.md not found`,
        phase_id: phaseId,
        completed_tasks: [],
        pending_tasks: [],
        changed_files: [],
        status: 'in_progress',
      };
    }

    let phaseContent = FSUtils.readFile(phaseFilePath);

    // Parse deliverables and done_criteria from phase file
    const deliverables: string[] = [];
    const doneCriteria: string[] = [];

    // Extract deliverables
    const deliverablesMatch = phaseContent.match(/## Deliverables\s*\n((?:- \[[ x]\] .+\n?)+)/);
    if (deliverablesMatch) {
      const items = deliverablesMatch[1].match(/- \[[ x]\] (.+)/g);
      if (items) {
        items.forEach(item => {
          const text = item.replace(/- \[[ x]\] /, '').trim();
          if (text) deliverables.push(text);
        });
      }
    }

    // Extract done criteria
    const doneCriteriaMatch = phaseContent.match(/## Done Criteria\s*\n((?:- \[[ x]\] .+\n?)+)/);
    if (doneCriteriaMatch) {
      const items = doneCriteriaMatch[1].match(/- \[[ x]\] (.+)/g);
      if (items) {
        items.forEach(item => {
          const text = item.replace(/- \[[ x]\] /, '').trim();
          if (text) doneCriteria.push(text);
        });
      }
    }

    // Check each deliverable
    for (const deliverable of deliverables) {
      const checked = checkTaskCompletion(deliverable, repoPath, aggressionLevel);
      
      if (checked.completed) {
        completedTasks.push({
          task: deliverable,
          type: 'deliverable',
          evidence: checked.evidence,
        });
        // Update checklist in phase file
        phaseContent = updateChecklistItem(phaseContent, deliverable, true, 'Deliverables');
      } else {
        pendingTasks.push({
          task: deliverable,
          type: 'deliverable',
          action_taken: checked.actionTaken,
        });
        // Create stub/TODO if aggression level allows
        if (aggressionLevel !== 'conservative' && checked.filePath) {
          createStubFile(checked.filePath, deliverable, aggressionLevel);
          changedFiles.push(checked.filePath);
        }
        // Update checklist in phase file
        phaseContent = updateChecklistItem(phaseContent, deliverable, false, 'Deliverables');
      }
    }

    // Check each done criterion
    for (const criterion of doneCriteria) {
      const checked = checkTaskCompletion(criterion, repoPath, aggressionLevel);
      
      if (checked.completed) {
        completedTasks.push({
          task: criterion,
          type: 'done_criterion',
          evidence: checked.evidence,
        });
        phaseContent = updateChecklistItem(phaseContent, criterion, true, 'Done Criteria');
      } else {
        pendingTasks.push({
          task: criterion,
          type: 'done_criterion',
          action_taken: checked.actionTaken,
        });
        phaseContent = updateChecklistItem(phaseContent, criterion, false, 'Done Criteria');
      }
    }

    // Update phase status to in_progress if not already
    if (phase.status === 'pending') {
      phase.status = 'in_progress';
      phase.started_at = new Date().toISOString();
      repoHandler.writePhasesIndexToPath(repoPath, projectPhases);
      changedFiles.push(join(repoPath, 'PHASES.md'));
    }

    // Update phase file
    phaseContent = updatePhaseStatus(phaseContent, 'in_progress');
    FSUtils.writeFile(phaseFilePath, phaseContent);
    changedFiles.push(phaseFilePath);

    // Determine overall status
    const allComplete = completedTasks.length === deliverables.length + doneCriteria.length;
    const status = allComplete ? 'potentially_complete' : 'in_progress';

    return {
      success: true,
      message: `Phase ${phaseId} execution completed. ${completedTasks.length} tasks complete, ${pendingTasks.length} pending.`,
      phase_id: phaseId,
      completed_tasks: completedTasks,
      pending_tasks: pendingTasks,
      changed_files: changedFiles,
      status,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to run phase: ${errorMessage}`,
      phase_id: args.phase_id,
      completed_tasks: [],
      pending_tasks: [],
      changed_files: [],
      status: 'in_progress',
    };
  }
}

function checkTaskCompletion(
  task: string,
  repoPath: string,
  aggressionLevel: string
): { completed: boolean; evidence: string; actionTaken: string; filePath?: string } {
  // Check for file references (e.g., "README.md", "src/file.ts")
  const filePattern = /([a-zA-Z0-9_\-./]+\.(md|ts|js|json|yml|yaml|txt|py|java|go|rs|php|rb|ex|exs))/g;
  const fileMatches = task.match(filePattern);

  if (fileMatches) {
    for (const fileRef of fileMatches) {
      const filePath = join(repoPath, fileRef);
      if (FSUtils.fileExists(filePath)) {
        return {
          completed: true,
          evidence: `File exists: ${fileRef}`,
          actionTaken: 'none',
          filePath,
        };
      } else {
        // File doesn't exist - determine if we should create it
        return {
          completed: false,
          evidence: '',
          actionTaken: `File ${fileRef} not found. ${aggressionLevel === 'bossmode' ? 'Will create stub.' : 'Needs to be created.'}`,
          filePath,
        };
      }
    }
  }

  // Check for directory references
  const dirPattern = /(src|app|lib|tests|docs|config|dist|build)\//;
  if (dirPattern.test(task)) {
    const dirMatch = task.match(dirPattern);
    if (dirMatch) {
      const dirPath = join(repoPath, dirMatch[1]);
      if (FSUtils.dirExists(dirPath)) {
        return {
          completed: true,
          evidence: `Directory exists: ${dirMatch[1]}/`,
          actionTaken: 'none',
        };
      } else {
        return {
          completed: false,
          evidence: '',
          actionTaken: `Directory ${dirMatch[1]}/ not found. ${aggressionLevel === 'bossmode' ? 'Will create.' : 'Needs to be created.'}`,
        };
      }
    }
  }

  // Generic task - assume incomplete if we can't verify
  return {
    completed: false,
    evidence: '',
    actionTaken: 'Task needs manual verification',
  };
}

function updateChecklistItem(
  content: string,
  item: string,
  checked: boolean,
  section: 'Deliverables' | 'Done Criteria'
): string {
  const checkbox = checked ? '[x]' : '[ ]';
  const sectionRegex = new RegExp(`(## ${section}\\s*\\n)((?:- \\[[ x]\\] .+\\n?)+)`, 'm');
  
  return content.replace(sectionRegex, (match, header, items) => {
    const updatedItems = items.replace(
      new RegExp(`- \\[[ x]\\] ${escapeRegex(item)}`, 'g'),
      `- ${checkbox} ${item}`
    );
    return header + updatedItems;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function updatePhaseStatus(content: string, status: string): string {
  return content.replace(/\*\*Status\*\*:\s*\w+/, `**Status**: ${status}`);
}

function createStubFile(filePath: string, deliverable: string, aggressionLevel: string): void {
  if (FSUtils.fileExists(filePath)) {
    return; // Don't overwrite existing files
  }

  FSUtils.ensureDir(dirname(filePath));
  
  const ext = filePath.split('.').pop()?.toLowerCase();
  let content = '';

  if (ext === 'md') {
    content = `# ${deliverable}\n\nTODO: Implement ${deliverable}\n\n*This file was created by Overseer MCP as part of phase execution.*\n`;
  } else if (ext === 'ts' || ext === 'js') {
    content = `// TODO: Implement ${deliverable}\n// This file was created by Overseer MCP as part of phase execution.\n\nexport {};\n`;
  } else if (ext === 'json') {
    content = `{\n  "// TODO": "Implement ${deliverable}",\n  "created_by": "Overseer MCP"\n}\n`;
  } else {
    content = `TODO: Implement ${deliverable}\n\nThis file was created by Overseer MCP as part of phase execution.\n`;
  }

  FSUtils.writeFile(filePath, content);
}
