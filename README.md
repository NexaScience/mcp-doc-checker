# MCP: Document Checker

This server provides document submission checklist management — defining required documents with sample templates, and validating submissions against them before acceptance.

## How It Works

```
検証者（管理者）側:
  create_checklist → add_item → add_sample（見本・必要記入項目を定義）
                              → add_validation_rule（確認ルールを定義）

提出者側:
  submit_item → [Claudeが提出物をサンプルと照合]
             → record_validation_result(pass/fail)
             → 全ルールpassなら提出確定 ✅ / failならブロック ❌
```

## Usage

| Feature | Example |
|---|---|
| Create Checklist | "Create a checklist for new employee onboarding" |
| Add Item | "Add 'Residence certificate' as a required document" |
| Add Sample | "Register a sample showing required fields: name, address, issue date" |
| Add Validation Rule | "Add a rule to check that My Number is masked" |
| Record Validation Result | "I checked the document — all fields are filled and masking is confirmed" |
| Submit Item | "Mark the residence certificate as submitted" |
| Get Missing | "Show me which required documents are still missing" |
| Get Checklist | "Show the full status of the onboarding checklist" |

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

### Sample Templates
| Tool | Arguments | Description |
|---|---|---|
| `add_sample` | `checklist_id`, `item_id`, `description`, `file_path?`, `required_fields?` | Register a sample with required fields |
| `get_samples` | `checklist_id`, `item_id` | Get samples for a document item |
| `add_sample_field` | `checklist_id`, `item_id`, `sample_id`, `field_name`, `required?`, `description?` | Add a required field to a sample |
| `delete_sample` | `checklist_id`, `item_id`, `sample_id` | Remove a sample |

### Validation
| Tool | Arguments | Description |
|---|---|---|
| `add_validation_rule` | `checklist_id`, `item_id`, `type`, `description` | Add a validation rule to a document item |
| `record_validation_result` | `checklist_id`, `item_id`, `rule_id`, `outcome`, `reason` | Record Claude's check result (`pass`/`fail`) |
| `get_validation_rules` | `checklist_id`, `item_id` | Get rules and latest results for an item |
| `delete_validation_rule` | `checklist_id`, `item_id`, `rule_id` | Remove a rule |

### Validation Rule Types
| Type | Description |
|---|---|
| `file_uploaded` | A file has been attached |
| `no_masking_omission` | Required fields (e.g. My Number) are properly masked |
| `correct_document` | The correct document type has been submitted |
| `custom` | Any condition described in natural language (e.g. "all sample fields are filled") |

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
│   └── tool-handler.ts     # Tool handlers (15 tools)
├── services/
│   └── checklist-service.ts  # Business logic
├── types/
│   ├── mcp.ts              # MCP base types
│   └── checklist.ts        # Checklist / ValidationRule / ItemSample types
└── utils/
    ├── logger.ts           # Logging
    └── validator.ts        # Validation
tests/
└── checklist.test.ts       # Unit & integration tests (54 cases)
```

## Development

- `npm run dev` - Run server in development mode
- `npm run build` - Build the TypeScript code
- `npm run watch` - Build and watch for changes
- `npm test` - Run tests
