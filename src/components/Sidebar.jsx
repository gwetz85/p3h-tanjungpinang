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
  X
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
    { name: 'Ringkasan', path: '/', icon: LayoutDashboard, roles: ['Admin', 'Petugas', 'Monitoring'] },
    { name: 'Manajemen Petugas', path: '/koordinator', icon: Users, roles: ['Admin', 'Petugas'] },

    { name: 'Manajemen User', path: '/users', icon: Users, roles: ['Admin'] },
    { name: 'Input Pekerjaan', path: '/input', icon: PlusSquare, roles: ['Admin'] },
    { name: 'Pendaftaran SIHALAL', path: '/pendaftaran', icon: FileSearch, roles: ['Admin'] },
    { name: 'Proses & Verifikasi', path: '/cek', icon: CheckCircle2, roles: ['Admin', 'Petugas', 'Monitoring'] },
    { name: 'Riwayat Selesai', path: '/selesai', icon: History, roles: ['Admin', 'Petugas', 'Monitoring'] },
    { name: 'Pesan', path: '/chat', icon: MessageCircle, roles: ['Admin', 'Petugas', 'Monitoring'] },
  ];

  return (
    <div className={`sidebar glass-card ${isOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-brand">
        <img src="/logo-p3h.png" alt="P3H" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
        <h2 className="title-gradient">P3H TPI</h2>
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

            <item.icon size={20} />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="btn-logout">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>

    </div>
  );
};

export default Sidebar;
