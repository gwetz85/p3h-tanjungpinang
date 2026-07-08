import { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { supabase, STORAGE_BUCKET } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Upload, FileText, X, Eye, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ArsipSH = () => {
  const { role } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Form and Data states
  const [formData, setFormData] = useState({ namaUsaha: '', nomorSertifikat: '', keterangan: '' });
  const [editingId, setEditingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [viewPdfUrl, setViewPdfUrl] = useState(null);

  useEffect(() => {
    const listRef = ref(rtdb, 'arsipSH');
    const unsubscribe = onValue(listRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        list.sort((a, b) => {
          if (!a.createdAt) return 1;
          if (!b.createdAt) return -1;
          return b.createdAt - a.createdAt;
        });
        setData(list);
      } else {
        setData([]);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching data:", error);
      alert("Gagal memuat data: " + error.message);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenForm = (record = null) => {
    if (record) {
      setFormData({ namaUsaha: record.namaUsaha, nomorSertifikat: record.nomorSertifikat, keterangan: record.keterangan || '' });
      setEditingId(record.id);
    } else {
      setFormData({ namaUsaha: '', nomorSertifikat: '', keterangan: '' });
      setEditingId(null);
    }
    setSelectedFile(null);
    setUploadProgress(0);
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setFormData({ namaUsaha: '', nomorSertifikat: '', keterangan: '' });
    setEditingId(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploading(false);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    if (selectedFile) {
      if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
        alert('File harus berformat PDF.');
        return;
      }
      setIsUploading(true);
      setUploadProgress(0);
      setUploadedBytes(0);
      setTotalBytes(selectedFile.size);

      const SUPABASE_URL = 'https://rbnnbjauwfmmxsniahys.supabase.co';
      const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibm5iamF1d2ZtbXhzbmlhaHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzMyMDMsImV4cCI6MjA5NjQwOTIwM30.YKnpoyouDIMp_YLINNU1uYCHsC_NhksEtSCTNOiLUKQ';
      
      let targetId = editingId;
      let newRef = null;
      if (!targetId) {
        newRef = push(ref(rtdb, 'arsipSH'));
        targetId = newRef.key;
      }
      
      const filePath = `arsip_${targetId}_${Date.now()}.pdf`;
      const uploadUrl = `${SUPABASE_URL}/storage/v1/object/berkas-sihalal/${filePath}`;

      const xhr = new XMLHttpRequest();
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setUploadProgress(progress);
          setUploadedBytes(event.loaded);
          setTotalBytes(event.total);
        }
      };
      
      xhr.onload = async () => {
        if (xhr.status === 200 || xhr.status === 201) {
          try {
            const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/berkas-sihalal/${filePath}`;
            if (editingId) {
              await update(ref(rtdb, `arsipSH/${editingId}`), {
                ...formData,
                berkasUrl: publicUrl,
                updatedAt: Date.now()
              });
            } else {
              await update(newRef, {
                ...formData,
                berkasUrl: publicUrl,
                createdAt: Date.now()
              });
            }
            setUploadProgress(100);
            setTimeout(() => {
              handleCloseForm();
            }, 600);
          } catch (err) {
            console.error('Error saving URL:', err);
            setIsUploading(false);
            alert('File terunggah tapi gagal menyimpan data: ' + err.message);
          }
        } else {
          console.error('Upload failed, status:', xhr.status, xhr.responseText);
          setIsUploading(false);
          let errMsg = 'Upload gagal (status ' + xhr.status + ')';
          try {
            const resp = JSON.parse(xhr.responseText);
            errMsg += ': ' + (resp.message || resp.error || xhr.responseText);
          } catch (_) {}
          alert(errMsg);
        }
      };

      xhr.onerror = () => {
        setIsUploading(false);
        alert('Koneksi gagal saat mengunggah.');
      };

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
      xhr.setRequestHeader('Content-Type', 'application/pdf');
      xhr.setRequestHeader('x-upsert', 'true');
      xhr.send(selectedFile);
      
    } else {
      try {
        if (editingId) {
          await update(ref(rtdb, `arsipSH/${editingId}`), {
            ...formData,
            updatedAt: Date.now()
          });
        } else {
          await push(ref(rtdb, 'arsipSH'), {
            ...formData,
            berkasUrl: null,
            createdAt: Date.now()
          });
        }
        handleCloseForm();
      } catch (error) {
        console.error("Error saving data:", error);
        alert("Terjadi kesalahan saat menyimpan data: " + error.message);
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus arsip ini?")) {
      try {
        await remove(ref(rtdb, `arsipSH/${id}`));
      } catch (error) {
        console.error("Error deleting data:", error);
        alert("Terjadi kesalahan saat menghapus data: " + error.message);
      }
    }
  };

  const handleOpenUpload = (id) => {
    setUploadingId(id);
    setSelectedFile(null);
    setUploadProgress(0);
    setIsUploadModalOpen(true);
  };

  const handleCloseUpload = () => {
    setIsUploadModalOpen(false);
    setUploadingId(null);
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(0);
    setIsUploading(false);
  };

  const handleUploadFile = () => {
    if (!selectedFile) return;
    if (isUploading) return;

    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      alert('File harus berformat PDF.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadedBytes(0);
    setTotalBytes(selectedFile.size);

    const SUPABASE_URL = 'https://rbnnbjauwfmmxsniahys.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJibm5iamF1d2ZtbXhzbmlhaHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4MzMyMDMsImV4cCI6MjA5NjQwOTIwM30.YKnpoyouDIMp_YLINNU1uYCHsC_NhksEtSCTNOiLUKQ';
    const filePath = `arsip_${uploadingId}_${Date.now()}.pdf`;
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/berkas-sihalal/${filePath}`;

    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const progress = (event.loaded / event.total) * 100;
        setUploadProgress(progress);
        setUploadedBytes(event.loaded);
        setTotalBytes(event.total);
      }
    };

    xhr.onload = async () => {
      if (xhr.status === 200 || xhr.status === 201) {
        try {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/berkas-sihalal/${filePath}`;

          await update(ref(rtdb, `arsipSH/${uploadingId}`), {
            berkasUrl: publicUrl,
          });

          setUploadProgress(100);
          setTimeout(() => {
            handleCloseUpload();
            alert('File berhasil diunggah!');
          }, 600);
        } catch (err) {
          console.error('Error saving URL:', err);
          setIsUploading(false);
          setUploadProgress(0);
          alert('File terunggah tapi gagal menyimpan URL: ' + err.message);
        }
      } else {
        console.error('Upload failed, status:', xhr.status, xhr.responseText);
        setIsUploading(false);
        setUploadProgress(0);
        setUploadedBytes(0);
        let errMsg = 'Upload gagal (status ' + xhr.status + ')';
        try {
          const resp = JSON.parse(xhr.responseText);
          errMsg += ': ' + (resp.message || resp.error || xhr.responseText);
        } catch (_) {}
        alert(errMsg);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadedBytes(0);
      alert('Koneksi gagal. Periksa koneksi internet Anda dan coba lagi.');
    };

    xhr.open('POST', uploadUrl, true);
    xhr.setRequestHeader('Authorization', `Bearer ${SUPABASE_ANON_KEY}`);
    xhr.setRequestHeader('Content-Type', 'application/pdf');
    xhr.setRequestHeader('x-upsert', 'true');
    xhr.send(selectedFile);
  };

  const handleViewPdf = (url) => {
    setViewPdfUrl(url);
    setIsViewModalOpen(true);
  };

  const canEditOrDelete = role === 'superadmin';
  const canAdd = ['superadmin', 'Admin', 'Petugas'].includes(role);
  const isSuperadmin = role === 'superadmin';

  const shouldShowUpload = (item) => {
    if (!item.berkasUrl) {
      return ['superadmin', 'Admin', 'Petugas'].includes(role);
    } else {
      return isSuperadmin;
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ margin: 0 }}>ARSIP SH</h1>
        {canAdd && (
          <button onClick={() => handleOpenForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Tambah Arsip
          </button>
        )}
      </div>

      <div className="table-container glass-card">
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ width: '60px', padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>No</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Pelaku Usaha</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nomor Sertifikat</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Keterangan</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Belum ada data arsip.</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', textAlign: 'center', whiteSpace: 'nowrap' }}>{index + 1}</td>
                  <td style={{ padding: '14px 16px', color: '#111827', fontSize: '0.875rem', fontWeight: '500', verticalAlign: 'middle' }}>{item.namaUsaha}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>{item.nomorSertifikat}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>{item.keterangan}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {item.berkasUrl && (
                        <button onClick={() => handleViewPdf(item.berkasUrl)} className="btn-primary-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="View PDF">
                          <Eye size={14} /> View
                        </button>
                      )}
                      {shouldShowUpload(item) && (
                        <button onClick={() => handleOpenUpload(item.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title={item.berkasUrl ? 'Ganti Berkas (Superadmin)' : 'Upload Berkas'}>
                          <Upload size={14} /> {item.berkasUrl ? 'Ganti' : 'Upload'}
                        </button>
                      )}
                      {canEditOrDelete && (
                        <>
                          <button onClick={() => handleOpenForm(item)} className="btn-icon text-accent" style={{ padding: '4px' }} title="Edit">
                            <Edit3 size={16} />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="btn-delete" style={{ padding: '4px' }} title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mobile-card-list mobile-only" style={{ marginTop: '1rem' }}>
        {data.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada data arsip.</div>
        ) : (
          data.map((item) => {
            return (
              <div key={item.id} className="mobile-data-card" onClick={() => item.berkasUrl && handleViewPdf(item.berkasUrl)}>
                {/* Header: Sertifikat */}
                <div className="mobile-card-date">
                  <FileText size={13} style={{marginRight: '4px'}}/>
                  {item.nomorSertifikat || 'Belum ada nomor'}
                </div>
                
                {/* Name */}
                <div className="mobile-card-name" style={{marginTop: '0.8rem'}}>{item.namaUsaha}</div>
                
                {/* Keterangan */}
                <div className="mobile-card-row" style={{marginTop: '0.6rem'}}>
                  <Info size={13} style={{color:'#94a3b8', marginTop: '2px'}} />
                  <span style={{color: '#475569'}}>{item.keterangan || '-'}</span>
                </div>

                {/* Footer Actions */}
                <div className="mobile-card-footer" onClick={e => e.stopPropagation()}>
                  <span className="mobile-card-badge blue">{item.berkasUrl ? 'BERKAS TERSEDIA' : 'BELUM ADA BERKAS'}</span>
                  
                  <div style={{display:'flex', gap:'6px', flexWrap: 'wrap', justifyContent: 'flex-end'}}>
                    {item.berkasUrl && (
                      <button onClick={() => handleViewPdf(item.berkasUrl)} className="btn-table-icon text-primary" title="View PDF">
                        <Eye size={15} />
                      </button>
                    )}
                    {shouldShowUpload(item) && (
                      <button onClick={() => handleOpenUpload(item.id)} className="btn-table-icon" style={{color: '#8b5cf6'}} title="Upload Berkas">
                        <Upload size={15} />
                      </button>
                    )}
                    {canEditOrDelete && (
                      <>
                        <button onClick={() => handleOpenForm(item)} className="btn-table-icon text-accent" title="Edit">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="btn-table-icon text-danger" title="Hapus">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {isFormModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="modal-content glass-card"
              style={{ maxWidth: '500px', width: '100%', padding: '2rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>{editingId ? 'Edit Arsip SH' : 'Tambah Arsip SH'}</h3>
                <button onClick={handleCloseForm} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nama Pelaku Usaha</label>
                  <input type="text" value={formData.namaUsaha} onChange={(e) => setFormData({...formData, namaUsaha: e.target.value})} required placeholder="Masukkan Nama Pelaku Usaha" />
                </div>
                <div className="input-group">
                  <label>Nomor Sertifikat</label>
                  <input type="text" value={formData.nomorSertifikat} onChange={(e) => setFormData({...formData, nomorSertifikat: e.target.value})} required placeholder="Masukkan Nomor Sertifikat" />
                </div>
                <div className="input-group">
                  <label>Keterangan</label>
                  <textarea 
                    value={formData.keterangan} 
                    onChange={(e) => setFormData({...formData, keterangan: e.target.value})} 
                    placeholder="Masukkan Keterangan Tambahan" 
                    rows={3}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--surface-border)', background: 'var(--surface-color)', color: 'inherit' }}
                  />
                </div>
                <div className="input-group">
                  <label>Upload Sertifikat (Opsional)</label>
                  <div style={{ padding: '0.8rem', border: '1px dashed var(--surface-border)', borderRadius: '8px', background: 'var(--surface-alt, rgba(0,0,0,0.02))' }}>
                    <input 
                      type="file" 
                      accept="application/pdf" 
                      onChange={(e) => setSelectedFile(e.target.files[0])} 
                      style={{ color: 'inherit', width: '100%' }}
                      disabled={isUploading}
                    />
                  </div>
                </div>
                {isUploading && (
                  <div style={{ marginTop: '0.5rem', padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-color, #333)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: uploadProgress === 0 ? '#f59e0b' : '#3b82f6', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                        {uploadProgress === 0 ? 'Menginisialisasi...' : 'Sedang mengunggah...'}
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3b82f6' }}>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '20px', overflow: 'hidden', height: '14px', marginBottom: '6px' }}>
                      <div style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%', borderRadius: '20px', transition: 'width 0.4s ease' }}></div>
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                  <button type="button" onClick={handleCloseForm} className="btn-secondary" disabled={isUploading}>Batal</button>
                  <button type="submit" className="btn-primary" disabled={isUploading}>
                    {isUploading ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="modal-overlay">
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="modal-content glass-card"
              style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Upload Sertifikat PDF</h3>
                <button onClick={handleCloseUpload} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ padding: '2rem', border: '2px dashed var(--accent-color)', borderRadius: '12px', marginBottom: '1rem', background: 'var(--surface-alt, rgba(0,0,0,0.02))' }}>
                  <FileText size={48} style={{ color: 'var(--accent-color)', marginBottom: '1rem' }} />
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', color: 'var(--text-color, inherit)' }}>Pilih file PDF dari perangkat Anda</p>
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    onChange={(e) => setSelectedFile(e.target.files[0])} 
                    style={{ color: 'inherit', width: '100%', padding: '0.5rem', border: '1px solid var(--surface-border)', borderRadius: '8px' }}
                  />
                </div>
                {isUploading && (
                  <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(59,130,246,0.06)', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.15)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-color, #333)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {uploadProgress === 0
                          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                              Menginisialisasi...
                            </span>
                          : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block', animation: 'pulse 1s infinite' }}></span>
                              Sedang mengunggah...
                            </span>
                        }
                      </span>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#3b82f6' }}>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '20px', overflow: 'hidden', height: '14px', marginBottom: '6px' }}>
                      <div style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%', borderRadius: '20px', transition: 'width 0.4s ease' }}></div>
                    </div>
                    {totalBytes > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'rgba(0,0,0,0.5)' }}>
                        <span>{(uploadedBytes / (1024 * 1024)).toFixed(2)} MB diunggah</span>
                        <span>{(totalBytes / (1024 * 1024)).toFixed(2)} MB total</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button onClick={handleCloseUpload} className="btn-secondary" disabled={isUploading}>Batal</button>
                <button onClick={handleUploadFile} className="btn-primary" disabled={!selectedFile || isUploading}>
                  {isUploading ? (uploadProgress > 0 ? `Mengunggah ${Math.round(uploadProgress)}%` : 'Memulai unggahan...') : 'Unggah File'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View PDF Modal */}
      <AnimatePresence>
        {isViewModalOpen && (
          <div className="modal-overlay" style={{ padding: '0.5rem' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content glass-card"
              style={{ width: '100%', maxWidth: '1200px', height: '95vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', margin: 'auto' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid var(--surface-border)' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={20} /> Preview Berkas PDF
                </h3>
                <button onClick={() => setIsViewModalOpen(false)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', width: '100%', height: '100%' }}>
                {viewPdfUrl && (
                  <iframe 
                    src={viewPdfUrl} 
                    style={{ width: '100%', height: '100%', border: 'none' }}
                    title="PDF Viewer"
                  />
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArsipSH;
