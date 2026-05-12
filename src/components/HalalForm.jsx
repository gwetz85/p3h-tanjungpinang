import React, { useState } from 'react';
import { rtdb } from '../firebase';
import { ref, update } from 'firebase/database';
import { motion } from 'framer-motion';
import { X, Save, FileText, Plus, Trash2, Image as ImageIcon, Download, ExternalLink, MapPin } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HalalForm = ({ job, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(job.halalData || {
    nib: '', kbli: '', usahaNib: '', namaUsaha: '', modalUsaha: '', lokasiUsaha: '', pendapatan: '',
    tatacara: '',
    photo: '',
    surveyDriveLink: '',
    location: null,
    bahan: Array(10).fill({ merk: '', produsen: '', sertifikat: '', sub: ['', '', ''] }),
    pembersih: Array(10).fill({ merk: '', produsen: '', sertifikat: '', sub: ['', '', ''] }),
    kemasan: Array(10).fill({ merk: '', produsen: '', sertifikat: '' })
  });

  const calculateProgress = (data) => {
    let totalFields = 12; // 7 Data Usaha + 3 Daftar (Bahan, Pembersih, Kemasan) + 1 Tatacara + 1 Photo
    let filledFields = 0;

    // Check Data Usaha (7 fields)
    if (data.nib) filledFields++;
    if (data.kbli) filledFields++;
    if (data.usahaNib) filledFields++;
    if (data.namaUsaha) filledFields++;
    if (data.modalUsaha) filledFields++;
    if (data.lokasiUsaha) filledFields++;
    if (data.pendapatan) filledFields++;

    // Check Lists (Minimal 1 item terisi)
    if (data.bahan.some(b => b.merk || b.produsen)) filledFields++;
    if (data.pembersih.some(p => p.merk)) filledFields++;
    if (data.kemasan.some(k => k.merk)) filledFields++;

    // Check Tatacara & Photo
    if (data.tatacara) filledFields++;
    if (data.photo) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const progress = calculateProgress(formData);
      await update(ref(rtdb, `pekerjaan/${job.id}`), { 
        halalData: formData,
        progress: progress,
        status: progress >= 100 ? 'Review' : 'Proses',
        reviewStartedAt: progress >= 100 ? Date.now() : null
      });
      alert(progress >= 100 ? 'Data lengkap! Pekerjaan kini diteruskan ke Admin untuk Verifikasi (30 Menit).' : `Data Disimpan! Progres otomatis: ${progress}%`);
    } catch (err) {
      alert('Gagal simpan: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Browser Anda tidak mendukung Geolocation');
      return;
    }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData({ ...formData, location: { lat: latitude, lng: longitude } });
        setLoading(false);
        alert('Lokasi berhasil diambil!');
      },
      () => {
        setLoading(false);
        alert('Gagal mengambil lokasi. Pastikan izin lokasi diberikan.');
      }
    );
  };


  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, photo: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    setLoading(true);
    // Create a hidden formal element for PDF
    const printEl = document.createElement('div');
    printEl.style.position = 'fixed';
    printEl.style.left = '-9999px';
    printEl.style.width = '800px';
    printEl.style.padding = '40px';
    printEl.style.backgroundColor = '#fff';
    printEl.style.color = '#000';
    printEl.style.fontFamily = 'Arial, sans-serif';

    printEl.innerHTML = `
      <div style="text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #10b981;">HALAL CENTRE TPI</h1>
        <p style="margin: 5px 0;">Sertifikasi Halal - Formulir Pengajuan Dokumen</p>
      </div>
      
      <h3 style="background: #f3f4f6; padding: 10px;">I. DATA USAHA</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 30%;">Nomor NIB</td><td>: ${formData.nib || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">KBLI</td><td>: ${formData.kbli || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Usaha Di NIB</td><td>: ${formData.usahaNib || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Nama Usaha</td><td>: ${formData.namaUsaha || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Modal Usaha</td><td>: ${formData.modalUsaha || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Lokasi Usaha</td><td>: ${formData.lokasiUsaha || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Pendapatan</td><td>: ${formData.pendapatan || '-'}</td></tr>
      </table>

      <h3 style="background: #f3f4f6; padding: 10px;">II. DAFTAR BAHAN & PROSES</h3>
      <div style="margin-bottom: 15px;">
        <strong>1. Bahan Pembuatan:</strong><br>
        <ul style="margin: 5px 0 0 20px; padding: 0;">
          ${formData.bahan.filter(b => b.merk).map(b => `
            <li style="margin-bottom: 5px;">
              ${b.merk} (${b.produsen}) - Sertifikat: ${b.sertifikat || '-'}
              ${b.sub.some(s => s) ? `<br><small style="color: #666;"><i>Pengganti: ${b.sub.filter(s => s).join(', ')}</i></small>` : ''}
            </li>
          `).join('') || '<li>-</li>'}
        </ul>
      </div>

      <div style="margin-bottom: 15px;">
        <strong>2. Bahan Pembersih:</strong><br>
        <ul style="margin: 5px 0 0 20px; padding: 0;">
          ${formData.pembersih.filter(p => p.merk).map(p => `
            <li style="margin-bottom: 5px;">
              ${p.merk}
              ${p.sub.some(s => s) ? `<br><small style="color: #666;"><i>Pengganti: ${p.sub.filter(s => s).join(', ')}</i></small>` : ''}
            </li>
          `).join('') || '<li>-</li>'}
        </ul>
      </div>

      <div style="margin-bottom: 20px;">
        <strong>3. Kemasan:</strong><br>
        <ul style="margin: 5px 0 0 20px; padding: 0;">
          ${formData.kemasan.filter(k => k.merk).map(k => `<li style="margin-bottom: 5px;">${k.merk}</li>`).join('') || '<li>-</li>'}
        </ul>
      </div>


      <h3 style="background: #f3f4f6; padding: 10px;">III. TATACARA PEMBUATAN</h3>
      <p style="white-space: pre-wrap; line-height: 1.6;">${formData.tatacara || '-'}</p>

      ${formData.photo ? `
        <h3 style="background: #f3f4f6; padding: 10px;">IV. FOTO PRODUK</h3>
        <div style="text-align: center; margin-top: 20px;">
          <img src="${formData.photo}" style="max-width: 400px; border: 1px solid #ddd; padding: 5px;" />
        </div>
      ` : ''}

      <div style="margin-top: 50px; text-align: right;">
        <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
        <br><br><br>
        <p>( __________________________ )</p>
        <p>Petugas Halal Centre TPI</p>
      </div>
    `;

    document.body.appendChild(printEl);
    
    try {
      const canvas = await html2canvas(printEl, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`HALAL_TPI_${formData.namaUsaha || 'DOKUMEN'}.pdf`);
    } catch (err) {
      alert('Error PDF: ' + err.message);
    } finally {
      document.body.removeChild(printEl);
      setLoading(false);
    }
  };


  return (
    <div className="modal-overlay">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal-content glass-card halal-modal">
        <div className="modal-header">
          <h2><FileText size={24} /> Form Sertifikasi Halal</h2>
          <div className="header-actions">
            <button onClick={generatePDF} className="btn-icon text-primary" title="Cetak PDF"><Download /></button>
            <button onClick={onClose} className="btn-close"><X /></button>
          </div>
        </div>

        <div className="halal-form-scroll" id="pdf-content">
          <div className="section-title">Data Usaha</div>
          <div className="detail-grid">
            <div className="input-group"><label>Nomor NIB</label><input type="text" value={formData.nib} onChange={e => setFormData({...formData, nib: e.target.value})} /></div>
            <div className="input-group"><label>KBLI</label><input type="text" value={formData.kbli} onChange={e => setFormData({...formData, kbli: e.target.value})} /></div>
            <div className="input-group"><label>Usaha Di NIB</label><input type="text" value={formData.usahaNib} onChange={e => setFormData({...formData, usahaNib: e.target.value})} /></div>
            <div className="input-group"><label>Nama Usaha</label><input type="text" value={formData.namaUsaha} onChange={e => setFormData({...formData, namaUsaha: e.target.value})} /></div>
            <div className="input-group"><label>Modal Usaha</label><input type="text" value={formData.modalUsaha} onChange={e => setFormData({...formData, modalUsaha: e.target.value})} /></div>
            <div className="input-group"><label>Lokasi Usaha</label><input type="text" value={formData.lokasiUsaha} onChange={e => setFormData({...formData, lokasiUsaha: e.target.value})} /></div>
            <div className="input-group"><label>Pendapatan</label><input type="text" value={formData.pendapatan} onChange={e => setFormData({...formData, pendapatan: e.target.value})} /></div>
          </div>

          <div className="section-title mt-4">1. Bahan Pembuatan Produk (10 Item)</div>
          <div className="bahan-list">
            {formData.bahan.map((b, i) => (
              <div key={i} className="bahan-item glass-card mb-2">
                <div className="bahan-main">
                  <input placeholder="Merk" value={b.merk} onChange={e => {
                    const newBahan = [...formData.bahan]; newBahan[i] = {...b, merk: e.target.value};
                    setFormData({...formData, bahan: newBahan});
                  }} />
                  <input placeholder="Produsen" value={b.produsen} onChange={e => {
                    const newBahan = [...formData.bahan]; newBahan[i] = {...b, produsen: e.target.value};
                    setFormData({...formData, bahan: newBahan});
                  }} />
                  <input placeholder="Sertifikat Halal" value={b.sertifikat} onChange={e => {
                    const newBahan = [...formData.bahan]; newBahan[i] = {...b, sertifikat: e.target.value};
                    setFormData({...formData, bahan: newBahan});
                  }} />
                </div>
                <div className="sub-data">
                  <p>Sub Data Pengganti:</p>
                  {b.sub.map((s, si) => (
                    <input key={si} placeholder={`Pengganti ${si+1}`} value={s} onChange={e => {
                      const newSub = [...b.sub]; newSub[si] = e.target.value;
                      const newBahan = [...formData.bahan]; newBahan[i] = {...b, sub: newSub};
                      setFormData({...formData, bahan: newBahan});
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="section-title mt-4">2. Pembersihan (10 Item)</div>
          <div className="bahan-list">
            {formData.pembersih.map((b, i) => (
              <div key={i} className="bahan-item glass-card mb-2">
                <div className="bahan-main">
                  <input placeholder="Item Pembersih" value={b.merk} onChange={e => {
                    const newPem = [...formData.pembersih]; newPem[i] = {...b, merk: e.target.value};
                    setFormData({...formData, pembersih: newPem});
                  }} />
                </div>
                <div className="sub-data">
                  <p>Sub Data Pengganti:</p>
                  {b.sub.map((s, si) => (
                    <input key={si} placeholder={`Pengganti ${si+1}`} value={s} onChange={e => {
                      const newSub = [...b.sub]; newSub[si] = e.target.value;
                      const newPem = [...formData.pembersih]; newPem[i] = {...b, sub: newSub};
                      setFormData({...formData, pembersih: newPem});
                    }} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="section-title mt-4">3. Kemasan (10 Item)</div>
          <div className="bahan-list">
            {formData.kemasan.map((b, i) => (
              <div key={i} className="bahan-item glass-card mb-2">
                <input placeholder="Jenis Kemasan" value={b.merk} onChange={e => {
                  const newKem = [...formData.kemasan]; newKem[i] = {...b, merk: e.target.value};
                  setFormData({...formData, kemasan: newKem});
                }} />
              </div>
            ))}
          </div>

          <div className="section-title mt-4">Tatacara Pembuatan Produk</div>
          <textarea rows="6" value={formData.tatacara} onChange={e => setFormData({...formData, tatacara: e.target.value})} placeholder="Uraikan sedetail mungkin..."></textarea>


          <div className="section-title mt-4">Photo Produk Jadi</div>
          <div className="photo-upload glass-card mb-4">
            {formData.photo ? (
              <img src={formData.photo} alt="Produk" className="preview-img" />
            ) : (
              <div className="photo-placeholder"><ImageIcon size={48} /> <p>Pilih Photo Produk</p></div>
            )}
            <input type="file" accept="image/*" onChange={handleImageUpload} />
          </div>

          <div className="input-group glass-card p-4 mb-4" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
            <label style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ExternalLink size={16} /> Link Google Drive (Foto Survey Lapangan)
            </label>
            <input 
              type="url" 
              placeholder="https://drive.google.com/..." 
              value={formData.surveyDriveLink} 
              onChange={e => setFormData({...formData, surveyDriveLink: e.target.value})}
              style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '10px', borderRadius: '8px' }}
            />
          </div>

          <div className="input-group glass-card p-4 mb-4" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <label style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <MapPin size={16} /> Titik Koordinat Verval (GPS)
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '8px', fontSize: '0.85rem', color: formData.location ? 'white' : 'rgba(255,255,255,0.3)' }}>
                {formData.location ? `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}` : 'Lokasi Belum Diambil'}
              </div>
              <button 
                type="button" 
                onClick={handleGetLocation} 
                className="btn-primary" 
                style={{ padding: '10px 20px', background: '#10b981', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
              >
                AMBIL LOKASI VERVAL
              </button>
            </div>
          </div>
        </div>

        <div className="modal-actions mt-4">
          <button onClick={handleUpdate} className="btn-primary" disabled={loading}>
            <Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Semua Data'}
          </button>
        </div>
      </motion.div>

    </div>
  );
};

export default HalalForm;
