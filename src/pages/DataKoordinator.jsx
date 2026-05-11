import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove } from 'firebase/database';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, User, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DataKoordinator = () => {
  const { role } = useAuth();
  const [coordinators, setCoordinators] = useState([]);
  const [formData, setFormData] = useState({ nama: '', phone: '', wilayah: '' });
  const [loading, setLoading] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await push(ref(rtdb, 'koordinators'), formData);
      setFormData({ nama: '', phone: '', wilayah: '' });
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

  return (
    <div className="page-container">
      <h1 className="title-gradient mb-8">Data Petugas Lapangan</h1>

      <div className="table-container glass-card">
        <table className="custom-table">
          <thead>
            <tr>
              <th><User size={16} /> Nama Petugas</th>
              <th><Phone size={16} /> No. WhatsApp</th>
              <th><MapPin size={16} /> Wilayah Kerja</th>
              {role === 'Admin' && <th style={{ textAlign: 'center' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {coordinators.length === 0 ? (
              <tr>
                <td colSpan={role === 'Admin' ? 4 : 3} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  Belum ada data petugas lapangan.
                </td>
              </tr>
            ) : (
              coordinators.map((coord) => (
                <motion.tr key={coord.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td><strong>{coord.nama}</strong></td>
                  <td>{coord.phone}</td>
                  <td>{coord.wilayah}</td>
                  {role === 'Admin' && (
                    <td style={{ textAlign: 'center' }}>
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

      {role === 'Admin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="form-card glass-card mt-8" style={{ maxWidth: '600px' }}>
          <h3 className="mb-4">Tambah Petugas Baru</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
              <UserPlus size={18} /> {loading ? 'Menyimpan...' : 'Simpan Data Petugas'}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default DataKoordinator;
