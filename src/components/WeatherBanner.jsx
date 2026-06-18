import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

// ── WMO Weather code → label & condition ──────────────────────────────────
const getWeatherInfo = (code) => {
  if (code === 0) return { label: 'Cerah', condition: 'sunny' };
  if (code <= 3) return { label: 'Berawan Sebagian', condition: 'cloudy' };
  if (code <= 48) return { label: 'Berkabut', condition: 'cloudy' };
  if (code <= 55) return { label: 'Gerimis', condition: 'rainy' };
  if (code <= 67) return { label: 'Hujan', condition: 'rainy' };
  if (code <= 77) return { label: 'Hujan Salju', condition: 'cloudy' };
  if (code <= 82) return { label: 'Hujan Lebat', condition: 'rainy' };
  if (code <= 86) return { label: 'Hujan Salju Lebat', condition: 'cloudy' };
  if (code <= 99) return { label: 'Petir & Badai', condition: 'stormy' };
  return { label: 'Tidak Diketahui', condition: 'cloudy' };
};

// ── Animated weather illustrations ────────────────────────────────────────
const SunnyAnimation = () => (
  <svg viewBox="0 0 120 120" width="90" height="90" className="weather-anim-svg">
    {/* Rays */}
    {[0,45,90,135,180,225,270,315].map((deg, i) => (
      <motion.line
        key={i}
        x1="60" y1="60"
        x2={60 + Math.cos((deg * Math.PI) / 180) * 44}
        y2={60 + Math.sin((deg * Math.PI) / 180) * 44}
        stroke="#FCD34D" strokeWidth="3.5" strokeLinecap="round"
        animate={{ opacity: [1, 0.4, 1], scale: [1, 1.1, 1] }}
        transition={{ duration: 2, delay: i * 0.15, repeat: Infinity }}
      />
    ))}
    {/* Sun core */}
    <motion.circle
      cx="60" cy="60" r="22"
      fill="#FBBF24"
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
    />
    <circle cx="60" cy="60" r="16" fill="#FDE68A" opacity="0.7" />
  </svg>
);

