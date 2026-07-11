import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── WMO Weather code → label & condition ──────────────────────────────────
const getWeatherInfo = (code) => {
  if (code === 0) return { label: 'Cerah', condition: 'sunny' };
  if (code <= 3) return { label: 'Berawan', condition: 'cloudy' };
  if (code <= 48) return { label: 'Berkabut', condition: 'cloudy' };
  if (code <= 55) return { label: 'Gerimis', condition: 'rainy' };
  if (code <= 67) return { label: 'Hujan', condition: 'rainy' };
  if (code <= 77) return { label: 'Hujan Salju', condition: 'cloudy' };
  if (code <= 82) return { label: 'Hujan Lebat', condition: 'rainy' };
  if (code <= 86) return { label: 'Hujan Salju Lebat', condition: 'cloudy' };
  if (code <= 99) return { label: 'Petir & Badai', condition: 'stormy' };
  return { label: 'Tidak Diketahui', condition: 'cloudy' };
};

// ── Full Background Animations ────────────────────────────────────────

const SunnyBackground = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
    <motion.div
      style={{
        position: 'absolute',
        top: '-50px',
        right: '-50px',
        width: '300px',
        height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(253,224,71,0.4) 0%, rgba(253,224,71,0) 70%)',
      }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      style={{
        position: 'absolute',
        top: '20px',
        right: '40px',
        width: '100px',
        height: '100px',
        borderRadius: '50%',
        background: '#FBBF24',
        boxShadow: '0 0 40px #F59E0B',
      }}
      animate={{ rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
    />
  </div>
);

const CloudyBackground = () => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
    <motion.div
      animate={{ x: [0, -50, 0] }}
      transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', top: '10%', right: '10%', width: '150px', height: '60px', background: 'rgba(255,255,255,0.4)', borderRadius: '50px', filter: 'blur(8px)' }}
    />
    <motion.div
      animate={{ x: [0, 60, 0] }}
      transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', top: '40%', left: '5%', width: '200px', height: '80px', background: 'rgba(255,255,255,0.2)', borderRadius: '50px', filter: 'blur(12px)' }}
    />
    <motion.div
      animate={{ x: [0, -30, 0] }}
      transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      style={{ position: 'absolute', bottom: '10%', right: '30%', width: '120px', height: '50px', background: 'rgba(255,255,255,0.3)', borderRadius: '50px', filter: 'blur(10px)' }}
    />
  </div>
);

