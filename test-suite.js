#!/usr/bin/env node

/**
 * Overseer MCP Self-Test Suite
 * Tests all tools with the problematic path containing spaces
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join } from 'path';

const TEST_PATH = '/Volumes/projects/Forge Panel/forgepanel';
const SERVER_PATH = './dist/server.js';

// Test results
const results = {
  passed: [],
  failed: [],
  errors: []
};

// Helper to call MCP tool
async function callTool(toolName, args) {
  return new Promise((resolve, reject) => {
    const request = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    };

    const proc = spawn('node', [SERVER_PATH], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      try {
        // Find JSON response in stdout
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const response = JSON.parse(jsonMatch[0]);
          resolve(response);
        } else {
          reject(new Error(`No JSON response found. stdout: ${stdout}, stderr: ${stderr}`));
        }
      } catch (error) {
        reject(new Error(`Parse error: ${error.message}. stdout: ${stdout}, stderr: ${stderr}`));
      }
    });

    proc.stdin.write(JSON.stringify(request) + '\n');
    proc.stdin.end();
  });
}

// Test functions
async function testPathResolution() {
  console.log('🔍 Testing path resolution...');
  try {
    const { existsSync, statSync } = await import('fs');
    const path = TEST_PATH;
    
    if (!existsSync(path)) {
      results.failed.push({
        test: 'Path Resolution',
        error: `Path does not exist: ${path}`,
        note: 'This is expected if the test repository doesn\'t exist'
      });
      return false;
    }

    const stats = statSync(path);
    if (!stats.isDirectory()) {
      results.failed.push({
        test: 'Path Resolution',
        error: `Path exists but is not a directory: ${path}`
      });
      return false;
    }

    results.passed.push('Path Resolution');
    return true;
  } catch (error) {
    results.failed.push({
      test: 'Path Resolution',
      error: error.message
    });
    return false;
  }
}

async function testStatus() {
  console.log('🔍 Testing overseer.status...');
  try {
    const result = await callTool('overseer.status', {
      repo_root: TEST_PATH
    });

    if (result.result && result.result.content) {
      const content = JSON.parse(result.result.content[0].text);
      
      if (content.success === false && content.message.includes('not found')) {
        // Check if PHASES.md exists
        const { existsSync } = await import('fs');
        const phasesPath = join(TEST_PATH, 'PHASES.md');
        
        if (existsSync(phasesPath)) {
          results.failed.push({
            test: 'overseer.status',
            error: 'Status reports project not found even though PHASES.md exists',
            details: content
          });
          return false;
        } else {
          results.passed.push('overseer.status (no PHASES.md - expected)');
          return true;
        }
      } else {
        results.passed.push('overseer.status');
        return true;
      }
    } else {
      results.failed.push({
        test: 'overseer.status',
        error: 'Unexpected response format',
        details: result
      });
      return false;
    }
  } catch (error) {
    results.failed.push({
      test: 'overseer.status',
      error: error.message
    });
    return false;
  }
}

async function testCheckCompliance() {
  console.log('🔍 Testing overseer.check_compliance...');
  try {
    const result = await callTool('overseer.check_compliance', {
      repo_root: TEST_PATH
    });

    if (result.result && result.result.content) {
      const content = JSON.parse(result.result.content[0].text);
      
      if (content.success === false && content.message && content.message.includes('does not exist')) {
        // Verify directory actually exists
        const { existsSync } = await import('fs');
        if (existsSync(TEST_PATH)) {
          results.failed.push({
            test: 'overseer.check_compliance',
            error: 'Reports directory does not exist when it actually exists',
            details: content
          });
          return false;
        }
      }
      
      results.passed.push('overseer.check_compliance');
      return true;
    } else {
      results.failed.push({
        test: 'overseer.check_compliance',
        error: 'Unexpected response format',
        details: result
      });
      return false;
    }
  } catch (error) {
    results.failed.push({
      test: 'overseer.check_compliance',
      error: error.message
    });
    return false;
  }
}

async function testInferPhases() {
  console.log('🔍 Testing overseer.infer_phases...');
  try {
    const result = await callTool('overseer.infer_phases', {
      repo_root: TEST_PATH
    });

    if (result.result && result.result.content) {
      const content = JSON.parse(result.result.content[0].text);
      
      // Check if it returns valid structure
      if (content.success !== undefined) {
        results.passed.push('overseer.infer_phases');
        return true;
      } else {
        results.failed.push({
          test: 'overseer.infer_phases',
          error: 'Response missing success field',
          details: content
        });
        return false;
      }
    } else {
      results.failed.push({
        test: 'overseer.infer_phases',
        error: 'Unexpected response format',
        details: result
      });
      return false;
    }
  } catch (error) {
    results.failed.push({
      test: 'overseer.infer_phases',
      error: error.message
    });
    return false;
  }
}

async function testLintRepo() {
  console.log('🔍 Testing overseer.lint_repo...');
  try {
    const result = await callTool('overseer.lint_repo', {
      repo_root: TEST_PATH
    });

    if (result.result && result.result.content) {
      const content = JSON.parse(result.result.content[0].text);
      
      // Check if it returns valid structure
      if (content.success !== undefined && Array.isArray(content.detected_languages)) {
        results.passed.push('overseer.lint_repo');
        return true;
      } else {
        results.failed.push({
          test: 'overseer.lint_repo',
          error: 'Response missing required fields',
          details: content
        });
        return false;
      }
    } else {
      results.failed.push({
        test: 'overseer.lint_repo',
        error: 'Unexpected response format',
        details: result
      });
      return false;
    }
  } catch (error) {
    results.failed.push({
      test: 'overseer.lint_repo',
      error: error.message
    });
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Overseer MCP Self-Test Suite\n');
  console.log(`Test Path: ${TEST_PATH}\n`);

  await testPathResolution();
  await testStatus();
  await testCheckCompliance();
  await testInferPhases();
  await testLintRepo();

  // Print results
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${results.passed.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed Tests:');
    results.passed.forEach(test => console.log(`  - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    results.failed.forEach(({ test, error, details }) => {
      console.log(`  - ${test}: ${error}`);
      if (details) {
        console.log(`    Details: ${JSON.stringify(details, null, 2)}`);
      }
    });
  }

  return {
    passed: results.passed.length,
    failed: results.failed.length,
    details: results
  };
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().then(results => {
    process.exit(results.failed > 0 ? 1 : 0);
  }).catch(error => {
    console.error('Test suite error:', error);
    process.exit(1);
  });
}

export { runTests, testPathResolution, testStatus, testCheckCompliance, testInferPhases, testLintRepo };