const CloudyAnimation = () => (
  <svg viewBox="0 0 120 90" width="110" height="85" className="weather-anim-svg">
    {/* Back cloud */}
    <motion.g
      animate={{ x: [-4, 4, -4] }}
      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ellipse cx="75" cy="52" rx="32" ry="20" fill="#CBD5E1" />
      <ellipse cx="90" cy="44" rx="20" ry="16" fill="#CBD5E1" />
    </motion.g>
    {/* Front cloud */}
    <motion.g
      animate={{ x: [3, -3, 3] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
    >
      <ellipse cx="52" cy="58" rx="36" ry="22" fill="#E2E8F0" />
      <ellipse cx="38" cy="47" rx="22" ry="18" fill="#E2E8F0" />
      <ellipse cx="62" cy="44" rx="20" ry="16" fill="#E2E8F0" />
    </motion.g>
  </svg>
);

const RainyAnimation = () => {
  const drops = [10, 22, 34, 46, 58, 70, 82, 16, 28, 52, 64, 76];
  return (
    <svg viewBox="0 0 100 110" width="90" height="100" className="weather-anim-svg">
      {/* Cloud */}
      <motion.g animate={{ y: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity }}>
        <ellipse cx="50" cy="38" rx="36" ry="22" fill="#94A3B8" />
        <ellipse cx="34" cy="28" rx="20" ry="17" fill="#94A3B8" />
        <ellipse cx="62" cy="26" rx="18" ry="15" fill="#94A3B8" />
      </motion.g>
      {/* Raindrops */}
      {drops.map((x, i) => (
        <motion.line
          key={i} x1={x} y1={58 + (i % 3) * 6} x2={x - 4} y2={74 + (i % 3) * 6}
          stroke="#60A5FA" strokeWidth="2.2" strokeLinecap="round"
          animate={{ opacity: [0, 1, 0], y: [0, 14, 0] }}
          transition={{ duration: 0.9, delay: (i * 0.13) % 0.9, repeat: Infinity }}
        />
      ))}
    </svg>
  );
};

const StormyAnimation = () => {
  const drops = [12, 28, 44, 60, 76, 20, 36, 52, 68];
  return (
    <svg viewBox="0 0 100 120" width="90" height="110" className="weather-anim-svg">
      <motion.g animate={{ y: [-2, 2, -2] }} transition={{ duration: 3, repeat: Infinity }}>
        <ellipse cx="50" cy="36" rx="36" ry="22" fill="#64748B" />
        <ellipse cx="34" cy="26" rx="20" ry="17" fill="#64748B" />
        <ellipse cx="64" cy="24" rx="18" ry="15" fill="#64748B" />
      </motion.g>
      {drops.map((x, i) => (
        <motion.line
          key={i} x1={x} y1={56 + (i % 3) * 5} x2={x - 5} y2={70 + (i % 3) * 5}
          stroke="#93C5FD" strokeWidth="2" strokeLinecap="round"
          animate={{ opacity: [0, 1, 0], y: [0, 12, 0] }}
          transition={{ duration: 0.8, delay: (i * 0.11) % 0.8, repeat: Infinity }}
        />
      ))}
      {/* Lightning */}
      <motion.polyline
        points="55,60 48,78 54,78 46,98"
        fill="none" stroke="#FCD34D" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        animate={{ opacity: [0, 1, 0, 1, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.1, 0.3, 0.4, 1] }}
      />
    </svg>
  );
};

const WeatherAnim = ({ condition }) => {
  if (condition === 'sunny')  return <SunnyAnimation />;
  if (condition === 'rainy')  return <RainyAnimation />;
  if (condition === 'stormy') return <StormyAnimation />;
  return <CloudyAnimation />;
};

// ── Gradient presets per condition ────────────────────────────────────────
const gradients = {
  sunny:  'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
  cloudy: 'linear-gradient(135deg, #334155 0%, #475569 50%, #64748b 100%)',
  rainy:  'linear-gradient(135deg, #1e3a5f 0%, #1e4d8c 50%, #2563eb 100%)',
  stormy: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
};

// ── Main component ─────────────────────────────────────────────────────────
const WeatherBanner = () => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');

  useEffect(() => {
    // Format today's date in Indonesian
    const now = new Date();
    const days   = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    setToday(`${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`);

    // Tanjungpinang coordinates
    const lat  = 0.9177;   // 0°55'N
    const lon  = 104.4525; // 104°27'E

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,relative_humidity_2m,windspeed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min,weathercode` +
      `&timezone=Asia%2FJakarta&forecast_days=1`
    )
      .then(r => r.json())
      .then(data => {
        const code    = data.current.weathercode;
        const info    = getWeatherInfo(code);
        setWeather({
          temp:      Math.round(data.current.temperature_2m),
          humidity:  data.current.relative_humidity_2m,
          wind:      Math.round(data.current.windspeed_10m),
          tempMax:   Math.round(data.daily.temperature_2m_max[0]),
          tempMin:   Math.round(data.daily.temperature_2m_min[0]),
          label:     info.label,
          condition: info.condition,
        });
        setLoading(false);
      })
      .catch(() => {
        // Fallback if fetch fails
        setWeather({ temp: '--', humidity: '--', wind: '--', tempMax: '--', tempMin: '--', label: 'Data Tidak Tersedia', condition: 'cloudy' });
        setLoading(false);
      });
  }, []);

  const condition = weather?.condition || 'cloudy';
  const bg = gradients[condition];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="weather-banner"
      style={{ background: bg }}
    >
      {/* Left: text info */}
      <div className="weather-info">
        <div className="weather-city">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.85}}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          Tanjungpinang, Kepulauan Riau
        </div>
        <div className="weather-date">{today}</div>

        {loading ? (
          <div className="weather-loading">Memuat data cuaca...</div>
        ) : (
          <>
            <div className="weather-condition-label">{weather.label}</div>
            <div className="weather-temp-main">{weather.temp}°C</div>
            <div className="weather-temp-range">
              <span className="temp-high">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="18 15 12 9 6 15"/></svg>
                {weather.tempMax}°
              </span>
              <span className="temp-divider">|</span>
              <span className="temp-low">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
                {weather.tempMin}°
              </span>
            </div>
            <div className="weather-extra">
              <span>💧 {weather.humidity}%</span>
              <span>💨 {weather.wind} km/j</span>
            </div>
          </>
        )}
      </div>

      {/* Right: animation */}
      <div className="weather-anim-wrapper">
        {!loading && <WeatherAnim condition={condition} />}
      </div>
    </motion.div>
  );
};

export default WeatherBanner;
