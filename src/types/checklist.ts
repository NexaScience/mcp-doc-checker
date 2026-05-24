export type ItemStatus = 'submitted' | 'not_submitted';

export type ValidationType =
  | 'file_uploaded'
  | 'no_masking_omission'
  | 'correct_document'
  | 'custom';

export interface ValidationRule {
  id: string;         // UUID v4
  itemId: string;
  type: ValidationType;
  description: string;  // Natural language description of what Claude should confirm
  createdAt: Date;
  updatedAt: Date;
}

export type ValidationOutcome = 'pass' | 'fail';

export interface ValidationResult {
  id: string;
  itemId: string;
  ruleId: string;
  outcome: ValidationOutcome;
  reason: string;       // Confirmation basis / details
  validatedAt: Date;
  createdAt: Date;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  name: string;
  description?: string;
  required: boolean;
  status: ItemStatus;
  note?: string;
  submittedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  validationRules: ValidationRule[];           // Default: []
  latestValidationResults: ValidationResult[]; // Default: []
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}
