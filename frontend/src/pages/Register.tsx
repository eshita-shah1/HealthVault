import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Heart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/ui/index';

export default function Register() {
  const { register, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.full_name.trim()) errs.full_name = 'Name is required';
    if (!form.email) errs.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(form.email)) errs.email = 'Enter a valid email';
    if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    try {
      await register(form.email, form.password, form.full_name, form.phone || undefined);
      navigate('/dashboard', { replace: true });
    } catch { /* error shown via context */ }
  };

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 48 }}>
            <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Heart size={22} fill="white" stroke="white" />
            </div>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 20 }}>Health Vault</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 32, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>Start your health<br />journey today.</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.6 }}>Join thousands of users who trust Health Vault to keep their medical records safe, organized and accessible.</p>
        </div>
      </div>
      <div className="auth-right">
        <div style={{ width: '100%', maxWidth: 400 }}>
          <p className="auth-card-title">Create your account</p>
          <p className="auth-card-subtitle">Your personal health vault awaits</p>

          {error && <Alert type="error">{error}</Alert>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label className="label" htmlFor="reg-name">Full name</label>
              <input id="reg-name" type="text" className={`input${fieldErrors.full_name ? ' input-error' : ''}`} value={form.full_name} onChange={set('full_name')} placeholder="Eshita Shah" />
              {fieldErrors.full_name && <span className="field-error">{fieldErrors.full_name}</span>}
            </div>
            <div className="input-group">
              <label className="label" htmlFor="reg-email">Email address</label>
              <input id="reg-email" type="email" className={`input${fieldErrors.email ? ' input-error' : ''}`} value={form.email} onChange={set('email')} placeholder="you@example.com" />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="input-group">
              <label className="label" htmlFor="reg-phone">Phone <span style={{color:'var(--color-text-muted)',fontWeight:400}}>(optional)</span></label>
              <input id="reg-phone" type="tel" className="input" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
            </div>
            <div className="input-group">
              <label className="label" htmlFor="reg-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="reg-password" type={showPw ? 'text' : 'password'} className={`input${fieldErrors.password ? ' input-error' : ''}`} style={{ paddingRight: 40 }} value={form.password} onChange={set('password')} placeholder="8+ characters" />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setShowPw(v => !v)} aria-label="Toggle password">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>
            <div className="input-group">
              <label className="label" htmlFor="reg-confirm">Confirm password</label>
              <input id="reg-confirm" type={showPw ? 'text' : 'password'} className={`input${fieldErrors.confirm ? ' input-error' : ''}`} value={form.confirm} onChange={set('confirm')} placeholder="Repeat password" />
              {fieldErrors.confirm && <span className="field-error">{fieldErrors.confirm}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={isLoading} id="register-btn">
              {isLoading ? <><div className="spinner spinner-sm" /> Creating account…</> : 'Create Account'}
            </button>
          </form>

          <div style={{ marginTop: 20 }} className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
