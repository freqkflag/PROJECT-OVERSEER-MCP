/*
 * Stub implementation of the overseer.run_phase tool.
 *
 * This function reads the requested phase ID and returns a placeholder
 * response.  In later phases it will parse phase files, inspect the repo
 * and update checklists accordingly.
 */
export interface RunPhaseInput {
  repo_root: string;
  phase_id: number;
  aggression_level?: 'normal' | 'bossmode';
}

export type PhaseStatus = 'in_progress' | 'potentially_complete' | 'blocked';

export interface RunPhaseOutput {
  repo_root: string;
  phase_id: number;
  status: PhaseStatus;
  completed_tasks: string[];
  pending_tasks: string[];
  changed_files: string[];
  notes?: string[];
}

export async function runPhase(args: RunPhaseInput): Promise<RunPhaseOutput> {
  console.log('run_phase called with:', args);
  // TODO: implement logic to read PHASE files and generate missing work
  return {
    repo_root: args.repo_root,
    phase_id: args.phase_id,
    status: 'in_progress',
    completed_tasks: [],
    pending_tasks: [],
    changed_files: [],
    notes: ['run_phase not implemented yet']
  };
}