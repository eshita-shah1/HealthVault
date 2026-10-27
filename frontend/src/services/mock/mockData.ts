import {
  DocumentType,
  ExpenseCategory,
  ProcessingStatus,
  ResultFlag,
  ShareStatus,
  TimelineEventType,
  ValidationStatus,
  VaultRole,
  type Diagnosis,
  type Document,
  type HealthSummary,
  type LabReport,
  type MedicalExpense,
  type Prescription,
  type SharedAccess,
  type TimelineEvent,
  type User,
  type Vault,
} from '../../types';

// ─────────────────────────────────────────────
// Seed user / vault
// ─────────────────────────────────────────────
export const MOCK_USER: User = {
  id: 'user-001',
  email: 'eshita@healthvault.io',
  full_name: 'Eshita Shah',
  phone: '+91 98765 43210',
  date_of_birth: '1995-03-12',
  is_active: true,
  created_at: '2025-01-15T10:00:00Z',
};

export const MOCK_VAULT: Vault = {
  id: 'vault-001',
  owner_id: 'user-001',
  name: "Eshita Shah's Health Vault",
  created_at: '2025-01-15T10:00:00Z',
};

// ─────────────────────────────────────────────
// Documents
// ─────────────────────────────────────────────
export const MOCK_DOCUMENTS: Document[] = [
  {
    id: 'doc-001',
    vault_id: 'vault-001',
    original_filename: 'Blood Test Report.pdf',
    file_size_bytes: 524288,
    mime_type: 'application/pdf',
    document_type: DocumentType.LAB_REPORT,
    processing_status: ProcessingStatus.PROCESSED,
    classification_confidence: 0.96,
    document_date: '2025-09-12',
    is_archived: false,
    created_at: '2025-09-12T09:30:00Z',
  },
  {
    id: 'doc-002',
    vault_id: 'vault-001',
    original_filename: 'Consultation - Dr. Mehta.pdf',
    file_size_bytes: 204800,
    mime_type: 'application/pdf',
    document_type: DocumentType.CONSULTATION,
    processing_status: ProcessingStatus.PROCESSED,
    classification_confidence: 0.91,
    document_date: '2025-09-05',
    is_archived: false,
    created_at: '2025-09-05T11:00:00Z',
  },
  {
    id: 'doc-003',
    vault_id: 'vault-001',
    original_filename: 'Prescription.jpg',
    file_size_bytes: 350000,
    mime_type: 'image/jpeg',
    document_type: DocumentType.PRESCRIPTION,
    processing_status: ProcessingStatus.PROCESSED,
    classification_confidence: 0.88,
    document_date: '2025-08-28',
    is_archived: false,
    created_at: '2025-08-28T15:00:00Z',
  },
  {
    id: 'doc-004',
    vault_id: 'vault-001',
    original_filename: 'Hospital Bill - Apollo.pdf',
    file_size_bytes: 180000,
    mime_type: 'application/pdf',
    document_type: DocumentType.MEDICAL_BILL,
    processing_status: ProcessingStatus.PROCESSED,
    classification_confidence: 0.99,
    document_date: '2025-08-14',
    is_archived: false,
    created_at: '2025-08-14T18:00:00Z',
  },
  {
    id: 'doc-009',
    vault_id: 'vault-001',
    original_filename: 'Insurance Document.pdf',
    file_size_bytes: 680000,
    mime_type: 'application/pdf',
    document_type: DocumentType.INSURANCE_DOCUMENT,
    processing_status: ProcessingStatus.NEEDS_REVIEW,
    classification_confidence: 0.72,
    document_date: '2025-07-01',
    is_archived: false,
    created_at: '2025-07-01T12:00:00Z',
  },
  {
    id: 'doc-010',
    vault_id: 'vault-001',
    original_filename: 'X-Ray Report.pdf',
    file_size_bytes: 1200000,
    mime_type: 'application/pdf',
    document_type: DocumentType.SCAN_REPORT,
    processing_status: ProcessingStatus.PROCESSING,
    document_date: '2025-09-20',
    is_archived: false,
    created_at: '2025-09-20T08:00:00Z',
  },
];

