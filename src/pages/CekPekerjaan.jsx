import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { rtdb } from '../firebase';
import { ref, onValue, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Edit3, Clock, Info, X, FileText, Calendar, CalendarX, Timer, MessageSquare, PhoneCall, Trash2, Save, ExternalLink, MapPin, CheckCircle2, User, Play, Pause, Home, Download, Send, ClipboardCheck, Navigation, Map } from 'lucide-react';
import { addNotification } from '../utils/notifications';
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

const CekPekerjaan = () => {
  const { role } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobPhoto, setSelectedJobPhoto] = useState('');
  const [selectedJobKTP, setSelectedJobKTP] = useState('');
  const [selectedJobLokasi, setSelectedJobLokasi] = useState('');
  const [selectedJobKunjungan, setSelectedJobKunjungan] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showHalal, setShowHalal] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [showVervalSchedule, setShowVervalSchedule] = useState(false);
  const [vervalScheduleDate, setVervalScheduleDate] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [jobToCancel, setJobToCancel] = useState(null);
  const [showEditAlamat, setShowEditAlamat] = useState(false);
  const [editAlamatJob, setEditAlamatJob] = useState(null);
  const [newAlamatUsaha, setNewAlamatUsaha] = useState('');
  const [showEditMaps, setShowEditMaps] = useState(false);
  const [newLinkMaps, setNewLinkMaps] = useState('');
  // WhatsApp invitation modal state
  const [showWAModal, setShowWAModal] = useState(false);
  const [waJob, setWAJob] = useState(null);
  const [waHari, setWAHari] = useState('');
  const [waTanggal, setWATanggal] = useState('');
  const [waPukul, setWAPukul] = useState('');

  const downloadImage = (dataUrl, filename) => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (selectedJob && selectedJob.id) {
      setSelectedJobPhoto('');
      setSelectedJobKTP('');
      // Lazy-load photo from separate node
      const photoRef = ref(rtdb, `pekerjaan_photos/${selectedJob.id}/photoPengajuan`);
      onValue(photoRef, (snapshot) => {
        if (snapshot.exists()) {
          setSelectedJobPhoto(snapshot.val());
        }
      }, { onlyOnce: true });

      // Lazy-load foto KTP
      const ktpRef = ref(rtdb, `pekerjaan_photos/${selectedJob.id}/photoKTP`);
      onValue(ktpRef, (snapshot) => {
        if (snapshot.exists()) {
          setSelectedJobKTP(snapshot.val());
        }
      }, { onlyOnce: true });

      // Lazy-load foto Lokasi Usaha
      setSelectedJobLokasi('');
      const lokasiRef = ref(rtdb, `pekerjaan_photos/${selectedJob.id}/photoLokasiUsaha`);
      onValue(lokasiRef, (snapshot) => {
        if (snapshot.exists()) setSelectedJobLokasi(snapshot.val());
      }, { onlyOnce: true });

      // Lazy-load foto Kunjungan
      setSelectedJobKunjungan('');
      const kunjunganRef = ref(rtdb, `pekerjaan_photos/${selectedJob.id}/photoKunjungan`);
      onValue(kunjunganRef, (snapshot) => {
        if (snapshot.exists()) setSelectedJobKunjungan(snapshot.val());
      }, { onlyOnce: true });

      // Lazy-load halalData if not already present (stripped from list for performance)
      if (!selectedJob.halalData) {
        const halalRef = ref(rtdb, `pekerjaan/${selectedJob.id}/halalData`);
        onValue(halalRef, (snapshot) => {
          if (snapshot.exists()) {
            setSelectedJob(prev => prev && prev.id === selectedJob.id ? { ...prev, halalData: snapshot.val() } : prev);
          }
        }, { onlyOnce: true });
      }
    }
  }, [selectedJob?.id]);




  useEffect(() => {
    // Separate queries to avoid fetching all jobs (which contain heavy base64 images)
    const qProses = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Proses'));
    const qPending = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Pending'));
    const qReturned = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Returned'));

    let prosesData = {};
    let pendingData = {};
    let returnedData = {};

    const updateJobsList = () => {
      // Strip heavy halalData from list items — it's only needed in the detail modal
      // and will be loaded lazily from the separate path when needed
      const stripHeavy = (obj) => Object.values(obj).map(({ halalData, ...rest }) => rest);
      const combined = [...stripHeavy(prosesData), ...stripHeavy(pendingData), ...stripHeavy(returnedData)];
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
    if (!scheduleDate) {
      alert('Harap pilih tanggal kunjungan.');
      return;
    }
    try {
      await update(ref(rtdb, `pekerjaan/${selectedJob.id}`), {
        jadwalKunjungan: scheduleDate,
        status: 'Proses'
      });
      setShowSchedule(false);
      setSelectedJob(null);
    } catch (err) {
      alert('Gagal set jadwal');
    }
  };

  const handleSetVervalSchedule = async (e) => {
    e.preventDefault();
    if (!vervalScheduleDate) {
      alert('Harap pilih tanggal verval bahan.');
      return;
    }
    try {
      await update(ref(rtdb, `pekerjaan/${selectedJob.id}`), {
        jadwalVerval: vervalScheduleDate,
        status: 'Proses'
      });
      setShowVervalSchedule(false);
      setSelectedJob(null);
    } catch (err) {
      alert('Gagal set jadwal verval bahan');
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

  const handleDeleteVervalSchedule = async (jobId) => {
    if (window.confirm('Hapus jadwal Verval Bahan untuk pemohon ini?')) {
      try {
        await update(ref(rtdb, `pekerjaan/${jobId}`), {
          jadwalVerval: null
        });
      } catch (err) {
        console.error(err);
        alert('Gagal menghapus jadwal verval');
      }
    }
  };

  const handleToggleStatus = async (job) => {
    try {
      const newStatus = job.status === 'Proses' ? 'Pending' : 'Proses';
      await update(ref(rtdb, `pekerjaan/${job.id}`), {
        status: newStatus
      });
      addNotification('Perubahan Status', `Pekerjaan "${job.nama}" diubah menjadi ${newStatus}.`, 'movement');
      alert(`Status pekerjaan diubah menjadi: ${newStatus}`);
    } catch (err) {
      console.error(err);
      alert('Gagal mengubah status pekerjaan');
    }
  };

  const handleMigrateVerifikasi = async (job) => {
    if (window.confirm('Pindahkan data ini ke menu Verifikasi PU?')) {
      try {
        await update(ref(rtdb, `pekerjaan/${job.id}`), {
          status: 'Verifikasi PU'
        });
        addNotification('Pindah Verifikasi', `Data "${job.nama}" dipindahkan ke Verifikasi PU.`, 'movement');
        alert('Data berhasil dipindahkan ke menu Verifikasi PU');
      } catch (err) {
        console.error(err);
        alert('Gagal memindahkan data');
      }
    }
  };

  const handleCancelClick = (job) => {
    setJobToCancel(job);
    setCancelReason('');
    setShowCancelModal(true);
  };

  const handleSubmitCancel = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      alert('Harap isi alasan pembatalan');
      return;
    }
    try {
      await update(ref(rtdb, `pekerjaan/${jobToCancel.id}`), {
        status: 'Selesai',
        isCancelled: true,
        cancelReason: cancelReason,
        keterangan: `DIBATALKAN: ${cancelReason}`,
        verifiedAt: Date.now()
      });
      alert('Pekerjaan berhasil dibatalkan dan dipindahkan ke Riwayat Selesai.');
      setShowCancelModal(false);
      setJobToCancel(null);
      setCancelReason('');
    } catch (err) {
      console.error(err);
      alert('Gagal memproses pembatalan.');
    }
  };
  const handleKirimWA = (job, e) => {
    if (e) e.stopPropagation();
    setWAJob(job);
    setWAHari('');
    setWATanggal('');
    setWAPukul('');
    setShowWAModal(true);
  };

  const handleSendWA = (e) => {
    e.preventDefault();
    if (!waJob) return;
    const nama = waJob.nama || '-';
    const alamat = waJob.alamat || '-';
    const noWA = (waJob.wa || '').replace(/\D/g, '');
    if (!noWA) {
      alert('Nomor WhatsApp pelaku usaha tidak tersedia.');
      return;
    }
    const tanggalFormatted = waTanggal
      ? new Date(waTanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : waTanggal;
    const pukulFormatted = waPukul ? waPukul.replace(':', '.') + ' WIB' : waPukul;
    const pesan =
`Assalamu 'alaikum
Perkenalkan Bapak/Ibu Pelaku Usaha kami tim dari AKA BOGOR Kota Tanjungpinang , berdasarkan data yang sebelumnya sudah di input melalui Link kami di : https://s.id/reghalaltpi . dengan ini kami akan melakukan kunjungan untuk Verifikasi dan Pendataan Bahan yang digunakan dalam Proses Produksi Produk Bapak/Ibu.
Adapun jadwal kunjungan kami adalah pada :
Hari : ${waHari}
Tanggal : ${tanggalFormatted}
Pukul : ${pukulFormatted}
Demi mempermudah dalam kami melakukan kunjungan mohon konfirmasi data dibawah ini terlebih dahulu :
Nama Pelaku Usaha : ${nama}
Alamat : ${alamat}

Dalam kunjungan ini , ada beberapa hal yang perlu disiapkan pelaku usaha guna memperlancar dalam proses pendataan pendampingan proses produksi Bapak/Ibu . adapun hal-hal tersebut adalah :
1. Mempersiapkan semua bahan yang digunakan , tanpa terkecuali
2. Mempersiapkan catatan produksi yang di tulis secara rinci
3. Produk yang sudah siap untuk dipasarkan
4. KTP Pelaku Usaha 
5. NIB 

Demikian informasi ini kami sampaikan dan silahkan konfirmasi ulang apabila di Tanggal diatas bapak/ibu sedang tidak bisa kami kunjungi .

TIM AKA BOGOR KOTA TANJUNGPINANG`;
    const encoded = encodeURIComponent(pesan);
    window.open(`https://wa.me/${noWA}?text=${encoded}`, '_blank');
    setShowWAModal(false);
    setWAJob(null);
  };

  const handleEditAlamatClick = (job, e) => {
    if (e) e.stopPropagation();
    setEditAlamatJob(job);
    setNewAlamatUsaha(job.alamat || '');
    setShowEditAlamat(true);
  };

  const handleSaveAlamat = async (e) => {
    e.preventDefault();
    if (!newAlamatUsaha.trim()) {
      alert('Alamat tidak boleh kosong.');
      return;
    }
    try {
      await update(ref(rtdb, `pekerjaan/${editAlamatJob.id}`), {
        alamat: newAlamatUsaha.trim()
      });
      setJobs(prev => prev.map(j => j.id === editAlamatJob.id ? { ...j, alamat: newAlamatUsaha.trim() } : j));
      if (selectedJob && selectedJob.id === editAlamatJob.id) {
        setSelectedJob(prev => ({ ...prev, alamat: newAlamatUsaha.trim() }));
      }
      alert('Alamat Domisili berhasil diperbarui!');
      setShowEditAlamat(false);
      setEditAlamatJob(null);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan alamat.');
    }
  };

  const handleEditMapsClick = (e) => {
    if (e) e.stopPropagation();
    setNewLinkMaps(selectedJob.linkMaps || '');
    setShowEditMaps(true);
  };

  const handleSaveMaps = async (e) => {
    e.preventDefault();
    try {
      await update(ref(rtdb, `pekerjaan/${selectedJob.id}`), {
        linkMaps: newLinkMaps.trim()
      });
      setJobs(prev => prev.map(j => j.id === selectedJob.id ? { ...j, linkMaps: newLinkMaps.trim() } : j));
      setSelectedJob(prev => ({ ...prev, linkMaps: newLinkMaps.trim() }));
      alert('Link Maps berhasil diperbarui!');
      setShowEditMaps(false);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan link maps.');
    }
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

      {/* View-only banner for Admin */}
      {role === 'Admin' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderLeft: '4px solid #2563eb',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '1rem',
          fontSize: '0.88rem',
          color: '#1d4ed8',
          fontWeight: 500
        }}>
          <Info size={16} style={{ flexShrink: 0 }} />
          <span>Anda login sebagai <strong>Admin</strong> — halaman ini hanya dapat dilihat. Untuk mengubah data, gunakan akun Petugas atau Superadmin.</span>
        </div>
      )}

      <div className="stats-summary-grid">
        <div className="stat-summary-card glass-card">
          <div className="stat-summary-info">
            <span className="stat-summary-label">Total Data</span>
            <h2 className="stat-summary-value">{filteredJobs.length}</h2>
          </div>
          <div className="stat-summary-icon text-primary"><CheckCircle2 size={24} /></div>
        </div>
        <div className="stat-summary-card glass-card" style={{ borderLeftColor: '#f59e0b' }}>
          <div className="stat-summary-info">
            <span className="stat-summary-label">Proses</span>
            <h2 className="stat-summary-value">{filteredJobs.filter(j => j.status === 'Proses').length}</h2>
          </div>
          <div className="stat-summary-icon" style={{ color: '#f59e0b' }}><Play size={24} /></div>
        </div>
        <div className="stat-summary-card glass-card" style={{ borderLeftColor: '#6b7280' }}>
          <div className="stat-summary-info">
            <span className="stat-summary-label">Pending</span>
            <h2 className="stat-summary-value">{filteredJobs.filter(j => j.status === 'Pending').length}</h2>
          </div>
          <div className="stat-summary-icon" style={{ color: '#6b7280' }}><Clock size={24} /></div>
        </div>
        <div className="stat-summary-card glass-card" style={{ borderLeftColor: '#ef4444' }}>
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
            <div className="table-container desktop-only" style={{ overflowX: 'auto' }}>
              <table className="verification-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>Jadwal Kunjungan</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Informasi Pemohon</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Kelurahan</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Jenis &amp; Progres</th>
                    <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Status</th>
                    {role !== 'Admin' && <th style={{ padding: '12px 16px', borderBottom: '2px solid #f3f4f6', color: '#6b7280', fontWeight: '600', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em' }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedJobs.map((job) => (
                    <tr key={job.id} onClick={() => setSelectedJob(job)} className="table-row" style={{ transition: 'all 0.2s ease', borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {job.jadwalKunjungan && (
                          <div className="schedule-cell">
                            <small className="text-muted" style={{fontSize: '0.65rem', display: 'block', marginBottom: '2px', fontWeight: 'bold'}}>Kunjungan:</small>
                            <div className="date-time">
                              <span className="date">
                                {new Date(job.jadwalKunjungan).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="time">
                                {new Date(job.jadwalKunjungan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )}
                        {job.jadwalVerval && (
                          <div className="schedule-cell" style={{marginTop: job.jadwalKunjungan ? '8px' : '0'}}>
                            <small className="text-primary" style={{fontSize: '0.65rem', display: 'block', marginBottom: '2px', fontWeight: 'bold'}}>Verval Bahan:</small>
                            <div className="date-time">
                              <span className="date">
                                {new Date(job.jadwalVerval).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}
                              </span>
                              <span className="time" style={{color: '#8b5cf6'}}>
                                {new Date(job.jadwalVerval).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        )}
                        {!job.jadwalKunjungan && !job.jadwalVerval && (
                          <span className="text-muted italic">Belum diset</span>
                        )}
                      </td>
                      <td style={{ padding: '14px 16px', color: '#111827', fontSize: '0.875rem', fontWeight: '500', verticalAlign: 'middle' }}>
                        <div className="applicant-cell">
                          <span className="name">{job.nama}</span>
                          <span className="address"><MapPin size={10} /> {job.alamat}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                        <span className="kelurahan-badge">{job.kelurahan || '-'}</span>
                      </td>
                      <td style={{ padding: '14px 16px', color: '#4b5563', fontSize: '0.875rem', verticalAlign: 'middle' }}>
                        <div className="type-progress-cell">
                          <span className="job-type-small">{job.jenisPekerjaan}</span>
                          <div className="mini-progress">
                            <div className="mini-bar-bg"><div className="mini-bar-fill" style={{ width: `${job.progress}%` }}></div></div>
                            <span className="percent">{job.progress}%</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span className={`status-pill ${job.status === 'Returned' ? 'returned' : (job.jadwalVerval ? '' : (job.status === 'Pending' ? 'pending' : 'proses'))}`} style={job.jadwalVerval && job.status !== 'Returned' ? {backgroundColor: '#ede9fe', color: '#8b5cf6', border: '1px solid #c4b5fd'} : {}}>
                          {job.status === 'Returned' ? 'Perlu Perbaikan' : (job.jadwalVerval ? 'Verval Bahan' : job.status)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                        {role !== 'Admin' ? (
                          <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                            <button
                              className="btn-table-icon"
                              title="Kirim Undangan WhatsApp"
                              onClick={(e) => handleKirimWA(job, e)}
                              style={{ color: '#25D366' }}
                            >
                              <MessageSquare size={16} />
                            </button>
                            <button 
                              className={`btn-table-icon ${job.status === 'Proses' ? 'text-warning' : 'text-success'}`}
                              title={job.status === 'Proses' ? 'Tandai Pending (Menunggu)' : 'Mulai Kerjakan (Proses)'}
                              onClick={() => handleToggleStatus(job)}
                            >
                              {job.status === 'Proses' ? <Pause size={16} /> : <Play size={16} />}
                            </button>
                            <button className="btn-table-icon text-accent" title="Set Jadwal Kunjungan" onClick={() => { setSelectedJob(job); setShowSchedule(true); setScheduleDate(job.jadwalKunjungan || ''); }}>
                              <Calendar size={16} />
                            </button>
                            <button className="btn-table-icon" style={{ color: '#8b5cf6' }} title="Set Jadwal Verval Bahan" onClick={() => { setSelectedJob(job); setShowVervalSchedule(true); setVervalScheduleDate(job.jadwalVerval || ''); }}>
                              <ClipboardCheck size={16} />
                            </button>
                            {job.jadwalKunjungan && (
                              <button className="btn-table-icon text-danger" title="Hapus Jadwal Kunjungan" onClick={() => handleDeleteSchedule(job.id)}>
                                <CalendarX size={16} />
                              </button>
                            )}
                            {job.jadwalVerval && (
                              <button className="btn-table-icon" style={{ color: '#dc2626' }} title="Hapus Jadwal Verval Bahan" onClick={() => handleDeleteVervalSchedule(job.id)}>
                                <CalendarX size={16} />
                              </button>
                            )}
                            {job.jenisPekerjaan === 'Sertifikasi Halal' && (
                              <button className="btn-table-icon text-primary" title="Isi Form Halal" onClick={() => { setSelectedJob(job); setShowHalal(true); }}>
                                <FileText size={16} />
                              </button>
                            )}
                            <button
                              className="btn-table-icon"
                              title="Edit Alamat Lokasi Usaha"
                              onClick={(e) => handleEditAlamatClick(job, e)}
                              style={{ color: '#8b5cf6' }}
                            >
                              <Home size={16} />
                            </button>
                            <button className="btn-table-icon" title="Migrate to Verifikasi PU" onClick={() => handleMigrateVerifikasi(job)} style={{ color: '#3b82f6' }}>
                              <Send size={16} />
                            </button>
                            <button className="btn-table-icon" title="Detail" onClick={() => setSelectedJob(job)}>
                              <Info size={16} />
                            </button>
                            <button 
                              className="btn-table-icon text-danger" 
                              title="Batalkan Pekerjaan" 
                              onClick={() => handleCancelClick(job)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="table-actions" onClick={(e) => e.stopPropagation()}>
                            <button className="btn-table-icon" title="Lihat Detail" onClick={() => setSelectedJob(job)}>
                              <Info size={16} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Layout – premium design */}
            <div className="mobile-card-list mobile-only">
              {sortedJobs.map((job) => {
                const jadwal = job.jadwalKunjungan || job.jadwalVerval;
                const badgeClass = job.status === 'Returned' ? 'red' : job.jadwalVerval && job.status !== 'Returned' ? 'blue' : job.status === 'Pending' ? 'amber' : 'green';
                const badgeLabel = job.status === 'Returned' ? 'Perlu Perbaikan' : job.jadwalVerval && job.status !== 'Returned' ? 'Verval Bahan' : (job.status || 'Pending');
                return (
                  <div key={job.id} className="mobile-data-card" onClick={() => setSelectedJob(job)}>
                    {/* Date row */}
                    {jadwal && (
                      <div className="mobile-card-date">
                        {new Date(jadwal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        <span className="time">{new Date(jadwal).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    {/* Name */}
                    <div className="mobile-card-name">{job.nama}</div>
                    {/* Business / jenis */}
                    <div className="mobile-card-business">
                      <span style={{fontSize:'0.9rem'}}>🏪</span> {job.namaUsaha || job.jenisPekerjaan || '-'}
                    </div>
                    {/* Address */}
                    <div className="mobile-card-row">
                      <MapPin size={13} style={{color:'#94a3b8'}} />
                      <span>{job.alamat || '-'}</span>
                      {job.kontak && (
                        <span className="mobile-card-wa" style={{marginLeft:'auto'}}>💬 {job.kontak}</span>
                      )}
                    </div>
                    {/* Type + progress */}
                    <div className="mobile-card-row">
                      <span className="mobile-card-label">Jenis:</span>
                      <span>{job.jenisPekerjaan} – {job.progress}%</span>
                    </div>
                    {/* Footer */}
                    <div className="mobile-card-footer" onClick={e => e.stopPropagation()}>
                      <span className={`mobile-card-badge ${badgeClass}`}>{badgeLabel}</span>
                      <div style={{display:'flex', gap:'6px'}}>
                        {role !== 'Admin' && (
                          <>
                            <button
                              className="btn-table-icon"
                              title="Kirim Undangan WhatsApp"
                              onClick={(e) => handleKirimWA(job, e)}
                              style={{ color: '#25D366' }}
                            >
                              <MessageSquare size={15} />
                            </button>
                            <button className={`btn-table-icon ${job.status === 'Proses' ? 'text-warning' : 'text-success'}`} title={job.status === 'Proses' ? 'Pending' : 'Proses'} onClick={() => handleToggleStatus(job)}>
                              {job.status === 'Proses' ? <Pause size={15} /> : <Play size={15} />}
                            </button>
                            <button className="btn-table-icon text-accent" title="Jadwal" onClick={() => { setSelectedJob(job); setShowSchedule(true); setScheduleDate(job.jadwalKunjungan || ''); }}>
                              <Calendar size={15} />
                            </button>
                            <button className="btn-table-icon" style={{color:'#8b5cf6'}} title="Verval" onClick={() => { setSelectedJob(job); setShowVervalSchedule(true); setVervalScheduleDate(job.jadwalVerval || ''); }}>
                              <ClipboardCheck size={15} />
                            </button>
                            {job.jadwalVerval && (
                              <button className="btn-table-icon" style={{color:'#dc2626'}} title="Hapus Jadwal Verval" onClick={() => handleDeleteVervalSchedule(job.id)}>
                                <CalendarX size={15} />
                              </button>
                            )}
                            <button className="btn-table-icon text-danger" title="Batalkan" onClick={() => handleCancelClick(job)}>
                              <X size={15} />
                            </button>
                          </>
                        )}
                        <button className="btn-table-icon" title="Detail" onClick={() => setSelectedJob(job)}>
                          <Info size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {createPortal(
      <AnimatePresence>
        {selectedJob && !showHalal && (
          <div className="modal-overlay">
            <div className="modal-content glass-card halal-modal">
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
                          <a 
                            href={
                              (() => {
                                if (!selectedJob.wa) return '#';
                                const phone = selectedJob.wa.replace(/\D/g, '');
                                if (!phone) return '#';
                                
                                if (!selectedJob.jadwalKunjungan) return `https://wa.me/${phone}`;
                                
                                const dateObj = new Date(selectedJob.jadwalKunjungan);
                                const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][dateObj.getDay()];
                                const tanggal = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                const waktu = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                
                                const text = `Halo Bapak/Ibu ${selectedJob.nama},\nKami dari Pendamping Proses Produk Halal (P3H) Kota Tanjungpinang menginformasikan bahwa kami akan melakukan kunjungan lapangan untuk verifikasi dokumen dan lokasi usaha.\n\nKunjungan dijadwalkan pada:\nHari: ${hari}\nTanggal: ${tanggal}\nWaktu: ${waktu} WIB\n\nMohon dipersiapkan dokumen terkait (KTP, NIB, dll) dan kesediaan waktunya. Terima kasih.`;
                                return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
                              })()
                            } 
                            target="_blank" 
                            rel="noreferrer" 
                            className="action-btn wa-btn"
                            title="Kirim Undangan WA"
                          >
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
                          <label>Alamat Usaha & Lokasi Maps</label>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px' }}>
                            <p style={{ margin: 0 }}>{selectedJob.alamatUsaha}</p>
                            {selectedJob.linkMaps ? (
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'nowrap' }}>
                                <a 
                                  href={selectedJob.linkMaps} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, whiteSpace: 'nowrap', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}
                                >
                                  <Navigation size={16} /> Buka Navigasi
                                </a>
                                <button onClick={handleEditMapsClick} className="btn-icon" style={{ padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} title="Edit Tautan Lokasi"><Edit3 size={16} /></button>
                              </div>
                            ) : (
                              <button onClick={handleEditMapsClick} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '0.85rem', whiteSpace: 'nowrap', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px dashed #3b82f6', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>
                                <Map size={16} /> + Input Sharelokasi
                              </button>
                            )}
                          </div>
                        </div>
                        {(selectedJobPhoto || selectedJob.photoPengajuan) && (
                          <div className="info-item full">
                            <label>Foto Pengajuan</label>
                            <img src={selectedJobPhoto || selectedJob.photoPengajuan} alt="Pengajuan" className="detail-photo" style={{ marginBottom: '10px' }} />
                            <button
                              type="button"
                              onClick={() => downloadImage(selectedJobPhoto || selectedJob.photoPengajuan, `Produk_${selectedJob.nama || selectedJob.id}.jpg`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59,130,246,0.15)', border: '1px solid #3b82f6', color: '#3b82f6', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%', justifyContent: 'center' }}
                            >
                              <Download size={16} /> Download
                            </button>
                          </div>
                        )}

                        {selectedJobKTP && (
                          <div className="info-item full">
                            <label>Foto KTP Pelaku Usaha</label>
                            <img src={selectedJobKTP} alt="KTP" className="detail-photo" style={{ marginBottom: '10px' }} />
                            <button
                              type="button"
                              onClick={() => downloadImage(selectedJobKTP, `KTP_${selectedJob.nama || selectedJob.id}.jpg`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(16,185,129,0.15)', border: '1px solid #10b981', color: '#10b981', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%', justifyContent: 'center' }}
                            >
                              <Download size={16} /> Download Foto KTP
                            </button>
                          </div>
                        )}

                        {selectedJobLokasi && (
                          <div className="info-item full">
                            <label>Foto Lokasi Usaha</label>
                            <img src={selectedJobLokasi} alt="Lokasi" className="detail-photo" style={{ marginBottom: '10px' }} />
                            <button
                              type="button"
                              onClick={() => downloadImage(selectedJobLokasi, `Lokasi_${selectedJob.nama || selectedJob.id}.jpg`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.15)', border: '1px solid #f59e0b', color: '#f59e0b', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%', justifyContent: 'center' }}
                            >
                              <Download size={16} /> Download Foto Lokasi
                            </button>
                          </div>
                        )}

                        {selectedJobKunjungan && (
                          <div className="info-item full">
                            <label>Foto Kunjungan Pendampingan</label>
                            <img src={selectedJobKunjungan} alt="Kunjungan" className="detail-photo" style={{ marginBottom: '10px' }} />
                            <button
                              type="button"
                              onClick={() => downloadImage(selectedJobKunjungan, `Kunjungan_${selectedJob.nama || selectedJob.id}.jpg`)}
                              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(236,72,153,0.15)', border: '1px solid #ec4899', color: '#ec4899', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: '600', width: '100%', justifyContent: 'center' }}
                            >
                              <Download size={16} /> Download Foto Kunjungan
                            </button>
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
                    {role !== 'Admin' && (
                      <>
                        <button
                          onClick={(e) => { handleKirimWA(selectedJob, e); }}
                          className="btn-primary-outline"
                          style={{ borderColor: '#25D366', color: '#15803d', fontWeight: '700', background: 'rgba(37,211,102,0.08)' }}
                        >
                          <MessageSquare size={18} /> Kirim Undangan WA
                        </button>
                        {selectedJob.jenisPekerjaan === 'Sertifikasi Halal' && (
                          <button onClick={() => setShowHalal(true)} className="btn-primary-outline">
                            <FileText size={18} /> Isi Form Halal
                          </button>
                        )}
                        <button onClick={() => setEditMode(true)} className="btn-primary-filled">
                          <Edit3 size={18} /> Update Progres
                        </button>
                        <button 
                          onClick={() => { handleCancelClick(selectedJob); setSelectedJob(null); }} 
                          className="btn-danger-outline"
                        >
                          <X size={18} /> Batalkan Pekerjaan
                        </button>
                      </>
                    )}
                    {role === 'Admin' && (
                      <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: '#eff6ff',
                        border: '1px solid #bfdbfe',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        color: '#1d4ed8',
                        fontWeight: 500
                      }}>
                        <Info size={14} />
                        <span>Mode tampilan saja — Admin tidak dapat mengubah data ini.</span>
                      </div>
                    )}
                    <button 
                      onClick={() => setSelectedJob(null)} 
                      className="btn-secondary"
                      style={{ marginLeft: role === 'Admin' ? '0' : 'auto' }}
                    >
                      Tutup
                    </button>
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

            </div>
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

        {selectedJob && showVervalSchedule && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal-content glass-card" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Set Jadwal Verval Bahan</h2>
                <button onClick={() => { setShowVervalSchedule(false); setSelectedJob(null); }} className="btn-close"><X /></button>
              </div>
              <form onSubmit={handleSetVervalSchedule} className="edit-form">
                <div className="input-group">
                  <label>Tanggal & Waktu Verval</label>
                  <input type="datetime-local" value={vervalScheduleDate} onChange={(e) => setVervalScheduleDate(e.target.value)} required />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => { setShowVervalSchedule(false); setSelectedJob(null); }} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary">Simpan Jadwal</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showCancelModal && jobToCancel && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>Batalkan Pekerjaan</h2>
                <button onClick={() => { setShowCancelModal(false); setJobToCancel(null); }} className="btn-close"><X /></button>
              </div>
              <form onSubmit={handleSubmitCancel} className="edit-form">
                <div className="input-group">
                  <label>Alasan Pembatalan</label>
                  <textarea 
                    rows="3" 
                    placeholder="Masukkan alasan pembatalan pekerjaan..." 
                    value={cancelReason} 
                    onChange={(e) => setCancelReason(e.target.value)} 
                    required 
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => { setShowCancelModal(false); setJobToCancel(null); }} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary" style={{ backgroundColor: '#ef4444' }}>Simpan & Selesaikan</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {showEditAlamat && editAlamatJob && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="modal-content glass-card" style={{ maxWidth: '480px' }}>
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Home size={20} style={{ color: '#8b5cf6' }} />
                  <h2 style={{ margin: 0 }}>Edit Alamat Domisili</h2>
                </div>
                <button onClick={() => { setShowEditAlamat(false); setEditAlamatJob(null); }} className="btn-close"><X /></button>
              </div>
              <form onSubmit={handleSaveAlamat} className="edit-form" style={{ padding: '1.5rem' }}>
                <div style={{ marginBottom: '1rem', padding: '10px 14px', background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: '8px', fontSize: '0.88rem' }}>
                  <strong>{editAlamatJob.nama}</strong> — {editAlamatJob.jenisPekerjaan}
                </div>
                <div className="input-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} /> Alamat Domisili
                  </label>
                  <textarea
                    rows="3"
                    placeholder="Masukkan alamat domisili..."
                    value={newAlamatUsaha}
                    onChange={(e) => setNewAlamatUsaha(e.target.value)}
                    required
                    style={{ resize: 'vertical' }}
                  />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => { setShowEditAlamat(false); setEditAlamatJob(null); }} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                    <Save size={16} /> Simpan Alamat
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* WhatsApp Invitation Modal */}
        {showWAModal && waJob && (
          <div className="modal-overlay">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content glass-card"
              style={{ maxWidth: '500px' }}
            >
              <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <MessageSquare size={18} color="white" />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1rem' }}>Kirim Undangan WhatsApp</h2>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{waJob.nama}</p>
                  </div>
                </div>
                <button onClick={() => { setShowWAModal(false); setWAJob(null); }} className="btn-close"><X /></button>
              </div>

              <form onSubmit={handleSendWA} className="edit-form" style={{ padding: '1.5rem' }}>
                {/* Info pelaku usaha */}
                <div style={{ marginBottom: '1.25rem', padding: '12px 14px', background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.25)', borderRadius: '10px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '90px' }}>Pelaku Usaha</span>
                    <span style={{ fontWeight: 600 }}>: {waJob.nama || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '90px' }}>Alamat</span>
                    <span>: {waJob.alamat || '-'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: '90px' }}>No. WA</span>
                    <span style={{ color: '#25D366', fontWeight: 600 }}>: {waJob.wa || '-'}</span>
                  </div>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem', marginTop: 0 }}>
                  Isi jadwal kunjungan yang akan disertakan dalam pesan undangan:
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Hari</label>
                    <input
                      type="text"
                      placeholder="Contoh: Senin"
                      value={waHari}
                      onChange={(e) => setWAHari(e.target.value)}
                      required
                      list="hari-options-cek"
                    />
                    <datalist id="hari-options-cek">
                      {['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Ahad'].map(h => <option key={h} value={h} />)}
                    </datalist>
                  </div>
                  <div className="input-group" style={{ margin: 0 }}>
                    <label>Pukul</label>
                    <input
                      type="time"
                      value={waPukul}
                      onChange={(e) => setWAPukul(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="input-group">
                  <label>Tanggal</label>
                  <input
                    type="date"
                    value={waTanggal}
                    onChange={(e) => {
                      setWATanggal(e.target.value);
                      if (e.target.value) {
                        const d = new Date(e.target.value);
                        const hariNames = ['Ahad','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
                        setWAHari(hariNames[d.getDay()]);
                      }
                    }}
                    required
                  />
                </div>

                {/* Preview pesan */}
                {(waHari || waTanggal || waPukul) && (
                  <div style={{ marginTop: '0.5rem', padding: '12px 14px', background: 'rgba(0,0,0,0.15)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: '#25D366', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Preview Pesan:</span>
                    {`Assalamu 'alaikum\nPerkenalkan Bapak/Ibu Pelaku Usaha kami tim dari AKA BOGOR Kota Tanjungpinang...\nAdapun jadwal kunjungan kami adalah pada :\nHari : ${waHari || '...'}\nTanggal : ${waTanggal ? new Date(waTanggal).toLocaleDateString('id-ID', {day:'numeric',month:'long',year:'numeric'}) : '...'}\nPukul : ${waPukul ? waPukul.replace(':','.') + ' WIB' : '...'}`}
                  </div>
                )}

                <div className="modal-actions" style={{ marginTop: '1.25rem' }}>
                  <button type="button" onClick={() => { setShowWAModal(false); setWAJob(null); }} className="btn-secondary">Batal</button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)', border: 'none' }}
                  >
                    <MessageSquare size={16} /> Buka WhatsApp
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {showEditMaps && selectedJob && (
          <div className="modal-overlay">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="modal-content glass-card" style={{ maxWidth: '400px' }}>
              <div className="modal-header">
                <h2>{selectedJob.linkMaps ? 'Edit Tautan Maps' : 'Input Sharelokasi'}</h2>
                <button onClick={() => setShowEditMaps(false)} className="btn-close"><X /></button>
              </div>
              <form onSubmit={handleSaveMaps} style={{ padding: '20px' }}>
                <p className="text-muted mb-4" style={{ fontSize: '0.9rem' }}>
                  Masukkan tautan (link) Google Maps dari lokasi usaha yang dikirimkan oleh Pelaku Usaha.
                </p>
                <div className="input-group">
                  <label>Link Google Maps / Sharelokasi</label>
                  <textarea 
                    value={newLinkMaps} 
                    onChange={e => setNewLinkMaps(e.target.value)} 
                    placeholder="Contoh: https://maps.app.goo.gl/..."
                    rows="3"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-white"
                  ></textarea>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowEditMaps(false)} className="btn-secondary">Batal</button>
                  <button type="submit" className="btn-primary">Simpan Lokasi</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>,
      document.body
      )}


    </div>
  );
};

export default CekPekerjaan;
