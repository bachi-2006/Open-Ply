# @openply/mcp

MCP (Model Context Protocol) server for openPly. Exposes openPly agents as tools for Claude Desktop, Cursor, Windsurf, and other MCP-compatible clients.

## Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "openply": {
      "command": "npx",
      "args": ["-y", "@openply/mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here",
        "OPENPLY_CWD": "/path/to/your/project"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` in your project root:

```json
{
  "mcpServers": {
    "openply": {
      "command": "npx",
      "args": ["-y", "@openply/mcp"],
      "env": {
        "OPENROUTER_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Available Tools

| Tool | Description |
|------|-------------|
| `openply_chat` | Send a coding task to the multi-agent system |
| `openply_read_file` | Read a file from the project |
| `openply_search` | Search for files or code patterns |
| `openply_run_command` | Execute a shell command |
| `openply_agents` | List available agents |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENROUTER_API_KEY` | OpenRouter API key (required) |
| `OPENPLY_API_KEY` | Alternative API key env var |
| `OPENPLY_MODEL` | Default model (default: `deepseek/deepseek-v4-flash`) |
| `OPENPLY_CWD` | Project root directory |

## Usage

Once configured, you can use openPly tools directly in Claude Desktop or Cursor:

> "Use openply_chat to add error handling to all API endpoints"
> "Use openply_search to find all files containing 'TODO'"
> "Use openply_run_command to run the test suite"
