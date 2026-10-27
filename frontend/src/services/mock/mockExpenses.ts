import { mockRequest } from './mockClient';
import { MOCK_EXPENSES } from './mockData';
import type { MedicalExpense, CreateExpenseRequest, ExpenseSummary } from '../../types';

let expenses = [...MOCK_EXPENSES];

export const mockExpenseService = {
  async list(_vaultId: string, documentId?: string): Promise<MedicalExpense[]> {
    return mockRequest(() => {
      const result = documentId ? expenses.filter(e => e.document_id === documentId) : [...expenses];
      return result.sort((a, b) => b.expense_date.localeCompare(a.expense_date));
    });
  },

  async summary(_vaultId: string): Promise<ExpenseSummary> {
    return mockRequest(() => {
      const total = expenses.reduce((s, e) => s + e.amount, 0);
      const byCategory: Record<string, number> = {};
      for (const e of expenses) byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;

      const now = new Date();
      const byMonth = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
        const monthStr = d.toISOString().slice(0, 7);
        const label = d.toLocaleString('default', { month: 'short' });
        const amount = expenses.filter(e => e.expense_date.startsWith(monthStr)).reduce((s, e) => s + e.amount, 0);
        return { month: label, amount };
      });

      const thisMonth = now.toISOString().slice(0, 7);
      const thisYear = now.toISOString().slice(0, 4);

      return {
        total,
        current_month_total: expenses.filter(e => e.expense_date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0),
        current_year_total: expenses.filter(e => e.expense_date.startsWith(thisYear)).reduce((s, e) => s + e.amount, 0),
        insurance_covered: expenses.reduce((s, e) => s + e.insurance_covered, 0),
        out_of_pocket: expenses.reduce((s, e) => s + e.patient_paid, 0),
        by_category: byCategory,
        by_month: byMonth,
      };
    });
  },

  async create(vaultId: string, req: CreateExpenseRequest): Promise<MedicalExpense> {
    return mockRequest(() => {
      const expense: MedicalExpense = {
        id: `exp-${Date.now()}`,
        vault_id: vaultId,
        expense_date: req.expense_date,
        category: req.category,
        hospital_name: req.hospital_name,
        amount: req.amount,
        currency: 'INR',
        insurance_covered: req.insurance_covered ?? 0,
        patient_paid: req.patient_paid ?? req.amount,
        notes: req.notes,
        created_at: new Date().toISOString(),
        items: [],
      };
      expenses = [expense, ...expenses];
      return expense;
    });
  },

  async delete(id: string): Promise<void> {
    return mockRequest(() => {
      expenses = expenses.filter(e => e.id !== id);
    });
  },
};
