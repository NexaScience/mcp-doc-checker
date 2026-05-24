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
