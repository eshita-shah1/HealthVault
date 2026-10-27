/**
 * Service registry.
 *
 * Exports the correct service implementation based on VITE_USE_MOCK.
 * Components and hooks import from here — never directly from mock/ or real service files.
 */
import { USE_MOCK } from '../config/api';

import { mockAuthService } from './mock/mockAuth';
import { mockDocumentService } from './mock/mockDocuments';
import { mockTimelineService } from './mock/mockTimeline';
import { mockExpenseService } from './mock/mockExpenses';
import { mockSummaryService } from './mock/mockSummaries';
import { mockSharingService } from './mock/mockSharing';
import { mockVaultService } from './mock/mockVault';
import { mockUserService } from './mock/mockUser';

import { authService as realAuth } from './auth';
import { documentService as realDoc } from './documents';
import { timelineService as realTimeline } from './timeline';
import { expenseService as realExpense } from './expenses';
import { summaryService as realSummary } from './summaries';
import { sharingService as realSharing } from './sharing';
import { vaultService as realVault } from './vault';
import { userService as realUser } from './users';

export const authService = USE_MOCK ? mockAuthService : realAuth;
export const documentService = USE_MOCK ? mockDocumentService : realDoc;
export const timelineService = USE_MOCK ? mockTimelineService : realTimeline;
export const expenseService = USE_MOCK ? mockExpenseService : realExpense;
export const summaryService = USE_MOCK ? mockSummaryService : realSummary;
export const sharingService = USE_MOCK ? mockSharingService : realSharing;
export const vaultService = USE_MOCK ? mockVaultService : realVault;
export const userService = USE_MOCK ? mockUserService : realUser;

export const Auth = authService;
export const Documents = documentService;
export const Timeline = timelineService;
export const Expenses = expenseService;
export const Summary = summaryService;
export const Sharing = sharingService;
export const VaultService = vaultService;
export const Users = userService;
