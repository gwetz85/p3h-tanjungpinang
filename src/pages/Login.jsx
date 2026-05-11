import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, rtdb } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { ref, set, update } from 'firebase/database';
import { Lock, Mail, Award, User, ArrowLeft, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();
  const { sessionKicked, clearSessionKicked } = useAuth();

  // Show kicked message
  React.useEffect(() => {
    if (sessionKicked) {
      setError('Akun Anda telah login di perangkat lain. Sesi ini telah berakhir.');
      clearSessionKicked();
    }
  }, [sessionKicked]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Generate unique session ID for single-device enforcement
      const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
      sessionStorage.setItem('sessionId', sessionId);
      
      // Write session to RTDB
      await update(ref(rtdb, `users/${userCredential.user.uid}`), {
        activeSession: sessionId
      });
      
      navigate('/');
    } catch (err) {
      setError('Email atau Password salah. Pastikan akun sudah aktif.');
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save to RTDB
      await set(ref(rtdb, `users/${user.uid}`), {
        nama,
        email,
        role: 'Pending',
        createdAt: Date.now()
      });

      setSuccess('Pendaftaran berhasil! Silahkan hubungi Admin untuk aktivasi akun Anda.');
      setIsRegister(false);
      setLoading(false);
      // Reset fields
      setNama('');
      setPassword('');
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="mesh-background"></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-card-modern glass-card"
      >
        <div className="login-header-modern">
          <img src="/logo-p3h.png" alt="P3H Tanjungpinang" className="app-logo" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
          <h1 className="brand-name">P3H TANJUNGPINANG</h1>
          <p className="brand-tagline">Petugas Pendampingan Produk Halal</p>
        </div>

        <div className="form-container-modern">
          <AnimatePresence mode="wait">
            {!isRegister ? (
              <motion.form 
                key="login"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleLogin} 
                className="modern-form"
              >
                <div className="input-modern">
                  <input 
                    type="email" 
                    placeholder="Alamat Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-modern">
                  <input 
                    type="password" 
                    placeholder="Kata Sandi" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="error-modern">{error}</div>}
                {success && <div className="success-modern">{success}</div>}

                <button type="submit" className="btn-login-modern" disabled={loading}>
                  {loading ? '...' : 'Masuk'}
                </button>

                <div className="forgot-password">
                  <span>Lupa kata sandi?</span>
                </div>

                <div className="divider-modern">
                  <span>atau</span>
                </div>

                <div className="create-account-container">
                  <button type="button" className="btn-register-modern" onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}>
                    Buat Akun Baru
                  </button>
                </div>
              </motion.form>
            ) : (
              <motion.form 
                key="register"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                onSubmit={handleRegister} 
                className="modern-form"
              >
                <div className="register-header">
                  <h2>Daftar Akun</h2>
                  <p>Cepat dan mudah.</p>
                </div>

                <div className="input-modern">
                  <input 
                    type="text" 
                    placeholder="Nama Lengkap" 
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    required
                  />
                </div>

                <div className="input-modern">
                  <input 
                    type="email" 
                    placeholder="Alamat Email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="input-modern">
                  <input 
                    type="password" 
                    placeholder="Kata Sandi Baru" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                {error && <div className="error-modern">{error}</div>}

                <button type="submit" className="btn-register-submit" disabled={loading}>
                  {loading ? '...' : 'Daftar'}
                </button>

                <div className="back-to-login">
                  <span onClick={() => { setIsRegister(false); setError(''); }}>Sudah punya akun?</span>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className="login-footer-modern">
          <p>© 2026 TarunaBangsa Team</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
