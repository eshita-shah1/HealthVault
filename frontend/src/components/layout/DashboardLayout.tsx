import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, FolderOpen, Clock, DollarSign, User
} from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { UploadModal } from '../documents/UploadModal';

const MOBILE_NAV = [
  { to: '/dashboard',      icon: LayoutDashboard, label: 'Home' },
  { to: '/documents',      icon: FolderOpen,       label: 'Docs' },
  { to: '/timeline',       icon: Clock,            label: 'Timeline' },
  { to: '/expenses',       icon: DollarSign,       label: 'Expenses' },
  { to: '/profile',        icon: User,             label: 'Profile' },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="main-content">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          onUploadClick={() => setUploadOpen(true)}
        />
        <main className="page-content" id="main-content" role="main">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-items">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `mobile-nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {uploadOpen && <UploadModal onClose={() => setUploadOpen(false)} />}
    </div>
  );
}
