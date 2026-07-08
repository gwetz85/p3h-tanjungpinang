import React, { memo, useMemo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, PlusSquare, CheckCircle2, ClipboardCheck,
  History, LogOut, LayoutDashboard, MessageCircle,
  FileSearch, X, Settings, Package, FileText, Archive, Wrench
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

// Static outside component — never re-created
const ALL_NAV_ITEMS = [
  { name: 'Dashboard',          path: '/',               icon: LayoutDashboard, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'DAFTAR HALAL',       path: '/daftar-halal',   icon: FileText,        roles: ['superadmin', 'Admin'] },
  { name: 'Input Pekerjaan',    path: '/input',          icon: PlusSquare,      roles: ['superadmin', 'Admin'] },
  { name: 'Proses & Verifikasi',path: '/cek',            icon: CheckCircle2,    roles: ['superadmin', 'Petugas'] },
  { name: 'Verifikasi PU',      path: '/verifikasi-pu',  icon: ClipboardCheck,  roles: ['superadmin', 'Petugas'] },
  { name: 'Pendaftaran SIHALAL',path: '/pendaftaran',    icon: FileSearch,      roles: ['superadmin', 'Admin'] },
  { name: 'Gudang Bahan',       path: '/gudang-bahan',   icon: Package,         roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'Perbaikan Akun',     path: '/perbaikan-akun', icon: Wrench,          roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'Riwayat Selesai',    path: '/selesai',        icon: History,         roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'Catatan Akun',       path: '/catatan-akun',   icon: FileText,        roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'ARSIP SH',           path: '/arsip-sh',       icon: Archive,         roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  { name: 'Manajemen Petugas',  path: '/koordinator',    icon: Users,           roles: ['superadmin', 'Admin', 'Petugas'] },
  { name: 'Manajemen User',     path: '/users',          icon: Users,           roles: ['superadmin'] },
  { name: 'Running Text',       path: '/running-text',   icon: Settings,        roles: ['superadmin'] },
  { name: 'Pengaturan Pop-out', path: '/popout-settings',icon: Settings,        roles: ['superadmin'] },
  { name: 'PENGUMUMAN',         path: '/admin-pengumuman',icon: FileText,        roles: ['superadmin'] },
  { name: 'Pesan Chat',         path: '/chat',           icon: MessageCircle,   roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = useCallback(() => {
    auth.signOut();
    navigate('/login');
  }, [navigate]);

  // Only recompute when role changes
  const visibleNavItems = useMemo(
    () => ALL_NAV_ITEMS.filter(item => item.roles.includes(role)),
    [role]
  );

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <h2 style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>P3H TPI</h2>
        <button onClick={onClose} className="mobile-close-btn" style={{ display: 'none', marginLeft: 'auto', background: 'none', border: 'none', color: 'white' }}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {visibleNavItems.map((item) => (
          <NavLink 
            key={item.path} 
            to={item.path}
            onClick={onClose}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={18} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="btn-logout-sidebar">
          <LogOut size={18} />
          <span>Keluar</span>
        </button>
      </div>
    </div>
  );
};

export default memo(Sidebar);
