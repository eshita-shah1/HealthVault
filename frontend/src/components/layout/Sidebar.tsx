import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Clock, DollarSign,
  FileText, Share2, User, Heart, X
} from 'lucide-react';
import { useVault } from '../../context/VaultContext';

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/documents', icon: FolderOpen, label: 'My Documents' },
  { to: '/timeline', icon: Clock, label: 'Health Timeline' },
  { to: '/expenses', icon: DollarSign, label: 'Expenses' },
  { to: '/health-summary', icon: FileText, label: 'Health Summary' },
  { to: '/sharing', icon: Share2, label: 'Sharing' },
  { to: '/profile', icon: User, label: 'Profile' },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation();
  const { dashboard } = useVault();
  const storageUsed = dashboard ? formatBytes(dashboard.storage_used_bytes) : '—';

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <Heart size={18} fill="white" stroke="white" />
          </div>
          <span className="sidebar-logo-text">Health Vault</span>
          <button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: 'auto', display: 'none' }}
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav" role="navigation">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={onClose}
              aria-current={location.pathname.startsWith(to) ? 'page' : undefined}
            >
              <Icon size={18} className="nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Storage */}
        <div className="sidebar-footer">
          <div className="storage-label">
            <span>Storage Used</span>
            <span>{storageUsed}</span>
          </div>
        </div>
      </aside>
    </>
  );
}
