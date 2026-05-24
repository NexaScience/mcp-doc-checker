import { MCPCapabilities, ToolInputSchema, JsonRpcError } from '../types/mcp';

export const MCP_PROTOCOL_VERSION = '2025-06-18';

export const JSON_RPC_ERRORS: Record<string, JsonRpcError> = {
  PARSE_ERROR: { code: -32700, message: 'Parse error' },
  INVALID_REQUEST: { code: -32600, message: 'Invalid Request' },
  METHOD_NOT_FOUND: { code: -32601, message: 'Method not found' },
  INVALID_PARAMS: { code: -32602, message: 'Invalid params' },
  INTERNAL_ERROR: { code: -32603, message: 'Internal error' }
};

export const MCP_ERRORS: Record<string, JsonRpcError> = {
  UNSUPPORTED_PROTOCOL: { code: -32000, message: 'Protocol version not supported by server' },
  CAPABILITY_NOT_SUPPORTED: { code: -32001, message: 'Requested capability not supported' },
  RESOURCE_NOT_FOUND: { code: -32002, message: 'Requested resource does not exist' },
  TOOL_NOT_FOUND: { code: -32003, message: 'Requested tool does not exist' },
  UNAUTHORIZED: { code: -32004, message: 'Access denied for requested operation' },
  RATE_LIMITED: { code: -32005, message: 'Request rate limit exceeded' },
  VALIDATION_ERROR: { code: -32006, message: 'Request parameters failed validation' }
};

export const MCP_CAPABILITIES: MCPCapabilities = {
  tools: {
    listChanged: true
  },
  resources: {
    subscribe: false,
    listChanged: false
  },
  logging: {}
};

export const TOOL_SCHEMAS: Record<string, ToolInputSchema> = {
  create_checklist: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Name of the checklist'
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional description of the checklist'
      }
    },
    required: ['name'],
    additionalProperties: false
  },

  add_item: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist to add the item to'
      },
      name: {
        type: 'string',
        minLength: 1,
        maxLength: 200,
        description: 'Name of the document item'
      },
      description: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional description of the document'
      },
      required: {
        type: 'boolean',
        description: 'Whether this document is required (default: true)'
      }
    },
    required: ['checklist_id', 'name'],
    additionalProperties: false
  },

  submit_item: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist'
      },
      item_id: {
        type: 'string',
        description: 'UUID of the item to mark as submitted'
      },
      note: {
        type: 'string',
        maxLength: 1000,
        description: 'Optional note about the submission'
      },
      force_submit: {
        type: 'boolean',
        description: 'If true, skip validation checks and force submission (default: false)'
      }
    },
    required: ['checklist_id', 'item_id'],
    additionalProperties: false
  },

  get_checklist: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist to retrieve'
      }
    },
    required: ['checklist_id'],
    additionalProperties: false
  },

  get_missing: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist to check'
      }
    },
    required: ['checklist_id'],
    additionalProperties: false
  },

  list_checklists: {
    type: 'object',
    properties: {},
    additionalProperties: false
  },

  delete_checklist: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist to delete'
      }
    },
    required: ['checklist_id'],
    additionalProperties: false
  },

  add_validation_rule: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist'
      },
      item_id: {
        type: 'string',
        description: 'UUID of the item to add the rule to'
      },
      type: {
        type: 'string',
        enum: ['file_uploaded', 'no_masking_omission', 'correct_document', 'custom'],
        description: 'Type of validation rule'
      },
      description: {
        type: 'string',
        minLength: 1,
        description: 'Natural language description of what Claude should confirm'
      }
    },
    required: ['checklist_id', 'item_id', 'type', 'description'],
    additionalProperties: false
  },

  record_validation_result: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist'
      },
      item_id: {
        type: 'string',
        description: 'UUID of the item'
      },
      rule_id: {
        type: 'string',
        description: 'UUID of the validation rule'
      },
      outcome: {
        type: 'string',
        enum: ['pass', 'fail'],
        description: 'Result of the validation'
      },
      reason: {
        type: 'string',
        minLength: 1,
        description: 'Confirmation basis / details about the validation result'
      }
    },
    required: ['checklist_id', 'item_id', 'rule_id', 'outcome', 'reason'],
    additionalProperties: false
  },

  get_validation_rules: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist'
      },
      item_id: {
        type: 'string',
        description: 'UUID of the item'
      }
    },
    required: ['checklist_id', 'item_id'],
    additionalProperties: false
  },

  delete_validation_rule: {
    type: 'object',
    properties: {
      checklist_id: {
        type: 'string',
        description: 'UUID of the checklist'
      },
      item_id: {
        type: 'string',
        description: 'UUID of the item'
      },
      rule_id: {
        type: 'string',
        description: 'UUID of the validation rule to delete'
      }
    },
    required: ['checklist_id', 'item_id', 'rule_id'],
    additionalProperties: false
  }
};
