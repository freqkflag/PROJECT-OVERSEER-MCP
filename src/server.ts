#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PhaseManager } from './core/phase-manager.js';
import { ConfigLoader } from './core/config.js';
import { createTools, handleToolCall, ToolContext } from './tools/index.js';

class OverseerMCPServer {
  private server: Server;
  private phaseManager: PhaseManager;
  private configLoader: ConfigLoader;
  private toolContext: ToolContext;

  constructor() {
    // Load configuration at startup
    this.configLoader = new ConfigLoader();
    try {
      this.configLoader.load();
      console.error('Configuration loaded successfully from config/sentinel.yml');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Warning: Failed to load config: ${errorMessage}`);
      // Continue with default config - ConfigLoader will handle this
    }

    // Initialize phase manager with config
    this.phaseManager = new PhaseManager(this.configLoader);
    this.toolContext = {
      phaseManager: this.phaseManager,
      configLoader: this.configLoader,
    };

    this.server = new Server(
      {
        name: 'overseer-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: createTools(this.toolContext),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        const result = await handleToolCall(name, args || {}, this.toolContext);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Overseer MCP server running on stdio');
    console.error(`Registered ${createTools(this.toolContext).length} tools`);
  }
}

// Start the server
const server = new OverseerMCPServer();
server.run().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

