import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Camera, X, Upload, Bell, ChevronDown, UserCircle } from 'lucide-react';
import { auth, rtdb } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

const Topbar = () => {
  const { userData, currentUser, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [showDropdown, setShowDropdown] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [koordinatorPhoto, setKoordinatorPhoto] = useState(null);

  useEffect(() => {
    if (userData?.nama) {
      const coordRef = ref(rtdb, 'koordinators');
      const unsubscribe = onValue(coordRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const matchedCoord = Object.values(data).find(c => c.nama === userData.nama);
          if (matchedCoord && matchedCoord.photoURL) {
            setKoordinatorPhoto(matchedCoord.photoURL);
          } else {
            setKoordinatorPhoto(null);
          }
        }
      });
      return () => unsubscribe();
    }
  }, [userData?.nama]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const handleFileChange = (e) => {
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
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress as JPEG 80% quality
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);

        try {
          await update(ref(rtdb, `users/${currentUser.uid}`), { photoURL: dataUrl });
          setShowPhotoModal(false);
        } catch (error) {
          console.error("Error updating photo:", error);
          alert("Gagal memperbarui foto profil.");
        } finally {
          setUploading(false);
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // Determine current page title
  const getPageTitle = (path) => {
    switch (path) {
      case '/': return 'Ringkasan';
      case '/koordinator': return 'Manajemen Petugas';
      case '/users': return 'Manajemen User';
      case '/input': return 'Input Pekerjaan';
      case '/cek': return 'Proses & Verifikasi';
      case '/verifikasi-pu': return 'Verifikasi PU';
      case '/pendaftaran': return 'Pendaftaran SIHALAL';
      case '/selesai': return 'Riwayat Selesai';
      case '/catatan-akun': return 'Catatan Akun Sihalal';
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
  const displayPhoto = userData?.photoURL || koordinatorPhoto;
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'AD';

  return (
    <div className="topbar">
      <div className="topbar-left">
        <h2 className="topbar-title">{getPageTitle(location.pathname)}</h2>
      </div>

      <div className="topbar-center">
        <span className="topbar-datetime">
          {formatDateTime(time)}
        </span>
      </div>
      
      <div className="topbar-right">
        {/* Bell Icon Notification */}
        <button className="topbar-icon-btn" title="Notifikasi">
          <Bell size={18} />
          <span className="notification-badge-dot"></span>
        </button>

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
      
      {/* Modal Upload Photo */}
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
      </AnimatePresence>
    </div>
  );
};

export default Topbar;
