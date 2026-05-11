import React, { useState } from 'react';
import { rtdb } from '../firebase';
import { ref, push, serverTimestamp } from 'firebase/database';
import { motion } from 'framer-motion';
import { Send, User, MapPin, CreditCard, Phone, Briefcase } from 'lucide-react';

const InputPekerjaan = () => {
  const [formData, setFormData] = useState({
    jenisPekerjaan: 'BPJS',
    nama: '',
    alamat: '',
    nik: '',
    wa: '',
    // Halal Specific
    tempatLahir: '',
    tanggalLahir: '',
    usia: '',
    kelurahan: '',
    namaUsaha: '',
    jenisUsaha: 'Makanan',
    tahunBerdiri: '',
    alamatUsaha: '',
    photoPengajuan: ''
  });
  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await push(ref(rtdb, 'pekerjaan'), {
        ...formData,
        status: 'Proses',
        tanggalInput: Date.now(), // or serverTimestamp() if preferred
        progress: 0,
        keterangan: ''
      });
      
      setSuccess(true);
      setFormData({
        jenisPekerjaan: 'BPJS',
        nama: '',
        alamat: '',
        nik: '',
        wa: ''
      });
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDOBChange = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    setFormData({ ...formData, tanggalLahir: dob, usia: age > 0 ? age : 0 });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData({ ...formData, photoPengajuan: reader.result });
      reader.readAsDataURL(file);
    }
  };


  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="form-container glass-card">
        <div className="form-header">
          <h2 className="title-gradient">Input Pekerjaan Baru (RTDB)</h2>
          <p>Silakan lengkapi data pekerjaan di bawah ini</p>
        </div>

        <form onSubmit={handleSubmit} className="job-form">
          <div className="form-grid">
            <div className="input-group full-width">
              <label><Briefcase size={16} /> Jenis Pekerjaan</label>
              <select value={formData.jenisPekerjaan} onChange={(e) => setFormData({...formData, jenisPekerjaan: e.target.value})}>
                <option value="BPJS">BPJS</option>
                <option value="Pemberkasan">Pemberkasan</option>
                <option value="Sertifikasi Halal">Sertifikasi Halal</option>
              </select>
            </div>
            <div className="input-group">
              <label><User size={16} /> Nama Lengkap</label>
              <input type="text" placeholder="Nama sesuai KTP" value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} required />
            </div>
            <div className="input-group">
              <label><CreditCard size={16} /> NIK</label>
              <input type="text" placeholder="16 Digit NIK" value={formData.nik} onChange={(e) => setFormData({...formData, nik: e.target.value})} required />
            </div>
            <div className="input-group">
              <label><Phone size={16} /> Nomor WhatsApp</label>
              <input type="text" placeholder="0812..." value={formData.wa} onChange={(e) => setFormData({...formData, wa: e.target.value})} required />
            </div>
            <div className="input-group full-width">
              <label><MapPin size={16} /> Alamat Lengkap (KTP)</label>
              <textarea placeholder="Alamat domisili" rows="2" value={formData.alamat} onChange={(e) => setFormData({...formData, alamat: e.target.value})} required ></textarea>
            </div>

            {formData.jenisPekerjaan === 'Sertifikasi Halal' && (
              <>
                <div className="section-divider full-width"><p>Detail Sertifikasi Halal</p></div>
                <div className="input-group">
                  <label>Tempat Lahir</label>
                  <input type="text" placeholder="Kota Kelahiran" value={formData.tempatLahir} onChange={(e) => setFormData({...formData, tempatLahir: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Tanggal Lahir & Usia</label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input type="date" value={formData.tanggalLahir} onChange={(e) => handleDOBChange(e.target.value)} required style={{ flex: 2 }} />
                    <input type="text" value={formData.usia ? `${formData.usia} Thn` : ''} readOnly placeholder="Usia" style={{ flex: 1, textAlign: 'center', background: 'rgba(255,255,255,0.05)' }} />
                  </div>
                </div>
                <div className="input-group">
                  <label>Kelurahan</label>
                  <input type="text" placeholder="Kelurahan" value={formData.kelurahan} onChange={(e) => setFormData({...formData, kelurahan: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Nama Usaha</label>
                  <input type="text" placeholder="Nama Bisnis" value={formData.namaUsaha} onChange={(e) => setFormData({...formData, namaUsaha: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Jenis Usaha</label>
                  <select value={formData.jenisUsaha} onChange={(e) => setFormData({...formData, jenisUsaha: e.target.value})}>
                    <option value="Makanan">Makanan</option>
                    <option value="Minuman">Minuman</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Tahun Berdiri</label>
                  <input type="number" placeholder="Contoh: 2020" value={formData.tahunBerdiri} onChange={(e) => setFormData({...formData, tahunBerdiri: e.target.value})} required />
                </div>
                <div className="input-group full-width">
                  <label>Alamat Usaha / Lokasi Produksi</label>
                  <textarea placeholder="Alamat lengkap tempat usaha" rows="2" value={formData.alamatUsaha} onChange={(e) => setFormData({...formData, alamatUsaha: e.target.value})} required ></textarea>
                </div>
                <div className="input-group full-width">
                  <label>Photo Pengajuan (Upload)</label>
                  <div className="photo-upload-input glass-card">
                    {formData.photoPengajuan ? (
                      <div className="preview-container">
                        <img src={formData.photoPengajuan} alt="Preview" />
                        <button type="button" onClick={() => setFormData({...formData, photoPengajuan: ''})} className="btn-remove">Hapus</button>
                      </div>
                    ) : (
                      <div className="upload-placeholder">
                        <p>Klik untuk pilih atau ambil foto</p>
                        <input type="file" accept="image/*" onChange={handleImageUpload} required />
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <button type="submit" className="btn-primary submit-btn" disabled={loading}>
            <Send size={18} /> {loading ? 'Menyimpan...' : 'Posting Pekerjaan'}
          </button>
          {success && <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="success-alert">Pekerjaan berhasil diposting!</motion.div>}
        </form>
      </motion.div>
    </div>
  );
};

export default InputPekerjaan;
