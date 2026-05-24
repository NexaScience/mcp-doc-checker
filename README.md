# MCP Todo Server

This server provides todo list functionality with tools and resources for task management.

## Usage

| Feature | Example |
|---|---|
| Create Tasks | "remind me to buy groceries" |
| Manage Tasks | "Mark task as completed" |
| Filter Tasks | "Show me all my incomplete tasks" |
| Task Analytics | "Analyze my task completion patterns" |

## Installation

1. Clone this repository:

```bash
git clone https://github.com/NexaScience/MCP-todo
cd MCP-todo
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

## Adding to Claude Desktop

To use this MCP server with Claude Desktop, you need to add it to your Claude Desktop configuration ([read more here](https://modelcontextprotocol.io/quickstart/user)):

### macOS/Linux

1. Open your Claude Desktop config file:

   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`

2. Add the MCP server to your configuration:

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["/absolute/path/to/MCP-todo/dist/server.js"]
    }
  }
}
```

### Windows

1. Open your Claude Desktop config file at: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the MCP server using the same JSON configuration as above, but with Windows-style paths:

```json
{
  "mcpServers": {
    "todo": {
      "command": "node",
      "args": ["C:\\absolute\\path\\to\\MCP-todo\\dist\\server.js"]
    }
  }
}
```

### Important Notes

- **Use absolute paths**: Replace `/absolute/path/to/MCP-todo` with the actual full path to your project directory
- **Build first**: Ensure you've run `npm run build` before adding to Claude Desktop
- **Restart Claude Desktop**: After making configuration changes, restart Claude Desktop for them to take effect

## Development

- `npm run dev` - Run server in development mode
- `npm run build` - Build the TypeScript code
- `npm run watch` - Build and watch for changes
