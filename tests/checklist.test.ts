// doc-parser モジュールをモック（ファイルI/Oを行わない）
jest.mock('../src/utils/doc-parser', () => ({
  validateFileExtension: jest.fn(),
  validateFileExists: jest.fn(),
  extractText: jest.fn(),
  extractPlaceholders: jest.fn(),
}));

import { validateFileExtension, validateFileExists, extractText, extractPlaceholders } from '../src/utils/doc-parser';
const mockValidateFileExtension = validateFileExtension as jest.Mock;
const mockValidateFileExists = validateFileExists as jest.Mock;
const mockExtractText = extractText as jest.Mock;
const mockExtractPlaceholders = extractPlaceholders as jest.Mock;

import { ChecklistService } from '../src/services/checklist-service';
import { MCPError } from '../src/utils/validator';

describe('ChecklistService', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  // ---------------------------------------------------------------------------
  // create_checklist
  // ---------------------------------------------------------------------------
  describe('createChecklist', () => {
    it('creates a checklist with name only', () => {
      const cl = service.createChecklist('Onboarding');
      expect(cl.id).toBeTruthy();
      expect(cl.name).toBe('Onboarding');
      expect(cl.items).toHaveLength(0);
      expect(cl.description).toBeUndefined();
    });

    it('creates a checklist with name and description', () => {
      const cl = service.createChecklist('Contract', 'Documents for contract signing');
      expect(cl.description).toBe('Documents for contract signing');
    });

    it('assigns unique IDs to separate checklists', () => {
      const a = service.createChecklist('A');
      const b = service.createChecklist('B');
      expect(a.id).not.toBe(b.id);
    });
  });

  // ---------------------------------------------------------------------------
  // add_item
  // ---------------------------------------------------------------------------
  describe('addItem', () => {
    it('adds an item with required=true by default', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'ID Card');
      expect(item.name).toBe('ID Card');
      expect(item.required).toBe(true);
      expect(item.status).toBe('not_submitted');
      expect(item.checklistId).toBe(cl.id);
    });

    it('adds an optional item when required=false is passed', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'Cover Letter', undefined, false);
      expect(item.required).toBe(false);
    });

    it('adds an item with description', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'Resume', 'PDF format preferred');
      expect(item.description).toBe('PDF format preferred');
    });

    it('throws VALIDATION_ERROR for unknown checklist_id', () => {
      expect(() => service.addItem('nonexistent-id', 'Doc')).toThrow(MCPError);
      try {
        service.addItem('nonexistent-id', 'Doc');
      } catch (e) {
        expect((e as MCPError).code).toBe(-32006);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // submit_item
  // ---------------------------------------------------------------------------
  describe('submitItem', () => {
    it('marks an item as submitted', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'ID Card');
      const updated = service.submitItem(cl.id, item.id);
      expect(updated.status).toBe('submitted');
      expect(updated.submittedAt).toBeInstanceOf(Date);
    });

    it('is idempotent: submitting twice does not throw and keeps status=submitted', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'ID Card');
      service.submitItem(cl.id, item.id);
      const second = service.submitItem(cl.id, item.id);
      expect(second.status).toBe('submitted');
    });

    it('records an optional note', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'Contract');
      const updated = service.submitItem(cl.id, item.id, 'Signed on 2026-05-25');
      expect(updated.note).toBe('Signed on 2026-05-25');
    });

    it('throws VALIDATION_ERROR for unknown checklist_id', () => {
      expect(() => service.submitItem('bad-cl-id', 'bad-item-id')).toThrow(MCPError);
    });

    it('throws VALIDATION_ERROR for unknown item_id', () => {
      const cl = service.createChecklist('HR');
      expect(() => service.submitItem(cl.id, 'bad-item-id')).toThrow(MCPError);
      try {
        service.submitItem(cl.id, 'bad-item-id');
      } catch (e) {
        expect((e as MCPError).code).toBe(-32006);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // get_missing
  // ---------------------------------------------------------------------------
  describe('getMissingItems', () => {
    it('returns required unsubmitted items only', () => {
      const cl = service.createChecklist('HR');
      const req1 = service.addItem(cl.id, 'ID Card', undefined, true);
      service.addItem(cl.id, 'Resume', undefined, true);
      service.addItem(cl.id, 'Cover Letter', undefined, false);  // optional
      service.submitItem(cl.id, req1.id);  // submit one required item

      const missing = service.getMissingItems(cl.id);
      expect(missing).toHaveLength(1);
      expect(missing[0].name).toBe('Resume');
    });

    it('returns empty array when all required items are submitted', () => {
      const cl = service.createChecklist('HR');
      const item = service.addItem(cl.id, 'ID Card', undefined, true);
      service.submitItem(cl.id, item.id);

      const missing = service.getMissingItems(cl.id);
      expect(missing).toHaveLength(0);
    });

    it('does NOT include optional (required=false) items even if not submitted', () => {
      const cl = service.createChecklist('HR');
      service.addItem(cl.id, 'Optional Doc', undefined, false);

      const missing = service.getMissingItems(cl.id);
      expect(missing).toHaveLength(0);
    });

    it('throws VALIDATION_ERROR for unknown checklist_id', () => {
      expect(() => service.getMissingItems('nonexistent')).toThrow(MCPError);
    });
  });

  // ---------------------------------------------------------------------------
  // list_checklists
  // ---------------------------------------------------------------------------
  describe('listChecklists', () => {
    it('returns empty array when no checklists exist', () => {
      expect(service.listChecklists()).toHaveLength(0);
    });

    it('returns all created checklists', () => {
      service.createChecklist('A');
      service.createChecklist('B');
      expect(service.listChecklists()).toHaveLength(2);
    });
  });

  // ---------------------------------------------------------------------------
  // delete_checklist
  // ---------------------------------------------------------------------------
  describe('deleteChecklist', () => {
    it('deletes an existing checklist', () => {
      const cl = service.createChecklist('Temp');
      service.deleteChecklist(cl.id);
      expect(service.getChecklistById(cl.id)).toBeUndefined();
    });

    it('throws VALIDATION_ERROR when deleting nonexistent checklist', () => {
      expect(() => service.deleteChecklist('nonexistent')).toThrow(MCPError);
      try {
        service.deleteChecklist('nonexistent');
      } catch (e) {
        expect((e as MCPError).code).toBe(-32006);
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Integration: full flow create → add → submit → get_missing
// ---------------------------------------------------------------------------
describe('Full checklist flow', () => {
  it('create_checklist → add_item × 3 → submit_item × 1 → get_missing returns 1', () => {
    const service = new ChecklistService();

    const cl = service.createChecklist('Employee Onboarding', 'Documents for day-1');
    const idCard = service.addItem(cl.id, 'ID Card', undefined, true);
    service.addItem(cl.id, 'Employment Contract', undefined, true);
    service.addItem(cl.id, 'Cover Letter', undefined, false);

    service.submitItem(cl.id, idCard.id, 'Submitted via HR portal');

    const missing = service.getMissingItems(cl.id);
    expect(missing).toHaveLength(1);
    expect(missing[0].name).toBe('Employment Contract');
    expect(missing[0].required).toBe(true);
    expect(missing[0].status).toBe('not_submitted');
  });
});

// ---------------------------------------------------------------------------
// addValidationRule
// ---------------------------------------------------------------------------
describe('addValidationRule', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('有効なアイテムにルールを追加できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'ID Card');
    const rule = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイルがアップロードされているか確認');
    expect(rule.id).toBeTruthy();
    expect(rule.itemId).toBe(item.id);
    expect(rule.type).toBe('file_uploaded');
    expect(rule.description).toBe('ファイルがアップロードされているか確認');
    expect(rule.createdAt).toBeInstanceOf(Date);
  });

  it('同一アイテムに複数ルールを追加できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Passport');
    service.addValidationRule(cl.id, item.id, 'file_uploaded', '書類がアップロードされているか');
    service.addValidationRule(cl.id, item.id, 'no_masking_omission', 'マスキング漏れがないか');
    const { rules } = service.getValidationRules(cl.id, item.id);
    expect(rules).toHaveLength(2);
  });

  it('存在しないchecklistIdでVALIDATION_ERROR', () => {
    expect(() =>
      service.addValidationRule('nonexistent', 'any-item', 'custom', 'description')
    ).toThrow(MCPError);
    try {
      service.addValidationRule('nonexistent', 'any-item', 'custom', 'description');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });

  it('存在しないitemIdでVALIDATION_ERROR', () => {
    const cl = service.createChecklist('HR');
    expect(() =>
      service.addValidationRule(cl.id, 'nonexistent-item', 'custom', 'description')
    ).toThrow(MCPError);
    try {
      service.addValidationRule(cl.id, 'nonexistent-item', 'custom', 'description');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });
});

// ---------------------------------------------------------------------------
// recordValidationResult
// ---------------------------------------------------------------------------
describe('recordValidationResult', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('pass を記録できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Resume');
    const rule = service.addValidationRule(cl.id, item.id, 'correct_document', '正しい書類か確認');
    const result = service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '確認済み');
    expect(result.outcome).toBe('pass');
    expect(result.ruleId).toBe(rule.id);
    expect(result.reason).toBe('確認済み');
    expect(result.validatedAt).toBeInstanceOf(Date);
  });

  it('fail を記録できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Contract');
    const rule = service.addValidationRule(cl.id, item.id, 'no_masking_omission', 'マスキング確認');
    const result = service.recordValidationResult(cl.id, item.id, rule.id, 'fail', '住所部分がマスクされていない');
    expect(result.outcome).toBe('fail');
  });

  it('同じruleIdで再度記録すると上書きされ件数が増えない', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'ID Card');
    const rule = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイル確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'fail', '最初はfail');
    service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '修正後pass');
    const { results } = service.getValidationRules(cl.id, item.id);
    expect(results).toHaveLength(1);
    expect(results[0].outcome).toBe('pass');
    expect(results[0].reason).toBe('修正後pass');
  });

  it('存在しないruleIdでVALIDATION_ERROR', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'ID Card');
    expect(() =>
      service.recordValidationResult(cl.id, item.id, 'nonexistent-rule', 'pass', 'some reason')
    ).toThrow(MCPError);
    try {
      service.recordValidationResult(cl.id, item.id, 'nonexistent-rule', 'pass', 'some reason');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });
});

