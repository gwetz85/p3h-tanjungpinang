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
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Mesh Background sama seperti Login */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(24, 119, 242, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.4) 0%, transparent 40%)', filter: 'blur(80px)', zIndex: 0 }}></div>

      <div style={{ position: 'relative', zIndex: 10, padding: '2rem 1rem' }}>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <img src="/logo-p3h.png" alt="P3H Logo" style={{ height: '60px', width: 'auto', marginBottom: '1rem' }} />
            <h1 style={{ color: '#fff', margin: 0, fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>PENGUMUMAN</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', fontWeight: '400' }}>Status Proses Sertifikasi Halal Pelaku Usaha</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
            <div className="search-bar" style={{ width: '100%', maxWidth: '300px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>
              <Search size={18} style={{ color: 'rgba(255,255,255,0.6)' }} />
              <input 
                type="text" 
                placeholder="Cari nama atau produk..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ color: '#fff', background: 'transparent' }}
              />
            </div>
          </div>

        <div className="table-responsive" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '60vh', marginTop: '1rem' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>No</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Nama Pelaku Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Nama Produk</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Alamat Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Last Update</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Status</th>
              </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '2rem' }}>Memuat data...</td></tr>
                ) : filteredPengumuman.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '2rem' }}>Belum ada data pengumuman.</td></tr>
                ) : (
                  filteredPengumuman.map((item, index) => (
                    <tr key={item.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid rgba(255,255,255,0.08)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem' }}>{index + 1}</td>
                      <td style={{ padding: '16px', color: '#fff', fontSize: '0.875rem', fontWeight: '600' }}>{item.namaPelakuUsaha}</td>
                      <td style={{ padding: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>{item.namaProduk}</td>
                      <td style={{ padding: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem' }}>{item.alamatUsaha}</td>
                      <td style={{ padding: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{item.lastUpdate}</td>
                      <td style={{ padding: '16px' }}>
                        <span style={{
                          background: 'rgba(16,185,129,0.2)',
                          color: '#6ee7b7',
                          padding: '6px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          display: 'inline-flex',
                          alignItems: 'center',
                          whiteSpace: 'nowrap',
                          border: '1px solid rgba(16,185,129,0.3)'
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
