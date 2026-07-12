import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, RotateCcw } from 'lucide-react';

const FloatingTatacara = ({
  isOpen,
  onClose,
  currentText = '',
  onApply
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef(null);

  // Synchronize text when editor opens
  useEffect(() => {
    if (isOpen) {
      setText(currentText || '');
    }
  }, [isOpen, currentText]);

  if (!isOpen) return null;

  const handleApplyText = () => {
    onApply(text);
    onClose();
  };

  const handleClear = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan editor tata cara?')) {
      setText('');
    }
  };

  return createPortal(
    <AnimatePresence>
      <div className="modal-overlay" style={{ zIndex: 99999 }} onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="modal-content glass-card halal-modal"
          style={{ 
            height: '90vh', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={22} style={{ color: 'var(--primary)' }} />
              <h3 style={headerTitleStyle}>Tata Cara Pembuatan Produk</h3>
            </div>
            <button 
              onClick={onClose} 
              title="Tutup" 
              style={closeBtnStyle}
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={bodyStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={sectionTitleStyle}>Ketik/Ubah Tata Cara Pembuatan</span>
              <span style={charCountStyle}>{text.length} karakter</span>
            </div>
            
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Uraikan sedetail mungkin cara pembuatan produk..."
              style={textareaStyle}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div style={footerStyle}>
            <button 
              type="button" 
              onClick={handleClear} 
              style={clearBtnStyle}
              title="Kosongkan Teks"
            >
              <RotateCcw size={14} /> Hapus Semua
            </button>
            <div style={{ display: 'flex', gap: '10px', marginLeft: 'auto' }}>
              <button 
                type="button" 
                onClick={onClose} 
                className="btn-primary-outline" 
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                Batal
              </button>
              <button 
                type="button" 
                onClick={handleApplyText} 
                className="btn-primary" 
                style={{ padding: '8px 24px', fontSize: '0.85rem', background: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={16} /> Terapkan ke Form Halal
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────── */

const headerStyle = {
  padding: '16px 20px',
  borderBottom: '1px solid var(--glass-border)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(12px)',
  userSelect: 'none',
  borderTopLeftRadius: '24px',
  borderTopRightRadius: '24px',
};

const headerTitleStyle = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: 'var(--text)',
  margin: 0,
};

const closeBtnStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: '4px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
};

const bodyStyle = {
  flex: 1,
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const sectionTitleStyle = {
  fontSize: '0.85rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
};

const charCountStyle = {
  fontSize: '0.8rem',
  color: 'var(--text-muted)',
};

const textareaStyle = {
  flex: 1,
  width: '100%',
  padding: '16px',
  borderRadius: '12px',
  border: '1px solid var(--glass-border)',
  background: 'rgba(255, 255, 255, 0.5)',
  backdropFilter: 'blur(12px)',
  color: 'var(--text)',
  fontSize: '0.95rem',
  lineHeight: 1.6,
  resize: 'none',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
  marginTop: '8px',
};

const clearBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: '#ef4444',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '8px 12px',
  borderRadius: '6px',
};

const footerStyle = {
  padding: '16px 20px',
  borderTop: '1px solid var(--glass-border)',
  display: 'flex',
  alignItems: 'center',
  background: 'rgba(255, 255, 255, 0.6)',
  backdropFilter: 'blur(12px)',
  borderBottomLeftRadius: '24px',
  borderBottomRightRadius: '24px',
};

export default FloatingTatacara;