// ─────────────────────────────────────────────
// Lab Reports
// ─────────────────────────────────────────────
export const MOCK_LAB_REPORTS: Record<string, LabReport> = {
  'doc-001': {
    id: 'lab-001',
    document_id: 'doc-001',
    doctor_name: 'Dr. Mehta',
    laboratory_name: 'Apollo Diagnostics',
    report_date: '2025-09-12',
    results: [
      { id: 'r1', test_name_raw: 'TSH', test_name_normalized: 'tsh', result_value_raw: '6.2', unit_raw: 'mIU/L', reference_range_raw: '0.4-4.0', flag: ResultFlag.HIGH, validation_status: ValidationStatus.VALID },
      { id: 'r4', test_name_raw: 'HbA1c', test_name_normalized: 'hba1c', result_value_raw: '7.2', unit_raw: '%', reference_range_raw: '<5.7', flag: ResultFlag.HIGH, validation_status: ValidationStatus.VALID },
      { id: 'r5', test_name_raw: 'Glucose (Fasting)', test_name_normalized: 'blood_glucose_fasting', result_value_raw: '145', unit_raw: 'mg/dL', reference_range_raw: '70-100', flag: ResultFlag.HIGH, validation_status: ValidationStatus.VALID },
      { id: 'r6', test_name_raw: 'Hemoglobin', test_name_normalized: 'hemoglobin', result_value_raw: '13.4', unit_raw: 'g/dL', reference_range_raw: '12.0-16.0', flag: ResultFlag.NORMAL, validation_status: ValidationStatus.VALID },
    ],
  },
};

// ─────────────────────────────────────────────
// Prescriptions
// ─────────────────────────────────────────────
export const MOCK_PRESCRIPTIONS: Record<string, Prescription> = {
  'doc-003': {
    id: 'pres-001',
    document_id: 'doc-003',
    doctor_name: 'Dr. Mehta',
    prescription_date: '2025-08-28',
    medicines: [
      { id: 'm1', medicine_name_raw: 'Metformin', medicine_name_normalized: 'Metformin', dosage_raw: '500mg', frequency_normalized: 'Twice daily', duration_raw: '3 months', instructions: 'After meals', validation_status: ValidationStatus.VALID },
      { id: 'm2', medicine_name_raw: 'Levothyroxine', medicine_name_normalized: 'Levothyroxine', dosage_raw: '50mcg', frequency_normalized: 'Once daily', duration_raw: '3 months', instructions: 'Empty stomach, 30 min before breakfast', validation_status: ValidationStatus.VALID },
    ],
  },
};

// ─────────────────────────────────────────────
// Diagnoses
// ─────────────────────────────────────────────
export const MOCK_DIAGNOSES: Diagnosis[] = [
  { id: 'd1', document_id: 'doc-002', condition_raw: 'Hypothyroidism', condition_normalized: 'hypothyroidism', doctor_name: 'Dr. Mehta', diagnosis_date: '2025-09-05', notes: 'Subclinical - TSH elevated', validation_status: ValidationStatus.VALID },
];

// ─────────────────────────────────────────────
// Timeline
// ─────────────────────────────────────────────
export const MOCK_TIMELINE: TimelineEvent[] = [
  { id: 'tl-001', vault_id: 'vault-001', event_date: '2025-09-12', event_type: TimelineEventType.LAB_TEST, title: 'Blood Test Report', description: 'Thyroid Function Test - TSH, T3, T4', document_id: 'doc-001', created_at: '2025-09-12T09:30:00Z' },
  { id: 'tl-002', vault_id: 'vault-001', event_date: '2025-09-05', event_type: TimelineEventType.CONSULTATION, title: 'Doctor Consultation - Dr. Mehta', description: 'Follow-up for thyroid management', document_id: 'doc-002', created_at: '2025-09-05T11:00:00Z' },
  { id: 'tl-003', vault_id: 'vault-001', event_date: '2025-08-28', event_type: TimelineEventType.PRESCRIPTION, title: 'Prescription - Dr. Mehta', description: 'Metformin 500mg, Levothyroxine 50mcg', document_id: 'doc-003', created_at: '2025-08-28T15:00:00Z' },
  { id: 'tl-004', vault_id: 'vault-001', event_date: '2025-08-14', event_type: TimelineEventType.MEDICAL_EXPENSE, title: 'Medical Expense - Apollo Hospital', description: 'INR 9,200.00', document_id: 'doc-004', created_at: '2025-08-14T18:00:00Z' },
];

