import React, { useState, useEffect, useRef } from 'react';
import { rtdb } from '../firebase';
import { ref, update, onValue, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { motion } from 'framer-motion';
import { X, Save, FileText, Image as ImageIcon, Download, ExternalLink, MapPin, Send, Eraser, PenTool } from 'lucide-react';

const HalalForm = ({ job, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [gudangBahanList, setGudangBahanList] = useState([]);
  const sigCanvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const defaultData = {
    nib: '', kbli: '', usahaNib: '', namaUsaha: '', modalUsaha: '', lokasiUsaha: '', pendapatan: '',
    namaPelakuUsaha: '', nikPelakuUsaha: '', tempatLahir: '', tglLahir: '', kontakWA: '', alamatPelakuUsaha: '',
    tatacara: '',
    photo: '',
    photoKTP: '',
    surveyDriveLink: '',
    location: null,
    siHalalEmail: '',
    siHalalPassword: '',
    tandaTanganPelakuUsaha: '',
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
    // Fetch latest halalData to prevent overwriting with defaults if it was stripped from job prop
    const halalDataRef = ref(rtdb, `pekerjaan/${job.id}/halalData`);
    get(halalDataRef).then((snapshot) => {
      if (snapshot.exists()) {
        const fetchedData = snapshot.val();
        setFormData(prev => {
          const newBahan = (() => {
            const existing = fetchedData.bahan || defaultData.bahan;
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
          })();

          const newPembersih = (fetchedData.pembersih || defaultData.pembersih).map(p => ({
            ...p,
            sub: p.sub || ['']
          }));

          return {
            ...prev,
            ...fetchedData,
            bahan: newBahan,
            pembersih: newPembersih,
            kemasan: fetchedData.kemasan || defaultData.kemasan,
            photo: prev.photo, // Preserve lazily loaded photos
            photoKTP: prev.photoKTP,
            tandaTanganPelakuUsaha: prev.tandaTanganPelakuUsaha
          };
        });
      }
    }).catch(err => console.error("Error fetching halalData:", err));

    // Lazily fetch photos from separate path
    const photosRef = ref(rtdb, `pekerjaan_photos/${job.id}`);
    const unsubPhotos = onValue(photosRef, (snapshot) => {
      if (snapshot.exists()) {
        const val = snapshot.val();
        setFormData(prev => ({
          ...prev,
          photo: val.photo || prev.photo,
          photoKTP: val.photoKTP || prev.photoKTP,
          tandaTanganPelakuUsaha: val.tandaTanganPelakuUsaha || prev.tandaTanganPelakuUsaha
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
    // Signature no longer counted in progress

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
      
      const { photo, photoKTP, tandaTanganPelakuUsaha, ...restFormData } = formData;
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
      if (tandaTanganPelakuUsaha) photoUpdates.tandaTanganPelakuUsaha = tandaTanganPelakuUsaha;

      if (Object.keys(photoUpdates).length > 0) {
        await update(ref(rtdb, `pekerjaan_photos/${job.id}`), photoUpdates);
      }
      
      if (isFinal) {
        // Automatically add valid bahan to Gudang Bahan
        const validBahan = cleanedBahan.filter(b => b.merk && b.merk.trim() !== '');
        
        for (const b of validBahan) {
          const supplierName = b.supplier === 'Swalayan' && b.namaSwalayan ? `${b.supplier} (${b.namaSwalayan})` : (b.supplier || '');
          const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
          const newBahanData = {
            kodeBarang: `GB-${Date.now().toString().slice(-4)}${uniqueId}`,
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
               
               let nameSimilar = false;
               const wordsA = getWords(item.merek);
               const wordsB = getWords(newBahanData.merek);
               if (wordsA.length > 0 && wordsB.length > 0) {
                 const common = wordsA.filter(w => wordsB.includes(w));
                 if (common.length >= 2 || (wordsA.length === 1 && wordsB.length === 1 && wordsA[0] === wordsB[0])) {
                   nameSimilar = true;
                 }
               }
               const normA = (item.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
               const normB = (newBahanData.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
               if (normA && normB && normA === normB) {
                 nameSimilar = true;
               }

               if (nameSimilar) {
                 const prodA = (item.produsen || '').toLowerCase().trim();
                 const prodB = (newBahanData.produsen || '').toLowerCase().trim();
                 
                 // If both have a produsen defined and they are different, they are DIFFERENT variants.
                 // Do not match, so it will push as a new variant.
                 if (prodA && prodB && prodA !== prodB) {
                   continue;
                 }
                 
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

  const downloadImage = (dataUrl, filename) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCoordinates = (e) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e) => {
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const drawSignature = (e) => {
    if (!isDrawing) return;
    // prevent scrolling when drawing on touch
    if (e.type.includes('touch')) {
      e.preventDefault();
    }
    const coords = getCoordinates(e);
    if (!coords) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
  };

  const finishDrawing = () => {
    if (!isDrawing) return;
    const ctx = sigCanvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
    const dataUrl = sigCanvasRef.current.toDataURL('image/png');
    setFormData(prev => ({ ...prev, tandaTanganPelakuUsaha: dataUrl }));
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData(prev => ({ ...prev, tandaTanganPelakuUsaha: '' }));
  };

  // set up touch options to non-passive for preventing scroll
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const handleTouchMove = (e) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isDrawing]);

  const buildHtmlContent = (forPernyataan = false) => {
    const bahanFilled = formData.bahan.filter(b => b.merk);
    const pembersihFilled = formData.pembersih.filter(p => p.merk);
    const kemasanFilled = formData.kemasan.filter(k => k.merk);
    const baseUrl = window.location.origin;
    const namaPelakuUsaha = formData.namaPelakuUsaha || job.nama || '-';
    const now = new Date();
    const bulanId = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const tanggalStr = `${String(now.getDate()).padStart(2,'0')} ${bulanId[now.getMonth()]} ${now.getFullYear()}`;

    if (forPernyataan) {
      return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8" />
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 12pt; color: #111; background: #fff; padding: 20mm; }
.wrapper { border: 1.5px solid #111; padding: 40px 48px 48px 48px; }
.title { text-align: center; font-weight: bold; font-size: 11pt; text-decoration: underline; margin-bottom: 8px; }
.subtitle { text-align: center; font-size: 12pt; margin-bottom: 28px; }
.body-text { text-align: justify; line-height: 1.9; margin-bottom: 14px; font-size: 12pt; }
.numbered-list { margin: 0 0 30px 0; padding-left: 0; list-style: none; }
.numbered-list li { display: flex; gap: 6px; text-align: justify; line-height: 1.9; margin-bottom: 4px; font-size: 12pt; }
.numbered-list li .num { min-width: 22px; flex-shrink: 0; }
.sign-area { margin-top: 30px; }
.sign-location { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 6px; }
.sign-label { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 0; }
.sign-img-wrap { margin: 10px auto; height: 90px; display: flex; align-items: center; justify-content: center; }
.sign-img-wrap img { max-height: 90px; max-width: 220px; object-fit: contain; display: block; }
.sign-name { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 2px; }
.sign-line { text-align: center; font-size: 12pt; }
@page { size: A4 portrait; margin: 20mm; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="wrapper">
  <div class="title">KEBIJAKAN HALAL</div>
  <div class="subtitle">(${namaPelakuUsaha.toUpperCase()})</div>
  <div class="body-text">Kami berkomitmen dan bertanggung jawab untuk menghasilkan produk halal secara konsisten dan berkesinambungan dengan melalukan tindakan:</div>
  <ol class="numbered-list">
    <li><span class="num">1.</span><span>Mentaati peraturan perundang-undangan terkait jaminan produk halal.</span></li>
    <li><span class="num">2.</span><span>Menggunakan bahan halal dan melaksanakan proses produk halal (PPH) sesuai dengan ketentuannya yang berlaku.</span></li>
    <li><span class="num">3.</span><span>Menyediakan sumber daya manusia yang mendukung pelaksanaan PPH di perusahaan.</span></li>
    <li><span class="num">4.</span><span>Mensosialisasikan dan mengkomunikasikan kebijakan halal pada seluruh pihak terkait untuk memastikan semua personel menjaga integritas halal di perusahaan.</span></li>
  </ol>
  <div class="sign-area">
    <div class="sign-location">KOTA TANJUNG PINANG, ${tanggalStr}</div>
    <div class="sign-label">Penanggung Jawab,</div>
    <div class="sign-img-wrap">${formData.tandaTanganPelakuUsaha ? `<img src="${formData.tandaTanganPelakuUsaha}" alt="Tanda Tangan" />` : '<div style="height:90px;"></div>'}</div>
    <div class="sign-name">${namaPelakuUsaha}</div>
    <div class="sign-line">(......................................)</div>
  </div>
</div>
</body></html>`;
    }

    return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8" />
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; background: #fff; padding: 18mm 15mm; }
.section { page-break-inside: avoid; break-inside: avoid; margin-bottom: 18px; }
.section-heading { background: #e5e7eb; padding: 7px 12px; font-weight: bold; font-size: 11pt; border-left: 4px solid #10b981; margin-bottom: 10px; }
table { width: 100%; border-collapse: collapse; }
table td { padding: 5px 8px; vertical-align: top; line-height: 1.5; }
table td:first-child { font-weight: bold; width: 32%; white-space: nowrap; }
.bahan-table { width: 100%; border-collapse: collapse; font-size: 10pt; }
.bahan-table th { background: #f3f4f6; padding: 5px 8px; text-align: left; border: 1px solid #d1d5db; font-size: 10pt; }
.bahan-table td { padding: 5px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
.img-section { page-break-inside: avoid; break-inside: avoid; text-align: center; margin-top: 8px; }
.img-section img { max-width: 100%; max-height: 220mm; object-fit: contain; border: 1px solid #d1d5db; padding: 4px; display: block; margin: 0 auto; }
.doc-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #10b981; padding-bottom: 14px; margin-bottom: 20px; gap: 12px; }
.doc-header-logo { width: 90px; height: 90px; object-fit: contain; flex-shrink: 0; }
.doc-header-center { flex: 1; text-align: center; }
.doc-header-center h1 { color: #10b981; font-size: 17pt; margin-bottom: 4px; }
.doc-header-center p { font-size: 10pt; color: #374151; }
.doc-header-center .sub { font-size: 9pt; color: #6b7280; margin-top: 2px; }
.identity-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 10px 14px; margin-bottom: 18px; }
.identity-box table td:first-child { width: 28%; }
@page { size: A4 portrait; margin: 18mm 15mm; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="doc-header">
  <img class="doc-header-logo" src="${baseUrl}/logo-halal-center.png" alt="Halal Center" onerror="this.style.display='none'" />
  <div class="doc-header-center">
    <h1>HALAL CENTRE TPI</h1>
    <p>Formulir Pengajuan Sertifikasi Halal &mdash; Kota Tanjungpinang</p>
    <p class="sub">Pendampingan Proses Produk Halal (P3H)</p>
  </div>
  <img class="doc-header-logo" src="${baseUrl}/logo-p3h-transparent.png" alt="P3H Logo" onerror="this.style.display='none'" />
</div>
<div class="identity-box">
  <table>
    <tr><td>Nama Pelaku Usaha</td><td>: <strong>${job.nama || '-'}</strong></td></tr>
    <tr><td>NIK</td><td>: ${job.nik || '-'}</td></tr>
    <tr><td>No. WhatsApp</td><td>: ${job.wa || '-'}</td></tr>
    <tr><td>Kelurahan</td><td>: ${job.kelurahan || '-'}</td></tr>
    <tr><td>Alamat Domisili</td><td>: ${job.alamat || '-'}</td></tr>
  </table>
</div>
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
<div class="section">
  <div class="section-heading">II. AKUN SIHALAL (RESMI)</div>
  <table>
    <tr><td>Email siHalal</td><td>: ${formData.siHalalEmail || '-'}</td></tr>
    <tr><td>Kata Sandi siHalal</td><td>: ${formData.siHalalPassword || '-'}</td></tr>
  </table>
</div>
<div class="section">
  <div class="section-heading">III. DAFTAR BAHAN &amp; PROSES</div>
  ${bahanFilled.length > 0 ? `
  <p style="font-weight:bold; margin-bottom:6px;">A. Bahan Pembuatan Produk</p>
  <table class="bahan-table"><thead><tr><th>No</th><th>Merk / Nama Bahan</th><th>Produsen</th><th>Sertifikat Halal</th><th>Expired</th><th>Supplier</th><th>Bahan Pengganti</th></tr></thead>
  <tbody>${bahanFilled.map((b, i) => `<tr><td style="text-align:center">${i+1}</td><td>${b.merk||'-'}</td><td>${b.produsen||'-'}</td><td>${b.sertifikat||'-'}</td><td>${b.expired||'-'}</td><td>${b.supplier||'-'}${b.supplier==='Swalayan'&&b.namaSwalayan?`<br><small>(${b.namaSwalayan})</small>`:''}</td><td>${(b.sub||[]).filter(s=>s).join(', ')||'-'}</td></tr>`).join('')}</tbody></table>` : '<p style="color:#6b7280;font-size:10pt;">Tidak ada bahan yang diisi.</p>'}
  ${pembersihFilled.length > 0 ? `<p style="font-weight:bold;margin:12px 0 6px;">B. Bahan Pembersih</p><table class="bahan-table"><thead><tr><th>No</th><th>Item Pembersih</th><th>Bahan Pengganti</th></tr></thead><tbody>${pembersihFilled.map((p,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${p.merk||'-'}</td><td>${(p.sub||[]).filter(s=>s).join(', ')||'-'}</td></tr>`).join('')}</tbody></table>` : ''}
  ${kemasanFilled.length > 0 ? `<p style="font-weight:bold;margin:12px 0 6px;">C. Kemasan</p><table class="bahan-table"><thead><tr><th>No</th><th>Jenis Kemasan</th></tr></thead><tbody>${kemasanFilled.map((k,i)=>`<tr><td style="text-align:center">${i+1}</td><td>${k.merk||'-'}</td></tr>`).join('')}</tbody></table>` : ''}
</div>
<div class="section">
  <div class="section-heading">IV. TATACARA PEMBUATAN PRODUK</div>
  <p style="white-space: pre-wrap; line-height: 1.7; font-size: 10.5pt;">${formData.tatacara || '-'}</p>
</div>
${formData.surveyDriveLink ? `<div class="section"><div class="section-heading">V. LINK FOTO SURVEY LAPANGAN</div><p style="word-break:break-all;color:#2563eb;">${formData.surveyDriveLink}</p></div>` : ''}
${formData.photo ? `<div class="section"><div class="section-heading">${formData.surveyDriveLink ? 'VI' : 'V'}. FOTO PRODUK</div><div class="img-section"><img src="${formData.photo}" alt="Foto Produk" /></div></div>` : ''}
${formData.photoKTP ? `<div class="section"><div class="section-heading">${formData.surveyDriveLink && formData.photo ? 'VII' : formData.surveyDriveLink || formData.photo ? 'VI' : 'V'}. FOTO KTP PELAKU USAHA</div><div class="img-section"><img src="${formData.photoKTP}" alt="Foto KTP" /></div></div>` : ''}
<div style="margin-top: 36px; text-align: right;">
  <p style="font-size:10pt;">Dicetak pada: ${new Date().toLocaleString('id-ID')}</p>
  <div style="display:inline-block;text-align:center;margin-top:20px;min-width:200px;">
    <p style="margin-bottom:10px;font-weight:bold;">PELAKU USAHA</p>
    ${formData.tandaTanganPelakuUsaha ? `<img src="${formData.tandaTanganPelakuUsaha}" style="max-height:80px;max-width:200px;display:block;margin:0 auto;" alt="Tanda Tangan" />` : '<div style="height:80px;"></div>'}
    <p style="margin-top:5px;font-weight:bold;text-decoration:underline;">${job.nama || '-'}</p>
  </div>
</div>
</body></html>`;
  };

  const openPrintWindow = (htmlContent) => {
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

  const generatePDF = () => {
    const html = buildHtmlContent(false);
    openPrintWindow(html);
  };

  const generatePernyataanHalalPDF = () => {
    const html = buildHtmlContent(true);
    openPrintWindow(html);
  };

  return (
    <div className="modal-overlay">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="modal-content glass-card halal-modal">
        <div className="modal-header">
          <h2><FileText size={24} /> Form Sertifikasi Halal</h2>
          <div className="header-actions">
            <button onClick={generatePernyataanHalalPDF} className="btn-icon" title="Cetak Pernyataan Halal" style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <FileText size={18} /><span style={{ fontWeight: 600 }}>Pernyataan Halal</span>
            </button>
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

          <div className="section-title mt-4">Data Pelaku Usaha</div>
          <div className="detail-grid">
            <div className="input-group"><label>Nama Pelaku Usaha</label><input type="text" value={formData.namaPelakuUsaha} onChange={e => setFormData({...formData, namaPelakuUsaha: e.target.value})} placeholder="Nama lengkap pelaku usaha" /></div>
            <div className="input-group"><label>NIK</label><input type="text" value={formData.nikPelakuUsaha} onChange={e => setFormData({...formData, nikPelakuUsaha: e.target.value})} placeholder="Nomor Induk Kependudukan" /></div>
            <div className="input-group"><label>Tempat Lahir</label><input type="text" value={formData.tempatLahir} onChange={e => setFormData({...formData, tempatLahir: e.target.value})} placeholder="Kota tempat lahir" /></div>
            <div className="input-group"><label>Tanggal Lahir</label><input type="date" value={formData.tglLahir} onChange={e => setFormData({...formData, tglLahir: e.target.value})} /></div>
            <div className="input-group"><label>Kontak WA</label><input type="text" value={formData.kontakWA} onChange={e => setFormData({...formData, kontakWA: e.target.value})} placeholder="Nomor WhatsApp aktif" /></div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}><label>Alamat</label><input type="text" value={formData.alamatPelakuUsaha} onChange={e => setFormData({...formData, alamatPelakuUsaha: e.target.value})} placeholder="Alamat lengkap pelaku usaha" /></div>
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
              <>
                <img src={formData.photoKTP} alt="KTP" className="preview-img" />
                <button
                  type="button"
                  onClick={() => downloadImage(formData.photoKTP, `KTP_${job.nama || job.id}.jpg`)}
                  className="btn-primary"
                  style={{ marginTop: '10px', width: '100%', background: 'rgba(16,185,129,0.2)', border: '1px solid #10b981', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Download size={16} /> Download Foto KTP
                </button>
              </>
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

          <div className="section-title mt-4">Tanda Tangan Pelaku Usaha</div>
          <div className="glass-card mb-4 p-4" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '2px solid #e5e7eb', marginBottom: '10px', width: '100%', maxWidth: '600px' }}>
              <canvas
                ref={sigCanvasRef}
                width={600}
                height={300}
                style={{ display: 'block', touchAction: 'none', width: '100%', height: 'auto' }}
                onMouseDown={startDrawing}
                onMouseMove={drawSignature}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
                onTouchStart={startDrawing}
                onTouchMove={drawSignature}
                onTouchEnd={finishDrawing}
              />
            </div>
            
            <div style={{ display: 'flex', gap: '10px', width: '100%', maxWidth: '600px' }}>
              <button 
                type="button" 
                onClick={clearSignature} 
                className="btn-primary-outline" 
                style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px' }}
              >
                <Eraser size={16} /> Hapus
              </button>
            </div>
            
            {formData.tandaTanganPelakuUsaha && (
              <div style={{ marginTop: '15px', textAlign: 'center' }}>
                <p style={{ fontSize: '0.8rem', color: '#10b981', marginBottom: '5px' }}>Tanda Tangan Tersimpan:</p>
                <img src={formData.tandaTanganPelakuUsaha} alt="Tanda Tangan Pelaku Usaha" style={{ maxHeight: '80px', border: '1px solid #d1d5db', background: '#fff', padding: '4px', borderRadius: '4px' }} />
              </div>
            )}
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
