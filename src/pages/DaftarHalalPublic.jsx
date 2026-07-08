import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, update } from 'firebase/database';
import { compressImage } from '../utils/imageUtils';

const KELURAHAN_LIST = [
  'Tanjungpinang Barat', 'Kemboja', 'Bukit Cermin', 'Kampung Baru',
  'Tanjungpinang Kota', 'Senggarang', 'Kampung Bugis', 'Penyengat',
  'Batu IX', 'Melayu Kota Piring', 'Kampung Bulang', 'Pinang Kencana',
  'Air Raja', 'Dompak', 'Sei Jang', 'Tanjung Unggat',
  'Tanjung Ayun Sakti', 'Tanjungpinang Timur',
];

const KELURAHAN_KECAMATAN = {
  'Tanjungpinang Kota': 'Tanjungpinang Kota',
  'Senggarang': 'Tanjungpinang Kota',
  'Kampung Bugis': 'Tanjungpinang Kota',
  'Penyengat': 'Tanjungpinang Kota',
  'Tanjungpinang Barat': 'Tanjungpinang Barat',
  'Kemboja': 'Tanjungpinang Barat',
  'Bukit Cermin': 'Tanjungpinang Barat',
  'Kampung Baru': 'Tanjungpinang Barat',
  'Batu IX': 'Tanjungpinang Timur',
  'Melayu Kota Piring': 'Tanjungpinang Timur',
  'Kampung Bulang': 'Tanjungpinang Timur',
  'Pinang Kencana': 'Tanjungpinang Timur',
  'Air Raja': 'Tanjungpinang Timur',
  'Dompak': 'Bukit Bestari',
  'Sei Jang': 'Bukit Bestari',
  'Tanjung Unggat': 'Bukit Bestari',
  'Tanjung Ayun Sakti': 'Bukit Bestari',
  'Tanjungpinang Timur': 'Bukit Bestari',
};

/* ── All styles defined here, no external CSS dependency ── */
const S = {
  page: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#ffffff',
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    zIndex: 99999,
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
    padding: '24px 20px 40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  logo: {
    width: '72px', height: '72px',
    borderRadius: '50%', objectFit: 'cover',
    margin: '0 auto 12px',
    display: 'block',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: {
    fontSize: '1.4rem', fontWeight: 700,
    color: '#059669', margin: '0 0 4px',
  },
  subtitle: {
    fontSize: '0.9rem', color: '#64748b', margin: 0,
  },
  sectionTitle: {
    fontSize: '0.85rem', fontWeight: 700,
    color: '#059669', textTransform: 'uppercase',
    letterSpacing: '0.5px',
    borderBottom: '2px solid #059669',
    paddingBottom: '6px',
    margin: '28px 0 16px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
  },
  fullWidth: {
    gridColumn: '1 / -1',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem', fontWeight: 600,
    color: '#1e293b',
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '0.95rem',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  },
  inputFocus: {
    borderColor: '#059669',
    boxShadow: '0 0 0 3px rgba(5,150,105,0.1)',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '0.95rem',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    boxSizing: 'border-box',
    appearance: 'auto',
  },
  readOnly: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '0.95rem',
    border: '1.5px solid #e2e8f0',
    borderRadius: '10px',
    background: '#f1f5f9',
    color: '#059669',
    fontWeight: 600,
    cursor: 'not-allowed',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    fontSize: '0.95rem',
    border: '1.5px solid #d1d5db',
    borderRadius: '10px',
    background: '#ffffff',
    color: '#0f172a',
    outline: 'none',
    resize: 'vertical',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  locationBox: {
    padding: '16px',
    background: '#f8fafc',
    border: '1.5px solid #e2e8f0',
    borderRadius: '12px',
  },
  locationBtn: {
    width: '100%',
    padding: '12px',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '0.95rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  coordBox: {
    marginTop: '10px',
    padding: '10px 14px',
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    fontSize: '0.85rem',
    color: '#064e3b',
  },
  uploadArea: {
    border: '2px dashed #d1d5db',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    cursor: 'pointer',
    position: 'relative',
    background: '#fafafa',
  },
  uploadText: {
    fontSize: '0.85rem', color: '#64748b', margin: 0,
  },
  fileInput: {
    position: 'absolute',
    inset: 0,
    opacity: 0,
    cursor: 'pointer',
  },
  previewImg: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    objectFit: 'contain',
    display: 'block',
    margin: '0 auto 10px',
  },
  removeBtn: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '0.85rem',
    cursor: 'pointer',
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(135deg, #059669, #047857)',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    fontSize: '1.05rem',
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: '28px',
    letterSpacing: '0.3px',
    boxShadow: '0 4px 14px rgba(5,150,105,0.3)',
  },
  submitBtnDisabled: {
    opacity: 0.6, cursor: 'not-allowed',
  },
  successPage: {
    position: 'fixed',
    top: 0, left: 0, right: 0, bottom: 0,
    background: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    fontFamily: "'Outfit', 'Segoe UI', sans-serif",
    padding: '24px',
  },
  successCard: {
    textAlign: 'center',
    maxWidth: '440px',
    width: '100%',
  },
  successIcon: {
    width: '64px', height: '64px',
    borderRadius: '50%',
    background: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
  },
};

