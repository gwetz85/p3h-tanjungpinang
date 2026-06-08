import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, set, push, remove, update } from 'firebase/database';
import { motion } from 'framer-motion';
import { UserPlus, Trash2, Shield, Mail, UserCheck } from 'lucide-react';

const DataUser = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    role: 'Petugas',
    nama: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(rtdb, 'users');
    const unsubscribe = onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data)
          .map(([id, val]) => ({ id, ...val }))
          .filter(user => user.role !== 'superadmin');
        setUsers(list);
      } else {
        setUsers([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Simpan user ke node 'users'
      // Note: Idealnya UID didapat dari Auth, tapi Admin bisa mendaftarkan profil awal di sini
      const newUserRef = push(ref(rtdb, 'users'));
      await set(newUserRef, {
        ...formData,
        createdAt: Date.now()
      });
      
      setFormData({ email: '', role: 'Petugas', nama: '' });
      alert('User berhasil didaftarkan di database!');
    } catch (err) {
      alert('Gagal menambah user');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus akses user ini?')) {
      await remove(ref(rtdb, `users/${id}`));
    }
  };

  const handleUpdateRole = async (id, newRole) => {
    await update(ref(rtdb, `users/${id}`), { role: newRole });
  };

  return (
    <div className="page-container">
      <h1 className="title-gradient mb-8">Manajemen Pengguna</h1>

      <div className="grid-layout">
        {/* Form Tambah User */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="form-card glass-card">
          <h3><UserPlus size={20} /> Daftarkan User Baru</h3>
          <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem', display: 'flex', flexType: 'column', gap: '1rem' }}>
            <div className="input-group">
              <label><Mail size={14} /> Email Pengguna</label>
              <input 
                type="email" 
                placeholder="email@contoh.com" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group">
              <label><UserCheck size={14} /> Nama Panggilan</label>
              <input 
                type="text" 
                placeholder="Nama User" 
                value={formData.nama} 
                onChange={(e) => setFormData({...formData, nama: e.target.value})} 
                required 
              />
            </div>
            <div className="input-group">
              <label><Shield size={14} /> Tentukan Role</label>
              <select 
                value={formData.role} 
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="Admin">Admin (Akses Penuh)</option>
                <option value="Petugas">Petugas (Input & Cek)</option>
                <option value="Monitoring">Monitoring (Hanya Lihat)</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
              Simpan Pengguna
            </button>
          </form>
          <div className="info-box mt-4" style={{ fontSize: '0.8rem', opacity: 0.8 }}>
            <p>ℹ️ User yang didaftarkan harus login/signup menggunakan email yang sama agar Role ini otomatis aktif.</p>
          </div>
        </motion.div>

        {/* Daftar User */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="list-card glass-card">
          <h3>Daftar Pengguna Aktif</h3>
          <div className="table-container mt-4">
            {loading ? <p>Memuat data...</p> : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <div style={{ fontWeight: '600' }}>{user.nama || 'User'}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>{user.email}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                          <span style={{
                            display: 'inline-block',
                            padding: '3px 10px',
                            borderRadius: '20px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            textTransform: 'uppercase',
                            backgroundColor:
                              user.role === 'Admin' ? '#eff6ff' :
                              user.role === 'Petugas' ? '#f0fdf4' :
                              user.role === 'Monitoring' ? '#fefce8' :
                              '#fef2f2',
                            color:
                              user.role === 'Admin' ? '#2563eb' :
                              user.role === 'Petugas' ? '#16a34a' :
                              user.role === 'Monitoring' ? '#ca8a04' :
                              '#ef4444',
                            border: `1px solid ${
                              user.role === 'Admin' ? '#bfdbfe' :
                              user.role === 'Petugas' ? '#bbf7d0' :
                              user.role === 'Monitoring' ? '#fde68a' :
                              '#fecaca'
                            }`
                          }}>
                            {user.role === 'Pending' ? 'Pending' : user.role}
                          </span>
                          <select 
                            value={user.role} 
                            onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                            style={{ 
                              padding: '3px 6px', 
                              fontSize: '0.75rem',
                              backgroundColor: '#f8fafc',
                              color: '#374151',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              outline: 'none',
                              width: '100%'
                            }}
                          >
                            <option value="Pending">Pending Approval</option>
                            <option value="Admin">Admin</option>
                            <option value="Petugas">Petugas</option>
                            <option value="Monitoring">Monitoring</option>
                          </select>
                        </div>
                      </td>
                      <td>
                        <button onClick={() => handleDelete(user.id)} className="text-danger" style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DataUser;
