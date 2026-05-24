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
