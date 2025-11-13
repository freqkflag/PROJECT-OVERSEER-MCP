# Logging in Overseer MCP

## Overview

Overseer MCP uses a structured logging approach that follows MCP protocol conventions. All logs are written to `stderr` (standard error), which is the standard for MCP servers.

## Logging Levels

### Error Logging (`console.error`)

Used for:
- Configuration loading failures
- Tool execution errors
- Server startup/shutdown messages
- Debugging information

**Example:**
```typescript
console.error('Configuration loaded successfully from config/sentinel.yml');
console.error(`Warning: Failed to load config: ${errorMessage}`);
```

### Important Notes

1. **No Secrets in Logs**: Never log sensitive information such as:
   - API keys
   - Passwords
   - Tokens
   - User credentials
   - Private keys

2. **Structured Output**: Tool results are returned as JSON in tool responses, not in logs.

3. **Error Handling**: All errors are caught and returned as structured JSON responses to the MCP client.

## Logging Patterns

### Server Startup

```typescript
console.error('Overseer MCP server running on stdio');
console.error(`Registered ${toolCount} tools`);
```

### Configuration Loading

```typescript
try {
  this.configLoader.load();
  console.error('Configuration loaded successfully from config/sentinel.yml');
} catch (error) {
  console.error(`Warning: Failed to load config: ${errorMessage}`);
}
```

### Tool Execution

Tool errors are returned as JSON responses, not logged directly:

```typescript
try {
  const result = await handleToolCall(name, args || {}, this.toolContext);
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
} catch (error) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ success: false, error: errorMessage }, null, 2) }],
    isError: true,
  };
}
```

## Best Practices

1. **Use `console.error` for all logging** (MCP convention)
2. **Keep logs concise** - detailed information should be in tool responses
3. **Log at appropriate times**:
   - Server lifecycle events
   - Configuration issues
   - Unexpected errors
4. **Never log sensitive data**
5. **Use structured error messages** that help debugging without exposing internals

## Debugging

To enable more verbose logging, set environment variables:

```bash
NODE_ENV=development npm start
```

In development mode, additional debug information may be logged.

## Future Enhancements

- Structured logging with log levels (debug, info, warn, error)
- Log file rotation
- Integration with external logging services
- Request/response logging for debugging

