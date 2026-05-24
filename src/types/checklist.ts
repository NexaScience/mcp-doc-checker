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

export interface SampleField {
  id: string;          // UUID v4
  fieldName: string;   // 例: "申請者氏名", "住所"
  required: boolean;   // この項目は必須入力か（デフォルト: true）
  description?: string; // 入力内容の説明・注意事項（例: "正式な氏名を記入"）
}

export interface ItemSample {
  id: string;              // UUID v4
  itemId: string;
  description: string;     // サンプルの説明（例: "2025年1月版 住民票サンプル"）
  filePath: string;        // サンプルファイルのパス（必須）
  requiredFields: SampleField[];  // 入力が必要な項目一覧（ファイルから自動抽出）
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionFieldResult {
  fieldName: string;
  required: boolean;
  status: 'filled' | 'unfilled';
}

export interface SubmissionValidationResult {
  outcome: 'pass' | 'fail';
  sampleId: string;
  submissionFilePath: string;
  fields: SubmissionFieldResult[];
  validatedAt: Date;
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
  samples: ItemSample[];                       // Default: []
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}
