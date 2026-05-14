import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, update } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Calendar, User, Briefcase, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Selesai = () => {
  const { currentUser } = useAuth();
  const isSuperAdmin = currentUser?.email === 'admin@tarunabangsa.id';
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const jobsRef = ref(rtdb, 'pekerjaan');
    const unsubscribe = onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data)
          .map(key => ({ id: key, ...data[key] }))
          .filter(job => job.status === 'Selesai');
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

      <div className="table-container glass-card">
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
                  <td><span className="badge-success"><CheckCircle2 size={14} /> Selesai</span></td>
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
    </div>
  );
};

export default Selesai;
