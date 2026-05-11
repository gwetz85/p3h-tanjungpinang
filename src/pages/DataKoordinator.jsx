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

      <div className="grid-layout">
        {role === 'Admin' && (
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="form-card glass-card">
            <h3>Tambah Petugas Baru</h3>
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label><User size={14} /> Nama</label>
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
              <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>
                <UserPlus size={18} /> {loading ? 'Menyimpan...' : 'Tambah'}
              </button>
            </form>
          </motion.div>
        )}

        <div className="list-section">
          {coordinators.map((coord) => (
            <motion.div key={coord.id} layout className="coord-card glass-card">
              <div className="coord-info">
                <h4>{coord.nama}</h4>
                <p><Phone size={12} /> {coord.phone}</p>
                <p><MapPin size={12} /> {coord.wilayah}</p>
              </div>
              {role === 'Admin' && (
                <button onClick={() => handleDelete(coord.id)} className="btn-delete">
                  <Trash2 size={18} />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DataKoordinator;
