import { ConfigLoader, PhaseTemplate } from './config.js';
import { RepoHandler, ProjectPhases, PhaseInfo } from './repo.js';

export interface PhaseExecutionResult {
  success: boolean;
  message: string;
  phase_name: string;
  artifacts_created?: string[];
  errors?: string[];
}

export class PhaseManager {
  private configLoader: ConfigLoader;
  private repoHandler: RepoHandler;

  constructor(configLoader?: ConfigLoader, repoHandler?: RepoHandler) {
    this.configLoader = configLoader || new ConfigLoader();
    this.repoHandler = repoHandler || new RepoHandler();
  }

  getPhaseTemplate(templateName: string): PhaseTemplate | undefined {
    return this.configLoader.getPhaseTemplate(templateName);
  }

  createPhaseInfo(name: string, template?: PhaseTemplate, id?: string): PhaseInfo {
    return {
      id: id || '01',
      name,
      status: 'pending',
      description: template?.description,
    };
  }

  generatePhaseContent(phaseName: string, template: PhaseTemplate): string {
    const lines: string[] = [];
    const now = new Date().toISOString();
    
    lines.push(`# ${template.name}`);
    lines.push('');
    lines.push(`**Phase**: ${phaseName}`);
    lines.push(`**Status**: pending`);
    lines.push(`**Created**: ${now}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push(template.description);
    lines.push('');
    lines.push('## Steps');
    lines.push('');
    if (template.steps && template.steps.length > 0) {
      template.steps.forEach((step, index) => {
        lines.push(`${index + 1}. [ ] ${step}`);
      });
    } else {
      lines.push('*No steps defined for this phase.*');
    }
    lines.push('');
    lines.push('## Artifacts');
    lines.push('');
    if (template.artifacts && template.artifacts.length > 0) {
      template.artifacts.forEach(artifact => {
        lines.push(`- ${artifact}`);
      });
    } else {
      lines.push('*No artifacts defined for this phase.*');
    }
    lines.push('');
    lines.push('## Progress');
    lines.push('');
    lines.push('- [ ] Phase started');
    lines.push('- [ ] Steps completed');
    lines.push('- [ ] Artifacts created');
    lines.push('- [ ] Phase completed');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*This phase file is managed by Overseer MCP.*');
    lines.push(`*Template: ${phaseName}*`);
    
    return lines.join('\n');
  }

  async planProject(
    repoName: string,
    phaseNames: string[]
  ): Promise<{
    success: boolean;
    message: string;
    phases_created: string[];
    phases_skipped: string[];
    errors: string[];
    repo_path: string;
    files_created: string[];
  }> {
    const errors: string[] = [];
    const phasesCreated: string[] = [];
    const phasesSkipped: string[] = [];
    const filesCreated: string[] = [];

    // Validate input
    if (!repoName || repoName.trim().length === 0) {
      return {
        success: false,
        message: 'Repository name is required',
        phases_created: [],
        phases_skipped: [],
        errors: ['Repository name cannot be empty'],
        repo_path: '',
        files_created: [],
      };
    }

    if (!phaseNames || phaseNames.length === 0) {
      return {
        success: false,
        message: 'At least one phase must be specified',
        phases_created: [],
        phases_skipped: [],
        errors: ['No phases provided'],
        repo_path: '',
        files_created: [],
      };
    }

    // Validate phase names against templates
    const config = this.configLoader.getConfig();
    const availableTemplates = Object.keys(config.phase_templates);
    const invalidPhases: string[] = [];

    for (const phaseName of phaseNames) {
      if (!availableTemplates.includes(phaseName)) {
        invalidPhases.push(phaseName);
      }
    }

    if (invalidPhases.length > 0) {
      errors.push(
        `Invalid phase names: ${invalidPhases.join(', ')}. ` +
        `Available phases: ${availableTemplates.join(', ')}`
      );
    }

    // Ensure repo exists
    try {
      this.repoHandler.ensureRepo(repoName);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to create repository directory: ${errorMsg}`);
      return {
        success: false,
        message: 'Failed to set up repository',
        phases_created: [],
        phases_skipped: [],
        errors,
        repo_path: this.repoHandler.getRepoPath(repoName),
        files_created: [],
      };
    }

    const repoPath = this.repoHandler.getRepoPath(repoName);

