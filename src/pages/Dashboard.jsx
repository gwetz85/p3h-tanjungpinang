import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { motion } from 'framer-motion';
import { Briefcase, CheckCircle, Clock, Users, Calendar, MapPin, User } from 'lucide-react';

const CountdownTimer = ({ targetDate }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate) - new Date();
      if (difference <= 0) {
        return 'Mulai...';
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      if (days > 0) {
        return `${days} Hari ${hours} Jam`;
      }
      
      const pad = (num) => String(num).padStart(2, '0');
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
};

const Dashboard = () => {
  const { currentUser, role } = useAuth();
  const [counts, setCounts] = useState({ total: 0, proses: 0, selesai: 0, koordinator: 0 });
  const [upcomingVisits, setUpcomingVisits] = useState([]);

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

        // Filter and sort upcoming visits
        const now = new Date();
        const visits = list
          .filter(j => j.jadwalKunjungan && new Date(j.jadwalKunjungan) >= now)
          .sort((a, b) => new Date(a.jadwalKunjungan) - new Date(b.jadwalKunjungan))
          .slice(0, 5); // Show top 5
        setUpcomingVisits(visits);
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

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="upcoming-section glass-card">
        <div className="section-header">
          <Calendar className="text-primary" size={24} />
          <h2>Kunjungan Mendatang</h2>
        </div>
        
        <div className="visits-list">
          {upcomingVisits.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada kunjungan terjadwal dalam waktu dekat.</p>
          ) : (
            upcomingVisits.map((visit, idx) => (
              <div key={idx} className="visit-card-compact">
                <div className="visit-time">
                  <span className="date">{new Date(visit.jadwalKunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span className="hour">{new Date(visit.jadwalKunjungan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="visit-details">
                  <h4>{visit.nama}</h4>
                  <div className="visit-meta">
                    <span><User size={14} /> {visit.jenisPekerjaan}</span>
                    <span><MapPin size={14} /> {visit.kelurahan || 'Tanjungpinang'}</span>
                  </div>
                </div>
                <div className="visit-badge-container">
                  <div className="visit-badge urgent">
                    Upcoming
                  </div>
                  <div className="visit-countdown">
                    <Clock size={12} />
                    <CountdownTimer targetDate={visit.jadwalKunjungan} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
