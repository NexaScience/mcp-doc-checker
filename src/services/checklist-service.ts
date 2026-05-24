import { v4 as uuidv4 } from 'uuid';
import { Checklist, ChecklistItem } from '../types/checklist';
import { MCPError } from '../utils/validator';
import { MCP_ERRORS } from '../core/constants';

export class ChecklistService {
  private checklists: Map<string, Checklist> = new Map();

  createChecklist(name: string, description?: string): Checklist {
    const now = new Date();
    const checklist: Checklist = {
      id: uuidv4(),
      name,
      items: [],
      createdAt: now,
      updatedAt: now,
      ...(description !== undefined ? { description } : {})
    };
    this.checklists.set(checklist.id, checklist);
    return checklist;
  }

  getChecklistById(id: string): Checklist | undefined {
    return this.checklists.get(id);
  }

  listChecklists(): Checklist[] {
    return Array.from(this.checklists.values());
  }

  addItem(
    checklistId: string,
    name: string,
    description?: string,
    required: boolean = true
  ): ChecklistItem {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Checklist with ID '${checklistId}' not found`
      });
    }

    const now = new Date();
    const item: ChecklistItem = {
      id: uuidv4(),
      checklistId,
      name,
      required,
      status: 'not_submitted',
      createdAt: now,
      updatedAt: now,
      ...(description !== undefined ? { description } : {})
    };

    checklist.items.push(item);
    checklist.updatedAt = now;
    return item;
  }

  submitItem(checklistId: string, itemId: string, note?: string): ChecklistItem {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Checklist with ID '${checklistId}' not found`
      });
    }

    const item = checklist.items.find(i => i.id === itemId);
    if (!item) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Item with ID '${itemId}' not found in checklist '${checklistId}'`
      });
    }

    const now = new Date();
    // Idempotent: only update if not already submitted
    if (item.status !== 'submitted') {
      item.status = 'submitted';
      item.submittedAt = now;
    }
    if (note !== undefined) {
      item.note = note;
    }
    item.updatedAt = now;
    checklist.updatedAt = now;

    return item;
  }

  getMissingItems(checklistId: string): ChecklistItem[] {
    const checklist = this.checklists.get(checklistId);
    if (!checklist) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Checklist with ID '${checklistId}' not found`
      });
    }

    return checklist.items.filter(
      item => item.required && item.status === 'not_submitted'
    );
  }

  deleteChecklist(id: string): Checklist {
    const checklist = this.checklists.get(id);
    if (!checklist) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Checklist with ID '${id}' not found`
      });
    }
    this.checklists.delete(id);
    return checklist;
  }
}
