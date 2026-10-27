import { useState } from 'react';
import { DollarSign, Plus, Trash2, IndianRupee } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { useExpenses } from '../hooks/index';
import { getErrorMessage } from '../services/api';
import { StatCard } from '../components/dashboard/StatCard';
import { EmptyState, ErrorState, SkeletonCard, Modal } from '../components/ui/index';
import { ExpenseCategory } from '../types';
import type { CreateExpenseRequest } from '../types';

const PIE_COLORS = ['#087443', '#0E7490', '#7C3AED', '#B45309', '#DC2626', '#6B7280', '#0369A1'];

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.DOCTOR_CONSULTATION]: 'Doctor Consultations',
  [ExpenseCategory.MEDICINE]:            'Medicines',
  [ExpenseCategory.LAB_TEST]:            'Lab Tests',
  [ExpenseCategory.SCAN]:                'Scans',
  [ExpenseCategory.HOSPITALIZATION]:     'Hospitalization',
  [ExpenseCategory.SURGERY]:             'Surgery',
  [ExpenseCategory.OTHER]:               'Other',
};

const EMPTY_FORM: CreateExpenseRequest = {
  expense_date: new Date().toISOString().slice(0,10),
  category: ExpenseCategory.DOCTOR_CONSULTATION,
  hospital_name: '',
  amount: 0,
  insurance_covered: 0,
  patient_paid: 0,
  notes: '',
};

