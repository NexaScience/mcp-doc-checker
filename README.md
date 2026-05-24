# MCP: Document Checker

This server provides document submission checklist management — tracking required documents and validating their content before accepting submissions.

## Usage

| Feature | Example |
|---|---|
| Create Checklist | "Create a checklist for new employee onboarding" |
| Add Item | "Add 'My Number card copy' as a required document" |
| Add Validation Rule | "Add a rule to check that the My Number is masked" |
| Record Validation Result | "I checked the document — masking is confirmed" |
| Submit Item | "Mark the employment contract as submitted" |
| Get Missing | "Show me which required documents are still missing" |
| Get Checklist | "Show the full status of the onboarding checklist" |
| List Checklists | "List all active checklists" |
| Delete Checklist | "Delete the onboarding checklist for April intake" |

## How Validation Works

Each document item can have one or more **validation rules** (e.g. "is the My Number masked?", "is the correct document type uploaded?"). Claude checks the document against each rule and records the result. `submit_item` is blocked unless all rules pass.

```
add_item → add_validation_rule → [Claude checks document] → record_validation_result(pass) → submit_item ✅
                                                           → record_validation_result(fail) → submit_item ❌
```

Use `force_submit: true` to override validation in exceptional cases.

### Validation Rule Types

| Type | Description |
|---|---|
| `file_uploaded` | A file has been attached |
| `no_masking_omission` | Required fields (e.g. My Number) are properly masked |
| `correct_document` | The correct document type has been submitted |
| `custom` | Any custom condition described in natural language |

## Tools

### Checklist Management
| Tool | Arguments | Description |
|---|---|---|
| `create_checklist` | `name`, `description?` | Create a checklist |
| `add_item` | `checklist_id`, `name`, `description?`, `required?` | Add a required document |
| `submit_item` | `checklist_id`, `item_id`, `note?`, `force_submit?` | Record submission (blocked if validation fails) |
| `get_checklist` | `checklist_id` | Get full checklist status |
| `get_missing` | `checklist_id` | List unsubmitted required documents |
| `list_checklists` | — | List all checklists |
| `delete_checklist` | `checklist_id` | Delete a checklist |

### Validation
| Tool | Arguments | Description |
|---|---|---|
| `add_validation_rule` | `checklist_id`, `item_id`, `type`, `description` | Add a rule to a document item |
| `record_validation_result` | `checklist_id`, `item_id`, `rule_id`, `outcome`, `reason` | Record Claude's check result (`pass`/`fail`) |
| `get_validation_rules` | `checklist_id`, `item_id` | Get rules and latest results for an item |
| `delete_validation_rule` | `checklist_id`, `item_id`, `rule_id` | Remove a rule |

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
│   ├── constants.ts        # Tool schemas and constants
│   └── message-handler.ts  # MCP message handling
├── handlers/
│   └── tool-handler.ts     # Tool handlers (11 tools)
├── services/
│   └── checklist-service.ts  # Business logic
├── types/
│   ├── mcp.ts              # MCP base types
│   └── checklist.ts        # Checklist / ValidationRule / ValidationResult types
└── utils/
    ├── logger.ts           # Logging
    └── validator.ts        # Validation
tests/
└── checklist.test.ts       # Unit & integration tests (40 cases)
```

## Development

- `npm run dev` - Run server in development mode
- `npm run build` - Build the TypeScript code
- `npm run watch` - Build and watch for changes
- `npm test` - Run tests
