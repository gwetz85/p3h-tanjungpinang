import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, remove } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit3, Clock, Info, X, FileText, Calendar, Timer, MessageSquare, PhoneCall, Trash2, Save, ExternalLink, MapPin, CheckCircle2 } from 'lucide-react';
import HalalForm from '../components/HalalForm';
import { useAuth } from '../context/AuthContext';






const CekPekerjaan = () => {
  const { role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showHalal, setShowHalal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');




  useEffect(() => {
    const jobsRef = ref(rtdb, 'pekerjaan');
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          const list = Object.keys(data)
            .map(key => ({ id: key, ...data[key] }))
            .filter(job => job.status === 'Proses' || job.status === 'Returned');
          setJobs(list);
        } else {
          setJobs([]);
        }
      } catch (err) {
        console.error("Error processing jobs:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteJob = async (id) => {
    if (window.confirm('Hapus seluruh data pekerjaan ini secara permanen?')) {
      try {
        await remove(ref(rtdb, `pekerjaan/${id}`));
        setSelectedJob(null);
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus data');
      }
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const jobRef = ref(rtdb, `pekerjaan/${selectedJob.id}`);
      const updateData = {
        ...selectedJob,
        progress: Number(selectedJob.progress),
        status: selectedJob.progress >= 100 ? 'Selesai' : 'Proses'
      };
      delete updateData.id;

      await update(jobRef, updateData);
      setEditMode(false);
      setSelectedJob(null);
    } catch (err) {
      console.error(err);
      alert('Gagal update data');
    }
  };


  const handleSetSchedule = async (e) => {
    e.preventDefault();
    try {
      await update(ref(rtdb, `pekerjaan/${selectedJob.id}`), {
        jadwalKunjungan: scheduleDate
      });
      setShowSchedule(false);
      setSelectedJob(null);
    } catch (err) {
      alert('Gagal set jadwal');
    }
  };

  const Countdown = ({ targetDate }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
      const calculateTime = () => {
        const target = new Date(targetDate).getTime();
        const now = new Date().getTime();

        if (isNaN(target)) {
          setTimeLeft('Jadwal tidak valid');
          return;
        }

        const diff = target - now;

        if (diff <= 0) {
          setTimeLeft('Waktunya Kunjungan!');
          return;
        }

        const d = Math.floor(diff / (1000 * 60 * 60 * 24));
        const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);

        const pad = (num) => String(num).padStart(2, '0');
        setTimeLeft(`${pad(d)}:${pad(h)}:${pad(m)}:${pad(s)}`);
      };

      calculateTime();
      const timer = setInterval(calculateTime, 1000); // Update setiap detik untuk format SS

      return () => clearInterval(timer);
    }, [targetDate]);

    return (
      <div className={`countdown-badge ${timeLeft === 'Waktunya Kunjungan!' ? 'urgent-glow' : ''}`}>
        <Timer size={12} /> {timeLeft}
      </div>
    );
  };



  const filteredJobs = jobs.filter(job => 
    (job.nama?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (job.jenisPekerjaan?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (job.kelurahan?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const groupedJobs = filteredJobs.reduce((groups, job) => {
    const kel = job.kelurahan || 'Belum Ditentukan';
    if (!groups[kel]) groups[kel] = [];
    groups[kel].push(job);
    return groups;
  }, {});

  const kelurahans = Object.keys(groupedJobs).sort();

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient">Proses & Verifikasi</h1>
      </div>

      <div className="stats-summary-grid">
        <div className="stat-summary-card glass-card">
          <div className="stat-summary-info">
            <span className="stat-summary-label">Total Pekerjaan</span>
            <h2 className="stat-summary-value">{filteredJobs.length}</h2>
          </div>
          <div className="stat-summary-icon text-primary"><CheckCircle2 size={24} /></div>
        </div>
        <div className="stat-summary-card glass-card">
          <div className="stat-summary-info">
            <span className="stat-summary-label">Total Kelurahan</span>
            <h2 className="stat-summary-value">{kelurahans.length}</h2>
          </div>
          <div className="stat-summary-icon text-accent"><MapPin size={24} /></div>
        </div>
      </div>

      <div className="search-section">
        <div className="search-bar glass-card">
          <Search size={20} className="text-muted" />
          <input 
            type="text" 
            placeholder="Cari nama, jenis pekerjaan, atau kelurahan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && <button onClick={() => setSearchTerm('')} className="btn-icon"><X size={18} /></button>}
        </div>
      </div>

      <div className="grouped-job-container">
        {loading ? (
          <div className="loading">Memuat data...</div>
        ) : filteredJobs.length === 0 ? (
          <div className="empty-state glass-card">Tidak ada pekerjaan aktif yang ditemukan.</div>
        ) : (
          kelurahans.map((kel) => (
            <div key={kel} className="kelurahan-group">
              <div className="kelurahan-header">
                <div className="kelurahan-title">
                  <MapPin size={18} className="text-primary" />
                  <h3>Kelurahan {kel}</h3>
                </div>
                <span className="kelurahan-count">{groupedJobs[kel].length} Pekerjaan</span>
              </div>
              <div className="job-list">
                {groupedJobs[kel].map((job) => (
                  <motion.div 
                    key={job.id} 
                    layoutId={job.id}
                    onClick={() => setSelectedJob(job)} 
                    className="job-card glass-card"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {job.jadwalKunjungan && <Countdown targetDate={job.jadwalKunjungan} />}
                    <div className="job-main">
                      <div className="job-info">
                        <span className="badge-type">{job.jenisPekerjaan}</span>
                        <h3>{job.nama}</h3>
                        <p className="job-location"><MapPin size={12} /> {job.alamat}</p>
                      </div>
                      
                      {job.jadwalKunjungan && (
                        <div className="job-schedule">
                          <Calendar size={16} />
                          <div>
                            <span className="schedule-label">Jadwal Kunjungan</span>
                            <span>
                              {new Date(job.jadwalKunjungan).toLocaleString('id-ID', { 
                                day: 'numeric', 
                                month: 'short', 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="job-progress-section">
                        <div className="progress-label">
                          <span>Progres</span>
                          <span>{job.progress}%</span>
                        </div>
                        <div className="progress-bar-bg">
                          <div className="progress-bar-fill" style={{ width: `${job.progress}%` }}></div>
                        </div>
                      </div>
                    </div>

                    <div className="job-footer">
                      <span className={`status-badge ${job.status === 'Returned' ? 'text-danger' : ''}`}>
                        {job.status === 'Returned' ? <X size={14} /> : <Clock size={14} />} 
                        {job.status === 'Returned' ? 'Perlu Perbaikan' : job.status}
                      </span>
                      <div className="job-actions">
                        <button className="btn-icon text-accent" title="Set Jadwal" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setShowSchedule(true); setScheduleDate(job.jadwalKunjungan || ''); }}>
                          <Calendar size={18} />
                        </button>
                        {job.jenisPekerjaan === 'Sertifikasi Halal' && (
                          <button className="btn-icon text-primary" title="Isi Form Halal" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setShowHalal(true); }}>
                            <FileText size={18} />
                          </button>
                        )}
                        <button className="btn-icon" title="Detail"><Info size={18} /></button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <AnimatePresence>
        {selectedJob && !showHalal && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card">
              <div className="modal-header" style={{ alignItems: 'center', gap: '15px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                  <h2 style={{ margin: 0 }}>Detail Pekerjaan</h2>
                  {selectedJob.jadwalKunjungan && <Countdown targetDate={selectedJob.jadwalKunjungan} />}
                </div>
                <button onClick={() => setSelectedJob(null)} className="btn-close"><X /></button>
              </div>
              {!editMode ? (
                <div className="job-detail-modern">
                  <div className="detail-header-section">
                    <h2 className="title-gradient">{selectedJob.nama}</h2>
                    <span className="badge-type-large">{selectedJob.jenisPekerjaan}</span>
                  </div>

                  {selectedJob.adminNote && (
                    <div className="admin-note-box glass-card mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '1rem' }}>
                      <h4 style={{ color: '#ef4444', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} /> Catatan Perbaikan Admin:
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'white' }}>{selectedJob.adminNote}</p>
                    </div>
                  )}



                  <div className="detail-info-grid">
                    <div className="info-item">
                      <label>NIK</label>
                      <p>{selectedJob.nik}</p>
                    </div>
                    <div className="info-item">
                      <label>Kontak & WhatsApp</label>
                      <div className="contact-actions">
                        <p>{selectedJob.wa}</p>
                        <div className="action-buttons">
                          <a href={`https://wa.me/${selectedJob.wa.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="action-btn wa-btn">
                            <MessageSquare size={16} />
                          </a>
                          <a href={`tel:${selectedJob.wa}`} className="action-btn call-btn">
                            <PhoneCall size={16} />
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="info-item full">
                      <label>Alamat Domisili</label>
                      <p>{selectedJob.alamat}</p>
                    </div>

                    {selectedJob.jenisPekerjaan === 'Sertifikasi Halal' && (
                      <>
                        <div className="info-item">
                          <label>TTL / Usia</label>
                          <p>{selectedJob.tempatLahir}, {selectedJob.tanggalLahir} ({selectedJob.usia} Thn)</p>
                        </div>
                        <div className="info-item">
                          <label>Kelurahan</label>
                          <p>{selectedJob.kelurahan}</p>
                        </div>
                        <div className="info-item">
                          <label>Nama Usaha</label>
                          <p>{selectedJob.namaUsaha} ({selectedJob.jenisUsaha})</p>
                        </div>
                        <div className="info-item">
                          <label>Tahun Berdiri</label>
                          <p>{selectedJob.tahunBerdiri}</p>
                        </div>
                        <div className="info-item full">
                          <label>Alamat Usaha</label>
                          <p>{selectedJob.alamatUsaha}</p>
                        </div>
                        {selectedJob.photoPengajuan && (
                          <div className="info-item full">
                            <label>Foto Pengajuan</label>
                            <img src={selectedJob.photoPengajuan} alt="Pengajuan" className="detail-photo" />
                          </div>
                        )}

                      </>
                    )}

                    <div className="info-item full">
                      <label>Keterangan / Jadwal Kunjungan</label>
                      <p className={selectedJob.jadwalKunjungan ? 'text-accent font-bold' : ''}>
                        {selectedJob.jadwalKunjungan 
                          ? `Kunjungan pada: ${new Date(selectedJob.jadwalKunjungan).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}` 
                          : selectedJob.keterangan || '-'}
                      </p>
                    </div>

                    {selectedJob.halalData?.surveyDriveLink && (
                      <div className="info-item full glass-card p-4 mt-2" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <label style={{ color: '#60a5fa', marginBottom: '8px', display: 'block' }}>Link Foto Survey Lapangan</label>
                        <a 
                          href={selectedJob.halalData.surveyDriveLink} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'white', textDecoration: 'none', fontWeight: '600' }}
                        >
                          <ExternalLink size={18} /> Buka Google Drive Survey
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="modal-footer-actions">
                    {selectedJob.jenisPekerjaan === 'Sertifikasi Halal' && (
                      <button onClick={() => setShowHalal(true)} className="btn-primary-outline">
                        <FileText size={18} /> Isi Form Halal
                      </button>
                    )}
                    <button onClick={() => setEditMode(true)} className="btn-primary-filled">
                      <Edit3 size={18} /> {role === 'Admin' ? 'Edit Data' : 'Update Progres'}
                    </button>
                    {role === 'Admin' && (
                      <button onClick={() => handleDeleteJob(selectedJob.id)} className="btn-danger-outline">
                        <Trash2 size={18} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              ) : (

                <form onSubmit={handleUpdate} className="edit-form">
                  {role === 'Admin' && (
                    <div className="admin-edit-section glass-card p-4 mb-6">
                      <h4 className="mb-4 text-accent">Edit Informasi Utama (Admin)</h4>
                      <div className="admin-grid">
                        <div className="input-group"><label>Nama</label><input type="text" value={selectedJob.nama} onChange={(e) => setSelectedJob({...selectedJob, nama: e.target.value})} /></div>
                        <div className="input-group"><label>NIK</label><input type="text" value={selectedJob.nik} onChange={(e) => setSelectedJob({...selectedJob, nik: e.target.value})} /></div>
                        <div className="input-group"><label>WhatsApp</label><input type="text" value={selectedJob.wa} onChange={(e) => setSelectedJob({...selectedJob, wa: e.target.value})} /></div>
                        <div className="input-group"><label>Alamat</label><input type="text" value={selectedJob.alamat} onChange={(e) => setSelectedJob({...selectedJob, alamat: e.target.value})} /></div>
                        <div className="input-group"><label>Nama Usaha</label><input type="text" value={selectedJob.namaUsaha} onChange={(e) => setSelectedJob({...selectedJob, namaUsaha: e.target.value})} /></div>
                        <div className="input-group"><label>Kelurahan</label><input type="text" value={selectedJob.kelurahan} onChange={(e) => setSelectedJob({...selectedJob, kelurahan: e.target.value})} /></div>
                      </div>
                    </div>
                  )}

                  <div className="info-box mb-4">
                    <p>ℹ️ Progres untuk Sertifikasi Halal dihitung otomatis dari kelengkapan formulir.</p>
                  </div>
                  <div className="input-group"><label>Keterangan</label>
                    <textarea rows="4" value={selectedJob.keterangan} onChange={(e) => setSelectedJob({...selectedJob, keterangan: e.target.value})}></textarea>
                  </div>
                  <div className="modal-actions">
                    <button type="button" onClick={() => setEditMode(false)} className="btn-secondary">Batal</button>
                    <button type="submit" className="btn-primary">Simpan</button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}

        {selectedJob && showHalal && (
          <HalalForm job={selectedJob} onClose={() => { setShowHalal(false); setSelectedJob(null); }} />
        )}
        {selectedJob && showSchedule && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal-content glass-card" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Set Jadwal Kunjungan</h2>
                <button onClick={() => { setShowSchedule(false); setSelectedJob(null); }} className="btn-close"><X /></button>
              </div>
              <form onSubmit={handleSetSchedule} className="edit-form">
                <div className="input-group">
                  <label>Tanggal & Waktu</label>
                  <input type="datetime-local" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => { setShowSchedule(false); setSelectedJob(null); }} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary">Simpan Jadwal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


    </div>
  );
};

export default CekPekerjaan;
