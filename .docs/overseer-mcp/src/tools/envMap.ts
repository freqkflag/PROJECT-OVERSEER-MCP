/*
 * Stub implementation of the overseer.env_map tool.
 *
 * Returns environment mappings defined in sentinel.yml.  The stub returns
 * an empty mapping; later versions will read sentinel.yml and return
 * structured data for each environment.
 */
export interface EnvMapInput {
  repo_root: string;
}

export interface EnvironmentMapping {
  id: string;
  description: string;
  base_path: string;
  default_domain_suffix: string;
}

export interface EnvMapOutput {
  environments: EnvironmentMapping[];
}

export async function envMap(args: EnvMapInput): Promise<EnvMapOutput> {
  console.log('env_map called with:', args);
  // TODO: implement reading from sentinel.yml
  return {
    environments: []
  };
}