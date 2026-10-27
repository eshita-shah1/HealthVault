import { Link } from 'react-router-dom';
import {
  Heart, Shield, Brain, Clock, Share2, DollarSign,
  Sparkles, ChevronRight, FolderOpen, Play
} from 'lucide-react';

const FEATURES = [
  { icon: FolderOpen,  title: 'Document Vault',          desc: 'Securely store all your medical documents — prescriptions, lab reports, bills, and more — in one place.' },
  { icon: Brain,       title: 'AI Document Processing',  desc: 'Our AI reads and extracts structured information from your documents automatically — no manual data entry.' },
  { icon: Clock,       title: 'Health Timeline',         desc: 'See your complete health journey in a chronological timeline. Track consultations, tests, and treatments.' },
  { icon: DollarSign,  title: 'Expense Tracking',        desc: 'Track every medical expense with breakdowns by category. Know exactly what you spend on healthcare.' },
  { icon: Sparkles,    title: 'Doctor Summary',          desc: 'Generate a concise AI health summary to share with any doctor — no more repeating your history.' },
  { icon: Share2,      title: 'Secure Sharing',          desc: 'Share selected records with doctors or family using time-limited, access-controlled secure links.' },
];

const HOW_STEPS = [
  { num: '01', title: 'Upload',        desc: 'Drag and drop your medical documents — PDFs, images, or scans.' },
  { num: '02', title: 'AI Organises', desc: 'Our AI classifies, extracts, and structures your medical data automatically.' },
  { num: '03', title: 'Track',         desc: 'View your health timeline, expenses, and summaries in a clean dashboard.' },
  { num: '04', title: 'Share',         desc: 'Generate secure links to share selected records with your healthcare team.' },
];

export default function LandingPage() {
  return (
    <div>
      {/* Nav */}
      <nav className="landing-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'var(--color-primary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={18} fill="white" stroke="white" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 18 }}>Health Vault</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a href="#features" className="btn btn-ghost btn-sm">Features</a>
          <a href="#how-it-works" className="btn btn-ghost btn-sm">How it works</a>
          <Link to="/login"    className="btn btn-secondary btn-sm">Login</Link>
          <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ background: 'linear-gradient(160deg, #FAFCFB 0%, #F1FAF5 100%)' }}>
        <div className="landing-hero">
          <div>
            <div className="hero-tag">
              <Shield size={12} /> Secure &amp; Private
            </div>
            <h1 className="hero-title">
              Your Complete<br />
              <span className="hero-title-accent">Health History,</span><br />
              Always With You.
            </h1>
            <p className="hero-subtitle">
              Store, organize and understand your medical documents in one secure place.
              Powered by AI to make your health information simple, structured and useful.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn btn-primary btn-lg">Get Started <ChevronRight size={16} /></Link>
              <button className="btn btn-secondary btn-lg" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Play size={12} style={{ color: 'var(--color-primary)', marginLeft: 2 }} />
                </div>
                Watch Demo
              </button>
            </div>
          </div>

          {/* Hero visual — floating document cards */}
          <div className="hero-visual">
            <div style={{ position: 'absolute', top: 12, right: 12 }}>
              <span className="badge badge-success badge-dot">AI Active</span>
            </div>
            {[
              { icon: '🧪', label: 'Blood Test Report', sub: '12 Sep 2025 • Lab Report', status: 'Processed' },
              { icon: '💊', label: 'Prescription', sub: '28 Aug 2025 • Prescription', status: 'Processed' },
              { icon: '🏥', label: 'Consultation — Dr. Mehta', sub: '5 Sep 2025 • Consultation', status: 'Processed' },
            ].map(c => (
              <div key={c.label} className="hero-floating-card">
                <div style={{ width: 40, height: 40, background: 'var(--color-primary-light)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{c.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 600, fontSize: 13 }} className="truncate">{c.label}</p>
                  <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>{c.sub}</p>
                </div>
                <span className="badge badge-success" style={{ fontSize: 10, flexShrink: 0 }}>✓ {c.status}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              <div style={{ flex: 1, padding: 12, background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Total Expenses</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-primary)' }}>₹18,450</p>
              </div>
              <div style={{ flex: 1, padding: 12, background: 'var(--color-surface)', borderRadius: 10, border: '1px solid var(--color-border)' }}>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)', marginBottom: 4 }}>Documents</p>
                <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--color-text)' }}>24</p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature chips */}
        <div className="hero-features-row">
          {[
            { icon: Shield,     label: 'Secure Storage' },
            { icon: Brain,      label: 'AI Powered' },
            { icon: Clock,      label: 'Complete Timeline' },
            { icon: Share2,     label: 'Easy Sharing' },
            { icon: DollarSign, label: 'Expense Tracking' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="hero-feature-chip">
              <Icon size={16} className="hero-feature-chip-icon" />
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="landing-section" id="how-it-works" style={{ background: 'var(--color-bg)' }}>
        <div className="landing-section-inner">
          <p className="section-label">How It Works</p>
          <h2 className="section-title">From upload to insight<br />in minutes</h2>
          <p className="section-subtitle">Health Vault handles the heavy lifting so you can focus on your health, not paperwork.</p>
          <div className="how-it-works-grid">
            {HOW_STEPS.map(s => (
              <div key={s.num} className="how-step">
                <div className="how-step-number">{s.num}</div>
                <p className="how-step-title">{s.title}</p>
                <p className="how-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section" id="features" style={{ background: 'var(--color-surface)' }}>
        <div className="landing-section-inner">
          <p className="section-label">Features</p>
          <h2 className="section-title">Everything you need to<br />manage your health records</h2>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon"><f.icon size={24} /></div>
                <p className="feature-title">{f.title}</p>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="landing-cta">
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <p className="landing-cta-title">Take control of your health records.</p>
          <p className="landing-cta-sub">Join thousands of users who trust Health Vault to keep their medical history safe, structured and accessible.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-white btn-lg">Get Started Free</Link>
            <Link to="/login"    className="btn btn-outline-white btn-lg">Sign In</Link>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© 2025 Health Vault. Your medical history, always with you.</p>
      </footer>
    </div>
  );
}
