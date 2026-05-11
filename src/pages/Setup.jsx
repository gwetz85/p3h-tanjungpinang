import React, { useState } from 'react';
import { auth, rtdb } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { ref, set } from 'firebase/database';
import { motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';

const Setup = () => {
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const createAdmin = async () => {
    setLoading(true);
    setStatus('Sedang memproses...');
    
    const email = 'admin@tarunabangsa.id';
    const password = 'Tanjungpinang';

    try {
      let user;
      try {
        // 1. Coba buat user baru
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          // 2. Jika sudah ada, login dulu untuk ambil UID
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          user = userCredential.user;
        } else {
          throw err;
        }
      }

      // 3. Simpan/Update Role di RTDB
      await set(ref(rtdb, 'users/' + user.uid), {
        username: 'HalalCentreTPI',
        email: email,
        role: 'Admin',
        updatedAt: Date.now()
      });


      setStatus('✅ Akun Admin Berhasil Disinkronkan ke RTDB! Anda sekarang bisa login.');
    } catch (error) {
      console.error(error);
      setStatus('❌ Gagal: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="setup-page">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="setup-card glass-card">
        <ShieldAlert size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
        <h1>HALAL CENTRE TPI - Setup</h1>
        <p>Klik tombol di bawah untuk sinkronisasi akun Admin utama.</p>
        <button onClick={createAdmin} className="btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
          {loading ? 'Processing...' : 'Sinkronkan Akun Admin'}
        </button>
        {status && <div className="status-message">{status}</div>}
        <a href="/login" className="back-link">Ke Halaman Login</a>
      </motion.div>
    </div>
  );
};

export default Setup;
