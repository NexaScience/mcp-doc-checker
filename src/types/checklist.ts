export type ItemStatus = 'submitted' | 'not_submitted';

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
}

export interface Checklist {
  id: string;
  name: string;
  description?: string;
  items: ChecklistItem[];
  createdAt: Date;
  updatedAt: Date;
}