const RainyBackground = () => {
  const drops = Array.from({ length: 30 });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
      <CloudyBackground />
      {drops.map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${Math.random() * 100}%`,
            width: '2px',
            height: '20px',
            background: 'rgba(255,255,255,0.6)',
            borderRadius: '2px',
          }}
          animate={{ y: ['0vh', '300px'], opacity: [0, 1, 0] }}
          transition={{ duration: 0.7 + Math.random() * 0.3, repeat: Infinity, delay: Math.random(), ease: 'linear' }}
        />
      ))}
    </div>
  );
};

const StormyBackground = () => {
  const drops = Array.from({ length: 40 });
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0, background: 'rgba(0,0,0,0.3)' }}>
      <CloudyBackground />
      {/* Lightning Flash */}
      <motion.div
        style={{ position: 'absolute', inset: 0, background: 'white' }}
        animate={{ opacity: [0, 0, 0.8, 0, 0, 0, 0.5, 0] }}
        transition={{ duration: 5, repeat: Infinity, times: [0, 0.9, 0.92, 0.94, 0.95, 0.96, 0.98, 1] }}
      />
      {drops.map((_, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: `${Math.random() * 100}%`,
            width: '3px',
            height: '25px',
            background: 'rgba(255,255,255,0.8)',
            transform: 'rotate(15deg)'
          }}
          animate={{ y: ['0vh', '400px'], x: [0, -50], opacity: [0, 1, 0] }}
          transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: Math.random(), ease: 'linear' }}
        />
      ))}
    </div>
  );
};

const WeatherBackground = ({ condition }) => {
  if (condition === 'sunny')  return <SunnyBackground />;
  if (condition === 'rainy')  return <RainyBackground />;
  if (condition === 'stormy') return <StormyBackground />;
  return <CloudyBackground />;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15, scale: 0.95 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 100 } }
};

// ── Main component ─────────────────────────────────────────────────────────
const WeatherBanner = () => {
  const [weather, setWeather]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [today, setToday]         = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  // Tanjungpinang coordinates
  const LAT = 0.9177;
  const LON = 104.4525;

  const updateDate = () => {
    const now    = new Date();
    const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli',
                    'Agustus','September','Oktober','November','Desember'];
    setToday(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);
  };

  const fetchWeather = () => {
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=temperature_2m,weathercode,relative_humidity_2m,windspeed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=Asia%2FJakarta&forecast_days=1`
    )
      .then(r => r.json())
      .then(data => {
        const code = data.current.weathercode;
        const info = getWeatherInfo(code);
        setWeather({
          temp:      Math.round(data.current.temperature_2m),
          humidity:  data.current.relative_humidity_2m,
          wind:      Math.round(data.current.windspeed_10m),
          tempMax:   Math.round(data.daily.temperature_2m_max[0]),
          tempMin:   Math.round(data.daily.temperature_2m_min[0]),
          label:     info.label,
          condition: info.condition,
        });
        const now = new Date();
        const hh  = String(now.getHours()).padStart(2, '0');
        const mm  = String(now.getMinutes()).padStart(2, '0');
        setLastUpdated(`${hh}:${mm}`);
        setLoading(false);
      })
      .catch(() => {
        setWeather({ temp: '--', humidity: '--', wind: '--', tempMax: '--', tempMin: '--', label: 'Data Tidak Tersedia', condition: 'cloudy' });
        setLoading(false);
      });
  };

  useEffect(() => {
    updateDate();
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 5 * 60 * 1000);
    const dateInterval = setInterval(updateDate, 60 * 1000);
    return () => {
      clearInterval(weatherInterval);
      clearInterval(dateInterval);
    };
  }, []);

  const condition = weather?.condition || 'cloudy';
  
  const gradients = {
    sunny:  'linear-gradient(135deg, #38bdf8 0%, #1d4ed8 100%)',
    cloudy: 'linear-gradient(135deg, #64748b 0%, #334155 100%)',
    rainy:  'linear-gradient(135deg, #475569 0%, #1e3a8a 100%)',
    stormy: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: 'spring' }}
      style={{
        position: 'relative',
        background: gradients[condition],
        borderRadius: '24px',
        padding: '30px',
        color: 'white',
        overflow: 'hidden',
        boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '220px',
        border: '1px solid rgba(255,255,255,0.1)'
      }}
    >
      <WeatherBackground condition={condition} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        
        {/* Left Side */}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', opacity: 0.9, marginBottom: '8px', fontWeight: 500 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            Tanjungpinang, Kepulauan Riau
          </motion.div>
          
          <motion.div 
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.5px' }}
          >
            {today}
          </motion.div>

          {loading ? (
            <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.5 }} style={{ marginTop: '20px', fontSize: '1.1rem' }}>
              Mendeteksi kondisi cuaca...
            </motion.div>
          ) : (
            <motion.div 
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              style={{ marginTop: '25px', display: 'flex', alignItems: 'center', gap: '15px' }}
            >
              <div style={{ fontSize: '1.1rem', background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', backdropFilter: 'blur(5px)' }}>
                {weather.label}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                Diperbarui {lastUpdated}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Side (Temperature) */}
        {!loading && (
          <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}
          >
            <motion.div variants={itemVariants} style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1, letterSpacing: '-2px', textShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>
              {weather.temp}°
            </motion.div>
            
            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '15px', marginTop: '10px', fontSize: '1rem', fontWeight: 500, opacity: 0.9 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F87171" strokeWidth="3"><polyline points="18 15 12 9 6 15"/></svg>
                {weather.tempMax}°
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60A5FA" strokeWidth="3"><polyline points="6 9 12 15 18 9"/></svg>
                {weather.tempMin}°
              </span>
            </motion.div>

            <motion.div variants={itemVariants} style={{ display: 'flex', gap: '15px', marginTop: '15px', background: 'rgba(0,0,0,0.15)', padding: '10px 20px', borderRadius: '12px', backdropFilter: 'blur(5px)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>💧</span> {weather.humidity}%
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem' }}>💨</span> {weather.wind} km/j
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default WeatherBanner;
