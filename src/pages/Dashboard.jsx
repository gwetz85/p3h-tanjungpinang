import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { rtdb } from '../firebase';
import { ref, onValue, query, orderByChild, equalTo, limitToLast, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import WeatherBanner from '../components/WeatherBanner';
import { 
  Briefcase, 
  CheckCircle, 
  Clock, 
  Users, 
  Calendar, 
  MapPin, 
  User, 
  X, 
  MessageSquare, 
  Timer,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  ChevronRight,
  Shield
} from 'lucide-react';

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

// Zero-dependency responsive sparkline svg renderer
const Sparkline = ({ points, color }) => {
  const width = 80;
  const height = 30;
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg width={width} height={height} className="sparkline">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={coords}
      />
    </svg>
  );
};

const Dashboard = () => {
  const { currentUser, role, userData } = useAuth();
  const [counts, setCounts] = useState({ total: 0, proses: 0, selesai: 0, returned: 0, sihalal: 0, koordinator: 0 });
  const [upcomingVisits, setUpcomingVisits] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  useEffect(() => {
    // --- Lightweight parallel queries: only count records by status ---
    // Instead of fetching the ENTIRE pekerjaan node (with heavy halalData),
    // we fire separate small queries for each status.

    const unsubscribers = [];

    // Helper: lightweight count listener for a specific status
    const listenStatus = (status, callback) => {
      const q = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo(status));
      const unsub = onValue(q, (snapshot) => {
        const data = snapshot.val();
        const list = data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : [];
        // Strip heavy halalData from memory immediately — we only need metadata here
        const lightList = list.map(({ halalData, ...rest }) => rest);
        callback(lightList);
      }, (err) => { console.error(err); callback([]); });
      unsubscribers.push(unsub);
    };

    let prosesJobs = [];
    let pendingJobs = [];
    let returnedJobs = [];
    let selesaiCount = 0;
    let reviewJobs = [];
    let adminProcJobs = [];
    let perbaikanJobs = [];

    const refreshCounts = () => {
      const activeJobs = [...prosesJobs, ...pendingJobs, ...returnedJobs, ...reviewJobs, ...adminProcJobs];
      const total = activeJobs.length + selesaiCount;
      setCounts(prev => ({
        total,
        proses: prosesJobs.length,
        selesai: selesaiCount,
        returned: returnedJobs.length + pendingJobs.length,
        sihalal: reviewJobs.length + adminProcJobs.length,
        koordinator: prev.koordinator
      }));

      // Upcoming visits from active jobs (they are lightweight already)
      const now = new Date();
      const visitEvents = [];
      activeJobs.forEach(j => {
        if (j.jadwalKunjungan && new Date(j.jadwalKunjungan) >= now) {
          visitEvents.push({ ...j, visitType: 'Kunjungan', time: j.jadwalKunjungan });
        }
        if (j.jadwalVerval && new Date(j.jadwalVerval) >= now) {
          visitEvents.push({ ...j, visitType: 'Verval Bahan', time: j.jadwalVerval });
        }
      });

        perbaikanJobs.forEach(j => {
          if (j.jadwalKunjungan && new Date(j.jadwalKunjungan) >= now) {
            visitEvents.push({
              ...j,
              nama: j.namaPelaku,
              visitType: 'Perbaikan Akun',
              time: j.jadwalKunjungan,
              jenisPekerjaan: 'Perbaikan Akun',
              kelurahan: j.alamat,
              // Include WhatsApp contact and keterangan for widget display
              kontak: j.kontak,
              wa: j.kontak,
              keterangan: j.keterangan
            });
          }
        });

      const visits = visitEvents
        .sort((a, b) => new Date(a.time) - new Date(b.time))
        .slice(0, 4);
      setUpcomingVisits(visits);

      // Recent activities from active jobs
      const activities = activeJobs
        .filter(j => j.tanggalInput)
        .sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0))
        .slice(0, 5);
      setRecentActivities(activities);

      setIsLoading(false);
    };

    const checkAndAutoUpdatePendingJobs = (pendingList) => {
      if (!['superadmin', 'Admin'].includes(role)) return; // Only let admins trigger the auto-update to avoid multiple clients racing
      
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const today = `${year}-${month}-${day}`;

      pendingList.forEach(job => {
        if (job.jadwalKunjungan && job.jadwalKunjungan <= today) {
          update(ref(rtdb, `pekerjaan/${job.id}`), {
            status: 'Proses'
          }).catch(console.error);
        }
      });
    };

    listenStatus('Proses', (list) => { prosesJobs = list; refreshCounts(); });
    listenStatus('Pending', (list) => { 
      pendingJobs = list; 
      refreshCounts(); 
      checkAndAutoUpdatePendingJobs(list);
    });
    listenStatus('Returned', (list) => { returnedJobs = list; refreshCounts(); });
    listenStatus('Review', (list) => { reviewJobs = list; refreshCounts(); });
    listenStatus('AdminProcessing', (list) => { adminProcJobs = list; refreshCounts(); });

    const unsubPerbaikan = onValue(ref(rtdb, 'perbaikan_akun'), (snapshot) => {
      const data = snapshot.val();
      if (data) {
        perbaikanJobs = Object.keys(data).map(k => ({ id: k, ...data[k] })).filter(j => j.status === 'Proses');
      } else {
        perbaikanJobs = [];
      }
      refreshCounts();
    }, (err) => { console.error(err); });
    unsubscribers.push(unsubPerbaikan);

    // For "Selesai", we only need the count — use limitToLast(1) just to check existence,
    // but to get accurate count we listen to the full selesai set (metadata only, no halalData needed in display)
    const qSelesai = query(ref(rtdb, 'pekerjaan'), orderByChild('status'), equalTo('Selesai'));
    const unsubSelesai = onValue(qSelesai, (snapshot) => {
      selesaiCount = snapshot.exists() ? Object.keys(snapshot.val()).length : 0;
      refreshCounts();
    }, (err) => { console.error(err); });
    unsubscribers.push(unsubSelesai);

    // Count Coordinators (already lightweight)
    const coordRef = ref(rtdb, 'koordinators');
    const unsubscribeCoords = onValue(coordRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setCounts(prev => ({ ...prev, koordinator: Object.keys(data).length }));
      }
    });
    unsubscribers.push(unsubscribeCoords);

    return () => unsubscribers.forEach(fn => fn());
  }, []);

  if (isLoading) {
    return (
      <div className="page-container skeleton-pulse">
        {/* Skeleton Header */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ width: '220px', height: '36px' }}></div>
          <div className="skeleton" style={{ width: '380px', height: '18px' }}></div>
        </div>

        {/* Skeleton Stat Cards */}
        <div className="stats-grid">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="stat-card glass-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1px solid #f1f5f9' }}>
              <div className="skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px' }}></div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
                <div className="skeleton" style={{ width: '60px', height: '26px' }}></div>
                <div className="skeleton" style={{ width: '120px', height: '12px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Grid */}
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div className="glass-card" style={{ height: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ width: '180px', height: '24px' }}></div>
            <div className="skeleton" style={{ flex: 1, width: '100%', borderRadius: '8px' }}></div>
          </div>
          <div className="glass-card" style={{ height: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="skeleton" style={{ width: '150px', height: '24px' }}></div>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="skeleton" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div className="skeleton" style={{ width: '120px', height: '14px' }}></div>
                  <div className="skeleton" style={{ width: '80px', height: '10px' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Sparkline data
  const totalTrend = [counts.total * 0.7, counts.total * 0.8, counts.total * 0.75, counts.total * 0.9, counts.total * 0.88, counts.total];
  const prosesTrend = [counts.proses * 0.5, counts.proses * 0.7, counts.proses * 0.6, counts.proses * 0.8, counts.proses * 0.85, counts.proses];
  const returnedTrend = [counts.returned * 1.3, counts.returned * 1.1, counts.returned * 1.2, counts.returned * 0.9, counts.returned * 0.8, counts.returned];
  const sihalalTrend = [counts.sihalal * 0.6, counts.sihalal * 0.7, counts.sihalal * 0.65, counts.sihalal * 0.8, counts.sihalal * 0.9, counts.sihalal];
  const selesaiTrend = [counts.selesai * 0.4, counts.selesai * 0.55, counts.selesai * 0.68, counts.selesai * 0.75, counts.selesai * 0.9, counts.selesai];

  const stats = [
    { 
      title: 'Total Pekerjaan', 
      value: counts.total, 
      icon: Briefcase, 
      color: '#2563eb', 
      bg: '#eff6ff', 
      trend: '+8.2%', 
      isUp: true,
      points: totalTrend
    },
    { 
      title: 'PENDING', 
      value: counts.returned, 
      icon: AlertCircle, 
      color: '#ef4444', 
      bg: '#fef2f2', 
      trend: '-12.5%', 
      isUp: false,
      points: returnedTrend
    },
    { 
      title: 'Proses', 
      value: counts.proses, 
      icon: Clock, 
      color: '#f59e0b', 
      bg: '#fffbeb', 
      trend: '+4.1%', 
      isUp: true,
      points: prosesTrend
    },
    { 
      title: 'Sihalal', 
      value: counts.sihalal, 
      icon: Shield, 
      color: '#7c3aed', 
      bg: '#f5f3ff', 
      trend: '+6.8%', 
      isUp: true,
      points: sihalalTrend
    },
    { 
      title: 'Selesai', 
      value: counts.selesai, 
      icon: CheckCircle, 
      color: '#10b981', 
      bg: '#f0fdf4', 
      trend: '+15.3%', 
      isUp: true,
      points: selesaiTrend
    },
  ];

  // SVG Chart Calculation
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
  const chartWidth = 440;
  const chartHeight = 150;
  const maxVal = Math.max(counts.total, counts.proses, counts.returned, counts.selesai, 10);

  const getCoordinates = (points) => {
    return points.map((p, i) => {
      const x = 40 + i * (chartWidth / 5);
      const y = 170 - (p / maxVal) * chartHeight;
      return { x, y, val: Math.round(p) };
    });
  };

  const seriesData = [
    { name: 'Total Data', coords: getCoordinates(totalTrend), color: '#2563eb' },
    { name: 'Sedang Proses', coords: getCoordinates(prosesTrend), color: '#f59e0b' },
    { name: 'Perlu Perbaikan', coords: getCoordinates(returnedTrend), color: '#ef4444' },
    { name: 'Selesai', coords: getCoordinates(selesaiTrend), color: '#10b981' },
  ];

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'Selesai': return 'badge-selesai';
      case 'Proses': return 'badge-proses';
      case 'Returned':
      case 'Pending':
        return 'badge-returned';
      default: return 'badge-baru';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Selesai': return 'Selesai';
      case 'Proses': return 'Proses';
      case 'Returned': return 'Kembali';
      case 'Pending': return 'Pending';
      default: return 'Review';
    }
  };

  return (
    <div className="page-container">
      {/* Weather Banner */}
      <WeatherBanner />

      {/* 4 Stats Cards */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <motion.div 
            key={index} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: index * 0.05 }} 
            className="stat-card glass-card"
          >
            <div className="stat-card-top">
              <div className="stat-icon-wrapper" style={{ backgroundColor: stat.bg, color: stat.color }}>
                <stat.icon size={22} />
              </div>
              <Sparkline points={stat.points} color={stat.color} />
            </div>
            
            <div className="stat-card-bottom">
              <div className="stat-card-info">
                <span className="stat-card-title">{stat.title}</span>
                <h2 className="stat-card-value">{stat.value}</h2>
              </div>
              
              <div className={`stat-card-trend ${stat.isUp ? 'trend-up' : 'trend-down'}`}>
                {stat.isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                <span>{stat.trend}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Dashboard Visual Grid */}
      <div className="dashboard-grid">
        {/* Ringkasan Data SVG Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }} 
          className="dashboard-card glass-card chart-container-card"
        >
          <div className="card-header-row">
            <div className="card-header-left">
              <Activity size={18} className="text-primary" />
              <h3>Ringkasan Data</h3>
            </div>
            {/* Legend */}
            <div className="chart-legend">
              {seriesData.map((s, idx) => (
                <div key={idx} className="legend-item">
                  <span className="legend-dot" style={{ backgroundColor: s.color }}></span>
                  <span className="legend-label">{s.name}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="svg-chart-wrapper">
            <svg viewBox="0 0 500 200" width="100%" height="100%">
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                const y = 20 + r * chartHeight;
                return (
                  <g key={idx}>
                    <line 
                      x1="40" 
                      y1={y} 
                      x2="480" 
                      y2={y} 
                      stroke="#f1f5f9" 
                      strokeWidth="1" 
                    />
                    <text 
                      x="30" 
                      y={y + 4} 
                      fill="#94a3b8" 
                      fontSize="9" 
                      textAnchor="end"
                    >
                      {Math.round(maxVal * (1 - r))}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {months.map((m, idx) => {
                const x = 40 + idx * (chartWidth / 5);
                return (
                  <text 
                    key={idx} 
                    x={x} 
                    y="190" 
                    fill="#94a3b8" 
                    fontSize="10" 
                    textAnchor="middle"
                  >
                    {m}
                  </text>
                );
              })}

              {/* Line Series */}
              {seriesData.map((s, sIdx) => {
                const pointsStr = s.coords.map(c => `${c.x},${c.y}`).join(' ');
                return (
                  <g key={sIdx}>
                    <path
                      d={`M ${pointsStr}`}
                      fill="none"
                      stroke={s.color}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Interactive Point Dots */}
                    {s.coords.map((c, cIdx) => (
                      <circle
                        key={cIdx}
                        cx={c.x}
                        cy={c.y}
                        r={hoveredIndex?.series === sIdx && hoveredIndex?.point === cIdx ? 5 : 3.5}
                        fill={s.color}
                        stroke="#ffffff"
                        strokeWidth="2"
                        style={{ cursor: 'pointer', transition: 'all 0.15s' }}
                        onMouseEnter={() => setHoveredIndex({ series: sIdx, point: cIdx, x: c.x, y: c.y, val: c.val, label: s.name })}
                        onMouseLeave={() => setHoveredIndex(null)}
                      />
                    ))}
                  </g>
                );
              })}
            </svg>

            {/* Interactive Custom HTML Tooltip inside Wrapper */}
            {hoveredIndex && (
              <div 
                className="chart-tooltip"
                style={{
                  position: 'absolute',
                  left: `${(hoveredIndex.x / 500) * 100}%`,
                  top: `${(hoveredIndex.y / 200) * 100 - 15}%`,
                  transform: 'translate(-50%, -100%)',
                }}
              >
                <span className="tooltip-label">{hoveredIndex.label}</span>
                <span className="tooltip-value">{hoveredIndex.val}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Aktivitas Terbaru Feed Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.3 }} 
          className="dashboard-card glass-card activity-container-card"
        >
          <div className="card-header-row">
            <div className="card-header-left">
              <Clock size={18} className="text-primary" />
              <h3>Aktivitas Terbaru</h3>
            </div>
          </div>

          <div className="activity-feed">
            {recentActivities.length === 0 ? (
              <div className="empty-state">
                <p>Belum ada aktivitas terekam.</p>
              </div>
            ) : (
              recentActivities.map((act, idx) => (
                <div key={idx} className="activity-item">
                  <div className="activity-left">
                    <div className="activity-bullet"></div>
                    <div className="activity-main-info">
                      <h4>{act.nama}</h4>
                      {act.namaUsaha && (
                        <span style={{ fontSize: '0.74rem', color: '#2563eb', fontWeight: 600 }}>🏪 {act.namaUsaha}</span>
                      )}
                      <p>{act.jenisPekerjaan} • {act.kelurahan || 'Tanjungpinang'}</p>
                    </div>
                  </div>
                  <div className="activity-right">
                    <span className={`status-badge-modern ${getStatusBadgeClass(act.status)}`}>
                      {getStatusText(act.status)}
                    </span>
                    <span className="activity-time-diff">
                      {new Date(act.tanggalInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>

      {/* Kunjungan Mendatang Section */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="upcoming-section glass-card" style={{ marginTop: '1.5rem' }}>
        <div className="section-header">
          <Calendar className="text-primary" size={20} />
          <h2>Kunjungan Terjadwal Mendatang</h2>
        </div>
        
        <div className="visits-list">
          {upcomingVisits.length === 0 ? (
            <p className="text-muted" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada kunjungan terjadwal dalam waktu dekat.</p>
          ) : (
            upcomingVisits.map((visit, idx) => (
              <div 
                key={idx} 
                className="visit-card-compact" 
                onClick={() => setSelectedVisit(visit)}
                style={{ cursor: 'pointer' }}
              >
                <div className="visit-time">
                  <span className="date">{new Date(visit.time).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  <span className="hour">{new Date(visit.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="visit-details">
                  <h4>{visit.nama}</h4>
                  {visit.namaUsaha && (
                    <p style={{ margin: '2px 0 4px', fontSize: '0.78rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      🏪 {visit.namaUsaha}
                    </p>
                  )}
                  <div className="visit-meta">
                     <span><User size={13} /> {visit.jenisPekerjaan}</span>
                     <span><MapPin size={13} /> {visit.kelurahan || 'Tanjungpinang'}</span>
                  </div>
                </div>
                <div className="visit-badge-container">
                   <div className={`visit-badge ${visit.visitType === 'Verval Bahan' ? '' : (visit.visitType === 'Perbaikan Akun' ? 'danger' : 'urgent')}`} style={visit.visitType === 'Verval Bahan' ? {backgroundColor: '#8b5cf6', color: 'white'} : (visit.visitType === 'Perbaikan Akun' ? {backgroundColor: '#ef4444', color: 'white'} : {})}>
                     {visit.visitType}
                   </div>
                   {visit.keterangan && (
                     <div className="visit-keterangan" style={{ marginTop: '4px', fontSize: '0.78rem', color: '#64748b', whiteSpace: 'pre-wrap', maxHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                       {visit.keterangan}
                     </div>
                   )}
                  <div className="visit-countdown">
                    <Clock size={11} />
                    <CountdownTimer targetDate={visit.time} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </motion.div>

      {/* Selected Visit Detail Modal */}
      <AnimatePresence>
        {selectedVisit && (
          <div className="modal-overlay" onClick={() => setSelectedVisit(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="modal-content glass-card"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '580px', padding: '2rem' }}
            >
              <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Detail Pelaku Usaha</h2>
                <button 
                  onClick={() => setSelectedVisit(null)} 
                  className="btn-close" 
                  style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div className="job-detail-modern">
                <div className="detail-header-section" style={{ textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <h2 style={{ margin: '0', fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>{selectedVisit.nama}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge-type-large" style={{ background: '#eff6ff', color: '#2563eb', padding: '6px 12px', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 600, display: 'inline-block' }}>{selectedVisit.jenisPekerjaan}</span>
                    {(selectedVisit.time || selectedVisit.jadwalKunjungan || selectedVisit.jadwalVerval) && (
                      <div className="countdown-badge" style={{ position: 'static', margin: 0, boxShadow: 'none', border: '1px solid #fef3c7', background: '#fffbeb', color: '#d97706' }}>
                        <Timer size={13} />
                        <CountdownTimer targetDate={selectedVisit.time || selectedVisit.jadwalKunjungan || selectedVisit.jadwalVerval} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-info-grid" style={{ textAlign: 'left' }}>
                  <div className="info-item">
                    <label>Nama Pelaku Usaha</label>
                    <p>{selectedVisit.nama}</p>
                  </div>
                  
                  <div className="info-item">
                    <label>Kontak WhatsApp</label>
                     <div className="whatsapp-link-container">
                       <p>{selectedVisit.kontak || selectedVisit.wa || '-'}</p>
                       {(selectedVisit.kontak || selectedVisit.wa) && (
                         <a
                           href={`https://wa.me/${(selectedVisit.kontak || selectedVisit.wa).replace(/\D/g, '')}`}
                           target="_blank"
                           rel="noreferrer"
                           className="wa-btn"
                         >
                           <MessageSquare size={14} />
                         </a>
                       )}
                     </div>
                  </div>

                  <div className="info-item full">
                     <label>Alamat Domisili</label>
                     <p>{selectedVisit.alamat || '-'}</p>
                   </div>

                   {/* Nama Petugas */}
                   <div className="info-item">
                     <label>Nama Petugas</label>
                     <p>{selectedVisit.namaPetugas || '-'} </p>
                   </div>

                   {selectedVisit.alamatUsaha && (
                    <div className="info-item full">
                      <label>Alamat Usaha / Lokasi Produksi</label>
                      <p>{selectedVisit.alamatUsaha || '-'}</p>
                    </div>
                  )}

                  {selectedVisit.jadwalKunjungan && (
                    <div className="info-item full">
                      <label>Jadwal Kunjungan Lapangan</label>
                      <p className="primary-text">
                        <Calendar size={15} />
                        {new Date(selectedVisit.jadwalKunjungan).toLocaleString('id-ID', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  {selectedVisit.jadwalVerval && (
                    <div className="info-item full">
                      <label>Jadwal Verval Bahan</label>
                      <p className="primary-text" style={{color: '#8b5cf6'}}>
                        <Calendar size={15} />
                        {new Date(selectedVisit.jadwalVerval).toLocaleString('id-ID', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  )}

                  <div className="info-item">
                    <label>Tanggal Registrasi</label>
                    <p>
                      {selectedVisit.tanggalInput 
                        ? new Date(selectedVisit.tanggalInput).toLocaleString('id-ID', { 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) 
                        : '-'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.25rem' }}>
                  <button 
                    onClick={() => setSelectedVisit(null)} 
                    className="btn-primary"
                    style={{ padding: '10px 24px', borderRadius: '8px' }}
                  >
                    Tutup Detail
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
