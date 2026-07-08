import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, FileText, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const getStatusStyle = (status) => {
  const styles = {
    'PROSES': { bg: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    'Pendaftaran Sihalal': { bg: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa', border: 'rgba(139, 92, 246, 0.3)' },
    'VERVAL': { bg: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' },
    'PROSES P3H': { bg: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8', border: 'rgba(14, 165, 233, 0.3)' },
    'Terkirim ke Komite': { bg: 'rgba(236, 72, 153, 0.2)', color: '#f472b6', border: 'rgba(236, 72, 153, 0.3)' },
    'Terbit SH': { bg: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: 'rgba(16, 185, 129, 0.3)' },
    'Perbaikkan Akun SiHalal': { bg: 'rgba(249, 115, 22, 0.2)', color: '#fb923c', border: 'rgba(249, 115, 22, 0.3)' },
    'PENDING': { bg: 'rgba(107, 114, 128, 0.2)', color: '#9ca3af', border: 'rgba(107, 114, 128, 0.3)' },
    'Verifikasi PU': { bg: 'rgba(34, 211, 238, 0.2)', color: '#67e8f9', border: 'rgba(34, 211, 238, 0.3)' },
    'Batal Pengajuan': { bg: 'rgba(239, 68, 68, 0.2)', color: '#f87171', border: 'rgba(239, 68, 68, 0.3)' }
  };
  return styles[status] || { bg: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: 'rgba(16, 185, 129, 0.3)' };
};
const PengumumanPublic = () => {
  const [pengumuman, setPengumuman] = useState([]);
  const [loading, setLoading] = useState(true);
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

  // Search feature removed per user request

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)' }}>
      {/* Mesh Background sama seperti Login */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(24, 119, 242, 0.4) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.4) 0%, transparent 40%)', filter: 'blur(80px)', zIndex: 0 }}></div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative', zIndex: 10, padding: '2rem 1rem', overflow: 'hidden' }}>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: 'flex', flexDirection: 'column', flex: 1, background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '16px', padding: '2rem', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden' }}
        >
          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <img src="/logo-p3h.png" alt="P3H Logo" style={{ height: '110px', width: '110px', borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', border: '2px solid rgba(255,255,255,0.2)' }} />
            <h1 style={{ color: '#fff', margin: 0, fontSize: '2rem', fontWeight: 'bold', letterSpacing: '0.05em' }}>PENGUMUMAN</h1>
            <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '0.5rem', fontWeight: '400' }}>Status Proses Sertifikasi Halal Pelaku Usaha</p>
          </div>

        <div className="table-responsive" style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', marginTop: 0, border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
              <tr>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>No</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Nama Pelaku Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Nama Produk</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', minWidth: '250px', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Alamat Usaha</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Last Update</th>
                <th style={{ padding: '12px 16px', borderBottom: '2px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap', background: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(10px)' }}>Status</th>
              </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '2rem' }}>Memuat data...</td></tr>
                ) : pengumuman.length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', color: 'rgba(255,255,255,0.6)', padding: '2rem' }}>Belum ada data pengumuman.</td></tr>
                ) : (
                  pengumuman.map((item, index) => {
                    const style = getStatusStyle(item.status);
                    return (
                      <tr key={item.id} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid rgba(255,255,255,0.08)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '16px', color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{index + 1}</td>
                        <td style={{ padding: '16px', color: '#fff', fontSize: '0.875rem', fontWeight: '600', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.namaPelakuUsaha}</td>
                        <td style={{ padding: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{item.namaProduk}</td>
                        <td style={{ padding: '16px', color: 'rgba(255,255,255,0.75)', fontSize: '0.875rem', textTransform: 'uppercase', minWidth: '250px' }}>{item.alamatUsaha}</td>
                        <td style={{ padding: '16px', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>{item.lastUpdate}</td>
                        <td style={{ padding: '16px', whiteSpace: 'nowrap' }}>
                          <span style={{
                            background: style.bg,
                            color: style.color,
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            whiteSpace: 'nowrap',
                            border: `1px solid ${style.border}`
                          }}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
