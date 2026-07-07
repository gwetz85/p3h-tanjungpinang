import React, { useState } from 'react';
import { rtdb } from '../firebase';
import { ref, push, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, User, MapPin, CreditCard, Phone, Briefcase, Camera, CheckCircle, Navigation } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DaftarHalalPublic = () => {
  const [formData, setFormData] = useState({
    nama: '',
    nik: '',
    tempatLahir: '',
    tanggalLahir: '',
    alamat: '',
    wa: '',
    namaUsaha: '',
    jenisUsaha: 'Makanan',
    kbli: '',
    nib: '',
    lokasiUsaha: '',
    tahunBerdiri: '',
    latitude: null,
    longitude: null,
    photoKTP: '',
    photoProduk: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');
  
  const navigate = useNavigate();

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Ukuran file terlalu besar! Maksimal 5MB.");
        e.target.value = null; 
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, [field]: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation tidak didukung oleh browser Anda');
      alert('Geolocation tidak didukung oleh browser Anda');
      return;
    }

    setLocationStatus('Sedang mencari lokasi...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData({
          ...formData,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
        setLocationStatus('Lokasi berhasil didapatkan!');
      },
      (error) => {
        console.error("Error getting location", error);
        let errorMsg = 'Gagal mendapatkan lokasi. Pastikan GPS aktif dan izinkan akses lokasi.';
        if (error.code === 1) errorMsg = 'Akses lokasi ditolak. Harap izinkan akses lokasi di pengaturan browser.';
        setLocationStatus(errorMsg);
        alert(errorMsg);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.latitude || !formData.longitude) {
      alert('Mohon ambil Titik Lokasi Usaha terlebih dahulu.');
      return;
    }
    if (!formData.photoKTP || !formData.photoProduk) {
      alert('Mohon upload foto KTP dan Foto Produk.');
      return;
    }

    setLoading(true);
    
    try {
      const newDaftarRef = push(ref(rtdb, 'daftar_halal'));
      const daftarId = newDaftarRef.key;
      
      const { photoKTP, photoProduk, ...dataToSave } = formData;
      
      await update(ref(rtdb, `daftar_halal/${daftarId}`), {
        ...dataToSave,
        status: 'Menunggu',
        tanggalInput: Date.now(),
        linkMaps: `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`
      });
      
      await update(ref(rtdb, `daftar_halal_photos/${daftarId}`), {
        photoKTP,
        photoProduk
      });
      
      setSuccess(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-page-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div className="mesh-background"></div>
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="login-card-modern glass-card text-center"
          style={{ maxWidth: '500px', width: '100%' }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <CheckCircle size={64} color="#10b981" />
          </div>
          <h2 className="title-gradient" style={{ marginBottom: '1rem' }}>Pendaftaran Berhasil!</h2>
          <p style={{ color: '#222222', marginBottom: '2rem' }}>
            Data pengajuan Sertifikasi Halal Anda telah kami terima dan akan segera diproses oleh petugas lapangan kami. 
            Terima kasih!
          </p>
          <button onClick={() => window.location.reload()} className="btn-primary-filled" style={{ width: '100%', justifyContent: 'center' }}>
            Ajukan Pendaftaran Lain
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ minHeight: '100vh', background: '#0a0a0a', padding: '20px', display: 'flex', justifyContent: 'center' }}>
      <div className="mesh-background" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 }}></div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="form-container glass-card"
        style={{ position: 'relative', zIndex: 1, maxWidth: '800px', width: '100%', margin: '2rem auto' }}
      >
        <div className="form-header" style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo-p3h.png" alt="P3H" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', margin: '0 auto 1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
          <h2 className="title-gradient">Pendaftaran Sertifikasi Halal</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>Self Declare - P3H Tanjungpinang</p>
        </div>

        <form onSubmit={handleSubmit} className="job-form">
          <div className="section-divider full-width"><p>Data Pelaku Usaha</p></div>
          <div className="form-grid">
            <div className="input-group">
              <label><User size={16} /> Nama Lengkap</label>
              <input type="text" placeholder="Nama sesuai KTP" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
            </div>
            <div className="input-group">
              <label><CreditCard size={16} /> NIK</label>
              <input type="text" inputMode="numeric" placeholder="16 Digit NIK" maxLength="16" value={formData.nik} onChange={(e) => setFormData({...formData, nik: e.target.value.replace(/\D/g, '').slice(0, 16)})} required />
            </div>
            
            <div className="input-group">
              <label>Tempat Lahir</label>
              <input type="text" placeholder="Kota Kelahiran" value={formData.tempatLahir} onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})} required />
            </div>
            <div className="input-group">
              <label>Tanggal Lahir</label>
              <input type="date" value={formData.tanggalLahir} onChange={(e) => setFormData({...formData, tanggalLahir: e.target.value})} required />
            </div>

            <div className="input-group">
              <label><Phone size={16} /> Nomor WhatsApp</label>
              <input type="text" inputMode="numeric" placeholder="0812..." maxLength="13" value={formData.wa} onChange={(e) => setFormData({...formData, wa: e.target.value.replace(/\D/g, '').slice(0, 13)})} required />
            </div>
            <div className="input-group full-width">
              <label><MapPin size={16} /> Alamat (Sesuai KTP)</label>
              <textarea placeholder="Alamat lengkap sesuai KTP" rows="2" value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} required ></textarea>
            </div>
          </div>

          <div className="section-divider full-width" style={{ marginTop: '2rem' }}><p>Data Usaha</p></div>
          <div className="form-grid">
            <div className="input-group">
              <label><Briefcase size={16} /> Nama Usaha</label>
              <input type="text" placeholder="Nama Bisnis / Merek" value={formData.namaUsaha} onChange={(e) => setFormData({...formData, namaUsaha: e.target.value})} required />
            </div>
            <div className="input-group">
              <label>Jenis Usaha</label>
              <select value={formData.jenisUsaha} onChange={(e) => setFormData({...formData, jenisUsaha: e.target.value})} required>
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
              </select>
            </div>
            <div className="input-group">
              <label>KBLI</label>
              <input type="text" inputMode="numeric" placeholder="Kode KBLI (5 digit)" maxLength="5" value={formData.kbli} onChange={(e) => setFormData({...formData, kbli: e.target.value.replace(/\D/g, '').slice(0, 5)})} required />
            </div>
            <div className="input-group">
              <label>Nomor NIB</label>
              <input type="text" inputMode="numeric" placeholder="Nomor Induk Berusaha (13 digit)" maxLength="13" value={formData.nib} onChange={(e) => setFormData({...formData, nib: e.target.value.replace(/\D/g, '').slice(0, 13)})} required />
            </div>
            
            <div className="input-group">
              <label>Tahun Berdiri</label>
              <input type="number" placeholder="Contoh: 2020" value={formData.tahunBerdiri} onChange={(e) => setFormData({...formData, tahunBerdiri: e.target.value})} required />
            </div>
            
            <div className="input-group full-width">
              <label><MapPin size={16} /> Lokasi Usaha (Alamat)</label>
              <textarea placeholder="Alamat lengkap tempat produksi / jualan" rows="2" value={formData.lokasiUsaha} onChange={(e) => setFormData({...formData, lokasiUsaha: e.target.value})} required ></textarea>
            </div>

            <div className="input-group full-width">
              <label><Navigation size={16} /> Titik Lokasi Usaha (Koordinat)</label>
              <div className="glass-card p-4" style={{ background: 'rgba(255,255,255,0.02)' }}>
                <button 
                  type="button" 
                  onClick={getLocation} 
                  className="btn-primary-outline"
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '10px' }}
                >
                  <MapPin size={18} /> Ambil Lokasi Saat Ini
                </button>
                {locationStatus && (
                  <p style={{ fontSize: '0.85rem', color: formData.latitude ? '#10b981' : '#f59e0b', textAlign: 'center', marginTop: '5px' }}>
                    {locationStatus}
                  </p>
                )}
                {formData.latitude && formData.longitude && (
                  <div style={{ marginTop: '10px', padding: '10px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.85rem', color: 'white' }}>
                    <strong>Latitude:</strong> {formData.latitude} <br/>
                    <strong>Longitude:</strong> {formData.longitude}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="section-divider full-width" style={{ marginTop: '2rem' }}><p>Upload Dokumen</p></div>
          <div className="form-grid">
            <div className="input-group full-width">
              <label><Camera size={16} /> Foto KTP</label>
              <div className="photo-upload-input glass-card">
                {formData.photoKTP ? (
                  <div className="preview-container">
                    <img src={formData.photoKTP} alt="KTP" />
                    <button type="button" onClick={() => setFormData({...formData, photoKTP: ''})} className="btn-remove">Ganti Foto KTP</button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>Klik untuk pilih atau ambil foto KTP (Maks 5MB)</p>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'photoKTP')} required />
                  </div>
                )}
              </div>
            </div>

            <div className="input-group full-width">
              <label><Camera size={16} /> Foto Produk</label>
              <div className="photo-upload-input glass-card">
                {formData.photoProduk ? (
                  <div className="preview-container">
                    <img src={formData.photoProduk} alt="Produk" />
                    <button type="button" onClick={() => setFormData({...formData, photoProduk: ''})} className="btn-remove">Ganti Foto Produk</button>
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <p>Klik untuk pilih atau ambil foto Produk Utama (Maks 5MB)</p>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImageUpload(e, 'photoProduk')} required />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <button type="submit" className="btn-primary-filled" style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', justifyContent: 'center' }} disabled={loading}>
              {loading ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <Send size={20} /> Kirim Pendaftaran
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default DaftarHalalPublic;