// ---------------------------------------------------------------------------
// submit_item with validation
// ---------------------------------------------------------------------------
describe('submit_item with validation', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('ルールなしのアイテムは従来通り提出できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'No-rule doc');
    const submitted = service.submitItem(cl.id, item.id);
    expect(submitted.status).toBe('submitted');
  });

  it('ルールあり・全pass済みなら提出できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Passport');
    const rule = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイル確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '確認済み');
    const submitted = service.submitItem(cl.id, item.id);
    expect(submitted.status).toBe('submitted');
  });

  it('ルールあり・1件でも未検証なら-32006エラー', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Contract');
    service.addValidationRule(cl.id, item.id, 'correct_document', 'ドキュメント確認');
    expect(() => service.submitItem(cl.id, item.id)).toThrow(MCPError);
    try {
      service.submitItem(cl.id, item.id);
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
      expect((e as MCPError).data.reason).toBe('validation_not_passed');
      expect((e as MCPError).data.failedRules[0].outcome).toBe('not_validated');
    }
  });

  it('ルールあり・1件でもfailなら-32006エラー', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'ID Card');
    const rule = service.addValidationRule(cl.id, item.id, 'no_masking_omission', 'マスキング確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'fail', 'マスキング漏れあり');
    expect(() => service.submitItem(cl.id, item.id)).toThrow(MCPError);
    try {
      service.submitItem(cl.id, item.id);
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
      expect((e as MCPError).data.reason).toBe('validation_not_passed');
      expect((e as MCPError).data.failedRules[0].outcome).toBe('fail');
    }
  });

  it('force_submit=trueならfailでも提出できる', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Waiver');
    const rule = service.addValidationRule(cl.id, item.id, 'custom', '特別確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'fail', '問題あり');
    const submitted = service.submitItem(cl.id, item.id, undefined, true);
    expect(submitted.status).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// getValidationRules
// ---------------------------------------------------------------------------
describe('getValidationRules', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('ルール0件のアイテムで空配列を返す', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Empty Doc');
    const { rules, results } = service.getValidationRules(cl.id, item.id);
    expect(rules).toHaveLength(0);
    expect(results).toHaveLength(0);
  });

  it('ルールあり・一部未検証の場合', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Mixed Doc');
    const rule1 = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイル確認');
    service.addValidationRule(cl.id, item.id, 'correct_document', 'ドキュメント種別確認');
    service.recordValidationResult(cl.id, item.id, rule1.id, 'pass', '確認済み');
    const { rules, results } = service.getValidationRules(cl.id, item.id);
    expect(rules).toHaveLength(2);
    // Only rule1 has a result; rule2 is not validated
    expect(results).toHaveLength(1);
    expect(results[0].ruleId).toBe(rule1.id);
  });
});

