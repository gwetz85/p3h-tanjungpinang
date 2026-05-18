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
    <div className="login-fullscreen">
      {/* Background Image is handled by CSS, but we can add an overlay here if needed */}
      <div className="simpu-overlay"></div>

      {/* Center Logo Area */}
      <div className="simpu-logo-container">
        <div className="simpu-logo-circle">
          <img src="/logo-p3h-transparent.png" alt="P3H Logo" />
        </div>
        <h1 className="simpu-title">P3H TPI</h1>
      </div>

      {/* Bottom Left Form Area */}
      <div className="simpu-form-container">
        <AnimatePresence mode="wait">
          {!isRegister ? (
            <motion.form 
              key="login"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin}
            >
              <div className="simpu-input-wrapper">
                <div className="simpu-input-icon">
                  <User size={18} />
                </div>
                <input 
                  type="email" 
                  placeholder="Email pengguna" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="simpu-input-wrapper">
                <div className="simpu-input-icon">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  placeholder="Kata sandi" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className="simpu-submit-btn" disabled={loading}>
                  {loading ? '...' : '→'}
                </button>
              </div>

              {error && <div className="simpu-error">{error}</div>}
              {success && <div className="simpu-success">{success}</div>}

              <div className="simpu-form-footer">
                <div className="footer-link" onClick={() => { setIsRegister(true); setError(''); setSuccess(''); }}>
                  BELUM PUNYA AKUN?<br/>DAFTAR
                </div>
              </div>
            </motion.form>

          ) : (
            <motion.form 
              key="register"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleRegister}
            >
              <div className="simpu-input-wrapper">
                <div className="simpu-input-icon">
                  <UserPlus size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Nama Lengkap" 
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  required
                />
              </div>

              <div className="simpu-input-wrapper">
                <div className="simpu-input-icon">
                  <Mail size={18} />
                </div>
                <input 
                  type="email" 
                  placeholder="Alamat Email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="simpu-input-wrapper">
                <div className="simpu-input-icon">
                  <Lock size={18} />
                </div>
                <input 
                  type="password" 
                  placeholder="Kata Sandi Baru" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button type="submit" className="simpu-submit-btn" disabled={loading}>
                  {loading ? '...' : '→'}
                </button>
              </div>

              {error && <div className="simpu-error">{error}</div>}

              <div className="simpu-form-footer">
                <div className="footer-link" onClick={() => { setIsRegister(false); setError(''); }}>
                  SUDAH PUNYA AKUN?<br/>MASUK
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Login;
