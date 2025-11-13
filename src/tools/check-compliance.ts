import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from '../core/phase-manager.js';
import { ConfigLoader } from '../core/config.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createCheckComplianceTool(phaseManager: PhaseManager): Tool {
  return {
    name: 'overseer.check_compliance',
    description: 'Validates repository structure against sentinel.yml conventions. Checks for expected directories and key files.',
    inputSchema: {
      type: 'object',
      required: ['repo_root'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository',
        },
        phase_id: {
          type: 'string',
          description: 'Optional: Specific phase ID to check',
        },
        strict: {
          type: 'boolean',
          default: false,
          description: 'If true, all checks must pass. If false, warns about missing items.',
        },
      },
    },
  };
}

export async function handleCheckCompliance(
  args: {
    repo_root: string;
    phase_id?: string;
    strict?: boolean;
  },
  phaseManager: PhaseManager
): Promise<{
  success: boolean;
  compliant: boolean;
  phase_id?: string;
  checks: Array<{
    check_type: 'directory' | 'file' | 'convention' | 'phase_structure';
    passed: boolean;
    message: string;
    details?: Record<string, unknown>;
  }>;
  summary: {
    total_checks: number;
    passed: number;
    failed: number;
  };
}> {
  const checks: Array<{
    check_type: 'directory' | 'file' | 'convention' | 'phase_structure';
    passed: boolean;
    message: string;
    details?: Record<string, unknown>;
  }> = [];

  try {
    // Resolve repo path
    let repoPath = args.repo_root;
    if (!repoPath.startsWith('/')) {
      repoPath = join(homedir(), 'dev', repoPath);
    }
    repoPath = FSUtils.expandPath(repoPath);

    if (!FSUtils.dirExists(repoPath)) {
      return {
        success: false,
        compliant: false,
        checks: [{
          check_type: 'directory',
          passed: false,
          message: 'Repository directory does not exist',
        }],
        summary: {
          total_checks: 1,
          passed: 0,
          failed: 1,
        },
      };
    }

    // Load config to get conventions
    const configLoader = new ConfigLoader();
    const config = configLoader.getConfig();
    const conventions = config.conventions;

    // Check PHASES.md exists
    const phasesPath = join(repoPath, conventions.phases_index.file);
    if (FSUtils.fileExists(phasesPath)) {
      checks.push({
        check_type: 'file',
        passed: true,
        message: `${conventions.phases_index.file} exists`,
      });
    } else {
      checks.push({
        check_type: 'file',
        passed: false,
        message: `${conventions.phases_index.file} is missing`,
      });
    }

    // Check for common expected directories based on conventions
    const expectedDirs = ['src', 'config', 'docs'];
    for (const dir of expectedDirs) {
      const dirPath = join(repoPath, dir);
      if (FSUtils.dirExists(dirPath)) {
        checks.push({
          check_type: 'directory',
          passed: true,
          message: `${dir}/ directory exists`,
        });
      } else {
        checks.push({
          check_type: 'directory',
          passed: false,
          message: `${dir}/ directory is missing`,
        });
      }
    }

    // Check for key files
    const keyFiles = ['README.md', 'package.json', '.gitignore'];
    for (const file of keyFiles) {
      const filePath = join(repoPath, file);
      if (FSUtils.fileExists(filePath)) {
        checks.push({
          check_type: 'file',
          passed: true,
          message: `${file} exists`,
        });
      } else {
        checks.push({
          check_type: 'file',
          passed: false,
          message: `${file} is missing`,
        });
      }
    }

    // If phase_id provided, check phase-specific structure
    if (args.phase_id) {
      const phaseId = args.phase_id.padStart(2, '0');
      const phaseFilePath = join(repoPath, `PHASE-${phaseId}.md`);
      
      if (FSUtils.fileExists(phaseFilePath)) {
        const phaseContent = FSUtils.readFile(phaseFilePath);
        
        // Check for required sections
        const requiredSections = ['Description', 'Deliverables', 'Done Criteria', 'Progress'];
        for (const section of requiredSections) {
          if (phaseContent.includes(`## ${section}`)) {
            checks.push({
              check_type: 'phase_structure',
              passed: true,
              message: `PHASE-${phaseId}.md has ${section} section`,
            });
          } else {
            checks.push({
              check_type: 'phase_structure',
              passed: false,
              message: `PHASE-${phaseId}.md missing ${section} section`,
            });
          }
        }
      } else {
        checks.push({
          check_type: 'phase_structure',
          passed: false,
          message: `PHASE-${phaseId}.md file is missing`,
        });
      }
    }

    // Check naming conventions
    const repoName = repoPath.split('/').pop() || '';
    const namingConvention = conventions.naming.phase_names; // Use phase_names as proxy for repo naming
    if (namingConvention === 'kebab-case') {
      const isValidKebabCase = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(repoName);
      checks.push({
        check_type: 'convention',
        passed: isValidKebabCase,
        message: `Repository name follows kebab-case convention`,
        details: { repo_name: repoName, expected_format: 'kebab-case' },
      });
    }

    // Calculate summary
    const passed = checks.filter(c => c.passed).length;
    const failed = checks.filter(c => !c.passed).length;
    const compliant = args.strict ? failed === 0 : true; // In strict mode, all must pass

    return {
      success: true,
      compliant,
      phase_id: args.phase_id,
      checks,
      summary: {
        total_checks: checks.length,
        passed,
        failed,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      compliant: false,
      checks: [{
        check_type: 'convention',
        passed: false,
        message: `Error checking compliance: ${errorMessage}`,
      }],
      summary: {
        total_checks: 1,
        passed: 0,
        failed: 1,
      },
    };
  }
}
