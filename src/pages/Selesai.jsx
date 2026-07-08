import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, query, orderByChild, equalTo, limitToLast } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Calendar, User, Briefcase, RotateCcw, Info, Download, FileText, MapPin, Send } from 'lucide-react';
import HalalForm from '../components/HalalForm';
import { useAuth } from '../context/AuthContext';

const Selesai = () => {
  const { currentUser, role } = useAuth();
  const isSuperAdmin = role === 'superadmin';
  const canDownload = role === 'Admin' || role === 'Petugas' || role === 'superadmin' || role === 'admin' || role === 'petugas';
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showHalal, setShowHalal] = useState(false);

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
    job.reviewStartedAt &&
    (job.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jenisPekerjaan.toLowerCase().includes(searchTerm.toLowerCase()))
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

      <div className="table-container glass-card desktop-only" style={{ overflowX: 'auto' }}>
        <table className="custom-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}><User size={16} /> Nama Pelaku Usaha</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}><Send size={16} /> Tanggal Dikirim ke Admin</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}><CheckCircle2 size={16} /> Tanggal Dipindahkan Ke Menu Selesai</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}><Briefcase size={16} /> Nama Usaha</th>
              <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}><MapPin size={16} /> Alamat</th>
              {(isSuperAdmin || canDownload) && <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Aksi</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={(isSuperAdmin || canDownload) ? "6" : "5"} className="text-center">Memuat...</td></tr>
            ) : filteredJobs.length === 0 ? (
              <tr><td colSpan={(isSuperAdmin || canDownload) ? "6" : "5"} className="text-center">Belum ada data.</td></tr>
            ) : (
              filteredJobs.map((job) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #f3f4f6' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: '#111827', fontSize: '0.875rem', fontWeight: '500', verticalAlign: 'middle' }}>{job.nama || '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{job.reviewStartedAt ? new Date(job.reviewStartedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{job.verifiedAt ? new Date(job.verifiedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>{job.namaUsaha || '-'}</td>
                  <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>{job.alamat || '-'}</td>
                  {(isSuperAdmin || canDownload) && (
                    <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {canDownload && job.jenisPekerjaan === 'Sertifikasi Halal' && (
                          <button 
                            onClick={() => { setSelectedJob(job); setShowHalal(true); }}
                            className="btn-table-icon text-primary"
                            title="Download Form Halal"
                            style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer', color: '#10b981' }}
                          >
                            <Download size={16} />
                          </button>
                        )}
                        {isSuperAdmin && (
                          <button 
                            onClick={() => handleRestore(job.id)} 
                            className="btn-table-icon text-accent" 
                            title="Kembalikan ke Proses"
                            style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}
                          >
                            <RotateCcw size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mobile-card-list mobile-only" style={{ marginTop: '1rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Memuat...</div>
        ) : filteredJobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada data.</div>
        ) : (
          filteredJobs.map((job) => (
            <div key={job.id} className="mobile-data-card">
              {/* Header: Name */}
              <div className="mobile-card-name" style={{marginTop: '0'}}>{job.nama || '-'}</div>

              {/* Nama Usaha */}
              <div className="mobile-card-business" style={{color: '#2563eb', marginTop: '0.4rem'}}>
                <Briefcase size={13} style={{marginRight: '4px'}}/> {job.namaUsaha || '-'}
              </div>
              
              {/* Alamat */}
              <div className="mobile-card-row" style={{marginTop: '0.4rem'}}>
                <MapPin size={13} style={{color:'#94a3b8', marginTop: '2px'}} />
                <span style={{color: '#475569'}}>{job.alamat || '-'}</span>
              </div>

              {/* Dates */}
              <div className="mobile-card-row" style={{marginTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '4px'}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                   <Send size={13} style={{color: '#f59e0b'}}/> 
                   <span style={{fontSize: '0.8rem', color: '#64748b'}}>Dikirim ke Admin: <strong>{job.reviewStartedAt ? new Date(job.reviewStartedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</strong></span>
                </div>
                <div style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                   <CheckCircle2 size={13} style={{color: '#10b981'}}/> 
                   <span style={{fontSize: '0.8rem', color: '#64748b'}}>Dipindah ke Selesai: <strong>{job.verifiedAt ? new Date(job.verifiedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : '-'}</strong></span>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mobile-card-footer" style={{marginTop: '0.8rem'}}>
                <span className="mobile-card-badge green" style={{display: 'flex', alignItems: 'center', gap: '4px'}}><CheckCircle2 size={13} /> SELESAI</span>
                
                <div style={{display: 'flex', gap: '8px'}}>
                  {canDownload && job.jenisPekerjaan === 'Sertifikasi Halal' && (
                    <button 
                      onClick={() => { setSelectedJob(job); setShowHalal(true); }}
                      className="btn-table-icon text-primary"
                      title="Download Form Halal"
                      style={{ background: 'rgba(16, 185, 129, 0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', color: '#10b981' }}
                    >
                      <Download size={15} />
                    </button>
                  )}
                  {isSuperAdmin && (
                    <button 
                      onClick={() => handleRestore(job.id)} 
                      className="btn-table-icon text-accent" 
                      title="Kembalikan ke Proses"
                      style={{ background: 'rgba(59, 130, 246, 0.1)', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      <RotateCcw size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedJob && showHalal && (
        <HalalForm job={selectedJob} onClose={() => { setShowHalal(false); setSelectedJob(null); }} />
      )}
    </div>
  );
};

export default Selesai;
