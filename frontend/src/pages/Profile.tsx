import { useState } from 'react';
import { User, Mail, Phone, Calendar, Lock, HardDrive, Users, FileText, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useVault } from '../context/VaultContext';
import { userService } from '../services';
import { getErrorMessage } from '../services/api';
import { Modal } from '../components/ui/index';

function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb < 1024 ? `${mb.toFixed(1)} MB` : `${(mb / 1024).toFixed(2)} GB`;
}

export default function Profile() {
  const { user } = useAuth();
  const { dashboard } = useVault();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [pwOpen, setPwOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);

  const formatDate = (str?: string | null) => str ? new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await userService.updateMe({ full_name: name });
      setEditMode(false);
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to update profile.'));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError(null);
    setPwSaving(true);
    try {
      await userService.changePassword({ current_password: currentPassword, new_password: newPassword });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwError(getErrorMessage(err, 'Failed to change password.'));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Profile</h1>
          <p className="page-subtitle">Manage your account and vault settings</p>
        </div>
      </div>

      {/* Avatar */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24 }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: 'var(--color-primary)', flexShrink: 0 }}>
          {user?.full_name?.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase()}
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>{user?.full_name}</p>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>{user?.email}</p>
          <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>Member since {formatDate(user?.created_at)}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => setEditMode(v => !v)}>{editMode ? 'Cancel' : 'Edit Profile'}</button>
      </div>

      {/* Personal Info */}
      <section className="card profile-section">
        <h2 className="profile-section-title">Personal Information</h2>
        {editMode ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {saveError && <div className="alert alert-error">{saveError}</div>}
            <div className="input-group"><label className="label">Full Name</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
              <button className="btn btn-secondary" onClick={() => { setEditMode(false); setName(user?.full_name ?? ''); }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {[
              { icon: User,     label: 'Full Name',     value: user?.full_name },
              { icon: Mail,     label: 'Email',         value: user?.email },
              { icon: Phone,    label: 'Phone',         value: user?.phone ?? '—' },
              { icon: Calendar, label: 'Date of Birth', value: formatDate(user?.date_of_birth) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="profile-field">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Icon size={16} style={{ color: 'var(--color-text-muted)' }} />
                  <span className="profile-field-label">{label}</span>
                </div>
                <span className="profile-field-value">{value}</span>
              </div>
            ))}
          </>
        )}
      </section>

      {/* Security */}
      <section className="card profile-section" style={{ marginTop: 16 }}>
        <h2 className="profile-section-title">Security</h2>
        <div className="profile-field">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span className="profile-field-label">Password</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => { setPwOpen(true); setPwSuccess(false); setPwError(null); }}>Change Password</button>
        </div>
        <div className="profile-field">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Shield size={16} style={{ color: 'var(--color-text-muted)' }} />
            <span className="profile-field-label">Two-Factor Authentication</span>
          </div>
          <span className="badge badge-neutral">Not enabled</span>
        </div>
      </section>

      {/* Vault Stats */}
      <section className="card profile-section" style={{ marginTop: 16 }}>
        <h2 className="profile-section-title">Vault</h2>
        {[
          { icon: HardDrive, label: 'Storage Used',   value: dashboard ? formatBytes(dashboard.storage_used_bytes) : '—' },
          { icon: FileText,  label: 'Total Documents', value: dashboard ? `${dashboard.document_count} document${dashboard.document_count === 1 ? '' : 's'}` : '—' },
          { icon: Users,     label: 'Vault Members',   value: dashboard ? (dashboard.member_count <= 1 ? 'Just you' : `${dashboard.member_count} members`) : '—' },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="profile-field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Icon size={16} style={{ color: 'var(--color-text-muted)' }} />
              <span className="profile-field-label">{label}</span>
            </div>
            <span className="profile-field-value">{value}</span>
          </div>
        ))}
      </section>

      {pwOpen && (
        <Modal
          title="Change Password"
          onClose={() => setPwOpen(false)}
          footer={
            pwSuccess ? (
              <button className="btn btn-primary" onClick={() => setPwOpen(false)}>Done</button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setPwOpen(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleChangePassword} disabled={pwSaving || !currentPassword || newPassword.length < 8}>
                  {pwSaving ? 'Saving…' : 'Change Password'}
                </button>
              </>
            )
          }
        >
          {pwSuccess ? (
            <div className="alert alert-success">Your password has been updated.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {pwError && <div className="alert alert-error">{pwError}</div>}
              <div className="input-group">
                <label className="label" htmlFor="current-pw">Current Password</label>
                <input id="current-pw" type="password" className="input" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
              </div>
              <div className="input-group">
                <label className="label" htmlFor="new-pw">New Password</label>
                <input id="new-pw" type="password" className="input" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="8+ characters" />
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
