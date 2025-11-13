import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { ConfigLoader } from './config.js';

export interface PhaseInfo {
  id: string; // e.g., "01", "02"
  name: string;
  status: 'pending' | 'active' | 'completed' | 'blocked' | 'locked' | 'in_progress';
  started_at?: string;
  completed_at?: string;
  description?: string;
  deliverables?: string[];
  done_criteria?: string[];
}

export interface ProjectPhases {
  project_name: string;
  phases: PhaseInfo[];
  created_at: string;
  updated_at: string;
}

export class RepoHandler {
  private basePath: string;
  private configLoader: ConfigLoader;

  constructor(basePath?: string, configLoader?: ConfigLoader) {
    // Use OVERSEER_BASE_PATH env var if available, otherwise use provided basePath or default
    const envBasePath = process.env.OVERSEER_BASE_PATH;
    this.basePath = basePath || envBasePath || join(homedir(), 'dev');
    this.configLoader = configLoader || new ConfigLoader();
  }

  expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(homedir(), path.slice(2));
    }
    return path;
  }

  getRepoPath(repoName: string): string {
    return join(this.expandPath(this.basePath), repoName);
  }

  getPhasesIndexPath(repoName: string): string {
    const repoPath = this.getRepoPath(repoName);
    const conventions = this.configLoader.getConventions();
    return join(repoPath, conventions.phases_index.file);
  }

  getPhaseFilePath(repoName: string, phaseName: string): string {
    const repoPath = this.getRepoPath(repoName);
    const conventions = this.configLoader.getConventions();
    const fileName = conventions.phase_files.pattern.replace('{name}', phaseName);
    return join(repoPath, fileName);
  }

  getPhaseFileByIdPath(repoName: string, phaseId: string): string {
    const repoPath = this.getRepoPath(repoName);
    return join(repoPath, `PHASE-${phaseId.padStart(2, '0')}.md`);
  }

  repoExists(repoName: string): boolean {
    return existsSync(this.getRepoPath(repoName));
  }

  readPhasesIndex(repoName: string): ProjectPhases | null {
    const indexPath = this.getPhasesIndexPath(repoName);
    if (!existsSync(indexPath)) {
      return null;
    }

    try {
      const content = readFileSync(indexPath, 'utf-8');
      
      // Try to parse as JSON first (backward compatibility)
      if (content.trim().startsWith('{')) {
        return JSON.parse(content);
      }
      
      // Parse markdown format
      return this.parsePhasesMarkdown(content, repoName);
    } catch (error) {
      throw new Error(`Failed to read PHASES.md from ${indexPath}: ${error}`);
    }
  }

  private parsePhasesMarkdown(content: string, repoName: string): ProjectPhases {
    const phases: PhaseInfo[] = [];
    let created_at = new Date().toISOString();
    let updated_at = new Date().toISOString();

    // Extract metadata from markdown
    const createdMatch = content.match(/\*\*Created\*\*:\s*(.+)/i);
    if (createdMatch) {
      created_at = createdMatch[1].trim();
    }

    const updatedMatch = content.match(/\*\*Updated\*\*:\s*(.+)/i);
    if (updatedMatch) {
      updated_at = updatedMatch[1].trim();
    }

    // Extract phases from markdown sections
    // Support multiple formats:
    // Format 1: ### 1. phase-name\n\n**Status**: status
    // Format 2: ### Phase 01: phase-name\n- **Status:** status
    // Format 3: ### Phase 01: phase-name\n- **Status**: status
    const phaseSectionRegex = /###\s+(?:Phase\s+)?(\d+)[:\.]\s*(.+?)(?:\n|$)/g;
    let match;
    
    while ((match = phaseSectionRegex.exec(content)) !== null) {
      const phaseId = match[1].trim().padStart(2, '0');
      const phaseName = match[2].trim();
      
      // Find status in the section (look for - **Status:** or **Status**:)
      const sectionStart = match.index;
      const nextSection = content.indexOf('###', sectionStart + match[0].length);
      const sectionContent = nextSection > 0 
        ? content.substring(sectionStart, nextSection)
        : content.substring(sectionStart);
      
      // Try to find status in various formats
      let status: PhaseInfo['status'] = 'pending';
      const statusMatch1 = sectionContent.match(/[-*]\s*\*\*Status\*\*:\s*(\w+)/i);
      const statusMatch2 = sectionContent.match(/\*\*Status\*\*:\s*(\w+)/i);
      if (statusMatch1) {
        status = statusMatch1[1].trim().toLowerCase() as PhaseInfo['status'];
      } else if (statusMatch2) {
        status = statusMatch2[1].trim().toLowerCase() as PhaseInfo['status'];
      }

      let description: string | undefined;
      let startedAt: string | undefined;
      let completedAt: string | undefined;
      const deliverables: string[] = [];
      const doneCriteria: string[] = [];

      const descMatch = sectionContent.match(/\*\*Description\*\*:\s*(.+?)(?:\n|$)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      const startedMatch = sectionContent.match(/\*\*Started\*\*:\s*(.+?)(?:\n|$)/);
      if (startedMatch) {
        startedAt = startedMatch[1].trim();
      }

      const completedMatch = sectionContent.match(/\*\*Completed\*\*:\s*(.+?)(?:\n|$)/);
      if (completedMatch) {
        completedAt = completedMatch[1].trim();
      }

      // Extract deliverables
      const deliverablesMatch = sectionContent.match(/\*\*Deliverables\*\*:\s*\n((?:- .+\n?)+)/);
      if (deliverablesMatch) {
        const deliverablesText = deliverablesMatch[1];
        const deliverableLines = deliverablesText.match(/- (.+)/g);
        if (deliverableLines) {
          deliverableLines.forEach(line => {
            const item = line.replace(/^- /, '').trim();
            if (item) deliverables.push(item);
          });
        }
      }

      // Extract done criteria
      const doneCriteriaMatch = sectionContent.match(/\*\*Done Criteria\*\*:\s*\n((?:- \[[ x]\] .+\n?)+)/);
      if (doneCriteriaMatch) {
        const criteriaText = doneCriteriaMatch[1];
        const criteriaLines = criteriaText.match(/- \[[ x]\] (.+)/g);
        if (criteriaLines) {
          criteriaLines.forEach(line => {
            const item = line.replace(/- \[[ x]\] /, '').trim();
            if (item) doneCriteria.push(item);
          });
        }
      }

      phases.push({
        id: phaseId,
        name: phaseName,
        status,
        description,
        started_at: startedAt,
        completed_at: completedAt,
        deliverables: deliverables.length > 0 ? deliverables : undefined,
        done_criteria: doneCriteria.length > 0 ? doneCriteria : undefined,
      });
    }

    return {
      project_name: repoName,
      phases,
      created_at,
      updated_at,
    };
  }

  writePhasesIndex(repoName: string, phases: ProjectPhases): void {
    const indexPath = this.getPhasesIndexPath(repoName);
    const dir = dirname(indexPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    phases.updated_at = new Date().toISOString();
    const content = this.generatePhasesMarkdown(phases);
    writeFileSync(indexPath, content, 'utf-8');
  }

  private generatePhasesMarkdown(phases: ProjectPhases): string {
    const lines: string[] = [];
    
    lines.push(`# Project Phases: ${phases.project_name}`);
    lines.push('');
    lines.push('This document tracks the phases of the project.');
    lines.push('');
    lines.push('## Metadata');
    lines.push('');
    lines.push(`- **Created**: ${phases.created_at}`);
    lines.push(`- **Updated**: ${phases.updated_at}`);
    lines.push(`- **Total Phases**: ${phases.phases.length}`);
    lines.push('');
    lines.push('## Phases');
    lines.push('');

    if (phases.phases.length === 0) {
      lines.push('No phases defined yet.');
      lines.push('');
    } else {
      phases.phases.forEach((phase) => {
        const phaseNum = phase.id || phases.phases.indexOf(phase) + 1;
        lines.push(`### ${phaseNum}. ${phase.name}`);
        lines.push('');
        lines.push(`**Status**: ${phase.status}`);
        if (phase.description) {
          lines.push(`**Description**: ${phase.description}`);
        }
        if (phase.started_at) {
          lines.push(`**Started**: ${phase.started_at}`);
        }
        if (phase.completed_at) {
          lines.push(`**Completed**: ${phase.completed_at}`);
        }
        lines.push('');
        
        if (phase.deliverables && phase.deliverables.length > 0) {
          lines.push('**Deliverables**:');
          lines.push('');
          phase.deliverables.forEach(deliverable => {
            lines.push(`- ${deliverable}`);
          });
          lines.push('');
        }
        
        if (phase.done_criteria && phase.done_criteria.length > 0) {
          lines.push('**Done Criteria**:');
          lines.push('');
          phase.done_criteria.forEach(criterion => {
            lines.push(`- [ ] ${criterion}`);
          });
          lines.push('');
        }
      });
    }

    lines.push('---');
    lines.push('');
    lines.push('*This file is automatically managed by Overseer MCP.*');
    
    return lines.join('\n');
  }

  readPhaseFile(repoName: string, phaseName: string): string | null {
    const phasePath = this.getPhaseFilePath(repoName, phaseName);
    if (!existsSync(phasePath)) {
      return null;
    }

    try {
      return readFileSync(phasePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read phase file ${phasePath}: ${error}`);
    }
  }

  writePhaseFile(repoName: string, phaseName: string, content: string): void {
    const phasePath = this.getPhaseFilePath(repoName, phaseName);
    const dir = dirname(phasePath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    writeFileSync(phasePath, content, 'utf-8');
  }

  ensureRepo(repoName: string): void {
    const repoPath = this.getRepoPath(repoName);
    if (!existsSync(repoPath)) {
      mkdirSync(repoPath, { recursive: true });
    }
  }

  // Methods that work with absolute paths directly (handles paths with spaces)
  readPhasesIndexFromPath(repoPath: string): ProjectPhases | null {
    const conventions = this.configLoader.getConventions();
    const indexPath = join(repoPath, conventions.phases_index.file);
    
    if (!existsSync(indexPath)) {
      return null;
    }

    try {
      const content = readFileSync(indexPath, 'utf-8');
      
      // Try to parse as JSON first (backward compatibility)
      if (content.trim().startsWith('{')) {
        return JSON.parse(content);
      }
      
      // Extract repo name from path for parsing
      const repoName = repoPath.split('/').pop() || 'unknown';
      // Parse markdown format
      return this.parsePhasesMarkdown(content, repoName);
    } catch (error) {
      throw new Error(`Failed to read PHASES.md from ${indexPath}: ${error}`);
    }
  }

  writePhasesIndexToPath(repoPath: string, phases: ProjectPhases): void {
    const conventions = this.configLoader.getConventions();
    const indexPath = join(repoPath, conventions.phases_index.file);
    const dir = dirname(indexPath);
    
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    phases.updated_at = new Date().toISOString();
    const content = this.generatePhasesMarkdown(phases);
    writeFileSync(indexPath, content, 'utf-8');
  }

  getPhaseFileByIdFromPath(repoPath: string, phaseId: string): string {
    return join(repoPath, `PHASE-${phaseId.padStart(2, '0')}.md`);
  }
}

