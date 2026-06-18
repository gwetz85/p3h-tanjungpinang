import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, set, onValue } from 'firebase/database';
import { useAuth } from '../context/AuthContext';
import { X } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * PopoutSettings – Admin UI for Superadmin (admin@tarunabangsa.id) to configure the login pop‑out.
 * Accessible only to users with role "superadmin". The settings are stored under the
 * `popoutInfo` node in Firebase Realtime Database.
 */
const PopoutSettings = () => {
  const { currentUser, role } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  // Load existing data once
  useEffect(() => {
    const infoRef = ref(rtdb, 'popoutInfo');
    const unsub = onValue(infoRef, snapshot => {
      const data = snapshot.val();
      if (data) {
        setTitle(data.title ?? '');
        setContent(data.content ?? '');
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSave = async e => {
    e.preventDefault();
    const infoRef = ref(rtdb, 'popoutInfo');
    await set(infoRef, { title, content });
    alert('Pop‑out information saved successfully.');
  };

  // Restrict access – show a simple message for non‑superadmin users.
  if (role !== 'superadmin') {
    return (
      <div className="centered-screen">
        <p>Anda tidak memiliki izin untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return (
    <motion.div
      className="popout-settings glass-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Pengaturan Pop‑out Login</h2>
        <button onClick={() => window.history.back()} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>
      {loading ? (
        <p>Memuat data…</p>
      ) : (
        <form onSubmit={handleSave} style={{ marginTop: '1rem' }}>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="title" style={{ display: 'block', marginBottom: '0.5rem' }}>Judul</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="content" style={{ display: 'block', marginBottom: '0.5rem' }}>Isi</label>
            <textarea
              id="content"
              rows={6}
              value={content}
              onChange={e => setContent(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
            />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '4px' }}>
            Simpan
          </button>
        </form>
      )}
    </motion.div>
  );
};

export default PopoutSettings;
