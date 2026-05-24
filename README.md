# MCP: Document Checker

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

> Run this before adding to Claude Desktop.

## Setup

Add to your MCP host's config file ([see host-specific instructions](https://modelcontextprotocol.io/quickstart/user)):

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

Restart the host after saving.

## Project Structure

```
src/
├── server.ts               # Entry point
├── core/
│   ├── constants.ts        # Constants
│   └── message-handler.ts  # MCP message handling
├── handlers/
│   ├── tool-handler.ts     # Tool handlers
│   └── resource-handler.ts # Resource handlers
├── services/
│   └── task-service.ts     # Business logic
├── types/
│   └── mcp.ts              # TypeScript types
└── utils/
    ├── logger.ts           # Logging
    └── validator.ts        # Validation
```

## Development

- `npm run dev` - Run server in development mode
- `npm run build` - Build the TypeScript code
- `npm run watch` - Build and watch for changes
