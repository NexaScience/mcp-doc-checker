import { MCPValidator, MCPError } from '../utils/validator';
import { MCP_ERRORS } from '../core/constants';
import { logger } from '../utils/logger';
import { ChecklistService } from '../services/checklist-service';
import { MCPTool, ToolResult } from '../types/mcp';

const toolDefinitions: MCPTool[] = [
  {
    name: 'create_checklist',
    description: 'Creates a new document submission checklist',
    inputSchema: {
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
      required: ['name']
    }
  },
  {
    name: 'add_item',
    description: 'Adds a document item to an existing checklist',
    inputSchema: {
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
      required: ['checklist_id', 'name']
    }
  },
  {
    name: 'submit_item',
    description: 'Records a document as submitted (idempotent). Blocked if validation rules exist and have not all passed, unless force_submit=true.',
    inputSchema: {
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
      required: ['checklist_id', 'item_id']
    }
  },
  {
    name: 'get_checklist',
    description: 'Retrieves a checklist with all its items and their statuses',
    inputSchema: {
      type: 'object',
      properties: {
        checklist_id: {
          type: 'string',
          description: 'UUID of the checklist to retrieve'
        }
      },
      required: ['checklist_id']
    }
  },
  {
    name: 'get_missing',
    description: 'Returns all required documents that have not yet been submitted',
    inputSchema: {
      type: 'object',
      properties: {
        checklist_id: {
          type: 'string',
          description: 'UUID of the checklist to check'
        }
      },
      required: ['checklist_id']
    }
  },
  {
    name: 'list_checklists',
    description: 'Lists all checklists',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false
    }
  },
  {
    name: 'delete_checklist',
    description: 'Deletes a checklist and all its items',
    inputSchema: {
      type: 'object',
      properties: {
        checklist_id: {
          type: 'string',
          description: 'UUID of the checklist to delete'
        }
      },
      required: ['checklist_id']
    }
  },
  {
    name: 'add_validation_rule',
    description: 'Adds a validation rule to a checklist item that must pass before submission',
    inputSchema: {
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
          description: 'Natural language description of what Claude should confirm'
        }
      },
      required: ['checklist_id', 'item_id', 'type', 'description']
    }
  },
  {
    name: 'record_validation_result',
    description: 'Records the outcome of a validation rule check for a checklist item',
    inputSchema: {
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
          description: 'Confirmation basis / details about the validation result'
        }
      },
      required: ['checklist_id', 'item_id', 'rule_id', 'outcome', 'reason']
    }
  },
  {
    name: 'get_validation_rules',
    description: 'Gets all validation rules and their latest results for a checklist item',
    inputSchema: {
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
      required: ['checklist_id', 'item_id']
    }
  },
  {
    name: 'delete_validation_rule',
    description: 'Deletes a validation rule and its associated results from a checklist item',
    inputSchema: {
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
      required: ['checklist_id', 'item_id', 'rule_id']
    }
  }
];

function makeResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    isError: false
  };
}

export class ToolHandler {
  private checklistService: ChecklistService;

  constructor(checklistService: ChecklistService) {
    this.checklistService = checklistService;
  }

  static getToolDefinitions(): MCPTool[] {
    return toolDefinitions;
  }

  async executeTool(toolName: string, parameters: any): Promise<ToolResult> {
    logger.logToolExecution(toolName, parameters);

    try {
      const tool = toolDefinitions.find(t => t.name === toolName);
      if (!tool) {
        throw new MCPError({
          ...MCP_ERRORS.VALIDATION_ERROR,
          data: `Tool '${toolName}' not found`
        });
      }

      MCPValidator.validateToolParameters(toolName, parameters ?? {});

      switch (toolName) {
        case 'create_checklist':
          return this.createChecklist(parameters);
        case 'add_item':
          return this.addItem(parameters);
        case 'submit_item':
          return this.submitItem(parameters);
        case 'get_checklist':
          return this.getChecklist(parameters);
        case 'get_missing':
          return this.getMissing(parameters);
        case 'list_checklists':
          return this.listChecklists();
        case 'delete_checklist':
          return this.deleteChecklist(parameters);
        case 'add_validation_rule':
          return this.addValidationRule(parameters);
        case 'record_validation_result':
          return this.recordValidationResult(parameters);
        case 'get_validation_rules':
          return this.getValidationRules(parameters);
        case 'delete_validation_rule':
          return this.deleteValidationRule(parameters);
        default:
          throw new MCPError({
            ...MCP_ERRORS.VALIDATION_ERROR,
            data: `Unknown tool: ${toolName}`
          });
      }
    } catch (error) {
      logger.logToolExecution(toolName, parameters, null, error);
      throw error;
    }
  }

