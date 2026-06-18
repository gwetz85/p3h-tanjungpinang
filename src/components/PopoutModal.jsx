import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue } from 'firebase/database';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * PopoutModal – displayed after a successful login.
 * Superadmin (admin@tarunabangsa.id) can edit the content via the admin UI (handled elsewhere).
 */
const PopoutModal = () => {
  const { currentUser } = useAuth();
  const [info, setInfo] = useState({ title: '', content: '' });
  const [show, setShow] = useState(false);

  // Load the pop‑out information once on mount
  useEffect(() => {
    const infoRef = ref(rtdb, 'popoutInfo');
    const unsub = onValue(infoRef, (snapshot) => {
      const data = snapshot.val();
      if (data) setInfo(data);
    });
    return () => unsub();
  }, []);

  // Show the modal when a user is logged in
  useEffect(() => {
    if (currentUser) setShow(true);
  }, [currentUser]);

  if (!show) return null;

  return (
    <div className="popout-overlay" style={overlayStyle}>
      <div className="popout-modal glass-card" style={modalStyle}>
        <button
          onClick={() => setShow(false)}
          className="popout-close"
          style={closeBtnStyle}
        >
          <X size={20} />
        </button>
        {info.title && <h2 style={titleStyle}>{info.title}</h2>}
        {info.content && <p style={contentStyle}>{info.content}</p>}
      </div>
    </div>
  );
};

// Inline‑styles for a premium glass‑morphism look
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
};

const modalStyle = {
  position: 'relative',
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '12px',
  maxWidth: '420px',
  width: '90%',
  boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
};

const closeBtnStyle = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: '#64748b',
};

const titleStyle = {
  margin: 0,
  marginBottom: '0.8rem',
  fontSize: '1.4rem',
  color: '#0f172a',
};

const contentStyle = {
  margin: 0,
  fontSize: '1rem',
  color: '#334155',
  lineHeight: 1.5,
};

export default PopoutModal;
