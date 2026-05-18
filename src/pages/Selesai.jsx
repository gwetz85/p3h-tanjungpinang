import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Calendar, User, Briefcase, RotateCcw, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Selesai = () => {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === 'admin@tarunabangsa.id';
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // Only fetch jobs that are 'Selesai' and limit to the most recent 100 to significantly improve loading speed
    const jobsRef = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Selesai'), limitToLast(100));
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => {
            const { halalData, ...rest } = data[key];
            return { id: key, ...rest };
          });
        
        // Sort newest first
        list.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0));
        setCompletedJobs(list);
      } else {
        setCompletedJobs([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRestore = async (jobId) => {
    if (window.confirm('Kembalikan data ini ke menu Input (Proses & Verifikasi)? Semua data input akan tetap ada.')) {
      try {
        await update(ref(rtdb, `pekerjaan/${jobId}`), {
          status: 'Proses',
          verifiedAt: null,
          adminNote: 'Data dikembalikan dari Riwayat Selesai oleh Superadmin'
        });
        alert('Data berhasil dikembalikan!');
      } catch (err) {
        console.error(err);
        alert('Gagal mengembalikan data.');
      }
    }
  };

  const filteredJobs = completedJobs.filter(job => 
    job.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jenisPekerjaan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient">Riwayat Selesai</h1>
      </div>

      <div className="search-section mb-6">
        <div className="search-bar glass-card">
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Cari nama atau jenis pekerjaan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container glass-card desktop-only">
        <table className="custom-table">
          <thead>
            <tr>
              <th><Calendar size={16} /> Tanggal</th>
              <th><Briefcase size={16} /> Jenis</th>
              <th><User size={16} /> Nama</th>
              <th>Status</th>
              <th>Keterangan</th>
              {isSuperAdmin && <th>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? "6" : "5"} className="text-center">Memuat...</td></tr>
            ) : filteredJobs.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? "6" : "5"} className="text-center">Belum ada data.</td></tr>
            ) : (
              filteredJobs.map((job) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>{new Date(job.tanggalInput).toLocaleDateString()}</td>
                  <td><span className="badge-type">{job.jenisPekerjaan}</span></td>
                  <td className="font-bold">{job.nama}</td>
                  <td><span className="badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 'bold' }}><CheckCircle2 size={14} /> Selesai</span></td>
                  <td className="text-muted">{job.keterangan || '-'}</td>
                  {isSuperAdmin && (
                    <td>
                      <button 
                        onClick={() => handleRestore(job.id)} 
                        className="btn-table-icon text-accent" 
                        title="Kembalikan ke Proses"
                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                      >
                        <RotateCcw size={16} />
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
        {loading ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Memuat...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>Belum ada data.</div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="visit-card-compact glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', width: '100%' }}>
                <div className="visit-time" style={{ borderRight: 'none', paddingRight: '0', flexShrink: 0, minWidth: '50px' }}>
                  <span className="date" style={{ fontSize: '1.2rem' }}>{new Date(job.tanggalInput).getDate()}</span>
                  <span className="hour" style={{ fontSize: '0.85rem' }}>{new Date(job.tanggalInput).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span>
                </div>
                <div style={{ flex: 1, borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '15px' }}>
                  <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: 'white' }}>{job.nama}</h4>
                  <div className="visit-meta" style={{ flexDirection: 'column', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Briefcase size={14} /> {job.jenisPekerjaan}</span>
                    {job.keterangan && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontStyle: 'italic', opacity: 0.8 }}><Info size={14} /> {job.keterangan}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px', alignItems: 'center' }}>
                <span className="visit-badge" style={{ marginRight: 'auto', display: 'flex', alignItems: 'center', gap: '5px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--primary)', border: '1px solid rgba(16, 185, 129, 0.2)' }}><CheckCircle2 size={14} /> Selesai</span>
                
                {isSuperAdmin && (
                  <button 
                    onClick={() => handleRestore(job.id)} 
                    className="btn-primary-outline" 
                    title="Kembalikan ke Proses"
                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                  >
                    <RotateCcw size={16} /> Restore
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Selesai;