  private createChecklist(params: { name: string; description?: string }): ToolResult {
    const checklist = this.checklistService.createChecklist(
      params.name,
      params.description
    );
    logger.info('Checklist created', { id: checklist.id, name: checklist.name });
    return makeResult(checklist);
  }

  private addItem(params: {
    checklist_id: string;
    name: string;
    description?: string;
    required?: boolean;
  }): ToolResult {
    const item = this.checklistService.addItem(
      params.checklist_id,
      params.name,
      params.description,
      params.required
    );
    logger.info('Item added', { checklistId: params.checklist_id, itemId: item.id });
    return makeResult(item);
  }

  private submitItem(params: {
    checklist_id: string;
    item_id: string;
    note?: string;
    force_submit?: boolean;
  }): ToolResult {
    const item = this.checklistService.submitItem(
      params.checklist_id,
      params.item_id,
      params.note,
      params.force_submit ?? false
    );
    logger.info('Item submitted', { checklistId: params.checklist_id, itemId: item.id });
    return makeResult(item);
  }

  private getChecklist(params: { checklist_id: string }): ToolResult {
    const checklist = this.checklistService.getChecklistById(params.checklist_id);
    if (!checklist) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Checklist with ID '${params.checklist_id}' not found`
      });
    }
    return makeResult(checklist);
  }

  private getMissing(params: { checklist_id: string }): ToolResult {
    const missing = this.checklistService.getMissingItems(params.checklist_id);
    return makeResult(missing);
  }

  private listChecklists(): ToolResult {
    const checklists = this.checklistService.listChecklists();
    return makeResult(checklists);
  }

  private deleteChecklist(params: { checklist_id: string }): ToolResult {
    const deleted = this.checklistService.deleteChecklist(params.checklist_id);
    logger.info('Checklist deleted', { id: deleted.id });
    return makeResult({ deleted: true, id: deleted.id });
  }

  private addValidationRule(params: {
    checklist_id: string;
    item_id: string;
    type: string;
    description: string;
  }): ToolResult {
    const rule = this.checklistService.addValidationRule(
      params.checklist_id,
      params.item_id,
      params.type as any,
      params.description
    );
    logger.info('Validation rule added', { ruleId: rule.id, itemId: params.item_id });
    return makeResult(rule);
  }

  private recordValidationResult(params: {
    checklist_id: string;
    item_id: string;
    rule_id: string;
    outcome: string;
    reason: string;
  }): ToolResult {
    const result = this.checklistService.recordValidationResult(
      params.checklist_id,
      params.item_id,
      params.rule_id,
      params.outcome as any,
      params.reason
    );
    logger.info('Validation result recorded', { resultId: result.id, ruleId: params.rule_id, outcome: result.outcome });
    return makeResult(result);
  }

  private getValidationRules(params: {
    checklist_id: string;
    item_id: string;
  }): ToolResult {
    const data = this.checklistService.getValidationRules(
      params.checklist_id,
      params.item_id
    );
    return makeResult(data);
  }

  private deleteValidationRule(params: {
    checklist_id: string;
    item_id: string;
    rule_id: string;
  }): ToolResult {
    const result = this.checklistService.deleteValidationRule(
      params.checklist_id,
      params.item_id,
      params.rule_id
    );
    logger.info('Validation rule deleted', { ruleId: params.rule_id });
    return makeResult(result);
  }
}
