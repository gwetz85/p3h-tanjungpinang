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
        })).sort((a, b) => (a.namaPelakuUsaha || '').localeCompare(b.namaPelakuUsaha || '', 'id'));
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
      
      <div style={{ width: '100%', maxWidth: '100%', padding: '0 1rem', zIndex: 10 }}>

        <motion.div 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="glass-card"
          style={{ padding: '2rem' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo-p3h.png" alt="P3H Logo" style={{ height: '60px', width: 'auto', marginBottom: '1rem' }} />
            <h1 style={{ color: '#000', margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>PENGUMUMAN</h1>
            <p style={{ color: 'rgba(0,0,0,0.7)', marginTop: '0.5rem', fontWeight: '500' }}>Status Proses Sertifikasi Halal Pelaku Usaha</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: '300px', background: 'rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.1)' }}>
              <Search size={18} style={{ color: 'rgba(0,0,0,0.5)' }} />
              <input 
                type="text" 
                placeholder="Cari nama atau produk..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ color: '#000' }}
              />
            </div>
          </div>

        <div className="table-responsive" style={{ overflowX: 'auto', marginTop: '1rem' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>No</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Pelaku Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Nama Produk</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Alamat Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Last Update</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid #e5e7eb', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
              </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#1f2937' }}>Memuat data...</td></tr>
                ) : filteredPengumuman.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: '#1f2937' }}>Belum ada data pengumuman.</td></tr>
                ) : (
                  filteredPengumuman.map((item, index) => (
                    <tr key={item.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #e5e7eb' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
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
