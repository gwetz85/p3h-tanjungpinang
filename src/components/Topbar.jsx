import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserCircle } from 'lucide-react';

const Topbar = () => {
  const { userData, currentUser, role } = useAuth();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  // Determine current page title
  const getPageTitle = (path) => {
    switch (path) {
      case '/': return 'Ringkasan';
      case '/koordinator': return 'Manajemen Petugas';
      case '/users': return 'Manajemen User';
      case '/input': return 'Input Pekerjaan';
      case '/cek': return 'Proses & Verifikasi';
      case '/pendaftaran': return 'Pendaftaran SIHALAL';
      case '/selesai': return 'Riwayat Selesai';
      case '/chat': return 'Pesan';
      default: return 'P3H TPI';
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDateTime = (date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[date.getDay()];
    const day = String(date.getDate()).padStart(2, '0');
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${dayName}, ${day} ${month} ${year} - ${hours}:${minutes}:${seconds}`;
  };

  const displayName = userData?.nama || currentUser?.email?.split('@')[0] || 'User';

  return (
    <div className="topbar glass-card">
      <div className="topbar-left">
        <h2 className="topbar-title">{getPageTitle(location.pathname)}</h2>
      </div>
      
      <div className="topbar-center">
        <div className="topbar-datetime">
          {formatDateTime(time)}
        </div>
      </div>
      
      <div className="topbar-right">
        <div className="user-info">
          <div className="user-details">
            <span className="user-name">{displayName}</span>
            <span className="user-role">{role || 'Pending'}</span>
          </div>
          <div className="user-icon">
            <UserCircle size={36} strokeWidth={1.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
