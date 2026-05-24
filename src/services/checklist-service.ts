import { v4 as uuidv4 } from 'uuid';
import {
  Checklist,
  ChecklistItem,
  ValidationRule,
  ValidationResult,
  ValidationType,
  ValidationOutcome
} from '../types/checklist';
import { MCPError } from '../utils/validator';
import { MCP_ERRORS } from '../core/constants';

const VALID_TYPES: ValidationType[] = [
  'file_uploaded',
  'no_masking_omission',
  'correct_document',
  'custom'
];

const VALID_OUTCOMES: ValidationOutcome[] = ['pass', 'fail'];

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
      validationRules: [],
      latestValidationResults: [],
      ...(description !== undefined ? { description } : {})
    };

    checklist.items.push(item);
    checklist.updatedAt = now;
    return item;
  }

  submitItem(
    checklistId: string,
    itemId: string,
    note?: string,
    forceSubmit: boolean = false
  ): ChecklistItem {
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

    // Validate rules if any exist and forceSubmit is false
    if (item.validationRules.length > 0 && !forceSubmit) {
      const failedRules: Array<{ ruleId: string; description: string; outcome: string }> = [];

      for (const rule of item.validationRules) {
        const result = item.latestValidationResults.find(r => r.ruleId === rule.id);
        if (!result) {
          failedRules.push({ ruleId: rule.id, description: rule.description, outcome: 'not_validated' });
        } else if (result.outcome === 'fail') {
          failedRules.push({ ruleId: rule.id, description: rule.description, outcome: 'fail' });
        }
      }

      if (failedRules.length > 0) {
        throw new MCPError({
          ...MCP_ERRORS.VALIDATION_ERROR,
          data: { reason: 'validation_not_passed', failedRules }
        });
      }
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

  // ---------------------------------------------------------------------------
  // Validation rule management
  // ---------------------------------------------------------------------------

  addValidationRule(
    checklistId: string,
    itemId: string,
    type: ValidationType,
    description: string
  ): ValidationRule {
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

    if (!VALID_TYPES.includes(type)) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Invalid type '${type}'. Must be one of: ${VALID_TYPES.join(', ')}`
      });
    }

    if (!description || description.trim() === '') {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `description must not be empty`
      });
    }

    const now = new Date();
    const rule: ValidationRule = {
      id: uuidv4(),
      itemId,
      type,
      description,
      createdAt: now,
      updatedAt: now
    };

    item.validationRules.push(rule);
    item.updatedAt = now;
    checklist.updatedAt = now;

    return rule;
  }

  recordValidationResult(
    checklistId: string,
    itemId: string,
    ruleId: string,
    outcome: ValidationOutcome,
    reason: string
  ): ValidationResult {
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

    const rule = item.validationRules.find(r => r.id === ruleId);
    if (!rule) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `ValidationRule with ID '${ruleId}' not found in item '${itemId}'`
      });
    }

    if (!VALID_OUTCOMES.includes(outcome)) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `Invalid outcome '${outcome}'. Must be one of: pass, fail`
      });
    }

    if (!reason || reason.trim() === '') {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `reason must not be empty`
      });
    }

    const now = new Date();
    const result: ValidationResult = {
      id: uuidv4(),
      itemId,
      ruleId,
      outcome,
      reason,
      validatedAt: now,
      createdAt: now
    };

    // latestValidationResults keeps only one result per ruleId
    const existingIndex = item.latestValidationResults.findIndex(r => r.ruleId === ruleId);
    if (existingIndex >= 0) {
      item.latestValidationResults[existingIndex] = result;
    } else {
      item.latestValidationResults.push(result);
    }

    item.updatedAt = now;
    checklist.updatedAt = now;

    return result;
  }

  getValidationRules(
    checklistId: string,
    itemId: string
  ): { rules: ValidationRule[]; results: ValidationResult[] } {
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

    return {
      rules: item.validationRules,
      results: item.latestValidationResults
    };
  }

  deleteValidationRule(
    checklistId: string,
    itemId: string,
    ruleId: string
  ): { deleted: boolean; ruleId: string } {
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

    const ruleIndex = item.validationRules.findIndex(r => r.id === ruleId);
    if (ruleIndex < 0) {
      throw new MCPError({
        ...MCP_ERRORS.VALIDATION_ERROR,
        data: `ValidationRule with ID '${ruleId}' not found in item '${itemId}'`
      });
    }

    item.validationRules.splice(ruleIndex, 1);

    // Remove associated results
    item.latestValidationResults = item.latestValidationResults.filter(r => r.ruleId !== ruleId);

    const now = new Date();
    item.updatedAt = now;
    checklist.updatedAt = now;

    return { deleted: true, ruleId };
  }
}
