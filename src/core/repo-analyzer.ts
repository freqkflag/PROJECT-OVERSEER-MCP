import { FSUtils } from './fsUtils.js';
import { join } from 'path';

export interface DetectedPattern {
  type: 'framework' | 'infrastructure' | 'language' | 'structure';
  name: string;
  confidence: number;
  evidence: string[];
}

export interface PhaseSuggestion {
  id: string;
  name: string;
  description: string;
  deliverables: string[];
  done_criteria: string[];
  confidence: number;
  reason: string;
  detected_patterns: string[];
}

export class RepoAnalyzer {
  /**
   * Analyzes repository structure to detect patterns and suggest phases
   */
  static analyzeRepo(repoPath: string, options?: {
    detect_frameworks?: boolean;
    detect_infrastructure?: boolean;
  }): {
    patterns: DetectedPattern[];
    suggested_phases: PhaseSuggestion[];
  } {
    const patterns: DetectedPattern[] = [];
    const suggestedPhases: PhaseSuggestion[] = [];

    if (!FSUtils.dirExists(repoPath)) {
      return { patterns, suggested_phases: suggestedPhases };
    }

    const files = FSUtils.listFiles(repoPath);
    const allFiles = this.scanDirectory(repoPath);

    // Detect frameworks
    if (options?.detect_frameworks !== false) {
      patterns.push(...this.detectFrameworks(repoPath, files, allFiles));
    }

    // Detect infrastructure
    if (options?.detect_infrastructure !== false) {
      patterns.push(...this.detectInfrastructure(repoPath, files, allFiles));
    }

    // Detect languages
    patterns.push(...this.detectLanguages(repoPath, allFiles));

    // Detect structure
    patterns.push(...this.detectStructure(repoPath, files));

    // Generate phase suggestions based on patterns
    suggestedPhases.push(...this.generatePhaseSuggestions(patterns, repoPath, allFiles));

    return { patterns, suggested_phases: suggestedPhases };
  }

  private static scanDirectory(dirPath: string, maxDepth: number = 3, currentDepth: number = 0): string[] {
    if (currentDepth >= maxDepth) {
      return [];
    }

    const files: string[] = [];
    const entries = FSUtils.listFiles(dirPath);

    for (const entry of entries) {
      const fullPath = join(dirPath, entry);
      if (FSUtils.dirExists(fullPath)) {
        // Skip common ignore directories
        if (['node_modules', '.git', 'dist', 'build', '.next', '.venv'].includes(entry)) {
          continue;
        }
        files.push(...this.scanDirectory(fullPath, maxDepth, currentDepth + 1));
      } else {
        files.push(fullPath);
      }
    }

    return files;
  }

  private static detectFrameworks(repoPath: string, files: string[], allFiles: string[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const evidence: Record<string, string[]> = {};

    // Phoenix/Elixir
    if (files.includes('mix.exs') || allFiles.some(f => f.includes('mix.exs'))) {
      evidence['phoenix'] = ['mix.exs'];
      if (allFiles.some(f => f.includes('phoenix'))) {
        evidence['phoenix'].push('phoenix dependency');
      }
    }

    // Next.js
    if (files.includes('next.config.js') || files.includes('next.config.ts')) {
      evidence['nextjs'] = ['next.config.*'];
    }
    if (files.includes('package.json')) {
      try {
        const pkgContent = FSUtils.readFile(join(repoPath, 'package.json'));
        const pkg = JSON.parse(pkgContent);
        if (pkg.dependencies?.next || pkg.devDependencies?.next) {
          evidence['nextjs'] = evidence['nextjs'] || [];
          evidence['nextjs'].push('next in package.json');
        }
      } catch {
        // Ignore parse errors
      }
    }

    // WordPress
    if (files.includes('wp-config.php') || allFiles.some(f => f.includes('wp-content'))) {
      evidence['wordpress'] = ['wp-config.php or wp-content'];
    }

    // React
    if (files.includes('package.json')) {
      try {
        const pkgContent = FSUtils.readFile(join(repoPath, 'package.json'));
        const pkg = JSON.parse(pkgContent);
        if (pkg.dependencies?.react || pkg.devDependencies?.react) {
          evidence['react'] = ['react in package.json'];
        }
      } catch {
        // Ignore
      }
    }

    // Node.js
    if (files.includes('package.json')) {
      evidence['nodejs'] = ['package.json'];
    }

    // Python
    if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('setup.py')) {
      evidence['python'] = ['Python project files'];
    }

    // Django
    if (allFiles.some(f => f.includes('manage.py')) || allFiles.some(f => f.includes('settings.py'))) {
      evidence['django'] = ['Django project structure'];
    }

    for (const [framework, ev] of Object.entries(evidence)) {
      patterns.push({
        type: 'framework',
        name: framework,
        confidence: ev.length > 1 ? 0.9 : 0.7,
        evidence: ev,
      });
    }

    return patterns;
  }

