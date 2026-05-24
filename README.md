# MCP: Document Checker

This server provides document submission checklist management with tools for tracking required documents across any workflow (onboarding, contracts, applications, etc.).

## Usage

| Feature | Example |
|---|---|
| Create Checklist | "Create a checklist for new employee onboarding" |
| Add Item | "Add 'My Number card copy' as a required document" |
| Submit Item | "Mark the employment contract as submitted" |
| Get Missing | "Show me which required documents are still missing" |
| Get Checklist | "Show the full status of the onboarding checklist" |
| List Checklists | "List all active checklists" |
| Delete Checklist | "Delete the onboarding checklist for April intake" |

## Installation

1. Clone this repository:

```bash
git clone https://github.com/NexaScience/mcp-doc-checker
cd mcp-doc-checker
```

2. Install dependencies:

```bash
npm install
```

3. Build the server:

```bash
npm run build
```

> Run this before adding to your MCP host.

## Setup

Add to your MCP host's config file ([see host-specific instructions](https://modelcontextprotocol.io/quickstart/user)):

```json
{
  "mcpServers": {
    "doc-checker": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-doc-checker/dist/server.js"]
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
│   └── tool-handler.ts     # Tool handlers
├── services/
│   └── checklist-service.ts  # Business logic
├── types/
│   ├── mcp.ts              # MCP base types
│   └── checklist.ts        # Checklist / ChecklistItem types
└── utils/
    ├── logger.ts           # Logging
    └── validator.ts        # Validation
tests/
└── checklist.test.ts       # Unit & integration tests
```

## Development

- `npm run dev` - Run server in development mode
- `npm run build` - Build the TypeScript code
- `npm run watch` - Build and watch for changes
- `npm test` - Run tests
