import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  Users, 
  PlusSquare, 
  CheckCircle2, 
  History, 
  LogOut,
  LayoutDashboard,
  MessageCircle,
  FileSearch,
  X,
  Settings,
  Layers,
  Package,
  FileText,
  Archive
} from 'lucide-react';
import { auth } from '../firebase';
import { useAuth } from '../context/AuthContext';

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
    { name: 'Input Pekerjaan', path: '/input', icon: PlusSquare, roles: ['superadmin', 'Admin'] },
    { name: 'Proses & Verifikasi', path: '/cek', icon: CheckCircle2, roles: ['superadmin', 'Petugas'] },
    { name: 'Pendaftaran SIHALAL', path: '/pendaftaran', icon: FileSearch, roles: ['superadmin', 'Admin'] },
    { name: 'Gudang Bahan', path: '/gudang-bahan', icon: Package, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
    { name: 'Riwayat Selesai', path: '/selesai', icon: History, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
    { name: 'Catatan Akun Sihalal', path: '/catatan-akun', icon: FileText, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
    { name: 'ARSIP SH', path: '/arsip-sh', icon: Archive, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
    { name: 'Manajemen Petugas', path: '/koordinator', icon: Users, roles: ['superadmin', 'Admin', 'Petugas'] },
    { name: 'Manajemen User', path: '/users', icon: Users, roles: ['superadmin'] },
    { name: 'Running Text', path: '/running-text', icon: Settings, roles: ['superadmin'] },
    { name: 'Pesan Chat', path: '/chat', icon: MessageCircle, roles: ['superadmin', 'Admin', 'Petugas', 'Monitoring'] },
  ];

  return (
    <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <h2 style={{ color: 'white', fontWeight: 700, margin: 0, fontSize: '1.35rem', letterSpacing: '-0.5px' }}>P3H TPI</h2>
        <button onClick={onClose} className="mobile-close-btn" style={{ display: 'none', marginLeft: 'auto', background: 'none', border: 'none', color: 'white' }}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="sidebar-nav">
        {navItems.filter(item => item.roles.includes(role)).map((item) => (
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

export default Sidebar;
