import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, remove, get, push } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { addNotification } from '../utils/notifications';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, FileText, Search, X, MessageSquare, Download, MapPin, ExternalLink, Send, Eye, Trash2 } from 'lucide-react';

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
          kelurahan: reg.kelurahan || '',
          kecamatan: reg.kecamatan || '',
          wa: reg.wa,
          namaUsaha: reg.namaUsaha,
          jenisUsaha: reg.jenisUsaha,
          kbli: reg.kbli || '',
          nib: reg.nib || '',
          tahunBerdiri: reg.tahunBerdiri,
          alamatUsaha: reg.lokasiUsaha,
          kelurahanUsaha: reg.kelurahanUsaha || '',
          kecamatanUsaha: reg.kecamatanUsaha || '',
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
        addNotification('Data Diteruskan', `Usaha "${reg.namaUsaha}" telah diteruskan ke Petugas Lapangan.`, 'movement');

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

  const handlePrintPDF = (reg) => {
    const baseUrl = window.location.origin;
    const now = new Date();
    const bulanId = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    
    const tanggalCetakStr = `${String(now.getDate()).padStart(2,'0')} ${bulanId[now.getMonth()]} ${now.getFullYear()}`;
    const regDate = new Date(reg.tanggalInput);
    const tanggalRegistrasiStr = `${String(regDate.getDate()).padStart(2,'0')} ${bulanId[regDate.getMonth()]} ${regDate.getFullYear()}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Bukti Pendaftaran - ${reg.nama}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 18mm 15mm; }
.section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 24px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
.section-heading { background: #059669; color: #ffffff; padding: 10px 14px; font-weight: bold; font-size: 11.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
table { width: 100%; border-collapse: collapse; }
table tr:nth-child(even) { background-color: #f9fafb; }
table td { padding: 10px 14px; vertical-align: top; line-height: 1.5; border-bottom: 1px solid #f3f4f6; }
table td:first-child { font-weight: 600; width: 35%; color: #374151; border-right: 1px solid #f3f4f6; }
.doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 24px; gap: 12px; }
.doc-header-logo { width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }
.logo-circle { border-radius: 50%; }
.doc-header-center { flex: 1; text-align: center; }
.doc-header-center h1 { color: #10b981; font-size: 17pt; margin-bottom: 4px; }
.doc-header-center p { font-size: 10pt; color: #374151; }
.doc-header-center .sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }
.badge { display: inline-block; padding: 4px 8px; background: #ecfdf5; color: #059669; border-radius: 4px; font-weight: 600; font-size: 9pt; border: 1px solid #a7f3d0; }
.info-row { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 10pt; color: #4b5563; }
@page { size: A4 portrait; margin: 18mm 15mm; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="doc-header">
  <img class="doc-header-logo" src="${baseUrl}/logo-halal-center.png" alt="Halal Center" onerror="this.style.display='none'" />
  <div class="doc-header-center">
    <h1>HALAL CENTRE TPI</h1>
    <p>Formulir Pengajuan Sertifikasi Halal &mdash; Kota Tanjungpinang</p>
    <p class="sub">Pendampingan Proses Produk Halal (P3H)</p>
  </div>
  <img class="doc-header-logo logo-circle" src="${baseUrl}/logo-p3h-transparent.png" alt="P3H Logo" onerror="this.style.display='none'" />
</div>

<h2 style="text-align:center; margin-bottom: 12px; font-size: 15pt; color: #111827;">FORMULIR PENDAFTARAN MANDIRI</h2>
<div class="info-row">
  <div><strong>Tanggal Registrasi:</strong> ${tanggalRegistrasiStr}</div>
  <div><strong>Tanggal Cetak:</strong> ${tanggalCetakStr}</div>
</div>

<div class="section">
  <div class="section-heading">DATA PELAKU USAHA</div>
  <table>
    <tr><td>Nama Lengkap</td><td>${reg.nama || '-'}</td></tr>
    <tr><td>NIK</td><td>${reg.nik || '-'}</td></tr>
    <tr><td>No. WhatsApp</td><td>${reg.wa || '-'}</td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>${reg.tempatLahir || '-'}, ${reg.tanggalLahir || '-'}</td></tr>
    <tr><td>Alamat (Sesuai KTP)</td><td>${reg.alamat || '-'}</td></tr>
    <tr><td>Kelurahan / Kecamatan</td><td>${reg.kelurahan || '-'} / ${reg.kecamatan || '-'}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-heading">DATA USAHA</div>
  <table>
    <tr><td>Nama Usaha (Merek)</td><td><strong>${reg.namaUsaha || '-'}</strong></td></tr>
    <tr><td>Jenis Usaha</td><td><span class="badge">${reg.jenisUsaha || '-'}</span></td></tr>
    <tr><td>Nomor NIB</td><td>${reg.nib || '-'}</td></tr>
    <tr><td>KBLI</td><td>${reg.kbli || '-'}</td></tr>
    <tr><td>Tahun Berdiri</td><td>${reg.tahunBerdiri || '-'}</td></tr>
    <tr><td>Lokasi Usaha</td><td>${reg.lokasiUsaha || '-'}</td></tr>
    <tr><td>Kelurahan / Kecamatan Usaha</td><td>${reg.kelurahanUsaha || '-'} / ${reg.kecamatanUsaha || '-'}</td></tr>
    <tr><td>Titik Koordinat (GPS)</td><td>${reg.latitude && reg.longitude ? `${reg.latitude}, ${reg.longitude}` : (reg.linkMaps ? 'Tersedia via Maps' : '-')}</td></tr>
  </table>
</div>

<div style="margin-top: 50px; display: flex; justify-content: space-between;">
  <div style="text-align: center; width: 250px;">
    <p style="margin-bottom: 60px;">Pendaftar,</p>
    <p style="font-weight: bold; text-decoration: underline;">${reg.nama || '....................................'}</p>
  </div>
  <div style="text-align: center; width: 250px;">
    <p style="margin-bottom: 60px;">Petugas Penerima,</p>
    <p style="font-weight: bold; text-decoration: underline;">(....................................)</p>
  </div>
</div>

</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) {
      alert('Popup diblokir browser. Silakan izinkan popup untuk situs ini lalu coba lagi.');
      URL.revokeObjectURL(url);
      return;
    }
    win.onload = () => {
      setTimeout(() => {
        win.focus();
        win.print();
        URL.revokeObjectURL(url);
      }, 500);
    };
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

      <div className="table-responsive glass-card" style={{ overflowX: 'auto', borderRadius: '12px', borderTop: 'none' }}>
        {loading ? (
          <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>Memuat Data...</div>
        ) : filteredData.length === 0 ? (
          <div className="empty-state" style={{ padding: '2rem', textAlign: 'center' }}>Belum ada pendaftaran baru.</div>
        ) : (
          <table className="modern-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Waktu Masuk</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Pelaku Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>No. WA</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((reg) => (
                <tr key={reg.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: '0.85rem', color: '#111827', fontWeight: '500' }}>{new Date(reg.tanggalInput).toLocaleDateString('id-ID')}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{new Date(reg.tanggalInput).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#111827', fontSize: '0.875rem', fontWeight: '500', verticalAlign: 'middle' }}>{reg.nama}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>{reg.namaUsaha || '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{reg.wa}</td>
                  <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button 
                        onClick={() => setSelectedReg(reg)} 
                        className="btn-icon" 
                        title="Lihat Detail"
                        style={{ padding: '6px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handlePrintPDF(reg)} 
                        className="btn-icon" 
                        title="Cetak Pendaftaran"
                        style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        <FileText size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(reg.id)} 
                        className="btn-icon" 
                        title="Hapus Data"
                        style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        <Trash2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleForwardToPetugas(reg)} 
                        className="btn-icon" 
                        title="Kirim ke Petugas Lapangan"
                        style={{ padding: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
                      >
                        <Send size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                  {(selectedReg.kelurahan || selectedReg.kecamatan) && (
                    <>
                      <div className="info-item">
                        <label>Kelurahan (Domisili)</label>
                        <p>{selectedReg.kelurahan || '-'}</p>
                      </div>
                      <div className="info-item">
                        <label>Kecamatan (Domisili)</label>
                        <p>{selectedReg.kecamatan || '-'}</p>
                      </div>
                    </>
                  )}
                  <div className="info-item full">
                    <label>Lokasi Usaha</label>
                    <p>{selectedReg.lokasiUsaha}</p>
                  </div>
                  {(selectedReg.kelurahanUsaha || selectedReg.kecamatanUsaha) && (
                    <>
                      <div className="info-item">
                        <label>Kelurahan Usaha</label>
                        <p>{selectedReg.kelurahanUsaha || '-'}</p>
                      </div>
                      <div className="info-item">
                        <label>Kecamatan Usaha</label>
                        <p>{selectedReg.kecamatanUsaha || '-'}</p>
                      </div>
                    </>
                  )}
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

                <div className="modal-footer-actions" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: '1rem', display: 'grid', gap: '10px' }}>
                  <button onClick={() => handleDelete(selectedReg.id)} className="btn-danger-outline" style={{ border: '1px solid #ef4444', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <XCircle size={18} /> Hapus Data
                  </button>

                  <button 
                    onClick={() => handlePrintPDF(selectedReg)} 
                    className="btn-primary-outline" 
                    style={{ border: '1px solid #f59e0b', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', background: 'transparent', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <FileText size={18} /> Cetak Form
                  </button>

                  <button 
                    onClick={() => handleForwardToPetugas(selectedReg)} 
                    className="btn-primary-filled" 
                    style={{ background: '#3b82f6', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.9rem' }}
                  >
                    <Send size={18} /> Ke Petugas
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
