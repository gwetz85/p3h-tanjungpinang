import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, update, onValue, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { motion } from 'framer-motion';
import { X, Save, FileText, Image as ImageIcon, Download, ExternalLink, MapPin, Send } from 'lucide-react';

const HalalForm = ({ job, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [gudangBahanList, setGudangBahanList] = useState([]);
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
    const unsubPhotos = onValue(photosRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setFormData(prev => ({
          ...prev,
          photo: val.photo || prev.photo,
          photoKTP: val.photoKTP || prev.photoKTP
        }));
      }
    });

    // Fetch Gudang Bahan for auto-fill
    const gudangRef = ref(rtdb, 'gudang_bahan');
    const unsubGudang = onValue(gudangRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        
        const uniqueList = [];
        const seen = new Set();
        list.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0));
        
        for (const item of list) {
          const merekLower = (item.merek || '').toLowerCase().trim();
          if (merekLower && !seen.has(merekLower)) {
            seen.add(merekLower);
            uniqueList.push(item);
          }
        }
        setGudangBahanList(uniqueList);
      }
    });

    return () => {
      unsubPhotos();
      unsubGudang();
    };
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
        // Automatically add valid bahan to Gudang Bahan
        const validBahan = cleanedBahan.filter(b => b.merk && b.merk.trim() !== '');
        
        for (const b of validBahan) {
          const supplierName = b.supplier === 'Swalayan' && b.namaSwalayan ? `${b.supplier} (${b.namaSwalayan})` : (b.supplier || '');
          const newBahanData = {
            merek: b.merk || '',
            produsen: b.produsen || '',
            sertifikatHalal: b.sertifikat || '',
            expiredDate: b.expired || '',
            supplier: supplierName,
            tanggalInput: Date.now()
          };
          
          // Simple deduplication check: check if a material with same merk and produsen already exists
          const gudangRef = ref(rtdb, 'gudang_bahan');
          const snapshot = await get(gudangRef);
          let exists = false;
          
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
            
            const getWords = (str) => {
              return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !['merk', 'merek', 'cap', 'dan', 'pt', 'cv'].includes(w));
            };

            let matchingItem = null;

            for (const item of list) {
               if (item.sertifikatHalal && newBahanData.sertifikatHalal && item.sertifikatHalal === newBahanData.sertifikatHalal) {
                 matchingItem = item; break;
               }
               const wordsA = getWords(item.merek);
               const wordsB = getWords(newBahanData.merek);
               if (wordsA.length > 0 && wordsB.length > 0) {
                 const common = wordsA.filter(w => wordsB.includes(w));
                 if (common.length >= 2 || (wordsA.length === 1 && wordsB.length === 1 && wordsA[0] === wordsB[0])) {
                   matchingItem = item; break;
                 }
               }
               const normA = (item.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
               const normB = (newBahanData.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
               if (normA && normB && normA === normB) {
                 matchingItem = item; break;
               }
            }

            if (matchingItem) {
              exists = true;
              
              const getScore = (item) => {
                let score = 0;
                if (item.merek) score += 1;
                if (item.produsen) score += 2;
                if (item.sertifikatHalal) score += 3;
                if (item.expiredDate) score += 1;
                if (item.supplier) score += 1;
                return score;
              };
              
              const existingScore = getScore(matchingItem);
              const newScore = getScore(newBahanData);
              
              let updates = {};
              let shouldUpdate = false;
              
              if (newScore > existingScore) {
                // If new data is better, overwrite most fields but preserve ID and original input date
                updates = { 
                  merek: newBahanData.merek || matchingItem.merek,
                  produsen: newBahanData.produsen || matchingItem.produsen,
                  sertifikatHalal: newBahanData.sertifikatHalal || matchingItem.sertifikatHalal,
                  expiredDate: newBahanData.expiredDate || matchingItem.expiredDate,
                  supplier: newBahanData.supplier || matchingItem.supplier
                };
                shouldUpdate = true;
              } else {
                // Merge missing fields if the new score is lower or equal but has missing info
                if (!matchingItem.produsen && newBahanData.produsen) { updates.produsen = newBahanData.produsen; shouldUpdate = true; }
                if (!matchingItem.expiredDate && newBahanData.expiredDate) { updates.expiredDate = newBahanData.expiredDate; shouldUpdate = true; }
                if (!matchingItem.supplier && newBahanData.supplier) { updates.supplier = newBahanData.supplier; shouldUpdate = true; }
                if (!matchingItem.sertifikatHalal && newBahanData.sertifikatHalal) { updates.sertifikatHalal = newBahanData.sertifikatHalal; shouldUpdate = true; }
              }
              
              if (shouldUpdate) {
                await update(ref(rtdb, `gudang_bahan/${matchingItem.id}`), updates);
              }
            }
          }
          
          if (!exists) {
            await push(gudangRef, newBahanData);
          }
        }

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

  const generatePDF = () => {
    const bahanFilled = formData.bahan.filter(b => b.merk);
    const pembersihFilled = formData.pembersih.filter(p => p.merk);
    const kemasanFilled = formData.kemasan.filter(k => k.merk);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      alert('Popup diblokir browser. Izinkan popup untuk mencetak PDF.');
      return;
    }

    const baseUrl = window.location.origin;

    printWindow.document.write(`
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Halal TPI - ${formData.namaUsaha || 'Dokumen'}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #111;
      background: #fff;
      padding: 0;
    }

    /* ── Page setup ── */
    @page {
      size: A4 portrait;
      margin: 18mm 15mm 18mm 15mm;
    }

    /* ── Section blocks — never split across pages ── */
    .section {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-bottom: 18px;
    }

    /* ── Section heading ── */
    .section-heading {
      background: #e5e7eb;
      padding: 7px 12px;
      font-weight: bold;
      font-size: 11pt;
      border-left: 4px solid #10b981;
      margin-bottom: 10px;
      page-break-after: avoid;
      break-after: avoid;
    }

    /* ── Data table ── */
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table td {
      padding: 5px 8px;
      vertical-align: top;
      line-height: 1.5;
    }
    table td:first-child {
      font-weight: bold;
      width: 32%;
      white-space: nowrap;
    }

    /* ── Bahan list ── */
    .bahan-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10pt;
    }
    .bahan-table th {
      background: #f3f4f6;
      padding: 5px 8px;
      text-align: left;
      border: 1px solid #d1d5db;
      font-size: 10pt;
    }
    .bahan-table td {
      padding: 5px 8px;
      border: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .bahan-table tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* ── Images — fit inside one page, never split ── */
    .img-section {
      page-break-inside: avoid;
      break-inside: avoid;
      text-align: center;
      margin-top: 8px;
    }
    .img-section img {
      max-width: 100%;
      max-height: 220mm;
      object-fit: contain;
      border: 1px solid #d1d5db;
      padding: 4px;
      display: block;
      margin: 0 auto;
    }

    /* ── Header ── */
    .doc-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 3px solid #10b981;
      padding-bottom: 14px;
      margin-bottom: 20px;
      gap: 12px;
    }
    .doc-header-logo {
      width: 90px;
      height: 90px;
      object-fit: contain;
      flex-shrink: 0;
    }
    .doc-header-center {
      flex: 1;
      text-align: center;
    }
    .doc-header-center h1 { color: #10b981; font-size: 17pt; margin-bottom: 4px; }
    .doc-header-center p  { font-size: 10pt; color: #374151; }
    .doc-header-center .sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }

    /* ── Identity block (pemohon) ── */
    .identity-box {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      padding: 10px 14px;
      margin-bottom: 18px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .identity-box table td:first-child { width: 28%; }

    /* ── Signature block ── */
    .sign-block {
      margin-top: 36px;
      text-align: right;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sign-block p { line-height: 1.8; font-size: 10pt; }
    .sign-line {
      display: inline-block;
      border-bottom: 1px solid #111;
      width: 200px;
      margin-top: 48px;
    }

    /* ── Print-only: hide browser chrome ── */
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="doc-header">
    <img class="doc-header-logo" src="${baseUrl}/logo-halal-center.png" alt="Halal Center" onerror="this.style.display='none'" />
    <div class="doc-header-center">
      <h1>HALAL CENTRE TPI</h1>
      <p>Formulir Pengajuan Sertifikasi Halal &mdash; Kota Tanjungpinang</p>
      <p class="sub">Pendampingan Proses Produk Halal (P3H)</p>
    </div>
    <img class="doc-header-logo" src="${baseUrl}/logo-p3h-transparent.png" alt="P3H Logo" onerror="this.style.display='none'" />
  </div>

  <!-- IDENTITAS PEMOHON -->
  <div class="identity-box">
    <table>
      <tr><td>Nama Pelaku Usaha</td><td>: <strong>${job.nama || '-'}</strong></td></tr>
      <tr><td>NIK</td><td>: ${job.nik || '-'}</td></tr>
      <tr><td>No. WhatsApp</td><td>: ${job.wa || '-'}</td></tr>
      <tr><td>Kelurahan</td><td>: ${job.kelurahan || '-'}</td></tr>
      <tr><td>Alamat Domisili</td><td>: ${job.alamat || '-'}</td></tr>
    </table>
  </div>

  <!-- I. DATA USAHA -->
  <div class="section">
    <div class="section-heading">I. DATA USAHA</div>
    <table>
      <tr><td>Nomor NIB</td><td>: ${formData.nib || '-'}</td></tr>
      <tr><td>KBLI</td><td>: ${formData.kbli || '-'}</td></tr>
      <tr><td>Usaha Di NIB</td><td>: ${formData.usahaNib || '-'}</td></tr>
      <tr><td>Nama Usaha</td><td>: ${formData.namaUsaha || '-'}</td></tr>
      <tr><td>Modal Usaha</td><td>: ${formData.modalUsaha || '-'}</td></tr>
      <tr><td>Lokasi Usaha</td><td>: ${formData.lokasiUsaha || '-'}</td></tr>
      <tr><td>Titik Koordinat GPS</td><td>: ${formData.location ? `${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}` : '-'}</td></tr>
      <tr><td>Pendapatan</td><td>: ${formData.pendapatan || '-'}</td></tr>
    </table>
  </div>

  <!-- II. AKUN SIHALAL -->
  <div class="section">
    <div class="section-heading">II. AKUN SIHALAL (RESMI)</div>
    <table>
      <tr><td>Email siHalal</td><td>: ${formData.siHalalEmail || '-'}</td></tr>
      <tr><td>Kata Sandi siHalal</td><td>: ${formData.siHalalPassword || '-'}</td></tr>
    </table>
  </div>

  <!-- III. DAFTAR BAHAN -->
  <div class="section">
    <div class="section-heading">III. DAFTAR BAHAN &amp; PROSES</div>

    ${bahanFilled.length > 0 ? `
    <p style="font-weight:bold; margin-bottom:6px;">A. Bahan Pembuatan Produk</p>
    <table class="bahan-table">
      <thead>
        <tr>
          <th>No</th><th>Merk / Nama Bahan</th><th>Produsen</th>
          <th>Sertifikat Halal</th><th>Expired</th><th>Supplier</th><th>Bahan Pengganti</th>
        </tr>
      </thead>
      <tbody>
        ${bahanFilled.map((b, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${b.merk || '-'}</td>
          <td>${b.produsen || '-'}</td>
          <td>${b.sertifikat || '-'}</td>
          <td>${b.expired || '-'}</td>
          <td>${b.supplier || '-'}${b.supplier === 'Swalayan' && b.namaSwalayan ? `<br><small>(${b.namaSwalayan})</small>` : ''}</td>
          <td>${(b.sub || []).filter(s => s).join(', ') || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : '<p style="color:#6b7280; font-size:10pt;">Tidak ada bahan yang diisi.</p>'}

    ${pembersihFilled.length > 0 ? `
    <p style="font-weight:bold; margin:12px 0 6px;">B. Bahan Pembersih</p>
    <table class="bahan-table">
      <thead><tr><th>No</th><th>Item Pembersih</th><th>Bahan Pengganti</th></tr></thead>
      <tbody>
        ${pembersihFilled.map((p, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${p.merk || '-'}</td>
          <td>${(p.sub || []).filter(s => s).join(', ') || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}

    ${kemasanFilled.length > 0 ? `
    <p style="font-weight:bold; margin:12px 0 6px;">C. Kemasan</p>
    <table class="bahan-table">
      <thead><tr><th>No</th><th>Jenis Kemasan</th></tr></thead>
      <tbody>
        ${kemasanFilled.map((k, i) => `
        <tr>
          <td style="text-align:center">${i + 1}</td>
          <td>${k.merk || '-'}</td>
        </tr>`).join('')}
      </tbody>
    </table>` : ''}
  </div>

  <!-- IV. TATACARA -->
  <div class="section">
    <div class="section-heading">IV. TATACARA PEMBUATAN PRODUK</div>
    <p style="white-space: pre-wrap; line-height: 1.7; font-size: 10.5pt;">${formData.tatacara || '-'}</p>
  </div>

  <!-- V. LINK SURVEY -->
  ${formData.surveyDriveLink ? `
  <div class="section">
    <div class="section-heading">V. LINK FOTO SURVEY LAPANGAN</div>
    <p style="word-break: break-all; color: #2563eb;">${formData.surveyDriveLink}</p>
  </div>` : ''}

  <!-- VI. FOTO PRODUK -->
  ${formData.photo ? `
  <div class="section">
    <div class="section-heading">${formData.surveyDriveLink ? 'VI' : 'V'}. FOTO PRODUK</div>
    <div class="img-section">
      <img src="${formData.photo}" alt="Foto Produk" />
    </div>
  </div>` : ''}

  <!-- VII. FOTO KTP -->
  ${formData.photoKTP ? `
  <div class="section">
    <div class="section-heading">${formData.surveyDriveLink && formData.photo ? 'VII' : formData.surveyDriveLink || formData.photo ? 'VI' : 'V'}. FOTO KTP PELAKU USAHA</div>
    <div class="img-section">
      <img src="${formData.photoKTP}" alt="Foto KTP" />
    </div>
  </div>` : ''}

  <!-- TANDA TANGAN -->
  <div class="sign-block">
    <p>Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
    <p class="sign-line"></p>
    <p>Petugas Halal Centre TPI</p>
  </div>

</body>
</html>`);

    printWindow.document.close();
    printWindow.focus();

    // Tunggu semua gambar selesai dimuat sebelum print
    const images = printWindow.document.images;
    let loaded = 0;
    const total = images.length;

    const doPrint = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
    };

    if (total === 0) {
      doPrint();
    } else {
      Array.from(images).forEach(img => {
        if (img.complete) {
          loaded++;
          if (loaded === total) doPrint();
        } else {
          img.onload = img.onerror = () => {
            loaded++;
            if (loaded === total) doPrint();
          };
        }
      });
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
          
          <datalist id="gudang-bahan-list">
            {gudangBahanList.map((b, idx) => (
              <option key={idx} value={b.merek} />
            ))}
          </datalist>

          <div className="bahan-list">
            {formData.bahan.map((b, i) => (
              <div key={i} className="bahan-item glass-card mb-2">
                <div className="bahan-main">
                  <div className="input-group" style={{ position: 'relative' }}>
                    <label>Merk</label>
                    <input 
                      list="gudang-bahan-list"
                      placeholder="Merk" 
                      value={b.merk} 
                      onBlur={e => {
                        const value = e.target.value.trim().toLowerCase();
                        if (value.length > 2) {
                          const matched = gudangBahanList.find(gb => 
                            gb.merek && gb.merek.toLowerCase().trim() === value
                          );
                          if (matched) {
                            const newBahan = [...formData.bahan];
                            let currentBahan = {...b};
                            if (!currentBahan.produsen) currentBahan.produsen = matched.produsen || '';
                            if (!currentBahan.sertifikat) currentBahan.sertifikat = matched.sertifikatHalal || '';
                            if (!currentBahan.expired) currentBahan.expired = matched.expiredDate || '';
                            if (!currentBahan.supplier && matched.supplier) {
                              let sup = matched.supplier;
                              if (sup.includes('Swalayan')) {
                                currentBahan.supplier = 'Swalayan';
                                const matchSwalayan = sup.match(/\((.*?)\)/);
                                if (matchSwalayan) currentBahan.namaSwalayan = matchSwalayan[1];
                              } else if (sup.includes('Pasar')) {
                                currentBahan.supplier = 'Pasar';
                              } else if (sup.includes('Kedai')) {
                                currentBahan.supplier = 'Kedai Kelontong';
                              } else {
                                currentBahan.supplier = sup;
                              }
                            }
                            newBahan[i] = currentBahan;
                            setFormData({...formData, bahan: newBahan});
                          }
                        }
                      }}
                      onChange={e => {
                        const value = e.target.value;
                        const newBahan = [...formData.bahan]; 
                        let currentBahan = {...b, merk: value};
                        
                        // Exact match on change
                        if (value.trim().length > 2) {
                          const searchVal = value.trim().toLowerCase();
                          const matched = gudangBahanList.find(gb => 
                            gb.merek && gb.merek.trim().toLowerCase() === searchVal
                          );
                          if (matched) {
                            if (!currentBahan.produsen) currentBahan.produsen = matched.produsen || '';
                            if (!currentBahan.sertifikat) currentBahan.sertifikat = matched.sertifikatHalal || '';
                            if (!currentBahan.expired) currentBahan.expired = matched.expiredDate || '';
                            
                            if (!currentBahan.supplier && matched.supplier) {
                              let sup = matched.supplier;
                              if (sup.includes('Swalayan')) {
                                currentBahan.supplier = 'Swalayan';
                                const matchSwalayan = sup.match(/\((.*?)\)/);
                                if (matchSwalayan) {
                                  currentBahan.namaSwalayan = matchSwalayan[1];
                                }
                              } else if (sup.includes('Pasar')) {
                                currentBahan.supplier = 'Pasar';
                              } else if (sup.includes('Kedai')) {
                                currentBahan.supplier = 'Kedai Kelontong';
                              } else {
                                currentBahan.supplier = sup;
                              }
                            }
                          }
                        }
                        
                        newBahan[i] = currentBahan;
                        setFormData({...formData, bahan: newBahan});
                      }} 
                    />
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
                {formData.location ? (
                  <a 
                    href={`https://www.google.com/maps?q=${formData.location.lat},${formData.location.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '500' }}
                    title="Buka di Google Maps"
                  >
                    <ExternalLink size={14} /> {`${formData.location.lat.toFixed(6)}, ${formData.location.lng.toFixed(6)}`}
                  </a>
                ) : 'Lokasi Belum Diambil'}
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
