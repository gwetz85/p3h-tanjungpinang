import { useState, useEffect } from 'react';
import { rtdb, storage } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Upload, FileText, X, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const CatatanAkunSihalal = () => {
  const { role } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  
  // Form and Data states
  const [formData, setFormData] = useState({ nama: '', akun: '', kataSandi: '', status: 'Active' });
  const [editingId, setEditingId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedBytes, setUploadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [viewPdfUrl, setViewPdfUrl] = useState(null);

  useEffect(() => {
    const listRef = ref(rtdb, 'catatanAkunSihalal');
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
      setFormData({ nama: record.nama, akun: record.akun, kataSandi: record.kataSandi, status: record.status });
      setEditingId(record.id);
    } else {
      setFormData({ nama: '', akun: '', kataSandi: '', status: 'Active' });
      setEditingId(null);
    }
    setIsFormModalOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormModalOpen(false);
    setFormData({ nama: '', akun: '', kataSandi: '', status: 'Active' });
    setEditingId(null);
  };

  const handleSaveForm = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await update(ref(rtdb, `catatanAkunSihalal/${editingId}`), {
          ...formData,
          updatedAt: Date.now()
        });
      } else {
        await push(ref(rtdb, 'catatanAkunSihalal'), {
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
  };

  const handleDelete = async (id) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus catatan akun ini?")) {
      try {
        await remove(ref(rtdb, `catatanAkunSihalal/${id}`));
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

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    if (isUploading) return;
    
    // Pengecekan lebih longgar: periksa ekstensi file jika type kosong (sering terjadi di Windows/browser tertentu)
    if (!selectedFile.name.toLowerCase().endsWith('.pdf') && selectedFile.type !== 'application/pdf') {
      alert("File harus berformat PDF.");
      return;
    }

    setIsUploading(true);

    try {
      const fileRef = storageRef(storage, `berkas_sihalal/${uploadingId}_${Date.now()}.pdf`);
      // uploadBytesResumable digunakan untuk mendukung ukuran file yang sangat besar (tidak terbatas)
      const uploadTask = uploadBytesResumable(fileRef, selectedFile);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
          setUploadedBytes(snapshot.bytesTransferred);
          setTotalBytes(snapshot.totalBytes);
        },
        (error) => {
          console.error("Error uploading file:", error);
          setUploadProgress(0);
          setUploadedBytes(0);
          setTotalBytes(0);
          setIsUploading(false);
          alert("Gagal mengunggah file ke server. Detail: " + error.message + "\n\nMohon pastikan Firebase Storage sudah diaktifkan di Firebase Console dan aturan aksesnya (Rules) mengizinkan proses 'write'.");
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            await update(ref(rtdb, `catatanAkunSihalal/${uploadingId}`), {
              berkasUrl: downloadURL
            });
            handleCloseUpload();
            alert("File berhasil diunggah!");
          } catch (err) {
            console.error("Error saving url:", err);
            setUploadProgress(0);
            setIsUploading(false);
            alert("Gagal menyimpan URL file: " + err.message);
          }
        }
      );
    } catch (e) {
      setIsUploading(false);
      alert("Terjadi kesalahan pada sistem unggah: " + e.message);
    }
  };

  const handleViewPdf = (url) => {
    setViewPdfUrl(url);
    setIsViewModalOpen(true);
  };

  // Helper functions to check roles
  const canEditOrDelete = role === 'superadmin';
  const canAdd = ['superadmin', 'Admin', 'Petugas'].includes(role);
  const canUpload = ['superadmin', 'Admin', 'Petugas'].includes(role);

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ margin: 0 }}>Catatan Akun Sihalal</h1>
        {canAdd && (
          <button onClick={() => handleOpenForm()} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} /> Tambah Data
          </button>
        )}
      </div>

      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th style={{ width: '60px' }}>Nomor</th>
              <th>Nama</th>
              <th>Akun</th>
              <th>Kata Sandi</th>
              <th>Status</th>
              <th>Upload Berkas</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>Memuat data...</td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Belum ada data catatan akun.</td>
              </tr>
            ) : (
              data.map((item, index) => (
                <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td><strong>{item.nama}</strong></td>
                  <td>{item.akun}</td>
                  <td>{item.kataSandi}</td>
                  <td>
                    <span className={`status-badge ${item.status === 'Active' ? 'status-selesai' : 'status-revisi'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {item.berkasUrl && (
                        <button onClick={() => handleViewPdf(item.berkasUrl)} className="btn-primary-outline" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="View PDF">
                          <Eye size={14} /> View
                        </button>
                      )}
                      {canUpload && (
                        <button onClick={() => handleOpenUpload(item.id)} className="btn-secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} title="Upload Berkas">
                          <Upload size={14} /> Upload
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

      {/* Form Modal (Add/Edit) */}
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
                <h3 style={{ margin: 0 }}>{editingId ? 'Edit Catatan Akun' : 'Tambah Catatan Akun'}</h3>
                <button onClick={handleCloseForm} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleSaveForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="input-group">
                  <label>Nama</label>
                  <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required placeholder="Masukkan Nama" />
                </div>
                <div className="input-group">
                  <label>Akun</label>
                  <input type="text" value={formData.akun} onChange={(e) => setFormData({...formData, akun: e.target.value})} required placeholder="Masukkan Akun" />
                </div>
                <div className="input-group">
                  <label>Kata Sandi</label>
                  <input type="text" value={formData.kataSandi} onChange={(e) => setFormData({...formData, kataSandi: e.target.value})} required placeholder="Masukkan Kata Sandi" />
                </div>
                <div className="input-group">
                  <label>Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="custom-select" required>
                    <option value="Active">Active</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '1rem' }}>
                  <button type="button" onClick={handleCloseForm} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary">Simpan</button>
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
                <h3 style={{ margin: 0 }}>Upload Berkas PDF</h3>
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
                    {/* Header persentase */}
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
                    {/* Progress bar */}
                    <div style={{ width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '20px', overflow: 'hidden', height: '14px', marginBottom: '6px' }}>
                      <div style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', height: '100%', borderRadius: '20px', transition: 'width 0.4s ease' }}></div>
                    </div>
                    {/* Info bytes */}
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
          <div className="modal-overlay" style={{ padding: '2rem' }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="modal-content glass-card"
              style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
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

export default CatatanAkunSihalal;
