/*
 * Stub implementation of the overseer.sync_docs tool.
 *
 * Synchronises documentation across README, BUILD, PHASES and phase docs.
 * The stub returns an empty change list.  Future implementations will
 * normalise headings, update checklists and ensure consistent style.
 */
export interface SyncDocsInput {
  repo_root: string;
}

export interface SyncDocsOutput {
  updated_files: string[];
}

export async function syncDocs(args: SyncDocsInput): Promise<SyncDocsOutput> {
  console.log('sync_docs called with:', args);
  // TODO: implement doc synchronisation logic
  return {
    updated_files: []
  };
}