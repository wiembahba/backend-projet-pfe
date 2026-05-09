import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { useAuth } from '../../context/AuthContext';

export default function UserDropdown() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const roleLabel: Record<string, string> = {
    admin: 'Admin',
    chef_projet: 'Chef de projet',
    employe: 'Employé',
  };

  const roleColor: Record<string, { bg: string; color: string }> = {
    admin: { bg: '#f3e8ff', color: '#6b21a8' },
    chef_projet: { bg: '#dbeafe', color: '#1e40af' },
    employe: { bg: '#dcfce7', color: '#166534' },
  };

  const rc = user?.role ? roleColor[user.role] : { bg: '#f1f5f9', color: '#475569' };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', borderRadius: '10px' }}
      >
        <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0 }}>
          {user?.name?.[0] ?? 'U'}
        </div>
        <div style={{ textAlign: 'left' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0, lineHeight: 1.2 }}>{user?.name}</p>
          <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>{user?.role ? roleLabel[user.role] : ''}</p>
        </div>
        <span style={{ fontSize: '10px', color: '#94a3b8' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 8px 30px rgba(0,0,0,0.12)', minWidth: '220px', zIndex: 1000, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, #1e3a8a, #1d4ed8)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px', flexShrink: 0 }}>
                {user?.name?.[0] ?? 'U'}
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{user?.name}</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{user?.email}</p>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '1px 8px', borderRadius: '20px', background: rc.bg, color: rc.color, marginTop: '3px', display: 'inline-block' }}>
                  {user?.role ? roleLabel[user.role] : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Mon profil */}
          <div style={{ padding: '6px' }}>
            <Link
              to="/profile"
              onClick={() => setIsOpen(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 12px', borderRadius: '8px', textDecoration: 'none', color: '#374151', fontSize: '13px', fontWeight: 500 }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span>👤</span> Mon profil
            </Link>
          </div>

          {/* Déconnexion */}
          <div style={{ padding: '6px', borderTop: '1px solid #f1f5f9' }}>
            <button
              onClick={() => { logout(); setIsOpen(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#be123c', fontSize: '13px', fontWeight: 500, textAlign: 'left' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#fff1f2'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <span>🚪</span> Se déconnecter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}