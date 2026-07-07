import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { X, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * PopoutModal – displayed after a successful login.
 * Superadmin (admin@tarunabangsa.id) can edit the content via the
 * "Pengaturan Pop-out" menu. Smooth framer-motion entrance/exit.
 */
const PopoutModal = () => {
  const { currentUser } = useAuth();
  const [info, setInfo]   = useState({ title: '', content: '' });
  const [show, setShow]   = useState(false);
  const [visible, setVisible] = useState(false); // controls AnimatePresence

  /* Load pop-out info from Firebase */
  useEffect(() => {
    const infoRef = ref(rtdb, 'popoutInfo');
    const unsub = onValue(infoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setInfo(data);
    });
    return () => unsub();
  }, []);

  /* Trigger pop-out on login */
  useEffect(() => {
    if (currentUser) {
      // Small delay so the dashboard has time to render first
      const t = setTimeout(() => {
        setShow(true);
        setVisible(true);
      }, 600);
      return () => clearTimeout(t);
    }
  }, [currentUser]);

  const handleClose = () => {
    setVisible(false);
    // Keep `show` true so AnimatePresence can run exit animation, then unmount
    setTimeout(() => setShow(false), 350);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {visible && (
        /* ── Overlay ── */
        <motion.div
          key="popout-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleClose}
          style={overlayStyle}
        >
          {/* ── Modal card ── */}
          <motion.div
            key="popout-card"
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 30 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            style={cardStyle}
          >
            {/* ── Gradient header strip ── */}
            <div style={headerStyle}>
              <div style={headerInner}>
                <div style={iconWrap}>
                  <Megaphone size={22} color="#fff" />
                </div>
                <span style={headerTitle}>Informasi</span>
              </div>

              {/* Close button */}
              <motion.button
                onClick={handleClose}
                style={closeBtnStyle}
                whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.25)' }}
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                aria-label="Tutup"
              >
                <X size={18} strokeWidth={2.5} />
              </motion.button>
            </div>

            {/* ── Body ── */}
            <div style={bodyStyle}>
              {info.title && (
                <h2 style={titleStyle}>{info.title}</h2>
              )}
              {info.content && (
                <p style={contentStyle}>{info.content}</p>
              )}
              {!info.title && !info.content && (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
                  Belum ada informasi yang tersedia.
                </p>
              )}
            </div>

            {/* ── Footer button ── */}
            <div style={footerStyle}>
              <motion.button
                onClick={handleClose}
                style={okBtnStyle}
                whileHover={{ scale: 1.04, boxShadow: '0 6px 20px rgba(37,99,235,0.4)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                Mengerti
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────── */

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.55)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '1rem',
};

const cardStyle = {
  position: 'relative',
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  borderRadius: '20px',
  maxWidth: '460px',
  width: '100%',
  boxShadow: '0 25px 60px rgba(0,0,0,0.2), 0 8px 24px rgba(37,99,235,0.15)',
  overflow: 'hidden',
  border: '1px solid rgba(255, 255, 255, 0.5)',
};

const headerStyle = {
  background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.8) 0%, rgba(37, 99, 235, 0.8) 50%, rgba(59, 130, 246, 0.8) 100%)',
  backdropFilter: 'blur(10px)',
  padding: '1rem 1.25rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const headerInner = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
};

const iconWrap = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const headerTitle = {
  color: '#fff',
  fontWeight: 700,
  fontSize: '1rem',
  letterSpacing: '0.02em',
};

const closeBtnStyle = {
  background: 'rgba(255,255,255,0.15)',
  border: 'none',
  cursor: 'pointer',
  color: '#fff',
  borderRadius: '8px',
  width: '32px',
  height: '32px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
  transition: 'background 0.2s',
};

const bodyStyle = {
  padding: '1.5rem 1.5rem 1rem',
};

const titleStyle = {
  margin: '0 0 0.75rem',
  fontSize: '1.25rem',
  fontWeight: 700,
  color: '#0f172a',
  lineHeight: 1.3,
};

const contentStyle = {
  margin: 0,
  fontSize: '0.95rem',
  color: '#475569',
  lineHeight: 1.7,
  whiteSpace: 'pre-wrap',
};

const footerStyle = {
  padding: '0.75rem 1.5rem 1.25rem',
  display: 'flex',
  justifyContent: 'flex-end',
};

const okBtnStyle = {
  background: 'linear-gradient(135deg, #1e40af, #2563eb)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '0.55rem 1.5rem',
  fontWeight: 600,
  fontSize: '0.9rem',
  cursor: 'pointer',
  letterSpacing: '0.02em',
};

export default PopoutModal;
