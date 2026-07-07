import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';
import { motion } from 'framer-motion';
import { Upload, FileText, Image as ImageIcon, Trash2, ArrowUp, ArrowDown, Play, Copy, CheckCircle2 } from 'lucide-react';

const ExtractToText = () => {
  const [images, setImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalProgress, setGlobalProgress] = useState({ text: '', percentage: 0 });
  const [finalText, setFinalText] = useState('');
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newImages = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      url: URL.createObjectURL(file),
      status: 'idle', // idle, processing, done, error
      progress: 0,
      text: ''
    }));

    setImages(prev => [...prev, ...newImages]);
    e.target.value = ''; // reset input
  };

  const removeImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setImages(prev => {
      const arr = [...prev];
      const temp = arr[index - 1];
      arr[index - 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const moveDown = (index) => {
    if (index === images.length - 1) return;
    setImages(prev => {
      const arr = [...prev];
      const temp = arr[index + 1];
      arr[index + 1] = arr[index];
      arr[index] = temp;
      return arr;
    });
  };

  const preprocessImage = (url) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Scale up by 2x for better text clarity
        const scale = 2;
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Grayscale and increase contrast
        const factor = (259 * (128 + 255)) / (255 * (259 - 128)); // contrast factor
        
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          // Apply contrast
          let newColor = factor * (avg - 128) + 128;
          newColor = Math.max(0, Math.min(255, newColor)); // clamp
          
          data[i] = newColor;
          data[i + 1] = newColor;
          data[i + 2] = newColor;
        }
        
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = url;
    });
  };

  const startExtraction = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    setFinalText('');
    setCopied(false);
    
    // Reset status
    setImages(prev => prev.map(img => ({ ...img, status: 'idle', progress: 0, text: '' })));

    let combinedText = '';

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      
      setImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'processing' } : p));
      setGlobalProgress({ text: `Membaca gambar ${i + 1} dari ${images.length}...`, percentage: 0 });

      try {
        setGlobalProgress({ text: `Memproses kualitas gambar ${i + 1}...`, percentage: 10 });
        const processedUrl = await preprocessImage(img.url);

        const { data: { text } } = await Tesseract.recognize(
          processedUrl,
          'ind+eng', // Indonesian + English language
          {
            logger: m => {
              if (m.status === 'recognizing text') {
                const progressPct = Math.round(m.progress * 100);
                setGlobalProgress(prev => ({ ...prev, percentage: progressPct }));
                setImages(prev => prev.map(p => p.id === img.id ? { ...p, progress: progressPct } : p));
              }
            }
          }
        );

        setImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'done', progress: 100, text } : p));
        combinedText += `\n\n--- Halaman ${i + 1} ---\n\n` + text;
      } catch (err) {
        console.error("Error recognizing image:", err);
        setImages(prev => prev.map(p => p.id === img.id ? { ...p, status: 'error' } : p));
        combinedText += `\n\n--- Halaman ${i + 1} (Gagal Dibaca) ---\n\n`;
      }
    }

    setFinalText(combinedText.trim());
    setIsProcessing(false);
    setGlobalProgress({ text: 'Selesai!', percentage: 100 });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(finalText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="title-gradient" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={28} /> Extract to Text
        </h1>
        <p className="text-muted">Upload gambar yang berisi teks untuk diubah menjadi tulisan secara otomatis.</p>
      </div>

      <div className="grid-2" style={{ gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* Left Side: Upload & List */}
        <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Upload Area */}
          <div 
            style={{
              border: '2px dashed rgba(59, 130, 246, 0.4)',
              borderRadius: '12px',
              padding: '40px 20px',
              textAlign: 'center',
              background: 'rgba(59, 130, 246, 0.05)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => !isProcessing && fileInputRef.current.click()}
          >
            <Upload size={32} style={{ margin: '0 auto 12px', color: '#3b82f6' }} />
            <h3 style={{ marginBottom: '8px' }}>Klik untuk Upload Gambar</h3>
            <p className="text-muted" style={{ fontSize: '0.9rem' }}>Pilih satu atau lebih gambar (JPG/PNG)</p>
            <input 
              type="file" 
              multiple 
              accept="image/*" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange}
              disabled={isProcessing}
            />
          </div>

          {/* List Area */}
          {images.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0 }}>Daftar Gambar ({images.length})</h4>
                {images.length > 1 && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Sesuaikan urutan jika perlu</span>}
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto', paddingRight: '5px' }}>
                {images.map((img, idx) => (
                  <div key={img.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <button disabled={isProcessing || idx === 0} onClick={() => moveUp(idx)} className="btn-icon" style={{ padding: '2px', background: 'none' }}><ArrowUp size={14} /></button>
                      <button disabled={isProcessing || idx === images.length - 1} onClick={() => moveDown(idx)} className="btn-icon" style={{ padding: '2px', background: 'none' }}><ArrowDown size={14} /></button>
                    </div>

                    <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                      <img src={img.url} alt="upload" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{img.file.name}</p>
                      
                      {/* Status / Progress */}
                      {img.status === 'idle' && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Menunggu diproses</span>}
                      {img.status === 'processing' && (
                        <div style={{ marginTop: '5px' }}>
                          <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', background: '#3b82f6', width: `${img.progress}%`, transition: 'width 0.2s' }}></div>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Membaca... {img.progress}%</span>
                        </div>
                      )}
                      {img.status === 'done' && <span style={{ fontSize: '0.8rem', color: '#10b981' }}><CheckCircle2 size={12} style={{ display: 'inline', marginRight: '4px' }}/> Selesai</span>}
                      {img.status === 'error' && <span style={{ fontSize: '0.8rem', color: '#ef4444' }}>Gagal</span>}
                    </div>

                    {!isProcessing && (
                      <button onClick={() => removeImage(img.id)} className="btn-icon text-danger" style={{ padding: '6px', background: 'rgba(239, 68, 68, 0.1)' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={startExtraction} 
                disabled={isProcessing}
                style={{
                  padding: '14px',
                  background: isProcessing ? '#475569' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
              >
                {isProcessing ? (
                  <>
                    <span className="spinner" style={{ width: '18px', height: '18px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></span>
                    Memproses...
                  </>
                ) : (
                  <>
                    <Play size={18} /> Mulai Ekstrak Teks
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Right Side: Output */}
        <div className="glass-card p-6" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} className="text-primary" /> Hasil Ekstraksi
            </h3>
            {finalText && (
              <button 
                onClick={copyToClipboard}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '6px 12px', background: copied ? '#10b981' : 'rgba(59, 130, 246, 0.1)',
                  color: copied ? 'white' : '#3b82f6', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'all 0.2s'
                }}
              >
                {copied ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin!' : 'Salin Teks'}
              </button>
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={finalText}
              onChange={(e) => setFinalText(e.target.value)}
              placeholder={isProcessing ? globalProgress.text : "Hasil teks akan muncul di sini...\n\nAnda dapat mengedit teks ini setelah proses ekstraksi selesai."}
              style={{
                flex: 1,
                minHeight: '400px',
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'var(--text-color)',
                fontSize: '0.95rem',
                lineHeight: '1.6',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'monospace'
              }}
            />
          </div>
        </div>

      </div>
      
      {/* Global Style for spinner if not exists */}
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ExtractToText;
