/*
 * Stub implementation of the overseer.status tool.
 *
 * Returns a summary of the current project status.  The stub reads no files
 * and returns placeholder data.  Later implementations will parse
 * PHASES.md and phase files to produce accurate information.
 */
export interface StatusInput {
  repo_root: string;
}

export interface PhaseSummary {
  id: number;
  name: string;
  status: string;
}

export interface StatusOutput {
  project_name: string;
  current_phase: number | null;
  phases: PhaseSummary[];
}

export async function status(args: StatusInput): Promise<StatusOutput> {
  console.log('status called with:', args);
  // TODO: implement logic to read PHASES.md and summarise phases
  return {
    project_name: 'unknown',
    current_phase: null,
    phases: []
  };
}