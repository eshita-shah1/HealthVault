import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  onUploadClick: () => void;
}

export function Header({ onMenuClick, onUploadClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/documents?search=${encodeURIComponent(search.trim())}`);
  };

  const initials = user?.full_name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'U';

  return (
    <header className="app-header" role="banner">
      {/* Hamburger (tablet/mobile) */}
      <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open navigation">
        <Menu size={20} />
      </button>

      {/* Search */}
      <form className="header-search" onSubmit={handleSearch} role="search">
        <Search size={16} className="search-icon" aria-hidden="true" />
        <input
          id="global-search"
          className="input"
          type="search"
          placeholder="Search documents, reports or keywords…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          aria-label="Search documents"
        />
      </form>

      <div className="header-right">
        {/* Upload CTA */}
        <button className="btn btn-primary btn-sm" onClick={onUploadClick} id="upload-doc-btn">
          + Upload Document
        </button>

        {/* Notifications */}
        <button className="header-icon-btn" aria-label="Notifications">
          <Bell size={18} />
          <span className="notification-dot" aria-hidden="true" />
        </button>

        {/* User menu */}
        <div className="dropdown" ref={dropRef}>
          <button
            className="header-user"
            onClick={() => setDropdownOpen(v => !v)}
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            <div className="header-avatar" aria-hidden="true">{initials}</div>
            <span className="header-user-name">{user?.full_name ?? 'User'}</span>
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)' }} />
          </button>

          {dropdownOpen && (
            <div className="dropdown-menu" role="menu">
              <button
                className="dropdown-item"
                role="menuitem"
                onClick={() => { navigate('/profile'); setDropdownOpen(false); }}
              >
                <User size={15} /> Profile
              </button>
              <div className="dropdown-divider" />
              <button
                className="dropdown-item danger"
                role="menuitem"
                onClick={async () => { await logout(); navigate('/login'); }}
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
