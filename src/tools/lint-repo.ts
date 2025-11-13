import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfigLoader } from '../core/config.js';
import { RepoAnalyzer } from '../core/repo-analyzer.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createLintRepoTool(configLoader: ConfigLoader): Tool {
  return {
    name: 'overseer.lint_repo',
    description: 'Detects languages in the repository and recommends linting commands based on coding standards in sentinel.yml.',
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
            fix: {
              type: 'boolean',
              default: false,
              description: 'Automatically fix issues where possible',
            },
            languages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific languages to lint (default: all detected)',
            },
          },
        },
      },
    },
  };
}

export async function handleLintRepo(
  args: {
    repo_root: string;
    options?: {
      fix?: boolean;
      languages?: string[];
    };
  },
  configLoader: ConfigLoader
): Promise<{
  success: boolean;
  detected_languages: string[];
  recommended_commands: Array<{
    language: string;
    command: string;
    description: string;
    fix_command?: string;
  }>;
  issues: Array<{
    file: string;
    line: number;
    column: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    rule: string;
  }>;
  summary: {
    total_issues: number;
    errors: number;
    warnings: number;
    files_checked: number;
  };
}> {
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
        detected_languages: [],
        recommended_commands: [],
        issues: [],
        summary: {
          total_issues: 0,
          errors: 0,
          warnings: 0,
          files_checked: 0,
        },
      };
    }

    // Analyze repository to detect languages
    const analysis = RepoAnalyzer.analyzeRepo(repoPath, {
      detect_frameworks: true,
      detect_infrastructure: false,
    });

    // Extract detected languages
    const languagePatterns = analysis.patterns.filter(p => p.type === 'language');
    const detectedLanguages = languagePatterns.map(p => p.name);

    // Get coding standards from config
    const config = configLoader.getConfig();
    const codingStandards = config.coding_standards;

    // Generate recommended commands
    const recommendedCommands: Array<{
      language: string;
      command: string;
      description: string;
      fix_command?: string;
    }> = [];

    for (const lang of detectedLanguages) {
      const standards = codingStandards.languages[lang];
      if (standards) {
        const linter = standards.linter;
        const formatter = standards.formatter;

        // Generate lint command
        let lintCommand = '';
        let fixCommand = '';

        if (lang === 'typescript' || lang === 'javascript') {
          if (linter === 'eslint') {
            lintCommand = 'npx eslint . --ext .ts,.tsx,.js,.jsx';
            if (args.options?.fix) {
              fixCommand = 'npx eslint . --ext .ts,.tsx,.js,.jsx --fix';
            }
          }
          if (formatter === 'prettier' && !lintCommand) {
            lintCommand = 'npx prettier --check .';
            if (args.options?.fix && !fixCommand) {
              fixCommand = 'npx prettier --write .';
            }
          }
        } else if (lang === 'python') {
          if (linter === 'pylint') {
            lintCommand = 'pylint **/*.py';
          }
          if (formatter === 'black' && !lintCommand) {
            lintCommand = 'black --check .';
            if (args.options?.fix && !fixCommand) {
              fixCommand = 'black .';
            }
          }
        }

        if (lintCommand) {
          recommendedCommands.push({
            language: lang,
            command: lintCommand,
            description: `Run ${linter || formatter} for ${lang} files`,
            fix_command: fixCommand,
          });
        }
      } else {
        // Default recommendations
        recommendedCommands.push({
          language: lang,
          command: `# No specific linter configured for ${lang}`,
          description: `Add ${lang} linting configuration to sentinel.yml`,
        });
      }
    }

    // For now, return empty issues (actual linting would be implemented later)
    return {
      success: true,
      detected_languages: detectedLanguages,
      recommended_commands: recommendedCommands,
      issues: [],
      summary: {
        total_issues: 0,
        errors: 0,
        warnings: 0,
        files_checked: 0,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      detected_languages: [],
      recommended_commands: [],
      issues: [],
      summary: {
        total_issues: 0,
        errors: 0,
        warnings: 0,
        files_checked: 0,
      },
    };
  }
}
