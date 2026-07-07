import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, remove, push } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, FileText, Search, X, MessageSquare, Download, MapPin, ExternalLink, Send } from 'lucide-react';

const MenuDaftarHalal = () => {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReg, setSelectedReg] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [photos, setPhotos] = useState({});

  useEffect(() => {
    const qReg = ref(rtdb, 'daftar_halal');
    
    const unsub = onValue(qReg, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).filter(item => item.status === 'Menunggu'); // Hanya tampilkan yang Menunggu
        setRegistrations(formattedData.reverse());
      } else {
        setRegistrations([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Fetch photos when a registration is selected
  useEffect(() => {
    if (selectedReg && selectedReg.id && !photos[selectedReg.id]) {
      const photoRef = ref(rtdb, `daftar_halal_photos/${selectedReg.id}`);
      onValue(photoRef, (snapshot) => {
        if (snapshot.exists()) {
          setPhotos(prev => ({ ...prev, [selectedReg.id]: snapshot.val() }));
        }
      }, { onlyOnce: true });
    }
  }, [selectedReg?.id, photos]);

  const downloadImage = (dataUrl, filename) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleForwardToPetugas = async (reg) => {
    if (window.confirm(`Teruskan pendaftaran atas nama ${reg.nama} ke Petugas Lapangan? Data akan masuk ke menu Pekerjaan.`)) {
      try {
        // Buat ID Pekerjaan baru
        const newJobRef = push(ref(rtdb, 'pekerjaan'));
        const jobId = newJobRef.key;
        
        // Data yang dimasukkan ke node pekerjaan
        const jobData = {
          jenisPekerjaan: 'Sertifikasi Halal',
          nama: reg.nama,
          nik: reg.nik,
          tempatLahir: reg.tempatLahir || '',
          tanggalLahir: reg.tanggalLahir || '',
          alamat: reg.alamat,
          wa: reg.wa,
          namaUsaha: reg.namaUsaha,
          jenisUsaha: reg.jenisUsaha,
          kbli: reg.kbli || '',
          nib: reg.nib || '',
          tahunBerdiri: reg.tahunBerdiri,
          alamatUsaha: reg.lokasiUsaha,
          linkMaps: reg.linkMaps || '',
          status: 'Pending',
          tanggalInput: Date.now(),
          progress: 0,
          keterangan: 'Pendaftaran Mandiri (Diteruskan Admin)'
        };

        await update(ref(rtdb, `pekerjaan/${jobId}`), jobData);

        // Jika foto sudah diambil dari daftar_halal_photos, kita pindahkan ke pekerjaan_photos
        if (photos[reg.id]) {
          await update(ref(rtdb, `pekerjaan_photos/${jobId}`), {
            photoPengajuan: photos[reg.id].photoProduk,
            photoKTP: photos[reg.id].photoKTP
          });
        }

        // Update status di daftar_halal
        await update(ref(rtdb, `daftar_halal/${reg.id}`), {
          status: 'Diteruskan'
        });

        alert('Berhasil diteruskan ke Petugas!');
        setSelectedReg(null);
      } catch (err) {
        console.error(err);
        alert('Gagal meneruskan data.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus data pendaftaran ini? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        await remove(ref(rtdb, `daftar_halal/${id}`));
        await remove(ref(rtdb, `daftar_halal_photos/${id}`));
        alert('Data berhasil dihapus');
        setSelectedReg(null);
      } catch (err) {
        alert('Gagal menghapus data');
      }
    }
  };

  const filteredData = registrations.filter(reg => 
    reg.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient">Daftar Halal (Masuk)</h1>
        <p className="text-muted">Kelola data pendaftaran mandiri dari calon pelaku usaha</p>
      </div>

      <div className="search-bar glass-card mb-6" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="Cari Nama Pelaku Usaha / Nama Usaha..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: 'white', outline: 'none' }}
        />
      </div>

      <div className="job-list">
        {loading ? (
          <div className="loading">Memuat Data...</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state glass-card">Belum ada pendaftaran baru.</div>
        ) : (
          filteredData.map((reg) => (
            <motion.div key={reg.id} onClick={() => setSelectedReg(reg)} className="job-card glass-card" style={{ cursor: 'pointer' }}>
              <div className="job-main">
                <div className="job-info">
                  <span className="badge-type" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                    Menunggu Admin
                  </span>
                  <h3>{reg.nama}</h3>
                  <p className="job-date">{reg.namaUsaha || '-'}</p>
                </div>
              </div>
              <div className="job-footer">
                <span className="status-badge text-accent"><FileText size={14} /> Lihat Detail</span>
                <span className="text-muted" style={{ fontSize: '0.8rem' }}>
                  {new Date(reg.tanggalInput).toLocaleDateString('id-ID')}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedReg && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card">
              <div className="modal-header">
                <h2>Detail Pendaftaran Baru</h2>
                <button onClick={() => setSelectedReg(null)} className="btn-close"><X /></button>
              </div>

              <div className="job-detail-modern p-6" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="detail-header-section mb-6">
                  <h2 className="title-gradient">{selectedReg.nama}</h2>
                  <p className="text-muted">NIK: {selectedReg.nik}</p>
                </div>

                <div className="detail-info-grid mb-6">
                  <div className="info-item">
                    <label>Nama Usaha</label>
                    <p>{selectedReg.namaUsaha}</p>
                  </div>
                  <div className="info-item">
                    <label>Jenis Usaha</label>
                    <p>{selectedReg.jenisUsaha}</p>
                  </div>
                  <div className="info-item">
                    <label>KBLI</label>
                    <p>{selectedReg.kbli || '-'}</p>
                  </div>
                  <div className="info-item">
                    <label>Nomor NIB</label>
                    <p>{selectedReg.nib || '-'}</p>
                  </div>
                  <div className="info-item">
                    <label>Tahun Berdiri</label>
                    <p>{selectedReg.tahunBerdiri}</p>
                  </div>
                  <div className="info-item">
                    <label>Kontak WA</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <p>{selectedReg.wa}</p>
                      <a 
                        href={`https://wa.me/${selectedReg.wa.replace(/\D/g, '')}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-primary"
                      >
                        <MessageSquare size={16} />
                      </a>
                    </div>
                  </div>
                  <div className="info-item full">
                    <label>Tempat/Tanggal Lahir</label>
                    <p>{selectedReg.tempatLahir}, {selectedReg.tanggalLahir}</p>
                  </div>
                  <div className="info-item full">
                    <label>Alamat KTP</label>
                    <p>{selectedReg.alamat}</p>
                  </div>
                  <div className="info-item full">
                    <label>Lokasi Usaha</label>
                    <p>{selectedReg.lokasiUsaha}</p>
                  </div>
                  {selectedReg.linkMaps && (
                    <div className="info-item full">
                      <label>Titik Lokasi (Maps)</label>
                      <a 
                        href={selectedReg.linkMaps} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-primary-outline"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.9rem', marginTop: '4px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', borderRadius: '6px', textDecoration: 'none' }}
                      >
                        <MapPin size={16} /> Buka di Google Maps
                      </a>
                    </div>
                  )}
                </div>

                {photos[selectedReg.id] ? (
                  <div className="form-grid" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                    {photos[selectedReg.id].photoKTP && (
                      <div className="info-item full glass-card p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <label style={{ color: '#10b981', marginBottom: '8px', display: 'block' }}>📷 Foto KTP</label>
                        <img src={photos[selectedReg.id].photoKTP} alt="KTP" style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
                        <button
                          type="button"
                          onClick={() => downloadImage(photos[selectedReg.id].photoKTP, `KTP_${selectedReg.nama}.jpg`)}
                          className="btn-primary-outline"
                          style={{ width: '100%', justifyContent: 'center' }}
                        >
                          <Download size={16} /> Download
                        </button>
                      </div>
                    )}
                    {photos[selectedReg.id].photoProduk && (
                      <div className="info-item full glass-card p-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <label style={{ color: '#f59e0b', marginBottom: '8px', display: 'block' }}>📷 Foto Produk</label>
                        <img src={photos[selectedReg.id].photoProduk} alt="Produk" style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
                        <button
                          type="button"
                          onClick={() => downloadImage(photos[selectedReg.id].photoProduk, `Produk_${selectedReg.nama}.jpg`)}
                          className="btn-primary-outline"
                          style={{ width: '100%', justifyContent: 'center', borderColor: '#f59e0b', color: '#f59e0b' }}
                        >
                          <Download size={16} /> Download
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 text-center text-muted">Memuat Foto...</div>
                )}

                <div className="modal-footer-actions" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '1rem' }}>
                  <button onClick={() => handleDelete(selectedReg.id)} className="btn-danger-outline" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
                    <XCircle size={18} /> Hapus Data
                  </button>

                  <button 
                    onClick={() => handleForwardToPetugas(selectedReg)} 
                    className="btn-primary-filled" 
                    style={{ background: '#3b82f6' }}
                  >
                    <Send size={18} /> Teruskan ke Petugas
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MenuDaftarHalal;
