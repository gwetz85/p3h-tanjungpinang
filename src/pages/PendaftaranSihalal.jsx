import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, FileText, Info, Search, X, MessageSquare, PhoneCall, Download, Timer } from 'lucide-react';
import HalalForm from '../components/HalalForm';
import { useAuth } from '../context/AuthContext';

const CountdownReview = ({ startTime, jobId }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTime = () => {
      const thirtyMinutes = 30 * 60 * 1000;
      const target = startTime + thirtyMinutes;
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Waktu Habis! Auto-Selesai...');
        // Auto verify logic
        update(ref(rtdb, `pekerjaan/${jobId}`), { 
          status: 'Selesai',
          verifiedAt: Date.now(),
          adminNote: 'Diverifikasi otomatis oleh Sistem (30 Menit Tanpa Respon)'
        });
        return;
      }

      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [startTime, jobId]);

  return (
    <div className="countdown-badge" style={{ background: '#f59e0b', color: '#000' }}>
      <Timer size={12} /> {timeLeft}
    </div>
  );
};

const PendaftaranSihalal = () => {
  const { role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showHalal, setShowHalal] = useState(false);
  const [adminNote, setAdminNote] = useState('');

  useEffect(() => {
    const jobsRef = ref(rtdb, 'pekerjaan');
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(job => job.status === 'Review');
        setJobs(list);
      } else {
        setJobs([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleVerify = async (jobId) => {
    if (window.confirm('Nyatakan pendaftaran ini SELESAI dan VALID?')) {
      try {
        await update(ref(rtdb, `pekerjaan/${jobId}`), { 
          status: 'Selesai',
          verifiedAt: Date.now(),
          adminNote: adminNote || 'Data Diverifikasi'
        });
        setSelectedJob(null);
        setAdminNote('');
      } catch (err) {
        alert('Gagal verifikasi data');
      }
    }
  };

  const handleReturn = async (jobId) => {
    if (!adminNote) {
      alert('Harap berikan alasan/catatan perbaikan agar petugas tahu apa yang harus diperbaiki.');
      return;
    }
    if (window.confirm('Kembalikan data ke petugas untuk diperbaiki?')) {
      try {
        await update(ref(rtdb, `pekerjaan/${jobId}`), { 
          status: 'Returned',
          adminNote: adminNote
        });
        setSelectedJob(null);
        setAdminNote('');
      } catch (err) {
        alert('Gagal mengembalikan data');
      }
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.namaUsaha?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient">Pendaftaran SIHALAL</h1>
        <p className="text-muted">Verifikasi dokumen pengajuan yang telah dilengkapi petugas lapangan</p>
      </div>

      <div className="search-bar glass-card mb-6" style={{ display: 'flex', alignItems: 'center', padding: '0 1rem' }}>
        <Search size={20} className="text-muted" />
        <input 
          type="text" 
          placeholder="Cari Nama Pelaku Usaha..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ flex: 1, padding: '1rem', background: 'none', border: 'none', color: 'white', outline: 'none' }}
        />
      </div>

      <div className="job-list">
        {loading ? (
          <div className="loading">Memuat Data...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state glass-card">Tidak ada pengajuan baru untuk diverifikasi.</div>
        ) : (
          filteredJobs.map((job) => (
            <motion.div key={job.id} onClick={() => setSelectedJob(job)} className="job-card glass-card">
              {job.reviewStartedAt && <CountdownReview startTime={job.reviewStartedAt} jobId={job.id} />}
              <div className="job-main">
                <div className="job-info">
                  <span className="badge-type" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>Menunggu Verifikasi</span>
                  <h3>{job.nama}</h3>
                  <p className="job-date">{job.namaUsaha || 'Nama Usaha Belum Diisi'}</p>
                </div>
                <div className="job-progress-section">
                  <div className="progress-label"><span>Kelengkapan Data</span><span>{job.progress}%</span></div>
                  <div className="progress-bar-bg"><div className="progress-bar-fill" style={{ width: `${job.progress}%` }}></div></div>
                </div>
              </div>
              <div className="job-footer">
                <span className="status-badge text-accent"><FileText size={14} /> Review Dokumen</span>
                <button className="btn-icon text-primary"><Info size={20} /></button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedJob && !showHalal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card">
              <div className="modal-header">
                <h2>Verifikasi Pengajuan</h2>
                <button onClick={() => setSelectedJob(null)} className="btn-close"><X /></button>
              </div>

              <div className="job-detail-modern p-6">
                <div className="detail-header-section mb-6">
                  <h2 className="title-gradient">{selectedJob.nama}</h2>
                  <p className="text-muted">{selectedJob.nik}</p>
                </div>

                <div className="detail-info-grid mb-6">
                  <div className="info-item">
                    <label>Nama Usaha</label>
                    <p>{selectedJob.halalData?.namaUsaha || selectedJob.namaUsaha}</p>
                  </div>
                  <div className="info-item">
                    <label>NIB</label>
                    <p>{selectedJob.halalData?.nib || '-'}</p>
                  </div>
                  <div className="info-item">
                    <label>Kontak</label>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <p>{selectedJob.wa}</p>
                      <a href={`https://wa.me/${selectedJob.wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="text-primary"><MessageSquare size={16} /></a>
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Wilayah</label>
                    <p>{selectedJob.kelurahan || '-'}</p>
                  </div>
                </div>

                <div className="action-box glass-card p-4 mb-6" style={{ background: 'rgba(255,255,255,0.03)' }}>
                  <label className="mb-2 block text-sm font-bold text-accent">Catatan Admin / Alasan Pengembalian</label>
                  <textarea 
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white text-sm"
                    rows="3"
                    placeholder="Contoh: Lampiran foto kurang jelas, harap upload ulang..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  ></textarea>
                </div>

                <div className="modal-footer-actions" style={{ gridTemplateColumns: '1fr 1fr' }}>
                   <button onClick={() => setShowHalal(true)} className="btn-primary-outline" style={{ gridColumn: 'span 2', marginBottom: '1rem' }}>
                    <FileText size={18} /> Lihat Dokumen Lengkap
                  </button>
                  
                  <button onClick={() => handleReturn(selectedJob.id)} className="btn-danger-outline" style={{ border: '1px solid #ef4444', color: '#ef4444' }}>
                    <XCircle size={18} /> Kembalikan ke Petugas
                  </button>

                  <button onClick={() => handleVerify(selectedJob.id)} className="btn-primary-filled" style={{ background: '#10b981' }}>
                    <CheckCircle size={18} /> Verifikasi & Selesai
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {selectedJob && showHalal && (
          <HalalForm job={selectedJob} onClose={() => setShowHalal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PendaftaranSihalal;
