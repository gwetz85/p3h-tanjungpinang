import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit3, Clock, Info, X, FileText, Calendar, CalendarX, Timer, MessageSquare, PhoneCall, Trash2, Save, ExternalLink, MapPin, CheckCircle2, User, Play, Pause } from 'lucide-react';
import HalalForm from '../components/HalalForm';
import { useAuth } from '../context/AuthContext';






const KELURAHAN_LIST = [
  "Tanjungpinang Kota",
  "Senggarang",
  "Kampung Bugis",
  "Penyengat",
  "Tanjungpinang Barat",
  "Kemboja",
  "Bukit Cermin",
  "Kampung Baru",
  "Pinang Kencana",
  "Air Raja",
  "Melayu Kota Piring",
  "Kampung Bulang",
  "Batu IX",
  "Tanjungpinang Timur",
  "Sei Jang",
  "Tanjung Unggat",
  "Dompak",
  "Tanjung Ayun Sakti"
];

const CekPekerjaan = () => {
  const { role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobPhoto, setSelectedJobPhoto] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showHalal, setShowHalal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    if (selectedJob && selectedJob.id) {
      setSelectedJobPhoto('');
      const photoRef = ref(rtdb, `pekerjaan_photos/${selectedJob.id}/photoPengajuan`);
      onValue(photoRef, (snapshot) => {
        if (snapshot.exists()) {
          setSelectedJobPhoto(snapshot.val());
        }
      }, { onlyOnce: true });
    }
  }, [selectedJob]);




  useEffect(() => {
    // Separate queries to avoid fetching all jobs (which contain heavy base64 images)
    const qProses = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Proses'));
    const qPending = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Pending'));
    const qReturned = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Returned'));

    let prosesData = {};
    let pendingData = {};
    let returnedData = {};

    const updateJobsList = () => {
      const combined = [...Object.values(prosesData), ...Object.values(pendingData), ...Object.values(returnedData)];
      setJobs(combined);
      setLoading(false);
    };

    const unsubProses = onValue(qProses, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          prosesData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { id: key, ...data[key] };
            return acc;
          }, {});
        } else {
          prosesData = {};
        }
        updateJobsList();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    const unsubPending = onValue(qPending, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          pendingData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { id: key, ...data[key] };
            return acc;
          }, {});
        } else {
          pendingData = {};
        }
        updateJobsList();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    const unsubReturned = onValue(qReturned, (snapshot) => {
      try {
        const data = snapshot.val();
        if (data) {
          returnedData = Object.keys(data).reduce((acc, key) => {
            acc[key] = { id: key, ...data[key] };
            return acc;
          }, {});
        } else {
          returnedData = {};
        }
        updateJobsList();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    });

    return () => {
      unsubProses();
      unsubPending();
      unsubReturned();
    };
  }, [role]);

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

  const handleDOBChange = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setSelectedJob({ ...selectedJob, tanggalLahir: dob, usia: age > 0 ? age : 0 });
  };

  const handleDeleteSchedule = async (jobId) => {
    if (window.confirm('Hapus jadwal kunjungan untuk pemohon ini?')) {
      try {
        await update(ref(rtdb, `pekerjaan/${jobId}`), {
          jadwalKunjungan: null
        });
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus jadwal');
      }
    }
  };

  const handleToggleStatus = async (job) => {
    try {
      const newStatus = job.status === 'Proses' ? 'Pending' : 'Proses';
      await update(ref(rtdb, `pekerjaan/${job.id}`), {
        status: newStatus
      });
      alert(`Status pekerjaan diubah menjadi: ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah status pekerjaan');
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
      const timer = setInterval(calculateTime, 1000);
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

  const sortedJobs = [...filteredJobs].sort((a, b) => {
    const dateA = a.jadwalKunjungan ? new Date(a.jadwalKunjungan).getTime() : Infinity;
    const dateB = b.jadwalKunjungan ? new Date(b.jadwalKunjungan).getTime() : Infinity;
    
    if (dateA !== dateB) return dateA - dateB;
    return (b.tanggalInput || 0) - (a.tanggalInput || 0);
  });

  return (
    <div className="page-container" style={{ maxWidth: '1200px' }}>
      <div className="page-header">
        <h1 className="title-gradient">Proses & Verifikasi</h1>
      </div>

      <div className="stats-summary-grid">
        <div className="stat-summary-card glass-card">
          <div className="stat-summary-info">
            <span className="stat-summary-label">Total Data</span>
            <h2 className="stat-summary-value">{filteredJobs.length}</h2>
          </div>
          <div className="stat-summary-icon text-primary"><CheckCircle2 size={24} /></div>
        </div>
        <div className="stat-summary-card glass-card">
          <div className="stat-summary-info">
            <span className="stat-summary-label">Perlu Perbaikan</span>
            <h2 className="stat-summary-value">{filteredJobs.filter(j => j.status === 'Returned').length}</h2>
          </div>
          <div className="stat-summary-icon text-danger"><X size={24} /></div>
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

      <div className="table-wrapper glass-card">
        {loading ? (
          <div className="loading">Memuat data...</div>
        ) : sortedJobs.length === 0 ? (
          <div className="empty-state">Tidak ada pekerjaan aktif yang ditemukan.</div>
        ) : (
          <>
            <div className="table-container desktop-only">
              <table className="verification-table">
                <thead>
                  <tr>
                    <th>Jadwal Kunjungan</th>
                    <th>Informasi Pemohon</th>
                    <th>Kelurahan</th>
                    <th>Jenis & Progres</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job) => (
                    <tr key={job.id} onClick={() => setSelectedJob(job)} className="table-row">
                      <td>
                        {job.jadwalKunjungan ? (
                          <div className="schedule-cell">
                            <div className="date-time">
                              <span className="date">
                                {new Date(job.jadwalKunjungan).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="time">
                                {new Date(job.jadwalKunjungan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted italic">Belum diset</span>
                        )}
                      </td>
                      <td>
                        <div className="applicant-cell">
                          <span className="name">{job.nama}</span>
                          <span className="address"><MapPin size={10} /> {job.alamat}</span>
                        </div>
                      </td>
                      <td>
                        <span className="kelurahan-badge">{job.kelurahan || '-'}</span>
                      </td>
                      <td>
                        <div className="type-progress-cell">
                          <span className="job-type-small">{job.jenisPekerjaan}</span>
                          <div className="mini-progress">
                            <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: `${job.progress}%` }}></div></div>
                            <span className="percent">{job.progress}%</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${job.status === 'Returned' ? 'returned' : job.status === 'Pending' ? 'pending' : 'proses'}`}>
                          {job.status === 'Returned' ? 'Perlu Perbaikan' : job.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                          <button 
                            className={`btn-table-icon ${job.status === 'Proses' ? 'text-warning' : 'text-success'}`}
                            title={job.status === 'Proses' ? 'Tandai Pending (Menunggu)' : 'Mulai Kerjakan (Proses)'}
                            onClick={() => handleToggleStatus(job)}
                          >
                            {job.status === 'Proses' ? <Pause size={16} /> : <Play size={16} />}
                          </button>
                          <button className="btn-table-icon text-accent" title="Set Jadwal" onClick={() => { setSelectedJob(job); setShowSchedule(true); setScheduleDate(job.jadwalKunjungan || ''); }}>
                            <Calendar size={16} />
                          </button>
                          {job.jadwalKunjungan && (
                            <button className="btn-table-icon text-danger" title="Hapus Jadwal" onClick={() => handleDeleteSchedule(job.id)}>
                              <CalendarX size={16} />
                            </button>
                          )}
                          {job.jenisPekerjaan === 'Sertifikasi Halal' && (
                            <button className="btn-table-icon text-primary" title="Isi Form Halal" onClick={() => { setSelectedJob(job); setShowHalal(true); }}>
                              <FileText size={16} />
                            </button>
                          )}
                          <button className="btn-table-icon" title="Detail" onClick={() => setSelectedJob(job)}>
                            <Info size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout */}
            <div className="mobile-job-cards mobile-only">
              {sortedJobs.map((job) => (
                <div key={job.id} className="visit-card-compact" onClick={() => setSelectedJob(job)}>
                  <div className="visit-time">
                    {job.jadwalKunjungan ? (
                      <>
                        <span className="date">{new Date(job.jadwalKunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                        <span className="hour">{new Date(job.jadwalKunjungan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    ) : (
                      <span className="date text-muted" style={{ fontStyle: 'italic', opacity: 0.6, fontSize: '0.8rem' }}>Belum<br/>diset</span>
                    )}
                  </div>
                  <div className="visit-details" style={{ width: '100%' }}>
                    <h4>{job.nama}</h4>
                    <div className="visit-meta" style={{ flexDirection: 'column', gap: '4px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> {job.jenisPekerjaan} ({job.progress}%)</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MapPin size={14} /> {job.kelurahan || '-'}</span>
                    </div>
                  </div>
                  <div className="visit-actions" style={{ display: 'flex', gap: '8px', alignSelf: 'flex-end', marginTop: '10px' }}>
                    <div className={`visit-badge ${job.status === 'Returned' ? 'danger' : job.status === 'Pending' ? 'pending' : 'urgent'}`} style={{ marginRight: 'auto', alignSelf: 'center' }}>
                      {job.status === 'Returned' ? 'Perlu Perbaikan' : (job.status ? job.status.toUpperCase() : 'PENDING')}
                    </div>
                    <button 
                      className={`btn-table-icon ${job.status === 'Proses' ? 'text-warning' : 'text-success'}`}
                      title={job.status === 'Proses' ? 'Tandai Pending' : 'Mulai Kerjakan'}
                      onClick={(e) => { e.stopPropagation(); handleToggleStatus(job); }}
                    >
                      {job.status === 'Proses' ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button className="btn-table-icon text-accent" title="Set Jadwal" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setShowSchedule(true); setScheduleDate(job.jadwalKunjungan || ''); }}>
                      <Calendar size={16} />
                    </button>
                    {job.jadwalKunjungan && (
                      <button className="btn-table-icon text-danger" title="Hapus Jadwal" onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(job.id); }}>
                        <CalendarX size={16} />
                      </button>
                    )}
                    {job.jenisPekerjaan === 'Sertifikasi Halal' && (
                      <button className="btn-table-icon text-primary" title="Isi Form Halal" onClick={(e) => { e.stopPropagation(); setSelectedJob(job); setShowHalal(true); }}>
                        <FileText size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
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
                  <div className="detail-header-section left-align">
                    <h2 className="title-gradient" style={{ margin: 0 }}>{selectedJob.nama}</h2>
                    <span className="badge-type-large left-align">{selectedJob.jenisPekerjaan}</span>
                    <div className="detail-progress-container">
                      <span className="detail-progress-label">Progres Pekerjaan: {selectedJob.progress}%</span>
                      <div className="detail-progress-bar-bg">
                        <div className="detail-progress-bar-fill" style={{ width: `${selectedJob.progress}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <hr className="detail-divider" />

                  {selectedJob.adminNote && (
                    <div className="admin-note-box glass-card mb-6" style={{ background: 'rgba(239, 68, 68, 0.1)', borderLeft: '4px solid #ef4444', padding: '1rem' }}>
                      <h4 style={{ color: '#ef4444', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={16} /> Catatan Perbaikan Admin:
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: '#dc2626' }}>{selectedJob.adminNote}</p>
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
                        {(selectedJobPhoto || selectedJob.photoPengajuan) && (
                          <div className="info-item full">
                            <label>Foto Pengajuan</label>
                            <img src={selectedJobPhoto || selectedJob.photoPengajuan} alt="Pengajuan" className="detail-photo" />
                          </div>
                        )}

                      </>
                    )}

                    <div className="info-item full">
                      <label>Keterangan / Jadwal Kunjungan</label>
                      <p className={selectedJob.jadwalKunjungan ? 'text-accent font-bold' : ''}>
                        {selectedJob.jadwalKunjungan 
                          ? `Kunjungan pada: ${new Date(selectedJob.jadwalKunjungan).toLocaleString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}` 
                          : selectedJob.keterangan || '-'}
                      </p>
                    </div>

                    {selectedJob.halalData?.surveyDriveLink && (
                      <div className="info-item full glass-card p-4 mt-2" style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <label style={{ color: 'var(--primary)', marginBottom: '8px', display: 'block' }}>Link Foto Survey Lapangan</label>
                        <a 
                          href={selectedJob.halalData.surveyDriveLink} 
                          target="_blank" 
                          rel="noreferrer"
                          style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '600' }}
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
                        <div className="input-group">
                          <label>Kelurahan</label>
                          <select 
                            value={selectedJob.kelurahan} 
                            onChange={(e) => setSelectedJob({...selectedJob, kelurahan: e.target.value})}
                          >
                            <option value="">Pilih Kelurahan</option>
                            {KELURAHAN_LIST.map(kel => (
                              <option key={kel} value={kel}>{kel}</option>
                            ))}
                          </select>
                        </div>
                        <div className="input-group"><label>Tempat Lahir</label><input type="text" value={selectedJob.tempatLahir || ''} onChange={(e) => setSelectedJob({...selectedJob, tempatLahir: e.target.value})} /></div>
                        <div className="input-group">
                          <label>Tanggal Lahir & Usia</label>
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <input type="date" value={selectedJob.tanggalLahir || ''} onChange={(e) => handleDOBChange(e.target.value)} style={{ flex: 2 }} />
                            <input type="text" value={selectedJob.usia ? `${selectedJob.usia} Thn` : ''} readOnly style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)' }} />
                          </div>
                        </div>
                        <div className="input-group">
                          <label>Jenis Usaha</label>
                          <select value={selectedJob.jenisUsaha || 'Makanan'} onChange={(e) => setSelectedJob({...selectedJob, jenisUsaha: e.target.value})}>
                            <option value="Makanan">Makanan</option>
                            <option value="Minuman">Minuman</option>
                          </select>
                        </div>
                        <div className="input-group"><label>Tahun Berdiri</label><input type="number" value={selectedJob.tahunBerdiri || ''} onChange={(e) => setSelectedJob({...selectedJob, tahunBerdiri: e.target.value})} /></div>
                        <div className="input-group" style={{ gridColumn: 'span 2' }}><label>Alamat Usaha</label><input type="text" value={selectedJob.alamatUsaha || ''} onChange={(e) => setSelectedJob({...selectedJob, alamatUsaha: e.target.value})} /></div>
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
