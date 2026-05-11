import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { Search, CheckCircle2, Calendar, User, Briefcase } from 'lucide-react';

const Selesai = () => {
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

  const filteredJobs = completedJobs.filter(job => 
    job.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.jenisPekerjaan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient">Riwayat Selesai</h1>
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
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center">Memuat...</td></tr>
            ) : filteredJobs.length === 0 ? (
              <tr><td colSpan="5" className="text-center">Belum ada data.</td></tr>
            ) : (
              filteredJobs.map((job) => (
                <motion.tr key={job.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td>{new Date(job.tanggalInput).toLocaleDateString()}</td>
                  <td><span className="badge-type">{job.jenisPekerjaan}</span></td>
                  <td className="font-bold">{job.nama}</td>
                  <td><span className="badge-success"><CheckCircle2 size={14} /> Selesai</span></td>
                  <td className="text-muted">{job.keterangan || '-'}</td>
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
