import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, User, Phone, MapPin, Edit3, Camera } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DataKoordinator = () => {
  const { role } = useAuth();
  const [coordinators, setCoordinators] = useState([]);
  const [formData, setFormData] = useState({ nama: '', phone: '', wilayah: '' });
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [compressing, setCompressing] = useState(false);

  useEffect(() => {
    const coordRef = ref(rtdb, 'koordinators');
    const unsubscribe = onValue(coordRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setCoordinators(list);
      } else {
        setCoordinators([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Harap pilih file gambar (JPG/PNG).');
      return;
    }

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 150;
        const MAX_HEIGHT = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(dataUrl);
        setCompressing(false);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (photoPreview) {
        dataToSave.photoURL = photoPreview;
      }

      if (editingId) {
        await update(ref(rtdb, `koordinators/${editingId}`), dataToSave);
        setEditingId(null);
      } else {
        await push(ref(rtdb, 'koordinators'), dataToSave);
      }
      setFormData({ nama: '', phone: '', wilayah: '' });
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus petugas ini?')) {
      await remove(ref(rtdb, `koordinators/${id}`));
    }
  };

  const handleEdit = (coord) => {
    setFormData({ nama: coord.nama, phone: coord.phone, wilayah: coord.wilayah });
    setPhotoPreview(coord.photoURL || null);
    setEditingId(coord.id);
  };

  return (
    <div className="page-container">
      <h1 className="title-gradient mb-8">Data Petugas Lapangan</h1>

      <div className="table-container glass-card desktop-only">
        <table className="custom-table">
          <thead>
            <tr>
              <th><User size={16} /> Nama Petugas</th>
              <th><Phone size={16} /> No. WhatsApp</th>
              <th><MapPin size={16} /> Wilayah Kerja</th>
              {['Admin', 'superadmin'].includes(role) && <th style={{ textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {coordinators.length === 0 ? (
              <tr>
                <td colSpan={['Admin', 'superadmin'].includes(role) ? 4 : 3} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  Belum ada data petugas lapangan.
                </td>
              </tr>
            ) : (
              coordinators.map((coord) => (
                <motion.tr key={coord.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {coord.photoURL ? (
                          <img src={coord.photoURL} alt={coord.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <User size={20} style={{ color: 'var(--text-muted)' }} />
                        )}
                      </div>
                      <strong>{coord.nama}</strong>
                    </div>
                  </td>
                  <td>
                    <a href={`https://wa.me/${coord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#10b981', textDecoration: 'none', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      {coord.phone}
                    </a>
                  </td>
                  <td>{coord.wilayah}</td>
                  {['Admin', 'superadmin'].includes(role) && (
                    <td style={{ textAlign: 'center' }}>
                      {role === 'superadmin' && (
                        <button onClick={() => handleEdit(coord)} className="btn-icon text-accent" title="Edit" style={{ marginRight: '0.5rem' }}>
                          <Edit3 size={18} />
                        </button>
                      )}
                      <button onClick={() => handleDelete(coord.id)} className="btn-delete" title="Hapus">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  )}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mobile-job-cards mobile-only">
        {coordinators.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            Belum ada data petugas lapangan.
          </div>
        ) : (
          coordinators.map((coord) => (
            <div key={coord.id} className="visit-card-compact glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {coord.photoURL ? (
                    <img src={coord.photoURL} alt={coord.nama} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <User size={24} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'white' }}>{coord.nama}</h4>
                  <div className="visit-meta" style={{ flexDirection: 'column', gap: '4px' }}>
                    <a href={`https://wa.me/${coord.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', textDecoration: 'none', fontWeight: '500' }}>
                      <Phone size={14} /> {coord.phone}
                    </a>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {coord.wilayah}</span>
                  </div>
                </div>
              </div>
              {['Admin', 'superadmin'].includes(role) && (
                <div style={{ display: 'flex', gap: '10px', marginTop: '15px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                  {role === 'superadmin' && (
                    <button onClick={() => handleEdit(coord)} className="btn-primary-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}>
                      <Edit3 size={16} /> Edit
                    </button>
                  )}
                  <button onClick={() => handleDelete(coord.id)} className="btn-danger-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem', justifyContent: 'center' }}>
                    <Trash2 size={16} /> Hapus
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {['Admin', 'superadmin'].includes(role) && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="form-card glass-card mt-8" style={{ maxWidth: '600px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>{editingId ? 'Edit Data Petugas' : 'Tambah Petugas Baru'}</h3>
            {editingId && (
              <button onClick={() => { setEditingId(null); setFormData({ nama: '', phone: '', wilayah: '' }); setPhotoPreview(null); }} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Batal</button>
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="input-group" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' }}>
              <label>Foto Profil (Opsional)</label>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px', position: 'relative' }}>
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <User size={40} style={{ color: 'var(--text-muted)' }} />
                )}
                {compressing && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.7rem' }}>...</span>
                  </div>
                )}
              </div>
              <label className="btn-primary-outline" style={{ cursor: 'pointer', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Camera size={14} /> Pilih Foto
                <input type="file" accept="image/png, image/jpeg" style={{ display: 'none' }} onChange={handlePhotoChange} disabled={compressing} />
              </label>
            </div>

            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label><User size={14} /> Nama Lengkap</label>
              <input type="text" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
            </div>
            <div className="input-group">
              <label><Phone size={14} /> WhatsApp</label>
              <input type="text" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required />
            </div>
            <div className="input-group">
              <label><MapPin size={14} /> Wilayah</label>
              <input type="text" value={formData.wilayah} onChange={(e) => setFormData({...formData, wilayah: e.target.value})} required />
            </div>
            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }} disabled={loading}>
              <UserPlus size={18} /> {loading ? 'Menyimpan...' : (editingId ? 'Update Data Petugas' : 'Simpan Data Petugas')}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default DataKoordinator;