    // Read existing phases or create new
    const existingPhases = this.repoHandler.readPhasesIndex(repoName);
    const projectPhases: ProjectPhases = existingPhases || {
      project_name: repoName,
      phases: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const isNewProject = !existingPhases;

    // Process each phase
    for (const phaseName of phaseNames) {
      // Skip invalid phases
      if (invalidPhases.includes(phaseName)) {
        phasesSkipped.push(phaseName);
        continue;
      }

      const template = this.getPhaseTemplate(phaseName);
      if (!template) {
        phasesSkipped.push(phaseName);
        errors.push(`Template not found for phase: ${phaseName}`);
        continue;
      }

      // Check if phase already exists
      const existingPhase = projectPhases.phases.find(p => p.name === phaseName);
      if (existingPhase) {
        phasesSkipped.push(phaseName);
        continue;
      }

      // Create phase info
      const phaseInfo = this.createPhaseInfo(phaseName, template);
      projectPhases.phases.push(phaseInfo);
      phasesCreated.push(phaseName);

      // Generate and write phase file
      try {
        const phaseContent = this.generatePhaseContent(phaseName, template);
        const phaseFilePath = this.repoHandler.getPhaseFilePath(repoName, phaseName);
        this.repoHandler.writePhaseFile(repoName, phaseName, phaseContent);
        filesCreated.push(phaseFilePath);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`Failed to create phase file for ${phaseName}: ${errorMsg}`);
      }
    }

    // Write PHASES.md
    try {
      const phasesIndexPath = this.repoHandler.getPhasesIndexPath(repoName);
      this.repoHandler.writePhasesIndex(repoName, projectPhases);
      filesCreated.push(phasesIndexPath);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Failed to write PHASES.md: ${errorMsg}`);
    }

    // Determine success
    const success = errors.length === 0 && phasesCreated.length > 0;
    const message = isNewProject
      ? `Created new project "${repoName}" with ${phasesCreated.length} phase(s)`
      : `Added ${phasesCreated.length} new phase(s) to project "${repoName}"`;

    return {
      success,
      message,
      phases_created: phasesCreated,
      phases_skipped: phasesSkipped,
      errors,
      repo_path: repoPath,
      files_created: filesCreated,
    };
  }

  async runPhase(
    repoName: string,
    phaseName: string
  ): Promise<PhaseExecutionResult> {
    const phases = this.repoHandler.readPhasesIndex(repoName);
    if (!phases) {
      return {
        success: false,
        message: `Project ${repoName} not found. Run plan_project first.`,
        phase_name: phaseName,
        errors: ['Project not found'],
      };
    }

    const phase = phases.phases.find(p => p.name === phaseName);
    if (!phase) {
      return {
        success: false,
        message: `Phase ${phaseName} not found in project ${repoName}`,
        phase_name: phaseName,
        errors: ['Phase not found'],
      };
    }

    const template = this.getPhaseTemplate(phaseName);
    if (!template) {
      return {
        success: false,
        message: `Template for phase ${phaseName} not found`,
        phase_name: phaseName,
        errors: ['Template not found'],
      };
    }

    // Update phase status to active
    phase.status = 'active';
    phase.started_at = new Date().toISOString();
    this.repoHandler.writePhasesIndex(repoName, phases);

    // Log what would be done
    const artifacts = template.artifacts || [];

    return {
      success: true,
      message: `Phase ${phaseName} execution started`,
      phase_name: phaseName,
      artifacts_created: artifacts,
    };
  }

  async advancePhase(
    repoName: string,
    phaseName: string
  ): Promise<{ success: boolean; message: string; new_status: string }> {
    const phases = this.repoHandler.readPhasesIndex(repoName);
    if (!phases) {
      return {
        success: false,
        message: `Project ${repoName} not found`,
        new_status: 'unknown',
      };
    }

    const phase = phases.phases.find(p => p.name === phaseName);
    if (!phase) {
      return {
        success: false,
        message: `Phase ${phaseName} not found`,
        new_status: 'unknown',
      };
    }

    // Advance status: pending -> active -> completed
    if (phase.status === 'pending') {
      phase.status = 'active';
      phase.started_at = new Date().toISOString();
    } else if (phase.status === 'active') {
      phase.status = 'completed';
      phase.completed_at = new Date().toISOString();
    }

    this.repoHandler.writePhasesIndex(repoName, phases);

    return {
      success: true,
      message: `Phase ${phaseName} advanced to ${phase.status}`,
      new_status: phase.status,
    };
  }

  getStatus(repoName: string): ProjectPhases | null {
    return this.repoHandler.readPhasesIndex(repoName);
  }
}