// ─────────────────────────────────────────────
// Expenses
// ─────────────────────────────────────────────
export const MOCK_EXPENSES: MedicalExpense[] = [
  { id: 'exp-001', vault_id: 'vault-001', document_id: 'doc-004', expense_date: '2025-08-14', category: ExpenseCategory.HOSPITALIZATION, hospital_name: 'Apollo Hospital', amount: 9200, currency: 'INR', insurance_covered: 5000, patient_paid: 4200, created_at: '2025-08-14T18:00:00Z', items: [] },
  { id: 'exp-002', vault_id: 'vault-001', document_id: 'doc-003', expense_date: '2025-08-28', category: ExpenseCategory.MEDICINE, hospital_name: 'MedPlus Pharmacy', amount: 2350, currency: 'INR', insurance_covered: 0, patient_paid: 2350, created_at: '2025-08-28T15:00:00Z', items: [] },
  { id: 'exp-003', vault_id: 'vault-001', document_id: 'doc-002', expense_date: '2025-09-05', category: ExpenseCategory.DOCTOR_CONSULTATION, hospital_name: 'Mehta Clinic', amount: 800, currency: 'INR', insurance_covered: 0, patient_paid: 800, created_at: '2025-09-05T11:00:00Z', items: [] },
  { id: 'exp-004', vault_id: 'vault-001', document_id: 'doc-001', expense_date: '2025-09-12', category: ExpenseCategory.LAB_TEST, hospital_name: 'Apollo Diagnostics', amount: 2000, currency: 'INR', insurance_covered: 0, patient_paid: 2000, created_at: '2025-09-12T09:30:00Z', items: [] },
];

// ─────────────────────────────────────────────
// Health Summary
// ─────────────────────────────────────────────
export const MOCK_HEALTH_SUMMARY: HealthSummary = {
  id: 'summary-001',
  vault_id: 'vault-001',
  version: 1,
  summary_text:
    'The patient has a known history of Hypothyroidism, currently managed with Levothyroxine. Recent lab investigations from September 2025 indicate elevated TSH (6.2 mIU/L) and borderline HbA1c (7.2%), suggesting suboptimal thyroid and glycemic control. Regular follow-ups with Dr. Mehta are ongoing.',
  model_used: 'mock',
  created_at: '2025-09-12T10:00:00Z',
  structured_data: {
    known_conditions: [{ condition: 'hypothyroidism', date: '2025-09-05', source_document_id: 'doc-002' }],
    recent_investigations: [
      { test_name: 'tsh', result: '6.2', unit: 'mIU/L', flag: ResultFlag.HIGH, date: '2025-09-12', source_document_id: 'doc-001' },
      { test_name: 'hba1c', result: '7.2', unit: '%', flag: ResultFlag.HIGH, date: '2025-09-12', source_document_id: 'doc-001' },
    ],
    current_medications: [
      { medicine: 'Levothyroxine', dosage: '50mcg', frequency: 'Once daily', source_document_id: 'doc-003' },
      { medicine: 'Metformin', dosage: '500mg', frequency: 'Twice daily', source_document_id: 'doc-003' },
    ],
    recent_consultations: [{ date: '2025-09-05', doctor: 'Dr. Mehta', source_document_id: 'doc-002' }],
    recent_medical_events: [{ date: '2025-09-12', type: TimelineEventType.LAB_TEST, title: 'Blood Test Report' }],
    recent_expenses_total: 18450,
    available_documents: MOCK_DOCUMENTS.length,
  },
};

// ─────────────────────────────────────────────
// Shared Access
// ─────────────────────────────────────────────
export const MOCK_SHARED_ACCESS: SharedAccess[] = [
  {
    id: 'share-001',
    vault_id: 'vault-001',
    owner_id: 'user-001',
    shared_with_email: 'dr.mehta@example.com',
    role: VaultRole.DOCTOR,
    allowed_document_types: [DocumentType.LAB_REPORT, DocumentType.PRESCRIPTION, DocumentType.DIAGNOSIS],
    status: ShareStatus.ACTIVE,
    expires_at: '2025-10-12T00:00:00Z',
    created_at: '2025-09-12T10:00:00Z',
  },
];
