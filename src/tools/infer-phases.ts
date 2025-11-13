import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConfigLoader } from '../core/config.js';
import { RepoAnalyzer } from '../core/repo-analyzer.js';
import { FSUtils } from '../core/fsUtils.js';
import { join } from 'path';
import { homedir } from 'os';

export function createInferPhasesTool(configLoader: ConfigLoader): Tool {
  return {
    name: 'overseer.infer_phases',
    description: 'Analyzes an existing repository structure to suggest phase definitions based on detected patterns (files, directories, configs).',
    inputSchema: {
      type: 'object',
      required: ['repo_root'],
      properties: {
        repo_root: {
          type: 'string',
          description: 'Root path of the repository (absolute path or relative to ~/dev)',
        },
        options: {
          type: 'object',
          properties: {
            detect_frameworks: {
              type: 'boolean',
              default: true,
              description: 'Detect framework-specific patterns (Phoenix, Next.js, etc.)',
            },
            detect_infrastructure: {
              type: 'boolean',
              default: true,
              description: 'Detect infrastructure files (Docker, Terraform, K8s)',
            },
          },
        },
      },
    },
  };
}

export async function handleInferPhases(
  args: {
    repo_root: string;
    options?: {
      detect_frameworks?: boolean;
      detect_infrastructure?: boolean;
    };
  },
  configLoader: ConfigLoader
): Promise<{
  success: boolean;
  suggested_phases: Array<{
    id: string;
    name: string;
    description: string;
    deliverables: string[];
    done_criteria: string[];
    confidence: number;
    reason: string;
    detected_patterns: string[];
  }>;
  detected_frameworks: string[];
  detected_patterns: Array<{
    type: string;
    name: string;
    confidence: number;
    evidence: string[];
  }>;
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
        suggested_phases: [],
        detected_frameworks: [],
        detected_patterns: [],
      };
    }

    // Analyze repository
    const analysis = RepoAnalyzer.analyzeRepo(repoPath, args.options);

    // Extract framework names
    const frameworkNames = analysis.patterns
      .filter(p => p.type === 'framework')
      .map(p => p.name);

    // Format suggested phases
    const suggestedPhases = analysis.suggested_phases.map(phase => ({
      id: phase.id,
      name: phase.name,
      description: phase.description,
      deliverables: phase.deliverables,
      done_criteria: phase.done_criteria,
      confidence: phase.confidence,
      reason: phase.reason,
      detected_patterns: phase.detected_patterns,
    }));

    return {
      success: true,
      suggested_phases: suggestedPhases,
      detected_frameworks: frameworkNames,
      detected_patterns: analysis.patterns.map(p => ({
        type: p.type,
        name: p.name,
        confidence: p.confidence,
        evidence: p.evidence,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      suggested_phases: [],
      detected_frameworks: [],
      detected_patterns: [],
    };
  }
}