// ---------------------------------------------------------------------------
// deleteValidationRule
// ---------------------------------------------------------------------------
describe('deleteValidationRule', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('存在するルールを削除すると紐づく結果も削除される', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'Passport');
    const rule = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイル確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '確認済み');
    const { deleted, ruleId } = service.deleteValidationRule(cl.id, item.id, rule.id);
    expect(deleted).toBe(true);
    expect(ruleId).toBe(rule.id);
    const { rules, results } = service.getValidationRules(cl.id, item.id);
    expect(rules).toHaveLength(0);
    expect(results).toHaveLength(0);
  });

  it('存在しないruleIdでVALIDATION_ERROR', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, 'ID Card');
    expect(() =>
      service.deleteValidationRule(cl.id, item.id, 'nonexistent-rule')
    ).toThrow(MCPError);
    try {
      service.deleteValidationRule(cl.id, item.id, 'nonexistent-rule');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });
});

// ---------------------------------------------------------------------------
// addSample
// ---------------------------------------------------------------------------
describe('addSample', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('サンプルをアイテムに追加できる（filePath省略時はフィールドなし）', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, '2025年1月版 住民票サンプル');
    expect(sample.id).toBeTruthy();
    expect(sample.itemId).toBe(item.id);
    expect(sample.description).toBe('2025年1月版 住民票サンプル');
    expect(sample.requiredFields).toHaveLength(0);
    expect(sample.createdAt).toBeInstanceOf(Date);
  });

  it('存在しない checklistId で VALIDATION_ERROR', async () => {
    await expect(service.addSample('nonexistent', 'any-item', 'desc')).rejects.toThrow(MCPError);
    await expect(service.addSample('nonexistent', 'any-item', 'desc')).rejects.toMatchObject({ code: -32006 });
  });

  it('存在しない itemId で VALIDATION_ERROR', async () => {
    const cl = service.createChecklist('HR');
    await expect(service.addSample(cl.id, 'nonexistent-item', 'desc')).rejects.toThrow(MCPError);
    await expect(service.addSample(cl.id, 'nonexistent-item', 'desc')).rejects.toMatchObject({ code: -32006 });
  });

  it('description が空で VALIDATION_ERROR', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    await expect(service.addSample(cl.id, item.id, '')).rejects.toThrow(MCPError);
    await expect(service.addSample(cl.id, item.id, '')).rejects.toMatchObject({ code: -32006 });
  });
});

