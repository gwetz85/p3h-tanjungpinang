import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, FileText, PenTool, Sparkles, Plus, Minimize2, Maximize2, RotateCcw, Info } from 'lucide-react';

const FloatingTatacara = ({
  isOpen,
  onClose,
  ingredients = [],
  pembersih = [],
  kemasan = [],
  currentText = '',
  onApply
}) => {
  const [text, setText] = useState('');
  const [minimized, setMinimized] = useState(false);
  const textareaRef = useRef(null);

  // Synchronize text when assistant opens
  useEffect(() => {
    if (isOpen) {
      setText(currentText || '');
    }
  }, [isOpen, currentText]);

  if (!isOpen) return null;

  // Filter filled items
  const activeBahan = ingredients
    .filter(b => b && b.merk && b.merk.trim() !== '')
    .map(b => ({
      merk: b.merk.trim(),
      sub: (b.sub || []).filter(s => s && s.trim() !== '')
    }));

  const activePembersih = pembersih
    .filter(p => p && p.merk && p.merk.trim() !== '')
    .map(p => ({
      merk: p.merk.trim(),
      sub: (p.sub || []).filter(s => s && s.trim() !== '')
    }));

  const activeKemasan = kemasan
    .filter(k => k && k.merk && k.merk.trim() !== '')
    .map(k => k.merk.trim());

  // Cursor-based insertion helper
  const insertAtCursor = (insertedText) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setText(prev => (prev ? prev + ' ' + insertedText : insertedText));
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = textarea.value;

    const newVal = currentVal.substring(0, start) + insertedText + currentVal.substring(end);
    setText(newVal);

    // Refocus and place cursor right after the newly inserted text
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + insertedText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Generate intelligent auto-draft from materials
  const handleAutoDraft = () => {
    if (activeBahan.length === 0) {
      alert('Silakan isi beberapa "Merk Bahan" di Form Halal terlebih dahulu agar asisten dapat meracik draf secara otomatis!');
      return;
    }

    if (text.trim() && !window.confirm('Draf otomatis ini akan menimpa teks yang saat ini sedang Anda ketik di editor asisten. Lanjutkan?')) {
      return;
    }

    const bahanNames = activeBahan.map(b => b.merk).join(', ');
    const pembersihNames = activePembersih.length > 0 ? activePembersih.map(p => p.merk).join(', ') : 'Air Bersih';
    const kemasanNames = activeKemasan.length > 0 ? activeKemasan.join(', ') : 'Kemasan Higienis';

    const draft = `PROSES PEMBUATAN PRODUK (DRAF OTOMATIS)

1. Persiapan Bahan Baku & Pembantu:
   Mempersiapkan bahan-bahan berkualitas dan terjamin kehalalannya yang meliputi: ${bahanNames}.

2. Pembersihan Peralatan & Lingkungan Kerja:
   Mencuci bersih semua alat pengolahan dengan air bersih yang mengalir. Pastikan wadah dan peralatan bebas dari najis. Jika diperlukan bahan pembersih, gunakan pembersih halal: ${pembersihNames}.

3. Pengolahan & Pencampuran Adonan:
   Campurkan bahan baku utama (${activeBahan.slice(0, 3).map(b => b.merk).join(', ') || 'bahan-bahan utama'}) ke dalam wadah pengolahan. Aduk rata secara higienis, tambahkan bahan penolong lainnya sesuai resep secara berurutan.

4. Proses Pematangan:
   Lakukan pematangan produk dengan cara (perebusan / pemanggangan / pengukusan / penggorengan) menggunakan peralatan yang bersih dan bebas kontaminasi bahan haram/najis.

5. Pendinginan & Pengemasan:
   Setelah matang sempurna, tiriskan dan dinginkan produk di wadah bersih. Kemas produk yang sudah dingin menggunakan kemasan bersih: ${kemasanNames} agar kebersihan dan kehalalan produk terjaga utuh sampai ke tangan konsumen.`;

    setText(draft);
  };

  // Pre-load structured industry templates
  const handleLoadTemplate = (type) => {
    if (text.trim() && !window.confirm('Memuat template ini akan menimpa tulisan Anda di editor asisten. Lanjutkan?')) {
      return;
    }

    const bahanNames = activeBahan.length > 0 ? activeBahan.map(b => b.merk).join(', ') : '[Nama Bahan-Bahan]';
    const kemasanNames = activeKemasan.length > 0 ? activeKemasan.join(', ') : '[Jenis Kemasan]';

    let templateText = '';

    switch (type) {
      case 'keripik':
        templateText = `ALUR PEMBUATAN SNACK & KERIPIK:

1. Persiapan & Pencucian:
   Siapkan bahan baku utama: ${bahanNames}. Cuci bersih dengan air mengalir.
2. Pemotongan/Perajangan:
   Kupas kulitnya (jika ada), lalu iris bahan utama tipis-tipis menggunakan pisau dan talenan yang bersih.
3. Pembumbuan:
   Rendam atau balurkan bumbu halus di wadah bersih secara merata dan diamkan sejenak agar meresap.
4. Penggorengan:
   Goreng potongan bahan utama dalam minyak panas yang bersih hingga matang kriuk dan berwarna kuning keemasan.
5. Penirisan & Pengemasan:
   Tiriskan minyak dengan mesin spinner atau rak peniris. Masukkan produk ke kemasan ${kemasanNames} kemudian segel dengan mesin hand sealer secara kedap udara.`;
        break;

      case 'kue':
        templateText = `ALUR PEMBUATAN ROTI / KUE BASAH / PASTRY:

1. Persiapan Bahan & Penimbangan:
   Siapkan dan timbang seluruh bahan baku seperti: ${bahanNames}.
2. Pembuatan Adonan:
   Kocok telur, gula, dan mentega dengan mixer bersih hingga mengembang. Masukkan tepung terigu dan bahan kering lainnya secara bertahap sambil diaduk hingga rata.
3. Pencetakan & Fermentasi:
   Tuangkan adonan ke dalam loyang cetakan bersih. (Jika roti: diamkan adonan beberapa saat hingga mengembang).
4. Pemanggangan / Pengukusan:
   Panggang adonan di dalam oven (atau kukus di dalam kukusan) yang bersih dengan suhu terkontrol hingga matang sempurna.
5. Pengemasan:
   Biarkan kue dingin di suhu ruang. Kemas produk satu per satu dengan kemasan ${kemasanNames} dan rekatkan segel pelindung.`;
        break;

      case 'olahan':
        templateText = `ALUR PEMBUATAN OLAHAN LAUK (BAKSO / NUGGET / OTAK-OTAK):

1. Persiapan Daging/Ikan:
   Siapkan bahan baku protein dan bahan pembantu: ${bahanNames}. Cuci bersih daging/ikan dengan air dingin.
2. Penggilingan & Pembumbuan:
   Giling daging/ikan bersama es batu dan bumbu penyedap menggunakan chopper bersih hingga halus dan lengket.
3. Pengulenan & Pencetakan:
   Campurkan tepung tapioka/sagu ke dalam adonan daging giling, uleni perlahan hingga homogen. Bentuk bulat (bakso) atau cetak di loyang (nugget) atau bungkus daun (otak-otak).
4. Perebusan / Pengukusan / Pemanggangan:
   Masak adonan yang telah dibentuk ke dalam air mendidih atau kukusan bersih hingga mengapung/matang. (Untuk otak-otak: panggang di atas panggangan bersih).
5. Pembekuan & Pengemasan:
   Tiriskan dan dinginkan. Masukkan produk ke dalam kemasan ${kemasanNames} (bisa dengan kemasan vakum) lalu simpan di freezer.`;
        break;

      case 'minuman':
        templateText = `ALUR PEMBUATAN MINUMAN / HERBAL / JUS:

1. Seleksi & Pencucian Bahan:
   Pilih bahan buah/rempah segar: ${bahanNames}. Cuci bersih menggunakan air steril.
2. Ekstraksi / Perebusan:
   (Untuk jus): Blender buah dengan air matang dan gula.
   (Untuk herbal/jamu): Iris bahan rempah lalu rebus bersama air dalam panci stainless steel bersih hingga mendidih.
3. Penyaringan:
   Saring cairan sari buah atau rebusan rempah menggunakan kain saring bersih agar bebas dari ampas kasar.
4. Pengisian (Filling):
   Tuangkan cairan minuman selagi hangat atau setelah dingin ke dalam botol/gelas kemasan ${kemasanNames} yang bersih dan steril.
5. Penyegelan:
   Tutup kemasan dengan rapat menggunakan cup sealer atau tutup botol berulir untuk menjaga higienitas.`;
        break;

      default:
        return;
    }

    setText(templateText);
  };

  const handleApplyText = () => {
    onApply(text);
    onClose();
  };

  const handleClear = () => {
    if (window.confirm('Apakah Anda yakin ingin mengosongkan editor asisten?')) {
      setText('');
    }
  };

  return (
    <AnimatePresence>
      {minimized ? (
        /* Collapsed Floating Widget */
        <motion.div
          key="minimized-widget"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8 }}
          drag
          dragMomentum={false}
          className="floating-tatacara-collapsed"
          style={collapsedStyle}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={pulseDot}></div>
            <PenTool size={16} color="var(--primary)" />
            <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Asisten Tata Cara Aktif</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button 
              onClick={() => setMinimized(false)} 
              title="Perbesar Asisten" 
              style={iconBtnStyle}
            >
              <Maximize2 size={14} />
            </button>
            <button 
              onClick={onClose} 
              title="Tutup Asisten" 
              style={closeBtnWidgetStyle}
            >
              <X size={14} />
            </button>
          </div>
        </motion.div>
      ) : (
        /* Main Floating Inspector Window */
        <motion.div
          key="main-assistant"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          drag
          dragHandleClassName="tatacara-drag-header"
          dragMomentum={false}
          className="floating-tatacara-panel glass-card"
          style={panelStyle}
        >
          {/* Header Drag Handle */}
          <div className="tatacara-drag-header" style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'move' }}>
              <div className="drag-icon-grid" style={dragDotsStyle}>
                <div></div><div></div><div></div>
                <div></div><div></div><div></div>
              </div>
              <PenTool size={18} color="var(--primary)" />
              <h3 style={headerTitleStyle}>Asisten Tata Cara Pembuatan</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button 
                onClick={() => setMinimized(true)} 
                title="Perkecil ke Widget" 
                style={actionBtnStyle}
              >
                <Minimize2 size={15} />
              </button>
              <button 
                onClick={onClose} 
                title="Tutup Asisten" 
                style={closeBtnStyle}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Panel Grid Body */}
          <div style={bodyStyle}>
            {/* Left Panel: Ingredients Injector & Templates */}
            <div style={leftPanelStyle} className="tatacara-scroll">
              <div style={sectionTitleStyle}>1. Klik Bahan untuk Menyisipkan</div>
              
              {/* Bahan */}
              <div style={tagHeaderStyle}>Bahan Utama & Pembantu:</div>
              {activeBahan.length > 0 ? (
                <div style={tagContainerStyle}>
                  {activeBahan.map((b, idx) => (
                    <div key={`b-${idx}`} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => insertAtCursor(b.merk)}
                        style={tagStyle}
                        title="Klik untuk sisipkan bahan utama"
                      >
                        <Plus size={10} style={{ marginRight: '2px' }} />
                        {b.merk}
                      </button>
                      {b.sub.map((s, sIdx) => (
                        <button
                          key={`s-${idx}-${sIdx}`}
                          type="button"
                          onClick={() => insertAtCursor(s)}
                          style={subTagStyle}
                          title="Klik untuk sisipkan bahan pengganti"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyTextStyle}>Bahan belum diisi di Form Halal</div>
              )}

              {/* Pembersih */}
              <div style={{ ...tagHeaderStyle, marginTop: '10px' }}>Pembersih:</div>
              {activePembersih.length > 0 ? (
                <div style={tagContainerStyle}>
                  {activePembersih.map((p, idx) => (
                    <div key={`p-${idx}`} style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '3px' }}>
                      <button
                        type="button"
                        onClick={() => insertAtCursor(p.merk)}
                        style={cleanTagStyle}
                        title="Klik untuk sisipkan pembersih"
                      >
                        <Plus size={10} style={{ marginRight: '2px' }} />
                        {p.merk}
                      </button>
                      {p.sub.map((s, sIdx) => (
                        <button
                          key={`p-s-${idx}-${sIdx}`}
                          type="button"
                          onClick={() => insertAtCursor(s)}
                          style={subTagStyle}
                          title="Klik untuk sisipkan pembersih pengganti"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={emptyTextStyle}>Pembersih belum diisi di Form Halal</div>
              )}

              {/* Kemasan */}
              <div style={{ ...tagHeaderStyle, marginTop: '10px' }}>Kemasan:</div>
              {activeKemasan.length > 0 ? (
                <div style={tagContainerStyle}>
                  {activeKemasan.map((k, idx) => (
                    <button
                      key={`k-${idx}`}
                      type="button"
                      onClick={() => insertAtCursor(k)}
                      style={packTagStyle}
                      title="Klik untuk sisipkan jenis kemasan"
                    >
                      <Plus size={10} style={{ marginRight: '2px' }} />
                      {k}
                    </button>
                  ))}
                </div>
              ) : (
                <div style={emptyTextStyle}>Kemasan belum diisi di Form Halal</div>
              )}

              <hr style={dividerStyle} />

              {/* Templates Section */}
              <div style={sectionTitleStyle}>2. Draf &amp; Template Cepat</div>
              
              <button
                type="button"
                onClick={handleAutoDraft}
                style={autoDraftBtnStyle}
                className="hover-scale"
              >
                <Sparkles size={14} /> Buat Draf Otomatis
              </button>

              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px', marginTop: '12px' }}>
                Kategori Template Industri:
              </div>
              <div style={templateGridStyle}>
                <button type="button" onClick={() => handleLoadTemplate('keripik')} style={templateBtnStyle}>
                  🍢 Keripik / Snack
                </button>
                <button type="button" onClick={() => handleLoadTemplate('kue')} style={templateBtnStyle}>
                  🍞 Kue / Roti / Pastry
                </button>
                <button type="button" onClick={() => handleLoadTemplate('olahan')} style={templateBtnStyle}>
                  🐟 Olahan Ikan/Daging
                </button>
                <button type="button" onClick={() => handleLoadTemplate('minuman')} style={templateBtnStyle}>
                  🍹 Minuman / Jus / Herbal
                </button>
              </div>

              <div style={infoBoxStyle}>
                <Info size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Tip: Klik bahan di atas untuk langsung menyisipkannya ke posisi kursor pengetikan Anda.</span>
              </div>
            </div>

            {/* Right Panel: Editor Area */}
            <div style={rightPanelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={sectionTitleStyle}>3. Editor Proses Pembuatan</span>
                <span style={charCountStyle}>{text.length} karakter</span>
              </div>
              
              <textarea
                ref={textareaRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Uraikan sedetail mungkin cara membuat produk Anda... Gunakan draf otomatis atau klik tag bahan di samping untuk menyusun deskripsi lebih cepat."
                style={textareaStyle}
              />
              
              {/* Editor Buttons */}
              <div style={editorActionsStyle}>
                <button 
                  type="button" 
                  onClick={handleClear} 
                  style={clearBtnStyle}
                  title="Kosongkan Teks"
                >
                  <RotateCcw size={14} /> Hapus Semua
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div style={footerStyle}>
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ─── Styles ─────────────────────────────────────────────────────────── */

const collapsedStyle = {
  position: 'fixed',
  bottom: '30px',
  right: '30px',
  zIndex: 10100,
  background: 'rgba(255, 255, 255, 0.9)',
  backdropFilter: 'blur(10px)',
  border: '1.5px solid var(--primary)',
  borderRadius: '30px',
  padding: '8px 16px',
  boxShadow: '0 10px 25px rgba(37,99,235,0.25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px',
  width: '260px',
};

const pulseDot = {
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  backgroundColor: '#10b981',
  boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)',
  animation: 'pulse 1.8s infinite',
};

const panelStyle = {
  position: 'fixed',
  bottom: '40px',
  right: '40px',
  zIndex: 10100,
  background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
  backdropFilter: 'blur(12px)',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  borderRadius: '20px',
  width: '780px',
  maxWidth: '90vw',
  height: '520px',
  maxHeight: '80vh',
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15), 0 5px 15px rgba(37,99,235,0.05)',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle = {
  padding: '12px 20px',
  borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  background: 'rgba(241, 245, 249, 0.5)',
  userSelect: 'none',
};

const dragDotsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 3px)',
  gap: '2px',
  marginRight: '6px',
  opacity: 0.4,
};

const headerTitleStyle = {
  fontSize: '0.95rem',
  fontWeight: 700,
  color: 'var(--text)',
  margin: 0,
};

const actionBtnStyle = {
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

const closeBtnWidgetStyle = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: '2px',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconBtnStyle = {
  background: 'rgba(0,0,0,0.05)',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-muted)',
  padding: '4px',
  borderRadius: '6px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const bodyStyle = {
  flex: 1,
  display: 'grid',
  gridTemplateColumns: '320px 1fr',
  overflow: 'hidden',
};

const leftPanelStyle = {
  padding: '16px',
  borderRight: '1px solid rgba(226, 232, 240, 0.8)',
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
  background: 'rgba(248, 250, 252, 0.3)',
};

const rightPanelStyle = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const sectionTitleStyle = {
  fontSize: '0.8rem',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text)',
  marginBottom: '6px',
};

const tagHeaderStyle = {
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--text-muted)',
  marginBottom: '4px',
};

const tagContainerStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
  maxHeight: '110px',
  overflowY: 'auto',
  padding: '4px 2px',
};

const tagStyle = {
  background: 'rgba(37, 99, 235, 0.08)',
  border: '1px solid rgba(37, 99, 235, 0.15)',
  color: 'var(--primary)',
  borderRadius: '16px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.15s',
  outline: 'none',
};

const subTagStyle = {
  background: 'rgba(245, 158, 11, 0.08)',
  border: '1px solid rgba(245, 158, 11, 0.15)',
  color: 'var(--secondary)',
  borderRadius: '16px',
  padding: '2px 6px',
  fontSize: '0.65rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-block',
  transition: 'all 0.15s',
};

const cleanTagStyle = {
  background: 'rgba(16, 185, 129, 0.08)',
  border: '1px solid rgba(16, 185, 129, 0.15)',
  color: 'var(--accent)',
  borderRadius: '16px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.15s',
};

const packTagStyle = {
  background: 'rgba(107, 114, 128, 0.08)',
  border: '1px solid rgba(107, 114, 128, 0.15)',
  color: 'var(--text-muted)',
  borderRadius: '16px',
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 500,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  transition: 'all 0.15s',
};

const emptyTextStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
  fontStyle: 'italic',
  padding: '4px',
};

const dividerStyle = {
  border: 'none',
  borderTop: '1px solid rgba(226, 232, 240, 0.8)',
  margin: '8px 0',
};

const autoDraftBtnStyle = {
  width: '100%',
  padding: '10px 14px',
  background: 'linear-gradient(135deg, var(--primary) 0%, #3b82f6 100%)',
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontWeight: 600,
  fontSize: '0.8rem',
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(37,99,235,0.15)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '6px',
  transition: 'transform 0.15s',
};

const templateGridStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '6px',
};

const templateBtnStyle = {
  padding: '8px',
  background: 'white',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  borderRadius: '8px',
  fontSize: '0.7rem',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'var(--text)',
  fontWeight: 500,
  transition: 'all 0.15s',
  display: 'flex',
  alignItems: 'center',
};

const infoBoxStyle = {
  background: 'rgba(59, 130, 246, 0.05)',
  border: '1px solid rgba(59, 130, 246, 0.1)',
  borderRadius: '10px',
  padding: '10px',
  fontSize: '0.7rem',
  color: '#3b82f6',
  display: 'flex',
  gap: '6px',
  marginTop: 'auto',
  lineHeight: 1.4,
};

const charCountStyle = {
  fontSize: '0.75rem',
  color: 'var(--text-muted)',
};

const textareaStyle = {
  flex: 1,
  width: '100%',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid rgba(226, 232, 240, 0.8)',
  background: 'white',
  color: 'var(--text)',
  fontSize: '0.85rem',
  lineHeight: 1.5,
  resize: 'none',
  outline: 'none',
  transition: 'all 0.2s',
  fontFamily: 'inherit',
};

const editorActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  marginTop: '8px',
};

const clearBtnStyle = {
  background: 'transparent',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  fontSize: '0.75rem',
  fontWeight: 500,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '4px 8px',
  borderRadius: '6px',
};

const footerStyle = {
  padding: '12px 20px',
  borderTop: '1px solid rgba(226, 232, 240, 0.8)',
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  background: 'rgba(241, 245, 249, 0.3)',
};

export default FloatingTatacara;
