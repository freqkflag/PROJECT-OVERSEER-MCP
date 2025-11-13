/*
 * Stub implementation of the overseer.lint_repo tool.
 *
 * Detects languages and suggests lint commands.  The stub returns a
 * fixed response.  Later versions will run actual linters and return
 * results.
 */
export interface LintRepoInput {
  repo_root: string;
  file_patterns?: string[];
}

export interface LintIssue {
  file: string;
  line: number;
  message: string;
}

export interface LintRepoOutput {
  issues: LintIssue[];
  recommendations: string[];
}

export async function lintRepo(args: LintRepoInput): Promise<LintRepoOutput> {
  console.log('lint_repo called with:', args);
  // TODO: detect languages and run actual lint tools
  return {
    issues: [],
    recommendations: ['lint_repo not implemented yet']
  };
}