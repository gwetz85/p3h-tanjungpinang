import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, update, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { X, Save, FileText, Plus, Trash2, Image as ImageIcon, Download, ExternalLink, MapPin, Send } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const HalalForm = ({ job, onClose }) => {
  const [loading, setLoading] = useState(false);
  const defaultData = {
    nib: '', kbli: '', usahaNib: '', namaUsaha: '', modalUsaha: '', lokasiUsaha: '', pendapatan: '',
    tatacara: '',
    photo: '',
    photoKTP: '',
    surveyDriveLink: '',
    location: null,
    siHalalEmail: '',
    siHalalPassword: '',
    bahan: Array(40).fill(null).map(() => ({ merk: '', produsen: '', sertifikat: '', expired: '', supplier: '', namaSwalayan: '', sub: [''] })),
    pembersih: Array(10).fill(null).map(() => ({ merk: '', produsen: '', sertifikat: '', sub: [''] })),
    kemasan: Array(10).fill(null).map(() => ({ merk: '', produsen: '', sertifikat: '' }))
  };

  const [formData, setFormData] = useState({
    ...defaultData,
    ...(job.halalData || {}),
    // Deeply ensure arrays and sub-properties exist
    bahan: (() => {
      const existing = job.halalData?.bahan || defaultData.bahan;
      const padded = [...existing];
      while (padded.length < 40) {
        padded.push({ merk: '', produsen: '', sertifikat: '', expired: '', supplier: '', namaSwalayan: '', sub: [''] });
      }
      return padded.map(b => ({
        ...b,
        expired: b.expired || '',
        supplier: b.supplier || '',
        namaSwalayan: b.namaSwalayan || '',
        sub: b.sub || ['']
      }));
    })(),
    pembersih: (job.halalData?.pembersih || defaultData.pembersih).map(p => ({
      ...p,
      sub: p.sub || ['']
    })),
    kemasan: (job.halalData?.kemasan || defaultData.kemasan)
  });

  useEffect(() => {
    // Lazily fetch photos from separate path
    const photosRef = ref(rtdb, `pekerjaan_photos/${job.id}`);
    onValue(photosRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setFormData(prev => ({
          ...prev,
          photo: val.photo || prev.photo,
          photoKTP: val.photoKTP || prev.photoKTP
        }));
      }
    }, { onlyOnce: true });
  }, [job.id]);

  const calculateProgress = (data) => {
    let totalFields = 17; // 7 Data Usaha + 3 Daftar + 1 Tatacara + 1 Photo + 1 PhotoKTP + 1 Drive + 1 Location + 2 siHalal
    let filledFields = 0;

    if (data.nib) filledFields++;
    if (data.kbli) filledFields++;
    if (data.usahaNib) filledFields++;
    if (data.namaUsaha) filledFields++;
    if (data.modalUsaha) filledFields++;
    if (data.lokasiUsaha) filledFields++;
    if (data.pendapatan) filledFields++;
    if (data.bahan.some(b => b.merk)) filledFields++;
    if (data.pembersih.some(p => p.merk)) filledFields++;
    if (data.kemasan.some(k => k.merk)) filledFields++;
    if (data.tatacara) filledFields++;
    if (data.photo) filledFields++;
    if (data.photoKTP) filledFields++;
    if (data.surveyDriveLink) filledFields++;
    if (data.location) filledFields++;
    if (data.siHalalEmail) filledFields++;
    if (data.siHalalPassword) filledFields++;

    return Math.round((filledFields / totalFields) * 100);
  };

  const handleUpdate = async (isFinal = false) => {
    setLoading(true);
    try {
      // Clean sub data: remove empty strings from sub arrays
      const cleanedBahan = formData.bahan.map(b => ({
        ...b,
        sub: (b.sub || []).filter(s => s && s.trim() !== '')
      }));
      const cleanedPembersih = formData.pembersih.map(p => ({
        ...p,
        sub: (p.sub || []).filter(s => s && s.trim() !== '')
      }));
      
      const { photo, photoKTP, ...restFormData } = formData;
      const dataToSave = {
        ...restFormData,
        bahan: cleanedBahan,
        pembersih: cleanedPembersih
      };

      const progress = calculateProgress(formData);
      
      let newStatus = job.status; // Default keep current status
      if (isFinal) {
        newStatus = 'Review';
      } else if (job.status === 'Returned') {
        newStatus = 'Returned'; // Stay returned
      } else {
        newStatus = 'Proses';
      }

      const updates = {
        halalData: dataToSave,
        progress: progress,
        status: newStatus,
        reviewStartedAt: (isFinal || (newStatus === 'Review' && job.status !== 'Review')) ? Date.now() : (job.reviewStartedAt || null)
      };
      
      await update(ref(rtdb, `pekerjaan/${job.id}`), updates);

      const photoUpdates = {};
      if (photo) photoUpdates.photo = photo;
      if (photoKTP) photoUpdates.photoKTP = photoKTP;

      if (Object.keys(photoUpdates).length > 0) {
        await update(ref(rtdb, `pekerjaan_photos/${job.id}`), photoUpdates);
      }
      
      if (isFinal) {
        alert('Data BERHASIL DIKIRIM ke Admin untuk Verifikasi!');
        onClose();
      } else {
        alert(`Draft Disimpan! Progres: ${progress}%`);
      }
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

  const handleKTPUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, photoKTP: reader.result });
      reader.readAsDataURL(file);
    }
  };

  const generatePDF = async () => {
    setLoading(true);
    // Create a hidden formal element for PDF
    const printEl = document.createElement('div');
    printEl.style.position = 'absolute';
    printEl.style.top = '0';
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
        <tr><td style="padding: 8px; font-weight: bold;">Titik Koordinat (GPS)</td><td>: ${formData.location ? `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}` : '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Pendapatan</td><td>: ${formData.pendapatan || '-'}</td></tr>
      </table>

      <h3 style="background: #f3f4f6; padding: 10px;">II. DAFTAR BAHAN & PROSES</h3>
      <div style="margin-bottom: 15px;">
        <strong>1. Bahan Pembuatan:</strong><br>
        <ul style="margin: 5px 0 0 20px; padding: 0;">
          ${formData.bahan.filter(b => b.merk).map(b => `
            <li style="margin-bottom: 5px;">
              ${b.merk} (${b.produsen}) - Sertifikat: ${b.sertifikat || '-'} ${b.expired ? `(Exp: ${b.expired})` : ''}
              ${b.supplier ? `<br><small style="color: #4b5563;">Supplier: ${b.supplier}${b.supplier === 'Swalayan' && b.namaSwalayan ? ` (${b.namaSwalayan})` : ''}</small>` : ''}
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


      <h3 style="background: #f3f4f6; padding: 10px;">III. AKUN SIHALAL (RESMI)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 8px; font-weight: bold; width: 30%;">Email siHalal</td><td>: ${formData.siHalalEmail || '-'}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Kata Sandi</td><td>: ${formData.siHalalPassword || '-'}</td></tr>
      </table>

      <h3 style="background: #f3f4f6; padding: 10px;">IV. TATACARA PEMBUATAN</h3>
      <p style="white-space: pre-wrap; line-height: 1.6;">${formData.tatacara || '-'}</p>

      ${formData.photo ? `
        <h3 style="background: #f3f4f6; padding: 10px;">V. FOTO PRODUK</h3>
        <div style="text-align: center; margin-top: 20px;">
          <img src="${formData.photo}" style="max-width: 400px; border: 1px solid #ddd; padding: 5px;" />
        </div>
      ` : ''}

      ${formData.photoKTP ? `
        <h3 style="background: #f3f4f6; padding: 10px; margin-top: 20px;">VI. FOTO KTP PELAKU USAHA</h3>
        <div style="text-align: center; margin-top: 20px;">
          <img src="${formData.photoKTP}" style="max-width: 400px; border: 1px solid #ddd; padding: 5px;" />
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
      const canvas = await html2canvas(printEl, { 
        scale: 2, 
        useCORS: true,
        windowHeight: printEl.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const margin = 15;
      const pdfWidth = pdf.internal.pageSize.getWidth() - (margin * 2);
      const pageHeight = pdf.internal.pageSize.getHeight();
      const contentHeightPerPage = pageHeight - (margin * 2);
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let slice_start_y = 0;
      
      // Page 1
      pdf.addImage(imgData, 'PNG', margin, margin, pdfWidth, imgHeight);
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), margin, 'F'); // Top margin mask
      pdf.rect(0, pageHeight - margin, pdf.internal.pageSize.getWidth(), margin, 'F'); // Bottom margin mask
      
      heightLeft -= contentHeightPerPage;
      slice_start_y += contentHeightPerPage;

      while (heightLeft > 0) {
        pdf.addPage();
        let position_on_page = margin - slice_start_y;
        pdf.addImage(imgData, 'PNG', margin, position_on_page, pdfWidth, imgHeight);
        
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pdf.internal.pageSize.getWidth(), margin, 'F'); // Top margin mask
        pdf.rect(0, pageHeight - margin, pdf.internal.pageSize.getWidth(), margin, 'F'); // Bottom margin mask
        
        heightLeft -= contentHeightPerPage;
        slice_start_y += contentHeightPerPage;
      }
      
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

          <div className="section-title mt-4">1. Bahan Pembuatan Produk (40 Item)</div>
          <div className="bahan-list">
            {formData.bahan.map((b, i) => (
              <div key={i} className="bahan-item glass-card mb-2">
                <div className="bahan-main">
                  <div className="input-group">
                    <label>Merk</label>
                    <input placeholder="Merk" value={b.merk} onChange={e => {
                      const newBahan = [...formData.bahan]; newBahan[i] = {...b, merk: e.target.value};
                      setFormData({...formData, bahan: newBahan});
                    }} />
                  </div>
                  <div className="input-group">
                    <label>Produsen</label>
                    <input placeholder="Produsen" value={b.produsen} onChange={e => {
                      const newBahan = [...formData.bahan]; newBahan[i] = {...b, produsen: e.target.value};
                      setFormData({...formData, bahan: newBahan});
                    }} />
                  </div>
                  <div className="input-group">
                    <label>Sertifikat Halal</label>
                    <input placeholder="Sertifikat Halal" value={b.sertifikat} onChange={e => {
                      const newBahan = [...formData.bahan]; newBahan[i] = {...b, sertifikat: e.target.value};
                      setFormData({...formData, bahan: newBahan});
                    }} />
                  </div>
                  <div className="input-group">
                    <label>Tgl Expired</label>
                    <input placeholder="Tgl Expired" value={b.expired || ''} onChange={e => {
                      const newBahan = [...formData.bahan]; newBahan[i] = {...b, expired: e.target.value};
                      setFormData({...formData, bahan: newBahan});
                    }} />
                  </div>
                  <div className="input-group">
                    <label>Supplier</label>
                    <select 
                      value={b.supplier || ''} 
                      onChange={e => {
                        const newBahan = [...formData.bahan]; 
                        newBahan[i] = {
                          ...b, 
                          supplier: e.target.value,
                          namaSwalayan: e.target.value === 'Swalayan' ? (b.namaSwalayan || '') : ''
                        };
                        setFormData({...formData, bahan: newBahan});
                      }}
                    >
                      <option value="">Pilih Supplier</option>
                      <option value="Pasar">Pasar</option>
                      <option value="Swalayan">Swalayan</option>
                      <option value="Kedai Kelontong">Kedai Kelontong</option>
                    </select>
                  </div>
                  {b.supplier === 'Swalayan' && (
                    <div className="input-group">
                      <label>Nama Swalayan</label>
                      <input 
                        placeholder="Nama Swalayan" 
                        value={b.namaSwalayan || ''} 
                        onChange={e => {
                          const newBahan = [...formData.bahan]; 
                          newBahan[i] = {...b, namaSwalayan: e.target.value};
                          setFormData({...formData, bahan: newBahan});
                        }} 
                      />
                    </div>
                  )}
                </div>
                <div className="sub-data">
                  <p>Sub Data Pengganti:</p>
                  {(() => {
                    // Always show existing sub data + 1 empty input if the last one is not empty
                    const displaySub = [...(b.sub || [])];
                    if (displaySub.length === 0 || displaySub[displaySub.length - 1] !== '') {
                      displaySub.push('');
                    }
                    return displaySub.map((s, si) => (
                      <input key={si} placeholder={`Pengganti ${si+1}`} value={s} onChange={e => {
                        const newSub = [...displaySub]; 
                        newSub[si] = e.target.value;
                        // Filter out trailing empties except the last one managed by displaySub logic
                        // but here we just update the actual b.sub
                        const actualSub = [...newSub];
                        const newBahan = [...formData.bahan]; 
                        newBahan[i] = {...b, sub: actualSub};
                        setFormData({...formData, bahan: newBahan});
                      }} />
                    ));
                  })()}
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
                  {(() => {
                    const displaySub = [...(b.sub || [])];
                    if (displaySub.length === 0 || displaySub[displaySub.length - 1] !== '') {
                      displaySub.push('');
                    }
                    return displaySub.map((s, si) => (
                      <input key={si} placeholder={`Pengganti ${si+1}`} value={s} onChange={e => {
                        const newSub = [...displaySub]; 
                        newSub[si] = e.target.value;
                        const actualSub = [...newSub];
                        const newPem = [...formData.pembersih]; 
                        newPem[i] = {...b, sub: actualSub};
                        setFormData({...formData, pembersih: newPem});
                      }} />
                    ));
                  })()}
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

          <div className="section-title mt-4">Akses Akun siHalal (Resmi)</div>
          <div className="detail-grid glass-card p-4 mb-4" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.1)' }}>
            <div className="input-group">
              <label style={{ color: '#f59e0b' }}>Email siHalal</label>
              <input type="email" placeholder="example@email.com" value={formData.siHalalEmail} onChange={e => setFormData({...formData, siHalalEmail: e.target.value})} />
            </div>
            <div className="input-group">
              <label style={{ color: '#f59e0b' }}>Kata Sandi siHalal</label>
              <input type="text" placeholder="Password siHalal" value={formData.siHalalPassword} onChange={e => setFormData({...formData, siHalalPassword: e.target.value})} />
            </div>
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

          <div className="section-title mt-4">Foto KTP Pelaku Usaha</div>
          <div className="photo-upload glass-card mb-4">
            {formData.photoKTP ? (
              <img src={formData.photoKTP} alt="KTP" className="preview-img" />
            ) : (
              <div className="photo-placeholder"><ImageIcon size={48} /> <p>Pilih Foto KTP</p></div>
            )}
            <input type="file" accept="image/*" onChange={handleKTPUpload} />
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

        <div className="modal-actions mt-4" style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => handleUpdate(false)} className="btn-primary-outline" disabled={loading} style={{ flex: 1 }}>
            <Save size={18} /> {loading ? 'Menyimpan...' : 'Simpan Draft'}
          </button>
          
          <button 
            onClick={() => handleUpdate(true)} 
            className="btn-primary" 
            disabled={loading || calculateProgress(formData) < 100} 
            style={{ 
              flex: 2, 
              background: calculateProgress(formData) < 100 ? '#374151' : '#10b981',
              cursor: calculateProgress(formData) < 100 ? 'not-allowed' : 'pointer',
              opacity: calculateProgress(formData) < 100 ? 0.6 : 1
            }}
            title={calculateProgress(formData) < 100 ? 'Lengkapi semua data (100%) termasuk Lokasi & Link Drive untuk mengirim' : 'Kirim ke Admin'}
          >
            <Send size={18} /> {loading ? 'Mengirim...' : 'KIRIM KE ADMIN'}
          </button>
        </div>
      </motion.div>

    </div>
  );
};

export default HalalForm;
