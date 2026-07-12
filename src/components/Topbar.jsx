import React, { useState, useEffect, useCallback, memo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Camera, X, Upload, Bell, ChevronDown, UserCircle } from 'lucide-react';
import { auth, rtdb } from '../firebase';
import { ref, update, onValue, query, limitToLast } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

// Isolated clock component — re-renders every second independently, not the whole Topbar
const LiveClock = memo(() => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const dayName = days[time.getDay()];
  const day = String(time.getDate()).padStart(2, '0');
  const month = months[time.getMonth()];
  const year = time.getFullYear();
  const hours = String(time.getHours()).padStart(2, '0');
  const minutes = String(time.getMinutes()).padStart(2, '0');
  const seconds = String(time.getSeconds()).padStart(2, '0');

  return (
    <span className="topbar-datetime">
      {`${dayName}, ${day} ${month} ${year} - ${hours}:${minutes}:${seconds}`}
    </span>
  );
});
LiveClock.displayName = 'LiveClock';

const PAGE_TITLES = {
  '/': 'Ringkasan',
  '/koordinator': 'Manajemen Petugas',
  '/users': 'Manajemen User',
  '/input': 'Input Pekerjaan',
  '/cek': 'Proses & Verifikasi',
  '/verifikasi-pu': 'Verifikasi PU',
  '/pendaftaran': 'Pendaftaran SIHALAL',
  '/selesai': 'Riwayat Selesai',
  '/catatan-akun': 'Catatan Akun Sihalal',
  '/chat': 'Pesan',
};

const Topbar = () => {
  const { userData, currentUser, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [koordinatorPhoto, setKoordinatorPhoto] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    const notifQuery = query(ref(rtdb, 'notifikasi'), limitToLast(50));
    const unsub = onValue(notifQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const notifList = Object.entries(data).map(([key, val]) => ({ id: key, ...val }));
        notifList.sort((a, b) => b.timestamp - a.timestamp);
        setNotifications(notifList);
      } else {
        setNotifications([]);
      }
    });
    return () => unsub();
  }, []);

  const unreadCount = currentUser ? notifications.filter(n => !n?.readBy?.[currentUser.uid]).length : 0;

  const handleNotifClick = async () => {
    setShowNotifDropdown(!showNotifDropdown);
    if (!showNotifDropdown && unreadCount > 0 && currentUser) {
      const updates = {};
      notifications.forEach(n => {
        if (!n?.readBy?.[currentUser.uid]) {
          updates[`notifikasi/${n.id}/readBy/${currentUser.uid}`] = true;
        }
      });
      if (Object.keys(updates).length > 0) {
        try { await update(ref(rtdb), updates); } catch (e) { console.error('Gagal update readBy:', e); }
      }
    }
  };

  useEffect(() => {
    if (!userData?.nama) return;
    const coordRef = ref(rtdb, 'koordinators');
    const unsubscribe = onValue(coordRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const matchedCoord = Object.values(data).find(c => c.nama === userData.nama);
        setKoordinatorPhoto(matchedCoord?.photoURL || null);
      }
    });
    return () => unsubscribe();
  }, [userData?.nama]);

  const handleLogout = useCallback(() => {
    auth.signOut();
    navigate('/login');
  }, [navigate]);

  const handleFileChange = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG/PNG).');
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 150;
        let { width, height } = img;
        if (width > height) {
          if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
        } else {
          if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        try {
          await update(ref(rtdb, `users/${currentUser.uid}`), { photoURL: dataUrl });
          setShowPhotoModal(false);
        } catch (error) {
          alert('Gagal memperbarui foto profil.');
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }, [currentUser]);

  const pageTitle = PAGE_TITLES[location.pathname] || 'P3H TPI';
  const displayName = userData?.nama || currentUser?.email?.split('@')[0] || 'User';
  const displayPhoto = userData?.photoURL || koordinatorPhoto;
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{pageTitle}</h2>
      </div>

      <div className="topbar-center">
        <LiveClock />
      </div>
      
      <div className="topbar-right">
        <div className="notification-container" style={{ position: 'relative' }}>
          <button className="topbar-icon-btn" title="Notifikasi" onClick={handleNotifClick}>
            <Bell size={18} />
            {unreadCount > 0 && <span className="notification-badge-dot"></span>}
          </button>
          
          <AnimatePresence>
            {showNotifDropdown && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                exit={{ opacity: 0, y: 10 }}
                className="notif-dropdown-menu glass-card"
              >
                <div className="notif-header">
                  <h3>Notifikasi Terbaru</h3>
                </div>
                <div className="notif-list">
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <div key={notif.id} className={`notif-item ${!notif?.readBy?.[currentUser?.uid] ? 'unread' : ''}`}>
                        <div className="notif-type-icon" data-type={notif.type}>
                          {notif.type === 'login' ? '👤' : notif.type === 'register' ? '📝' : notif.type === 'movement' ? '➡️' : '🔔'}
                        </div>
                        <div className="notif-content">
                          <h4>{notif.title}</h4>
                          <p>{notif.message}</p>
                          <span className="notif-time">{new Date(notif.timestamp).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="notif-empty">Belum ada aktivitas.</div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="user-profile-trigger" onClick={() => setShowDropdown(!showDropdown)}>
          <div className="avatar-circle">
            {displayPhoto ? (
              <img src={displayPhoto} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="avatar-initials">{initials}</span>
            )}
          </div>
          
          <div className="user-profile-details">
            <span className="user-profile-name">{displayName}</span>
            <span className="user-profile-role">{role || 'Pending'}</span>
          </div>

          <ChevronDown size={14} className="chevron-down-icon" />
          
          {showDropdown && (
            <div className="user-dropdown-menu">
              <button 
                onClick={(e) => { e.stopPropagation(); setShowPhotoModal(true); setShowDropdown(false); }} 
                className="dropdown-menu-item"
              >
                <Camera size={16} />
                <span>Ubah Foto Profil</span>
              </button>
              <button onClick={handleLogout} className="dropdown-menu-item logout-item">
                <LogOut size={16} />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>
      </div>
      
      {createPortal(
      <AnimatePresence>
        {showPhotoModal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Ubah Foto Profil</h2>
                <button onClick={() => setShowPhotoModal(false)} className="btn-close"><X /></button>
              </div>
              <div className="p-6 text-center">
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', overflow: 'hidden', margin: '0 auto 1.5rem', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {displayPhoto ? (
                    <img src={displayPhoto} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <UserCircle size={64} style={{ color: 'var(--primary)' }} />
                  )}
                </div>
                <label className="btn-primary-filled" style={{ display: 'inline-flex', cursor: 'pointer', background: 'var(--primary)', color: 'white', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold' }}>
                  {uploading ? 'Memproses...' : (
                    <>
                      <Upload size={18} style={{ marginRight: '8px' }} />
                      Pilih Foto Baru
                    </>
                  )}
                  <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handleFileChange} disabled={uploading} />
                </label>
                <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Maksimal ukuran otomatis disesuaikan. Mendukung JPG & PNG.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}
    </div>
  );
};

export default memo(Topbar);