// ---------------------------------------------------------------------------
// getSamples
// ---------------------------------------------------------------------------
describe('getSamples', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('サンプルがない場合は空配列を返す', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const samples = service.getSamples(cl.id, item.id);
    expect(samples).toHaveLength(0);
  });

  it('追加したサンプルが取得できる', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    await service.addSample(cl.id, item.id, 'サンプルA');
    await service.addSample(cl.id, item.id, 'サンプルB');
    const samples = service.getSamples(cl.id, item.id);
    expect(samples).toHaveLength(2);
    expect(samples[0].description).toBe('サンプルA');
    expect(samples[1].description).toBe('サンプルB');
  });
});

// ---------------------------------------------------------------------------
// addSampleField
// ---------------------------------------------------------------------------
describe('addSampleField', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('既存サンプルにフィールドを追加できる', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');
    const field = service.addSampleField(cl.id, item.id, sample.id, '申請者氏名');
    expect(field.id).toBeTruthy();
    expect(field.fieldName).toBe('申請者氏名');
    expect(field.required).toBe(true); // default
    const samples = service.getSamples(cl.id, item.id);
    expect(samples[0].requiredFields).toHaveLength(1);
  });

  it('required=false のフィールドを追加できる', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');
    const field = service.addSampleField(cl.id, item.id, sample.id, '備考', false, 'あれば記入');
    expect(field.required).toBe(false);
    expect(field.description).toBe('あれば記入');
  });

  it('存在しない sampleId で VALIDATION_ERROR', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    expect(() =>
      service.addSampleField(cl.id, item.id, 'nonexistent-sample', 'フィールド名')
    ).toThrow(MCPError);
    try {
      service.addSampleField(cl.id, item.id, 'nonexistent-sample', 'フィールド名');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });
});

