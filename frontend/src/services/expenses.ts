import apiClient from './api';
import { ENDPOINTS } from '../config/api';
import type { MedicalExpense, CreateExpenseRequest, ExpenseSummary } from '../types';

export const expenseService = {
  async list(vaultId: string, documentId?: string): Promise<MedicalExpense[]> {
    const res = await apiClient.get<MedicalExpense[]>(ENDPOINTS.EXPENSES, {
      params: { vault_id: vaultId, document_id: documentId },
    });
    return res.data;
  },
  async summary(vaultId: string): Promise<ExpenseSummary> {
    const res = await apiClient.get<ExpenseSummary>(ENDPOINTS.EXPENSES_SUMMARY, { params: { vault_id: vaultId } });
    return res.data;
  },
  async create(vaultId: string, req: CreateExpenseRequest): Promise<MedicalExpense> {
    const res = await apiClient.post<MedicalExpense>(ENDPOINTS.EXPENSES, req, { params: { vault_id: vaultId } });
    return res.data;
  },
  /** The backend refuses to delete an expense that was auto-extracted from a
   * document (400) — only manual entries can be deleted directly. */
  async delete(id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.EXPENSE_BY_ID(id));
  },
};
