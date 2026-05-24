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
    description: 'Records a document as submitted (idempotent)',
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
  }): ToolResult {
    const item = this.checklistService.submitItem(
      params.checklist_id,
      params.item_id,
      params.note
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
}