// ---------------------------------------------------------------------------
// deleteSample
// ---------------------------------------------------------------------------
describe('deleteSample', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
  });

  it('サンプルを削除できる', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');
    const result = service.deleteSample(cl.id, item.id, sample.id);
    expect(result.deleted).toBe(true);
    expect(result.sampleId).toBe(sample.id);
  });

  it('削除後 getSamples で取得できない', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');
    service.deleteSample(cl.id, item.id, sample.id);
    const samples = service.getSamples(cl.id, item.id);
    expect(samples).toHaveLength(0);
  });

  it('存在しない sampleId で VALIDATION_ERROR', () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    expect(() =>
      service.deleteSample(cl.id, item.id, 'nonexistent-sample')
    ).toThrow(MCPError);
    try {
      service.deleteSample(cl.id, item.id, 'nonexistent-sample');
    } catch (e) {
      expect((e as MCPError).code).toBe(-32006);
    }
  });
});

// ---------------------------------------------------------------------------
// Full sample-based validation flow
// ---------------------------------------------------------------------------
describe('Full sample-based validation flow', () => {
  it('create_checklist → add_item → add_sample → add_validation_rule → record(pass) → submit_item → status=submitted', async () => {
    const service = new ChecklistService();
    const cl = service.createChecklist('住民票提出フロー');
    const item = service.addItem(cl.id, '住民票');

    // Add a sample without a file (no placeholders to extract)
    const sample = await service.addSample(cl.id, item.id, '2025年1月版サンプル');
    expect(sample.requiredFields).toHaveLength(0);

    // Add a custom validation rule referencing the sample
    const rule = service.addValidationRule(
      cl.id,
      item.id,
      'custom',
      'サンプルの全フィールドが記入されているか確認'
    );
    expect(rule.id).toBeTruthy();

    // Record a passing result
    service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '全フィールド記入済み');

    // Submit should succeed
    const submitted = service.submitItem(cl.id, item.id);
    expect(submitted.status).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// Full validation flow
// ---------------------------------------------------------------------------
describe('Full validation flow', () => {
  it('create → add_item → add_rule×2 → record(pass)×2 → submit → submitted', () => {
    const service = new ChecklistService();
    const cl = service.createChecklist('Contract Signing');
    const item = service.addItem(cl.id, '身分証明書');
    const rule1 = service.addValidationRule(cl.id, item.id, 'file_uploaded', 'ファイルがアップロードされているか');
    const rule2 = service.addValidationRule(cl.id, item.id, 'no_masking_omission', 'マスキング漏れがないか');
    service.recordValidationResult(cl.id, item.id, rule1.id, 'pass', 'ファイル確認済み');
    service.recordValidationResult(cl.id, item.id, rule2.id, 'pass', 'マスキング問題なし');
    const submitted = service.submitItem(cl.id, item.id);
    expect(submitted.status).toBe('submitted');
  });

  it('create → add_item → add_rule → record(fail) → submit blocked → record(pass) → submit → submitted', () => {
    const service = new ChecklistService();
    const cl = service.createChecklist('Onboarding');
    const item = service.addItem(cl.id, '雇用契約書');
    const rule = service.addValidationRule(cl.id, item.id, 'correct_document', '雇用契約書であるか確認');
    service.recordValidationResult(cl.id, item.id, rule.id, 'fail', '書類が間違っている');

    // Submit should be blocked
    let blocked = false;
    try {
      service.submitItem(cl.id, item.id);
    } catch (e) {
      blocked = true;
      expect((e as MCPError).code).toBe(-32006);
    }
    expect(blocked).toBe(true);
    expect(service.getChecklistById(cl.id)!.items[0].status).toBe('not_submitted');

    // Fix: re-record as pass
    service.recordValidationResult(cl.id, item.id, rule.id, 'pass', '正しい書類に差し替えた');
    const submitted = service.submitItem(cl.id, item.id);
    expect(submitted.status).toBe('submitted');
  });
});

// ---------------------------------------------------------------------------
// addSample with file parsing
// ---------------------------------------------------------------------------
describe('addSample with file parsing', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
    // デフォルトでモックをリセットし、正常動作を設定
    mockValidateFileExtension.mockReset();
    mockValidateFileExists.mockReset();
    mockExtractText.mockReset();
    mockExtractPlaceholders.mockReset();
    // デフォルト: バリデーション通過、空テキスト、空プレースホルダー
    mockValidateFileExtension.mockImplementation(() => { /* no-op = valid */ });
    mockValidateFileExists.mockImplementation(() => { /* no-op = exists */ });
    mockExtractText.mockResolvedValue('');
    mockExtractPlaceholders.mockReturnValue([]);
  });

  it('.docx ファイルを指定するとプレースホルダーが自動抽出される', async () => {
    mockExtractText.mockResolvedValue('{{氏名}} {{住所}}');
    mockExtractPlaceholders.mockReturnValue(['氏名', '住所']);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.docx');

    expect(sample.requiredFields).toHaveLength(2);
    expect(sample.requiredFields[0].fieldName).toBe('氏名');
    expect(sample.requiredFields[0].required).toBe(true);
    expect(sample.requiredFields[1].fieldName).toBe('住所');
    expect(sample.requiredFields[1].required).toBe(true);
    expect(sample.filePath).toBe('/path/to/sample.docx');
  });

  it('.xlsx ファイルを指定するとプレースホルダーが自動抽出される', async () => {
    mockExtractText.mockResolvedValue('{{会社名}} {{担当者}}');
    mockExtractPlaceholders.mockReturnValue(['会社名', '担当者']);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '申請書');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.xlsx');

    expect(sample.requiredFields).toHaveLength(2);
    expect(sample.requiredFields[0].fieldName).toBe('会社名');
    expect(sample.requiredFields[1].fieldName).toBe('担当者');
    expect(sample.filePath).toBe('/path/to/sample.xlsx');
  });

  it('プレースホルダーが0件でもエラーにならない（空のrequiredFields）', async () => {
    mockExtractText.mockResolvedValue('プレースホルダーなしのテキスト');
    mockExtractPlaceholders.mockReturnValue([]);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.docx');

    expect(sample.requiredFields).toHaveLength(0);
  });

  it('同一プレースホルダーが重複しても1件のみ登録される', async () => {
    mockExtractText.mockResolvedValue('{{氏名}} {{住所}} {{氏名}}');
    // extractPlaceholders 自体が重複除去を行うので、モックでも1件のみ返す
    mockExtractPlaceholders.mockReturnValue(['氏名', '住所']);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.docx');

    expect(sample.requiredFields).toHaveLength(2);
  });

  it('拡張子エラー（.pdf等）でVALIDATION_ERROR', async () => {
    mockValidateFileExtension.mockImplementation(() => {
      throw new Error('Unsupported file type: .pdf. Only .docx and .xlsx are allowed.');
    });

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    await expect(
      service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.pdf')
    ).rejects.toMatchObject({ code: -32006 });
  });

  it('ファイル未存在でVALIDATION_ERROR', async () => {
    mockValidateFileExists.mockImplementation(() => {
      throw new Error('File not found: /path/to/missing.docx');
    });

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    await expect(
      service.addSample(cl.id, item.id, 'サンプル', '/path/to/missing.docx')
    ).rejects.toMatchObject({ code: -32006 });
  });

  it('file_pathを省略するとフィールド抽出なし（エラーにならない）', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');

    // filePath省略の場合はファイルI/Oが呼ばれない
    expect(mockExtractText).not.toHaveBeenCalled();
    expect(sample.requiredFields).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// validateSubmission
// ---------------------------------------------------------------------------
describe('validateSubmission', () => {
  let service: ChecklistService;

  beforeEach(() => {
    service = new ChecklistService();
    mockValidateFileExtension.mockReset();
    mockValidateFileExists.mockReset();
    mockExtractText.mockReset();
    mockExtractPlaceholders.mockReset();
    mockValidateFileExtension.mockImplementation(() => { /* no-op = valid */ });
    mockValidateFileExists.mockImplementation(() => { /* no-op = exists */ });
    mockExtractText.mockResolvedValue('');
    mockExtractPlaceholders.mockReturnValue([]);
  });

  async function setupSampleWithFields(fieldNames: string[]): Promise<{ checklistId: string; itemId: string; sampleId: string }> {
    // サンプルをファイルから作成し、フィールドをモックで注入
    mockExtractText.mockResolvedValueOnce(fieldNames.map(n => `{{${n}}}`).join(' '));
    mockExtractPlaceholders.mockReturnValueOnce(fieldNames);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '住民票');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.docx');
    return { checklistId: cl.id, itemId: item.id, sampleId: sample.id };
  }

  it('全フィールドが埋まっている提出書類 → outcome: "pass"', async () => {
    const { checklistId, itemId, sampleId } = await setupSampleWithFields(['氏名', '住所']);

    // 提出書類にはプレースホルダーが残っていない（埋められた状態）
    mockExtractText.mockResolvedValue('山田太郎 東京都千代田区1-1');
    mockExtractPlaceholders.mockReturnValue([]);

    const result = await service.validateSubmission(checklistId, itemId, sampleId, '/path/to/submission.docx');

    expect(result.outcome).toBe('pass');
    expect(result.sampleId).toBe(sampleId);
    expect(result.submissionFilePath).toBe('/path/to/submission.docx');
    expect(result.fields).toHaveLength(2);
    expect(result.fields.every(f => f.status === 'filled')).toBe(true);
    expect(result.validatedAt).toBeInstanceOf(Date);
  });

  it('1件以上のプレースホルダーが残っている → outcome: "fail"', async () => {
    const { checklistId, itemId, sampleId } = await setupSampleWithFields(['氏名', '住所']);

    // 提出書類に {{住所}} プレースホルダーがまだ残っている
    mockExtractText.mockResolvedValue('山田太郎 {{住所}}');

    const result = await service.validateSubmission(checklistId, itemId, sampleId, '/path/to/submission.docx');

    expect(result.outcome).toBe('fail');
    const addrField = result.fields.find(f => f.fieldName === '住所');
    expect(addrField?.status).toBe('unfilled');
    const nameField = result.fields.find(f => f.fieldName === '氏名');
    expect(nameField?.status).toBe('filled');
  });

  it('required=false のフィールドが未入力でも他が全部埋まっていれば → pass', async () => {
    // required=false のフィールドをサンプルに追加するにはaddSampleFieldを使う
    mockExtractText.mockResolvedValueOnce('{{氏名}}');
    mockExtractPlaceholders.mockReturnValueOnce(['氏名']);

    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル', '/path/to/sample.docx');
    // required=false のフィールドを手動追加
    service.addSampleField(cl.id, item.id, sample.id, '備考', false);

    // 提出書類: 氏名は埋まっているが備考プレースホルダーが残っている
    mockExtractText.mockResolvedValue('山田太郎 {{備考}}');

    const result = await service.validateSubmission(cl.id, item.id, sample.id, '/path/to/submission.docx');

    // required=true の「氏名」は filled → pass
    expect(result.outcome).toBe('pass');
    const bikoField = result.fields.find(f => f.fieldName === '備考');
    expect(bikoField?.status).toBe('unfilled');
    expect(bikoField?.required).toBe(false);
  });

  it('requiredFieldsが空のサンプル → outcome: "pass"', async () => {
    // フィールドなしのサンプル
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');

    mockExtractText.mockResolvedValue('何かテキスト');

    const result = await service.validateSubmission(cl.id, item.id, sample.id, '/path/to/submission.docx');

    expect(result.outcome).toBe('pass');
    expect(result.fields).toHaveLength(0);
  });

  it('存在しないsampleIdでVALIDATION_ERROR', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');

    await expect(
      service.validateSubmission(cl.id, item.id, 'nonexistent-sample', '/path/to/submission.docx')
    ).rejects.toMatchObject({ code: -32006 });
  });

  it('提出書類が.pdf等の不正拡張子でVALIDATION_ERROR', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');

    mockValidateFileExtension.mockImplementation(() => {
      throw new Error('Unsupported file type: .pdf. Only .docx and .xlsx are allowed.');
    });

    await expect(
      service.validateSubmission(cl.id, item.id, sample.id, '/path/to/submission.pdf')
    ).rejects.toMatchObject({ code: -32006 });
  });

  it('提出書類ファイルが未存在でVALIDATION_ERROR', async () => {
    const cl = service.createChecklist('HR');
    const item = service.addItem(cl.id, '書類');
    const sample = await service.addSample(cl.id, item.id, 'サンプル');

    mockValidateFileExists.mockImplementation(() => {
      throw new Error('File not found: /path/to/missing.docx');
    });

    await expect(
      service.validateSubmission(cl.id, item.id, sample.id, '/path/to/missing.docx')
    ).rejects.toMatchObject({ code: -32006 });
  });
});
