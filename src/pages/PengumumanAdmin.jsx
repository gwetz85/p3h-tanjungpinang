import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { motion } from 'framer-motion';
import { Plus, Trash2, Edit, Save, X, Search, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  'PROSES',
  'Pendaftaran Sihalal',
  'VERVAL',
  'PROSES P3H',
  'Terkirim ke Komite',
  'Terbit SH',
  'Perbaikkan Akun SiHalal',
  'PENDING',
  'Verifikasi PU'
];

const PengumumanAdmin = () => {
  const { role } = useAuth();
  const [pengumuman, setPengumuman] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    idPelakuUsaha: '',
    namaPelakuUsaha: '',
    namaProduk: '',
    alamatUsaha: '',
    lastUpdate: '',
    status: STATUS_OPTIONS[0]
  });

  useEffect(() => {
    // Fetch Data Pekerjaan untuk Dropdown
    const pekerjaanRef = ref(rtdb, 'pekerjaan');
    const unsubPekerjaan = onValue(pekerjaanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          nama: data[key].nama || '',
          namaProduk: data[key].namaProduk || '',
          alamatUsaha: data[key].alamatUsaha || ''
        }));
        setPekerjaanList(list);
      }
    });

    // Fetch Data Pengumuman
    const pengumumanRef = ref(rtdb, 'pengumuman');
    const unsubPengumuman = onValue(pengumumanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => (a.namaPelakuUsaha || '').localeCompare(b.namaPelakuUsaha || '', 'id'));
        setPengumuman(list);
      } else {
        setPengumuman([]);
      }
      setLoading(false);
    });

    return () => {
      unsubPekerjaan();
      unsubPengumuman();
    };
  }, []);

  const handlePUChange = (e) => {
    const selectedId = e.target.value;
    const selectedPU = pekerjaanList.find(p => p.id === selectedId);
    if (selectedPU) {
      setFormData(prev => ({
        ...prev,
        idPelakuUsaha: selectedPU.id,
        namaPelakuUsaha: selectedPU.nama,
        namaProduk: selectedPU.namaProduk,
        alamatUsaha: selectedPU.alamatUsaha
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        idPelakuUsaha: '',
        namaPelakuUsaha: '',
        namaProduk: '',
        alamatUsaha: ''
      }));
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      idPelakuUsaha: '',
      namaPelakuUsaha: '',
      namaProduk: '',
      alamatUsaha: '',
      lastUpdate: '',
      status: STATUS_OPTIONS[0]
    });
    setEditId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.namaPelakuUsaha || !formData.lastUpdate) {
      alert('Mohon lengkapi data Nama Pelaku Usaha dan Last Update.');
      return;
    }

    try {
      if (editId) {
        await update(ref(rtdb, `pengumuman/${editId}`), {
          ...formData,
          updatedAt: Date.now()
        });
        alert('Data berhasil diupdate!');
      } else {
        await push(ref(rtdb, 'pengumuman'), {
          ...formData,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        alert('Data berhasil ditambahkan!');
      }
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat menyimpan data.');
    }
  };

  const handleEdit = (item) => {
    setFormData({
      idPelakuUsaha: item.idPelakuUsaha || '',
      namaPelakuUsaha: item.namaPelakuUsaha || '',
      namaProduk: item.namaProduk || '',
      alamatUsaha: item.alamatUsaha || '',
      lastUpdate: item.lastUpdate || '',
      status: item.status || STATUS_OPTIONS[0]
    });
    setEditId(item.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Yakin ingin menghapus pengumuman ini?')) {
      try {
        await remove(ref(rtdb, `pengumuman/${id}`));
        alert('Data berhasil dihapus');
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus data');
      }
    }
  };

  const filteredPengumuman = pengumuman.filter(p => 
    p.namaPelakuUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.namaProduk?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (role !== 'superadmin') {
    return (
      <div className="page-container">
        <h2>Akses Ditolak</h2>
        <p>Hanya Superadmin yang dapat mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="header-content">
          <h1 className="page-title">
            <FileText size={28} />
            Pengumuman
          </h1>
          <p className="page-subtitle">Kelola data status sertifikasi halal untuk halaman publik</p>
        </div>
        <button className="btn-primary" onClick={() => { resetForm(); setShowForm(!showForm); }}>
          {showForm ? <><X size={20} /> Batal</> : <><Plus size={20} /> Tambah Data</>}
        </button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card mb-4">
          <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
            {editId ? 'Edit Data Pengumuman' : 'Tambah Data Pengumuman Baru'}
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Nama Pelaku Usaha (Pilih dari Data Pekerjaan)</label>
              <select className="form-control" name="idPelakuUsaha" value={formData.idPelakuUsaha} onChange={handlePUChange} required>
                <option value="">-- Pilih Pelaku Usaha --</option>
                {pekerjaanList.map(pu => (
                  <option key={pu.id} value={pu.id}>{pu.nama} {pu.namaProduk ? `(${pu.namaProduk})` : ''}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Nama Produk</label>
              <input type="text" className="form-control" name="namaProduk" value={formData.namaProduk} onChange={handleInputChange} placeholder="Otomatis terisi atau ketik manual" />
            </div>

            <div className="form-group">
              <label>Alamat Usaha</label>
              <input type="text" className="form-control" name="alamatUsaha" value={formData.alamatUsaha} onChange={handleInputChange} placeholder="Otomatis terisi atau ketik manual" />
            </div>

            <div className="form-group">
              <label>Last Update (Format Tanggal)</label>
              <input type="date" className="form-control" name="lastUpdate" value={formData.lastUpdate} onChange={handleInputChange} required />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select className="form-control" name="status" value={formData.status} onChange={handleInputChange}>
                {STATUS_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
              <button type="button" className="btn-secondary" onClick={resetForm}>Batal</button>
              <button type="submit" className="btn-primary"><Save size={18} /> Simpan Data</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Daftar Pengumuman</h3>
          <div className="search-bar" style={{ width: '300px' }}>
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Cari nama atau produk..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="table-responsive" style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>No</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Pelaku Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Produk</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Alamat Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Last Update</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Memuat data...</td></tr>
              ) : filteredPengumuman.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center' }}>Belum ada data pengumuman.</td></tr>
              ) : (
                filteredPengumuman.map((item, index) => (
                  <tr key={item.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <td style={{ padding: '16px', color: '#4b5563', fontSize: '0.875rem' }}>{index + 1}</td>
                    <td style={{ padding: '16px', color: '#111827', fontSize: '0.875rem', fontWeight: '500' }}>{item.namaPelakuUsaha}</td>
                    <td style={{ padding: '16px', color: '#4b5563', fontSize: '0.875rem' }}>{item.namaProduk}</td>
                    <td style={{ padding: '16px', color: '#4b5563', fontSize: '0.875rem' }}>{item.alamatUsaha}</td>
                    <td style={{ padding: '16px', color: '#4b5563', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{item.lastUpdate}</td>
                    <td style={{ padding: '16px' }}>
                      <span className={`status-badge ${item.status.replace(/\s+/g, '-').toLowerCase()}`} style={{
                        background: 'rgba(var(--primary-rgb), 0.1)',
                        color: 'var(--primary-color)',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        whiteSpace: 'nowrap'
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '16px' }}>
                      <div className="action-buttons" style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleEdit(item)} title="Edit" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}>
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id)} title="Hapus" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', padding: '8px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PengumumanAdmin;
