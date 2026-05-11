import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Clock, Users } from 'lucide-react';

const Dashboard = () => {
  const { currentUser, role } = useAuth();
  const [counts, setCounts] = useState({ total: 0, proses: 0, selesai: 0, koordinator: 0 });

  useEffect(() => {
    // Count Jobs
    const jobsRef = ref(rtdb, 'pekerjaan');
    onValue(jobsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.values(data);
        setCounts(prev => ({
          ...prev,
          total: list.length,
          proses: list.filter(j => j.status === 'Proses').length,
          selesai: list.filter(j => j.status === 'Selesai').length
        }));
      }
    });

    // Count Coordinators
    const coordRef = ref(rtdb, 'koordinators');
    onValue(coordRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCounts(prev => ({ ...prev, koordinator: Object.keys(data).length }));
      }
    });
  }, []);

  const stats = [
    { title: 'Total Pekerjaan', value: counts.total, icon: Briefcase, color: '#6366f1' },
    { title: 'Sedang Proses', value: counts.proses, icon: Clock, color: '#f59e0b' },
    { title: 'Selesai', value: counts.selesai, icon: CheckCircle, color: '#10b981' },
    { title: 'Petugas', value: counts.koordinator, icon: Users, color: '#ec4899' },
  ];


  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="welcome-section">
        <h1 className="title-gradient">HALAL CENTRE TPI</h1>
        <p>Sistem Manajemen Sertifikasi Halal - Role: <strong>{role}</strong></p>
      </motion.div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} className="stat-card glass-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}><stat.icon size={24} /></div>
            <div className="stat-info"><h3>{stat.value}</h3><p>{stat.title}</p></div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
