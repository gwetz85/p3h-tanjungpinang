import React, { useEffect, useState } from 'react';
import { rtdb } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { Save, Settings } from 'lucide-react';

const RunningTextSettings = () => {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const textRef = ref(rtdb, 'runningText');
    const unsub = onValue(textRef, (snapshot) => {
      if (snapshot.exists()) {
        setText(snapshot.val());
      } else {
        setText("INFORMASI MANAJEMEN PELAKU USAHA | APLIKASI MANAJEMEN DATA YANG DIKEMBANGKAN SECARA MANDIRI OLEH TEAM PENDATAAN GUNA MENGOPTIMALKAN EFISIENSI KERJA PETUGAS DI LAPANGAN | DIDUKUNG PENUH OLEH SISTEM REALTIME DATA");
      }
    });
    return () => unsub();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await set(ref(rtdb, 'runningText'), text.toUpperCase());
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan running text.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container">
      <div className="header-actions">
        <h1 className="title-gradient">Pengaturan Running Text</h1>
      </div>

      <div className="form-container" style={{ marginTop: '1rem' }}>
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
            <Settings className="text-primary" size={24} />
            <h3 style={{ margin: 0 }}>Kelola Isi Informasi Teks Berjalan</h3>
          </div>

          <form onSubmit={handleSave} className="edit-form">
            <div className="input-group">
              <label htmlFor="runningText" style={{ fontWeight: 600 }}>Isi Teks Berjalan</label>
              <textarea
                id="runningText"
                rows="6"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Masukkan isi running text di sini..."
                required
                style={{ resize: 'vertical', lineHeight: '1.6' }}
              />
              <span className="text-muted" style={{ fontSize: '0.8rem', marginTop: '6px' }}>
                * Catatan: Teks akan otomatis dikonversi ke huruf KAPITAL (Uppercase). Gunakan tanda vertikal bar <strong>|</strong> sebagai pembatas antar kalimat.
              </span>
            </div>

            {success && (
              <div className="success-alert" style={{ marginTop: '1rem' }}>
                Running text berhasil diperbarui secara realtime di seluruh sistem!
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={saving} style={{ marginTop: '1.5rem', width: 'fit-content' }}>
              <Save size={18} />
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RunningTextSettings;