  private static detectInfrastructure(repoPath: string, files: string[], allFiles: string[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Docker
    if (files.includes('Dockerfile') || files.includes('docker-compose.yml') || files.includes('docker-compose.yaml')) {
      patterns.push({
        type: 'infrastructure',
        name: 'docker',
        confidence: 0.95,
        evidence: ['Dockerfile or docker-compose.yml'],
      });
    }

    // Kubernetes
    if (allFiles.some(f => f.includes('k8s') || f.includes('kubernetes')) || files.some(f => f.includes('.yaml') && FSUtils.readFile(join(repoPath, f)).includes('kind: Deployment'))) {
      patterns.push({
        type: 'infrastructure',
        name: 'kubernetes',
        confidence: 0.8,
        evidence: ['Kubernetes manifests'],
      });
    }

    // Terraform
    if (allFiles.some(f => f.endsWith('.tf')) || files.includes('terraform.tfvars')) {
      patterns.push({
        type: 'infrastructure',
        name: 'terraform',
        confidence: 0.9,
        evidence: ['.tf files'],
      });
    }

    // AWS
    if (files.includes('serverless.yml') || files.includes('serverless.yaml') || allFiles.some(f => f.includes('aws'))) {
      patterns.push({
        type: 'infrastructure',
        name: 'aws',
        confidence: 0.7,
        evidence: ['AWS-related files'],
      });
    }

    return patterns;
  }

  private static detectLanguages(repoPath: string, allFiles: string[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const extensions = new Map<string, number>();

    for (const file of allFiles) {
      const ext = file.split('.').pop()?.toLowerCase();
      if (ext) {
        extensions.set(ext, (extensions.get(ext) || 0) + 1);
      }
    }

    const langMap: Record<string, string[]> = {
      typescript: ['ts', 'tsx'],
      javascript: ['js', 'jsx'],
      python: ['py'],
      java: ['java'],
      go: ['go'],
      rust: ['rs'],
      php: ['php'],
      ruby: ['rb'],
      elixir: ['ex', 'exs'],
    };

    for (const [lang, exts] of Object.entries(langMap)) {
      const count = exts.reduce((sum, ext) => sum + (extensions.get(ext) || 0), 0);
      if (count > 0) {
        patterns.push({
          type: 'language',
          name: lang,
          confidence: Math.min(0.9, 0.5 + (count / 100)),
          evidence: [`${count} ${lang} files`],
        });
      }
    }

    return patterns;
  }

  private static detectStructure(repoPath: string, files: string[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Source directory
    if (files.includes('src') || files.includes('app') || files.includes('lib')) {
      patterns.push({
        type: 'structure',
        name: 'source_code',
        confidence: 0.9,
        evidence: ['src/, app/, or lib/ directory'],
      });
    }

    // Tests
    if (files.includes('tests') || files.includes('test') || files.includes('__tests__') || files.includes('spec')) {
      patterns.push({
        type: 'structure',
        name: 'testing',
        confidence: 0.85,
        evidence: ['test directory'],
      });
    }

    // Documentation
    if (files.includes('docs') || files.includes('documentation')) {
      patterns.push({
        type: 'structure',
        name: 'documentation',
        confidence: 0.8,
        evidence: ['docs/ directory'],
      });
    }

    return patterns;
  }

  private static generatePhaseSuggestions(
    patterns: DetectedPattern[],
    repoPath: string,
    allFiles: string[]
  ): PhaseSuggestion[] {
    const suggestions: PhaseSuggestion[] = [];
    const frameworkNames = patterns.filter(p => p.type === 'framework').map(p => p.name);
    const hasInfra = patterns.some(p => p.type === 'infrastructure');
    const hasTests = patterns.some(p => p.name === 'testing');
    const hasDocs = patterns.some(p => p.name === 'documentation');

    // Foundation phase (always suggested)
    suggestions.push({
      id: '01',
      name: 'foundation',
      description: 'Project foundation, setup, and initial structure',
      deliverables: [
        'Project structure established',
        'Development environment configured',
        'Initial configuration files',
        'README.md',
      ],
      done_criteria: [
        'Project structure is in place',
        'Development environment is set up',
        'Basic configuration files exist',
        'README.md is created',
      ],
      confidence: 1.0,
      reason: 'Foundation phase is standard for all projects',
      detected_patterns: [],
    });

    // Core features phase
    if (patterns.some(p => p.type === 'structure' && p.name === 'source_code')) {
      suggestions.push({
        id: '02',
        name: 'core_features',
        description: 'Core feature development and implementation',
        deliverables: [
          'Core functionality implemented',
          'Source code in src/ or app/',
          'Basic features working',
        ],
        done_criteria: [
          'Core features are implemented',
          'Source code is organized',
          'Basic functionality works',
        ],
        confidence: 0.9,
        reason: 'Source code structure detected',
        detected_patterns: ['source_code'],
      });
    }

    // Testing phase
    if (hasTests) {
      suggestions.push({
        id: '03',
        name: 'testing',
        description: 'Comprehensive testing and validation',
        deliverables: [
          'Test suite implemented',
          'Test coverage report',
          'Integration tests',
        ],
        done_criteria: [
          'Test suite passes',
          'Test coverage meets requirements',
          'Integration tests are working',
        ],
        confidence: 0.9,
        reason: 'Test directory structure detected',
        detected_patterns: ['testing'],
      });
    } else {
      // Suggest testing even if not detected
      suggestions.push({
        id: '03',
        name: 'testing',
        description: 'Comprehensive testing and validation',
        deliverables: [
          'Test suite implemented',
          'Test coverage report',
        ],
        done_criteria: [
          'Test suite passes',
          'Test coverage meets requirements',
        ],
        confidence: 0.7,
        reason: 'Testing is recommended for all projects',
        detected_patterns: [],
      });
    }

    // Infrastructure phase
    if (hasInfra) {
      suggestions.push({
        id: '04',
        name: 'infrastructure',
        description: 'Infrastructure setup and deployment configuration',
        deliverables: [
          'Docker configuration (if applicable)',
          'Kubernetes manifests (if applicable)',
          'Terraform configs (if applicable)',
          'CI/CD pipeline',
        ],
        done_criteria: [
          'Infrastructure is configured',
          'Deployment scripts are ready',
          'CI/CD pipeline is set up',
        ],
        confidence: 0.85,
        reason: 'Infrastructure files detected',
        detected_patterns: patterns.filter(p => p.type === 'infrastructure').map(p => p.name),
      });
    }

    // Documentation phase
    if (hasDocs) {
      suggestions.push({
        id: '05',
        name: 'documentation',
        description: 'Create and maintain project documentation',
        deliverables: [
          'API documentation',
          'User guides',
          'Architecture documentation',
        ],
        done_criteria: [
          'Documentation is complete',
          'API docs are up to date',
          'User guides are written',
        ],
        confidence: 0.8,
        reason: 'Documentation directory detected',
        detected_patterns: ['documentation'],
      });
    } else {
      // Suggest documentation even if not detected
      suggestions.push({
        id: '05',
        name: 'documentation',
        description: 'Create and maintain project documentation',
        deliverables: [
          'README.md updated',
          'API documentation',
        ],
        done_criteria: [
          'Documentation is complete',
          'README.md is comprehensive',
        ],
        confidence: 0.7,
        reason: 'Documentation is recommended for all projects',
        detected_patterns: [],
      });
    }

    // Integration phase (if framework detected)
    if (frameworkNames.length > 0) {
      suggestions.push({
        id: '06',
        name: 'integrations',
        description: `Integrations with ${frameworkNames.join(', ')} and external services`,
        deliverables: [
          'Framework integration complete',
          'External service integrations',
          'API integrations',
        ],
        done_criteria: [
          'Framework is properly integrated',
          'External services are connected',
          'APIs are integrated',
        ],
        confidence: 0.8,
        reason: `Framework detected: ${frameworkNames.join(', ')}`,
        detected_patterns: frameworkNames,
      });
    }

    return suggestions;
  }
}

