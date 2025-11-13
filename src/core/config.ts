import { readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'yaml';

export interface PhaseTemplate {
  name: string;
  description: string;
  steps: string[];
  artifacts: string[];
}

export interface Conventions {
  phase_files: {
    pattern: string;
    location: string;
  };
  phases_index: {
    file: string;
    location: string;
  };
  naming: {
    phase_names: string;
    branch_names: string;
    repo_names?: string;
    container_names?: string;
  };
  domains?: {
    primary: string;
    secondary?: string[];
    subdomain_pattern?: string;
  };
  docker?: {
    image_prefix?: string;
    container_naming?: string;
    network_naming?: string;
    volume_naming?: string;
  };
}

export interface Environment {
  base_path: string;
  auto_commit: boolean;
  verbose_logging: boolean;
  docker_host?: string;
  ssh_host?: string;
  ssh_user?: string;
  ssh_port?: number;
}

export interface CodingStandards {
  languages: Record<string, {
    formatter: string;
    linter: string;
    style_guide: string;
    config_files?: string[];
  }>;
  general: {
    max_line_length: number;
    indent_size: number;
    use_tabs: boolean;
    trailing_commas: boolean;
    end_of_line?: string;
  };
}

export interface ProjectDefaults {
  repo_root_base: string;
  phases_file: string;
  phase_file_pattern: string;
  default_phases: string[];
  git_enabled: boolean;
  auto_generate_readme: boolean;
}

export interface CiCdConfig {
  default_provider: string;
  default_workflow: Record<string, unknown>;
  supported_providers: string[];
  github_actions?: {
    default_runners?: string[];
    cache_strategies?: string[];
  };
}

export interface SentinelConfig {
  project_defaults?: ProjectDefaults;
  phase_templates: Record<string, PhaseTemplate>;
  conventions: Conventions;
  environments: Record<string, Environment>;
  coding_standards: CodingStandards;
  ci_cd?: CiCdConfig;
}

export class ConfigLoader {
  private config: SentinelConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || join(process.cwd(), 'config', 'sentinel.yml');
  }

  load(): SentinelConfig {
    if (this.config) {
      return this.config;
    }

    try {
      const content = readFileSync(this.configPath, 'utf-8');
      this.config = parse(content) as SentinelConfig;
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load config from ${this.configPath}: ${error}`);
    }
  }

  getConfig(): SentinelConfig {
    return this.load();
  }

  getPhaseTemplate(name: string): PhaseTemplate | undefined {
    const config = this.load();
    return config.phase_templates[name];
  }

  getConventions(): Conventions {
    const config = this.load();
    return config.conventions;
  }

  getEnvironment(name: string = 'development'): Environment {
    const config = this.load();
    return config.environments[name] || config.environments.development;
  }
}