export default function Expenses() {
  const { listState, summaryState, create, remove } = useExpenses();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState<CreateExpenseRequest>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const summary = summaryState.status === 'success' ? summaryState.data : null;
  const expenses = listState.status === 'success' ? listState.data : [];

  const pieData = summary
    ? Object.entries(summary.by_category)
        .map(([category, value]) => ({ name: CATEGORY_LABELS[category as ExpenseCategory] ?? category, value: value ?? 0 }))
        .filter(d => d.value > 0)
    : [];

  const setField = <K extends keyof CreateExpenseRequest>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const v = e.target.type === 'number' ? Number(e.target.value) : e.target.value;
      setForm(p => ({ ...p, [k]: v }));
    };

  const handleSave = async () => {
    setSaving(true);
    setFormError(null);
    try {
      await create({ ...form, patient_paid: form.amount - (form.insurance_covered ?? 0) });
      setAddOpen(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Failed to save expense.'));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    setDeleteError(null);
    try {
      await remove(id);
    } catch (err) {
      setDeleteError(getErrorMessage(err, 'Failed to delete expense.'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Medical Expenses</h1>
          <p className="page-subtitle">Track and analyse your medical expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddOpen(true)} id="add-expense-btn"><Plus size={16} /> Add Expense</button>
      </div>

      {/* Summary cards */}
      {summaryState.status === 'loading' && <div className="stat-cards-grid">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>}
      {summaryState.status === 'error' && <ErrorState message={summaryState.error} />}
      {summaryState.status === 'success' && summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard icon={IndianRupee} label="Total Expenses"       value={`₹${summary.total.toLocaleString('en-IN')}`} iconBg="var(--color-primary-light)" iconColor="var(--color-primary)" />
          <StatCard icon={IndianRupee} label="This Month"           value={`₹${summary.current_month_total.toLocaleString('en-IN')}`} iconBg="var(--color-lab-bg)" iconColor="var(--color-lab)" />
          <StatCard icon={IndianRupee} label="Insurance Covered"    value={`₹${summary.insurance_covered.toLocaleString('en-IN')}`} iconBg="var(--color-success-bg)" iconColor="var(--color-success)" />
          <StatCard icon={IndianRupee} label="Out of Pocket"        value={`₹${summary.out_of_pocket.toLocaleString('en-IN')}`} iconBg="var(--color-prescription-bg)" iconColor="var(--color-prescription)" />
        </div>
      )}

      {/* Charts */}
      {summaryState.status === 'success' && summary && (
        <div className="charts-grid">
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 600 }}>Expense Overview</h2>
              <span className="badge badge-neutral">Last 6 months</span>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={summary.by_month} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: unknown) => [`₹${(Number(v) || 0).toLocaleString('en-IN')}`, 'Amount']} contentStyle={{ borderRadius: 10, border: '1px solid var(--color-border)', fontSize: 13 }} />
                <Bar dataKey="amount" fill="var(--color-primary)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h2 style={{ fontWeight: 600, marginBottom: 20 }}>Expense Breakdown</h2>
            {pieData.length === 0 ? (
              <p className="empty-state-desc" style={{ textAlign: 'center', padding: '48px 0' }}>No category breakdown yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => [`₹${(Number(v) || 0).toLocaleString('en-IN')}`, '']} contentStyle={{ borderRadius: 10, fontSize: 13 }} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* Expense list */}
      <div className="card" style={{ marginTop: 24 }}>
        <h2 style={{ fontWeight: 600, marginBottom: 16 }}>All Expenses</h2>
        {deleteError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{deleteError}</div>}
        {listState.status === 'loading' && <SkeletonCard />}
        {listState.status === 'error' && <ErrorState message={listState.error} />}
        {listState.status === 'success' && expenses.length === 0 && (
          <EmptyState icon={DollarSign} title="No expenses recorded yet" description="Add your first medical expense to start tracking." action={<button className="btn btn-primary" onClick={() => setAddOpen(true)}>Add Expense</button>} />
        )}
        {listState.status === 'success' && expenses.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table className="lab-table" style={{ width: '100%' }} aria-label="Expense list">
              <thead><tr><th>Date</th><th>Category</th><th>Hospital / Pharmacy</th><th>Amount</th><th>Insurance</th><th>You Paid</th><th></th></tr></thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>{new Date(e.expense_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</td>
                    <td><span className="badge badge-neutral" style={{ fontSize: 11 }}>{CATEGORY_LABELS[e.category]}</span></td>
                    <td>{e.hospital_name ?? '—'}</td>
                    <td style={{ fontWeight: 600 }}>₹{e.amount.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--color-text-muted)' }}>{e.insurance_covered ? `₹${e.insurance_covered.toLocaleString('en-IN')}` : '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-primary)' }}>₹{e.patient_paid.toLocaleString('en-IN')}</td>
                    <td>
                      {!e.document_id && (
                        <button className="btn btn-ghost btn-icon" onClick={() => handleRemove(e.id)} aria-label="Delete expense" title="Delete expense">
                          <Trash2 size={14} style={{ color: 'var(--color-error)' }} />
                        </button>
                      )}
                      {e.document_id && (
                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }} title="Extracted from a document — delete the source document to remove it">From document</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {addOpen && (
        <Modal title="Add Expense" onClose={() => setAddOpen(false)} footer={
          <><button className="btn btn-secondary" onClick={() => setAddOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Expense'}</button></>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {formError && <div className="alert alert-error">{formError}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="label" htmlFor="exp-date">Date</label>
                <input id="exp-date" type="date" className="input" value={form.expense_date} onChange={setField('expense_date')} />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="exp-cat">Category</label>
                <select id="exp-cat" className="input" value={form.category} onChange={setField('category')}>
                  {Object.entries(CATEGORY_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="exp-provider">Hospital / Pharmacy</label>
              <input id="exp-provider" className="input" value={form.hospital_name} onChange={setField('hospital_name')} placeholder="Apollo Hospital" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div className="input-group">
                <label className="label" htmlFor="exp-amount">Total Amount (₹)</label>
                <input id="exp-amount" type="number" min="0" className="input" value={form.amount || ''} onChange={setField('amount')} placeholder="0" />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="exp-ins">Insurance Covered (₹)</label>
                <input id="exp-ins" type="number" min="0" className="input" value={form.insurance_covered || ''} onChange={setField('insurance_covered')} placeholder="0" />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="exp-paid">You Paid (₹)</label>
                <input id="exp-paid" type="number" min="0" className="input" value={(form.amount - (form.insurance_covered ?? 0)) || ''} readOnly />
              </div>
            </div>
            <div className="input-group">
              <label className="label" htmlFor="exp-notes">Notes</label>
              <input id="exp-notes" className="input" value={form.notes} onChange={setField('notes')} placeholder="Optional notes" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
