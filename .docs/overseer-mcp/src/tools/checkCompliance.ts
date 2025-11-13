/*
 * Stub implementation of the overseer.check_compliance tool.
 *
 * Compares the project structure against conventions defined in
 * sentinel.yml and returns violations.  The stub always returns an empty
 * list of violations.
 */
export interface CheckComplianceInput {
  repo_root: string;
}

export interface ComplianceViolation {
  path: string;
  message: string;
}

export interface CheckComplianceOutput {
  violations: ComplianceViolation[];
}

export async function checkCompliance(args: CheckComplianceInput): Promise<CheckComplianceOutput> {
  console.log('check_compliance called with:', args);
  // TODO: parse sentinel.yml and validate structure
  return {
    violations: []
  };
}