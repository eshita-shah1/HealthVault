import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Heart, Shield, Clock, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/ui/index';

export default function Login() {
  const { login, error, isLoading, clearError } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof fieldErrors = {};
    if (!email) errs.email = 'Email is required';
    else if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) errs.email = 'Enter a valid email';
    if (!password) errs.password = 'Password is required';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const errs = validate();
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setFieldErrors({});
    try {
      await login(email, password);
      navigate(from, { replace: true });
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
          <h1 style={{ color: 'white', fontSize: 32, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>Your health records,<br />always secure.</h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.6, marginBottom: 48 }}>Store, organize and understand your medical documents in one secure place.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[{ icon: Shield, label: 'Bank-level encryption' }, { icon: Clock, label: 'Complete health timeline' }, { icon: FileText, label: 'AI-powered document extraction' }].map(({ icon: Icon, label }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color="white" />
                </div>
                <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 15 }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="auth-right">
        <div style={{ width: '100%', maxWidth: 360 }}>
          <p className="auth-card-title">Welcome back</p>
          <p className="auth-card-subtitle">Sign in to your Health Vault</p>

          {error && <Alert type="error">{error}</Alert>}

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <div className="input-group">
              <label className="label" htmlFor="login-email">Email address</label>
              <input id="login-email" type="email" className={`input${fieldErrors.email ? ' input-error' : ''}`} value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" placeholder="you@example.com" />
              {fieldErrors.email && <span className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="input-group">
              <label className="label" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input id="login-password" type={showPw ? 'text' : 'password'} className={`input${fieldErrors.password ? ' input-error' : ''}`} style={{ paddingRight: 40 }} value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
                <button type="button" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} onClick={() => setShowPw(v => !v)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {fieldErrors.password && <span className="field-error">{fieldErrors.password}</span>}
            </div>

            <button type="submit" className="btn btn-primary w-full btn-lg" disabled={isLoading} id="login-btn">
              {isLoading ? <><div className="spinner spinner-sm" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div style={{ marginTop: 24 }} className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