const DaftarHalalPublic = () => {
  const [formData, setFormData] = useState({
    nama: '', nik: '', tempatLahir: '', tanggalLahir: '',
    alamat: '', kelurahan: '', kecamatan: '', wa: '',
    namaUsaha: '', jenisUsaha: 'Makanan', kbli: '', nib: '',
    lokasiUsaha: '', kelurahanUsaha: '', kecamatanUsaha: '',
    tahunBerdiri: '', latitude: null, longitude: null,
    photoKTP: '', photoProduk: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  useEffect(() => {
    document.body.style.cssText = 'background:#ffffff !important;margin:0;padding:0;';
    document.documentElement.style.cssText = 'background:#ffffff !important;';
    return () => {
      document.body.style.cssText = '';
      document.documentElement.style.cssText = '';
    };
  }, []);

  const handleImageUpload = async (e, field) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file terlalu besar! Maksimal 5MB.');
        e.target.value = null;
        return;
      }
      try {
        const compressed = await compressImage(file);
        setFormData({ ...formData, [field]: compressed });
      } catch (err) {
        console.error("Gagal kompres foto:", err);
      }
    }
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('Geolocation tidak didukung');
      return;
    }
    setLocationStatus('Sedang mencari lokasi...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData({ ...formData, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus('Lokasi berhasil didapatkan!');
      },
      (err) => {
        setLocationStatus('Gagal mendapatkan lokasi. Pastikan GPS aktif.');
        alert('Gagal mendapatkan lokasi. Pastikan GPS aktif dan izinkan akses lokasi.');
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
      const newRef = push(ref(rtdb, 'daftar_halal'));
      const id = newRef.key;
      const { photoKTP, photoProduk, ...dataToSave } = formData;
      await update(ref(rtdb, `daftar_halal/${id}`), {
        ...dataToSave,
        status: 'Menunggu',
        tanggalInput: Date.now(),
        linkMaps: `https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`
      });
      await update(ref(rtdb, `daftar_halal_photos/${id}`), { photoKTP, photoProduk });
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    const baseUrl = window.location.origin;
    const now = new Date();
    const bulanId = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tanggalStr = `${String(now.getDate()).padStart(2,'0')} ${bulanId[now.getMonth()]} ${now.getFullYear()}`;

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>Bukti Pendaftaran - ${formData.nama}</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 18mm 15mm; }
.section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px; }
.section-heading { background: #e5e7eb; padding: 7px 12px; font-weight: bold; font-size: 11pt; border-left: 4px solid #10b981; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
table td { padding: 5px 8px; vertical-align: top; line-height: 1.5; }
table td:first-child { font-weight: bold; width: 32%; white-space: nowrap; }
.doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 20px; gap: 12px; }
.doc-header-logo { width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }
.doc-header-center { flex: 1; text-align: center; }
.doc-header-center h1 { color: #10b981; font-size: 17pt; margin-bottom: 4px; }
.doc-header-center p { font-size: 10pt; color: #374151; }
.doc-header-center .sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }
.identity-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
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
  <img class="doc-header-logo" src="${baseUrl}/logo-p3h-transparent.png" alt="P3H Logo" onerror="this.style.display='none'" />
</div>

<h2 style="text-align:center; margin-bottom: 20px; text-decoration: underline; font-size: 14pt;">BUKTI PENDAFTARAN</h2>

<div class="identity-box">
  <table>
    <tr><td>Nama Lengkap</td><td>: ${formData.nama || '-'}</td></tr>
    <tr><td>NIK</td><td>: ${formData.nik || '-'}</td></tr>
    <tr><td>No. WhatsApp</td><td>: ${formData.wa || '-'}</td></tr>
    <tr><td>Tempat, Tanggal Lahir</td><td>: ${formData.tempatLahir || '-'}, ${formData.tanggalLahir || '-'}</td></tr>
    <tr><td>Alamat (Sesuai KTP)</td><td>: ${formData.alamat || '-'}</td></tr>
    <tr><td>Kelurahan / Kecamatan</td><td>: ${formData.kelurahan || '-'} / ${formData.kecamatan || '-'}</td></tr>
  </table>
</div>

<div class="section">
  <div class="section-heading">DATA USAHA</div>
  <table>
    <tr><td>Nama Usaha (Merek)</td><td>: ${formData.namaUsaha || '-'}</td></tr>
    <tr><td>Jenis Usaha</td><td>: ${formData.jenisUsaha || '-'}</td></tr>
    <tr><td>Nomor NIB</td><td>: ${formData.nib || '-'}</td></tr>
    <tr><td>KBLI</td><td>: ${formData.kbli || '-'}</td></tr>
    <tr><td>Tahun Berdiri</td><td>: ${formData.tahunBerdiri || '-'}</td></tr>
    <tr><td>Lokasi Usaha</td><td>: ${formData.lokasiUsaha || '-'}</td></tr>
    <tr><td>Kelurahan / Kecamatan Usaha</td><td>: ${formData.kelurahanUsaha || '-'} / ${formData.kecamatanUsaha || '-'}</td></tr>
    <tr><td>Titik Koordinat (GPS)</td><td>: ${formData.latitude ? `${formData.latitude}, ${formData.longitude}` : '-'}</td></tr>
  </table>
</div>

<div style="margin-top: 40px; text-align: right;">
  <p>Kota Tanjungpinang, ${tanggalStr}</p>
  <p style="margin-top: 5px;">Pendaftar,</p>
  <div style="height: 80px;"></div>
  <p style="font-weight: bold; text-decoration: underline;">${formData.nama || '....................................'}</p>
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

  const InputField = ({ label, icon, ...props }) => (
    <div>
      <label style={S.label}>{icon && <span style={{ marginRight: 6 }}>{icon}</span>}{label}</label>
      <input style={S.input} {...props} />
    </div>
  );

  if (success) {
    return (
      <div style={S.successPage}>
        <div style={S.successCard}>
          <div style={S.successIcon}>
            <svg width="32" height="32" fill="none" stroke="#059669" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <h2 style={{ color: '#059669', marginBottom: '12px' }}>Pendaftaran Berhasil!</h2>
          <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '24px' }}>
            Data pengajuan Sertifikasi Halal Anda telah kami terima dan akan segera diproses oleh petugas lapangan kami. Terima kasih!
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={downloadPDF} style={{ ...S.submitBtn, marginTop: 0, background: '#f59e0b', boxShadow: '0 4px 14px rgba(245,158,11,0.3)', color: '#fff' }}>
              📄 Download / Cetak Bukti PDF
            </button>
            <button onClick={() => window.location.reload()} style={{ ...S.submitBtn, marginTop: 0, background: '#f1f5f9', color: '#0f172a', boxShadow: 'none', border: '1.5px solid #cbd5e1' }}>
              Ajukan Pendaftaran Lain
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <div style={S.container}>
        {/* Header */}
        <div style={S.header}>
          <img src="/logo-p3h.png" alt="P3H" style={S.logo} />
          <h1 style={S.title}>Pendaftaran Sertifikasi Halal</h1>
          <p style={S.subtitle}>Self Declare - P3H Tanjungpinang</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* ── DATA PELAKU USAHA ── */}
          <div style={S.sectionTitle}>Data Pelaku Usaha</div>
          <div style={S.grid}>
            <InputField label="Nama Lengkap" icon="👤" placeholder="Nama sesuai KTP" value={formData.nama} onChange={e => setFormData({...formData, nama: e.target.value})} required />
            <InputField label="NIK" icon="💳" placeholder="16 Digit NIK" inputMode="numeric" maxLength="16" value={formData.nik} onChange={e => setFormData({...formData, nik: e.target.value.replace(/\D/g,'').slice(0,16)})} required />
            <InputField label="Tempat Lahir" placeholder="Kota Kelahiran" value={formData.tempatLahir} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} required />
            <div>
              <label style={S.label}>Tanggal Lahir</label>
              <input type="date" style={S.input} value={formData.tanggalLahir} onChange={e => setFormData({...formData, tanggalLahir: e.target.value})} required />
            </div>
            <InputField label="Nomor WhatsApp" icon="📱" placeholder="0812..." inputMode="numeric" maxLength="13" value={formData.wa} onChange={e => setFormData({...formData, wa: e.target.value.replace(/\D/g,'').slice(0,13)})} required />
            <div style={S.fullWidth}>
              <label style={S.label}>📍 Alamat (Sesuai KTP)</label>
              <textarea style={S.textarea} rows="2" placeholder="Alamat lengkap sesuai KTP" value={formData.alamat} onChange={e => setFormData({...formData, alamat: e.target.value})} required />
            </div>
            <div>
              <label style={S.label}>Kelurahan</label>
              <select style={S.select} value={formData.kelurahan} onChange={e => { const k = e.target.value; setFormData({...formData, kelurahan: k, kecamatan: KELURAHAN_KECAMATAN[k]||''}); }} required>
                <option value="">-- Pilih Kelurahan --</option>
                {KELURAHAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Kecamatan</label>
              <input style={S.readOnly} value={formData.kecamatan} readOnly placeholder="Otomatis terisi" />
            </div>
          </div>

          {/* ── DATA USAHA ── */}
          <div style={S.sectionTitle}>Data Usaha</div>
          <div style={S.grid}>
            <InputField label="Nama Usaha" icon="🏪" placeholder="Nama Bisnis / Merek" value={formData.namaUsaha} onChange={e => setFormData({...formData, namaUsaha: e.target.value})} required />
            <div>
              <label style={S.label}>Jenis Usaha</label>
              <select style={S.select} value={formData.jenisUsaha} onChange={e => setFormData({...formData, jenisUsaha: e.target.value})} required>
                <option value="Makanan">Makanan</option>
                <option value="Minuman">Minuman</option>
              </select>
            </div>
            <InputField label="KBLI" placeholder="Kode KBLI (5 digit) (Opsional)" inputMode="numeric" maxLength="5" value={formData.kbli} onChange={e => setFormData({...formData, kbli: e.target.value.replace(/\D/g,'').slice(0,5)})} />
            <InputField label="Nomor NIB" placeholder="13 digit (Opsional)" inputMode="numeric" maxLength="13" value={formData.nib} onChange={e => setFormData({...formData, nib: e.target.value.replace(/\D/g,'').slice(0,13)})} />
            <InputField label="Tahun Berdiri" placeholder="Contoh: 2020" type="number" value={formData.tahunBerdiri} onChange={e => setFormData({...formData, tahunBerdiri: e.target.value})} required />
            <div style={S.fullWidth}>
              <label style={S.label}>📍 Lokasi Usaha (Alamat)</label>
              <textarea style={S.textarea} rows="2" placeholder="Alamat lengkap tempat produksi / jualan" value={formData.lokasiUsaha} onChange={e => setFormData({...formData, lokasiUsaha: e.target.value})} required />
            </div>
            <div>
              <label style={S.label}>Kelurahan Usaha</label>
              <select style={S.select} value={formData.kelurahanUsaha} onChange={e => { const k = e.target.value; setFormData({...formData, kelurahanUsaha: k, kecamatanUsaha: KELURAHAN_KECAMATAN[k]||''}); }} required>
                <option value="">-- Pilih Kelurahan --</option>
                {KELURAHAN_LIST.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div>
              <label style={S.label}>Kecamatan Usaha</label>
              <input style={S.readOnly} value={formData.kecamatanUsaha} readOnly placeholder="Otomatis terisi" />
            </div>

            {/* Titik Lokasi */}
            <div style={S.fullWidth}>
              <label style={S.label}>📌 Titik Lokasi Usaha (Koordinat)</label>
              <div style={S.locationBox}>
                <button type="button" onClick={getLocation} style={S.locationBtn}>
                  📍 Ambil Lokasi Saat Ini
                </button>
                {locationStatus && (
                  <p style={{ fontSize: '0.85rem', color: formData.latitude ? '#059669' : '#d97706', textAlign: 'center', marginTop: '8px', marginBottom: 0 }}>
                    {locationStatus}
                  </p>
                )}
                {formData.latitude && formData.longitude && (
                  <div style={S.coordBox}>
                    <strong>Latitude:</strong> {formData.latitude}<br/>
                    <strong>Longitude:</strong> {formData.longitude}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── UPLOAD DOKUMEN ── */}
          <div style={S.sectionTitle}>Upload Dokumen</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* KTP */}
            <div>
              <label style={S.label}>📸 Foto KTP</label>
              {formData.photoKTP ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={formData.photoKTP} alt="KTP" style={S.previewImg} />
                  <button type="button" onClick={() => setFormData({...formData, photoKTP: ''})} style={S.removeBtn}>Ganti Foto KTP</button>
                </div>
              ) : (
                <div style={S.uploadArea}>
                  <p style={S.uploadText}>Klik untuk pilih atau ambil foto KTP (Maks 5MB)</p>
                  <input type="file" accept="image/*" capture="environment" onChange={e => handleImageUpload(e, 'photoKTP')} style={S.fileInput} required />
                </div>
              )}
            </div>
            {/* Produk */}
            <div>
              <label style={S.label}>📸 Foto Produk</label>
              {formData.photoProduk ? (
                <div style={{ textAlign: 'center' }}>
                  <img src={formData.photoProduk} alt="Produk" style={S.previewImg} />
                  <button type="button" onClick={() => setFormData({...formData, photoProduk: ''})} style={S.removeBtn}>Ganti Foto Produk</button>
                </div>
              ) : (
                <div style={S.uploadArea}>
                  <p style={S.uploadText}>Klik untuk pilih atau ambil foto Produk (Maks 5MB)</p>
                  <input type="file" accept="image/*" capture="environment" onChange={e => handleImageUpload(e, 'photoProduk')} style={S.fileInput} required />
                </div>
              )}
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading} style={{ ...S.submitBtn, ...(loading ? S.submitBtnDisabled : {}) }}>
            {loading ? 'Menyimpan...' : '📨 Kirim Pendaftaran'}
          </button>
        </form>
      </div>

      {/* CSS Reset khusus halaman ini */}
      <style>{`
        .daftar-halal-page *, .daftar-halal-page *::before, .daftar-halal-page *::after { box-sizing: border-box; }
        @media (max-width: 600px) {
          .daftar-grid-responsive { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};

export default DaftarHalalPublic;
