import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

/**
 * File system utilities for repository operations.
 * Provides path resolution, file read/write, and directory operations.
 */
export class FSUtils {
  /**
   * Expands paths with ~ to home directory
   */
  static expandPath(path: string): string {
    if (path.startsWith('~/')) {
      return join(homedir(), path.slice(2));
    }
    return path;
  }

  /**
   * Resolves repository path based on base path and repo name
   */
  static resolveRepoPath(basePath: string, repoName: string): string {
    return join(this.expandPath(basePath), repoName);
  }

  /**
   * Ensures a directory exists, creating it if necessary
   * Handles paths with spaces and existing directories gracefully
   */
  static ensureDir(dirPath: string): void {
    if (existsSync(dirPath)) {
      // Check if it's actually a directory, not a file
      const stats = statSync(dirPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path exists but is not a directory: ${dirPath}`);
      }
      // Directory already exists, nothing to do
      return;
    }
    // Directory doesn't exist, create it
    mkdirSync(dirPath, { recursive: true });
  }

  /**
   * Checks if a file exists
   */
  static fileExists(filePath: string): boolean {
    return existsSync(filePath);
  }

  /**
   * Checks if a directory exists
   */
  static dirExists(dirPath: string): boolean {
    return existsSync(dirPath) && statSync(dirPath).isDirectory();
  }

  /**
   * Reads a file as UTF-8 string
   */
  static readFile(filePath: string): string {
    try {
      return readFileSync(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  /**
   * Writes a file with UTF-8 encoding
   */
  static writeFile(filePath: string, content: string): void {
    const dir = dirname(filePath);
    this.ensureDir(dir);
    writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * Lists files in a directory
   */
  static listFiles(dirPath: string): string[] {
    if (!this.dirExists(dirPath)) {
      return [];
    }
    try {
      return readdirSync(dirPath);
    } catch (error) {
      throw new Error(`Failed to list directory ${dirPath}: ${error}`);
    }
  }

  /**
   * Gets file stats
   */
  static getFileStats(filePath: string) {
    if (!this.fileExists(filePath)) {
      return null;
    }
    return statSync(filePath);
  }
}

