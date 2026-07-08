import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PengumumanPublic = () => {
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const pengumumanRef = ref(rtdb, 'pengumuman');
    const unsub = onValue(pengumumanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => b.createdAt - a.createdAt);
        setPengumuman(list);
      } else {
        setPengumuman([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredPengumuman = pengumuman.filter(p => 
    p.namaPelakuUsaha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.namaProduk?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="login-page-container" style={{ minHeight: '100vh', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="mesh-background"></div>
      
      <div style={{ width: '100%', maxWidth: '1000px', zIndex: 10 }}>
        <button 
          onClick={() => navigate('/login')} 
          className="btn-secondary" 
          style={{ marginBottom: '1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)' }}
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card"
          style={{ padding: '2rem' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/icon-192x192.png" alt="P3H Logo" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }} />
            <h1 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>PENGUMUMAN</h1>
            <p style={{ color: 'rgba(0,0,0,0.7)', marginTop: '0.5rem', fontWeight: '500' }}>Status Proses Sertifikasi Halal Pelaku Usaha</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: '300px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <Search size={18} style={{ color: 'rgba(255,255,255,0.5)' }} />
              <input 
                type="text" 
                placeholder="Cari nama atau produk..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ color: 'white' }}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="data-table" style={{ background: 'transparent' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <th>No</th>
                  <th>Nama Pelaku Usaha</th>
                  <th>Nama Produk</th>
                  <th>Alamat Usaha</th>
                  <th>Last Update</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'white' }}>Memuat data...</td></tr>
                ) : filteredPengumuman.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'white' }}>Belum ada data pengumuman.</td></tr>
                ) : (
                  filteredPengumuman.map((item, index) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ color: 'rgba(255,255,255,0.9)' }}>{index + 1}</td>
                      <td style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 'bold' }}>{item.namaPelakuUsaha}</td>
                      <td style={{ color: 'rgba(255,255,255,0.9)' }}>{item.namaProduk}</td>
                      <td style={{ color: 'rgba(255,255,255,0.9)' }}>{item.alamatUsaha}</td>
                      <td style={{ color: 'rgba(255,255,255,0.9)' }}>{item.lastUpdate}</td>
                      <td>
                        <span className={`status-badge ${item.status.replace(/\s+/g, '-').toLowerCase()}`} style={{
                          background: 'rgba(var(--primary-rgb), 0.2)',
                          border: '1px solid rgba(var(--primary-rgb), 0.5)',
                          color: 'white',
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          display: 'inline-block'
                        }}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PengumumanPublic;
