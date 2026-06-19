import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit3, Trash2, Calendar, CheckCircle2, User, MapPin, MessageSquare, X, Clock, Eye } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PerbaikanAkunSihalal = () => {
  const { role } = useAuth();
  const [data, setData] = useState([]);
  const [pelakuUsahaList, setPelakuUsahaList] = useState([]);
  const [petugasList, setPetugasList] = useState([]);
  const [viewDetailItem, setViewDetailItem] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    pelakuUsahaId: '',
    petugasId: '',
    keterangan: '',
    jenisPekerjaan: 'Verval Si Halal'
  });

  // Modal Schedule states
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');

  useEffect(() => {
    // Fetch Pelaku Usaha
    const puRef = ref(rtdb, 'pekerjaan');
    const unsubPU = onValue(puRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        setPelakuUsahaList(list.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0)));
      } else {
        setPelakuUsahaList([]);
      }
    });

    // Fetch Petugas (Koordinators)
    const petugasRef = ref(rtdb, 'koordinators');
    const unsubPetugas = onValue(petugasRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        setPetugasList(list);
      } else {
        setPetugasList([]);
      }
    });

    // Fetch Perbaikan Akun data
    const perbaikanRef = ref(rtdb, 'perbaikan_akun');
    const unsubPerbaikan = onValue(perbaikanRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const list = Object.keys(val).map(key => ({ id: key, ...val[key] }));
        list.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0));
        setData(list);
      } else {
        setData([]);
      }
      setLoading(false);
    });

    return () => {
      unsubPU();
      unsubPetugas();
      unsubPerbaikan();
    };
  }, []);

  const handleOpenForm = (record = null) => {
    if (record) {
      setFormData({
        pelakuUsahaId: record.pelakuUsahaId,
        petugasId: record.petugasId,
        keterangan: record.keterangan,
        jenisPekerjaan: record.jenisPekerjaan || 'Verval Si Halal'
      });
      setEditingId(record.id);
    } else {
      setFormData({ pelakuUsahaId: '', petugasId: '', keterangan: '', jenisPekerjaan: 'Verval Si Halal' });
      setEditingId(null);
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.pelakuUsahaId || !formData.petugasId || !formData.keterangan) {
      alert("Harap lengkapi semua data!");
      return;
    }

    const pu = pelakuUsahaList.find(p => p.id === formData.pelakuUsahaId);
    const petugas = petugasList.find(p => p.id === formData.petugasId);

    if (!pu || !petugas) return;

    const payload = {
      pelakuUsahaId: pu.id,
      namaPelaku: pu.nama || '',
      namaUsaha: pu.namaUsaha || '',
      kontak: pu.wa || '',
      alamat: pu.alamatUsaha || pu.alamat || '',
      petugasId: petugas.id,
      namaPetugas: petugas.nama || '',
      keterangan: formData.keterangan,
      jenisPekerjaan: formData.jenisPekerjaan || 'Verval Si Halal',
      status: 'Proses',
      tanggalInput: Date.now()
    };

    try {
      if (editingId) {
        // If editing, reset schedule as requested by user
        payload.jadwalKunjungan = null;
        await update(ref(rtdb, `perbaikan_akun/${editingId}`), payload);
      } else {
        await push(ref(rtdb, 'perbaikan_akun'), payload);
      }
      handleCloseForm();
    } catch (error) {
      console.error(error);
      alert("Gagal menyimpan data!");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Yakin ingin menghapus data ini?")) {
      await remove(ref(rtdb, `perbaikan_akun/${id}`));
    }
  };

  const handleSetSelesai = async (id) => {
    if (window.confirm("Tandai perbaikan ini sebagai selesai?")) {
      await update(ref(rtdb, `perbaikan_akun/${id}`), { status: 'Selesai' });
    }
  };

  const handleOpenSchedule = (item) => {
    setSelectedItem(item);
    setScheduleDate(item.jadwalKunjungan || '');
    setIsScheduleOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleDate) return;
    try {
      await update(ref(rtdb, `perbaikan_akun/${selectedItem.id}`), {
        jadwalKunjungan: scheduleDate
      });
      setIsScheduleOpen(false);
      setSelectedItem(null);
    } catch (error) {
      console.error(error);
      alert("Gagal set jadwal!");
    }
  };

  const handleDeleteSchedule = async () => {
    if (!selectedItem) return;
    if (window.confirm(`Hapus jadwal kunjungan untuk ${selectedItem.namaPelaku}? Ini akan menghapus jadwal yang sudah diset.`)) {
      try {
        await update(ref(rtdb, `perbaikan_akun/${selectedItem.id}`), {
          jadwalKunjungan: null
        });
        setIsScheduleOpen(false);
        setSelectedItem(null);
        setScheduleDate('');
      } catch (error) {
        console.error(error);
        alert("Gagal menghapus jadwal!");
      }
    }
  };

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
          <Clock size={40} className="text-primary" />
        </motion.div>
      </div>
    );
  }

  // Get selected PU for form preview
  const selectedPU = pelakuUsahaList.find(p => p.id === formData.pelakuUsahaId);

  return (
    <div className="page-container">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="page-header">
        <div>
          <h1 className="page-title">Perbaikan Akun Si Halal</h1>
          <p className="page-subtitle">Kelola catatan perbaikan dan jadwal kunjungan</p>
        </div>
        {(role === 'superadmin' || role === 'Admin') && !isFormOpen && (
          <button onClick={() => handleOpenForm()} className="btn btn-primary shadow-glow">
            <Plus size={18} /> Tambah Perbaikan
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isFormOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            className="form-section glass-card"
            style={{ marginBottom: '2rem', overflow: 'hidden' }}
          >
            <div className="form-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>{editingId ? 'Edit Perbaikan' : 'Tambah Perbaikan Baru'}</h2>
              <button onClick={handleCloseForm} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20}/></button>
            </div>
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Pilih Pelaku Usaha</label>
                  <select 
                    value={formData.pelakuUsahaId} 
                    onChange={(e) => setFormData({...formData, pelakuUsahaId: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="">-- Pilih Pelaku Usaha --</option>
                    {pelakuUsahaList.map(pu => (
                      <option key={pu.id} value={pu.id}>{pu.nama} {pu.namaUsaha ? `(${pu.namaUsaha})` : ''}</option>
                    ))}
                  </select>
                  
                  {selectedPU && (
                    <div className="pu-preview" style={{ marginTop: '0.8rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem' }}>
                      <p style={{ margin: '0 0 5px 0' }}><strong>{selectedPU.nama}</strong></p>
                      <p style={{ margin: '0 0 5px 0', display: 'flex', alignItems: 'center', gap: '5px' }}><MessageSquare size={13}/> {selectedPU.wa || '-'}</p>
                      <p style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '5px' }}><MapPin size={13}/> {selectedPU.alamatUsaha || selectedPU.alamat || '-'}</p>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Pilih Petugas Pendamping</label>
                  <select 
                    value={formData.petugasId} 
                    onChange={(e) => setFormData({...formData, petugasId: e.target.value})}
                    className="form-control"
                    required
                  >
                    <option value="">-- Pilih Petugas --</option>
                    {petugasList.map(ptg => (
                      <option key={ptg.id} value={ptg.id}>{ptg.nama}</option>
                    ))}
                  </select>

                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Jenis Pekerjaan</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {['Verval Si Halal', 'Perbaikan Si Halal'].map(jenis => (
                        <label
                          key={jenis}
                          style={{
                            flex: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '0.65rem 1rem',
                            borderRadius: '10px',
                            border: `2px solid ${formData.jenisPekerjaan === jenis ? (jenis === 'Verval Si Halal' ? '#3b82f6' : '#f59e0b') : '#e2e8f0'}`,
                            background: formData.jenisPekerjaan === jenis ? (jenis === 'Verval Si Halal' ? 'rgba(59,130,246,0.08)' : 'rgba(245,158,11,0.08)') : '#f8fafc',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            color: formData.jenisPekerjaan === jenis ? (jenis === 'Verval Si Halal' ? '#2563eb' : '#d97706') : '#64748b',
                            transition: 'all 0.2s'
                          }}
                        >
                          <input
                            type="radio"
                            name="jenisPekerjaan"
                            value={jenis}
                            checked={formData.jenisPekerjaan === jenis}
                            onChange={(e) => setFormData({...formData, jenisPekerjaan: e.target.value})}
                            style={{ display: 'none' }}
                          />
                          <span>{jenis === 'Verval Si Halal' ? '🔵' : '🟠'}</span>
                          {jenis}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label>Keterangan / Informasi Perbaikan</label>
                    <textarea 
                      value={formData.keterangan} 
                      onChange={(e) => setFormData({...formData, keterangan: e.target.value})}
                      className="form-control"
                      rows="4"
                      required
                      placeholder="Masukkan detail perbaikan yang harus dikerjakan..."
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" onClick={handleCloseForm} className="btn btn-secondary">Batal</button>
                <button type="submit" className="btn btn-primary">{editingId ? 'Simpan Perubahan' : 'Simpan Data'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        <div className="table-responsive">
          <table className="verification-table">
            <thead>
              <tr>
                <th style={{ width: '19%' }}>Pelaku Usaha</th>
                <th style={{ width: '13%' }}>Kontak WA</th>
                <th style={{ width: '12%', textAlign: 'center' }}>Jenis Pekerjaan</th>
                <th style={{ width: '13%', textAlign: 'center' }}>Petugas</th>
                <th style={{ width: '17%' }}>Keterangan</th>
                <th style={{ width: '4%', textAlign: 'center' }}>Detail</th>
                <th style={{ width: '13%', textAlign: 'center' }}>Jadwal & Status</th>
                <th style={{ width: '9%', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Belum ada catatan perbaikan.</td></tr>
              ) : (
                data.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 'bold' }}>{item.namaPelaku}</div>
                      {item.namaUsaha && <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.namaUsaha}</div>}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <a href={`https://wa.me/${item.kontak.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="whatsapp-link" style={{ color: '#25D366', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <MessageSquare size={14} /> {item.kontak}
                      </a>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '3px 10px',
                        borderRadius: '20px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        letterSpacing: '0.3px',
                        background: (item.jenisPekerjaan === 'Perbaikan Si Halal') ? 'rgba(245,158,11,0.12)' : 'rgba(59,130,246,0.12)',
                        color: (item.jenisPekerjaan === 'Perbaikan Si Halal') ? '#d97706' : '#2563eb',
                        border: `1px solid ${(item.jenisPekerjaan === 'Perbaikan Si Halal') ? 'rgba(245,158,11,0.3)' : 'rgba(59,130,246,0.3)'}`
                      }}>
                        {(item.jenisPekerjaan === 'Perbaikan Si Halal') ? '🟠' : '🔵'} {item.jenisPekerjaan || 'Verval Si Halal'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className="badge-type-large" style={{ background: '#f8fafc', color: '#334155', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <User size={13} style={{ marginRight: '4px' }}/> {item.namaPetugas}
                      </span>
                    </td>
                    <td style={{ maxWidth: '200px' }}>
                      <p style={{ fontSize: '0.85rem', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.keterangan}</p>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button className="btn-table-icon text-info" title="Lihat Detail" onClick={() => setViewDetailItem(item)}>
                        <Eye size={16} />
                      </button>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                        <span className={`status-pill ${item.status === 'Selesai' ? 'success' : 'proses'}`}>
                          {item.status.toUpperCase()}
                        </span>
                        {item.jadwalKunjungan && (
                          <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12}/> {new Date(item.jadwalKunjungan).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'})}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 28px)',
                        gap: '5px',
                        justifyContent: 'center',
                        margin: '0 auto'
                      }}>
                        {item.status !== 'Selesai' && (
                          <>
                            <button className="btn-table-icon text-accent" title="Set Jadwal" onClick={() => handleOpenSchedule(item)}>
                              <Calendar size={15} />
                            </button>
                            <button className="btn-table-icon text-success" title="Tandai Selesai" onClick={() => handleSetSelesai(item.id)}>
                              <CheckCircle2 size={15} />
                            </button>
                          </>
                        )}
                        {(role === 'superadmin' || role === 'Admin') && (
                          <>
                            <button className="btn-table-icon text-primary" title="Edit" onClick={() => handleOpenForm(item)}>
                              <Edit3 size={15} />
                            </button>
                            <button className="btn-table-icon text-danger" title="Hapus" onClick={() => handleDelete(item.id)}>
                              <Trash2 size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="mobile-card-list mobile-only" style={{ marginTop: '1rem' }}>
          {data.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Belum ada catatan perbaikan.</div>
          ) : (
            data.map((item) => {
              const badgeClass = item.status === 'Selesai' ? 'green' : 'red'; // Using red to match screenshot "PERBAIKAN AKUN" vibe
              return (
                <div key={item.id} className="mobile-data-card" onClick={() => setViewDetailItem(item)}>
                  {/* Date row */}
                  <div className="mobile-card-date">
                    <Calendar size={13} style={{marginRight: '2px'}}/>
                    {item.jadwalKunjungan ? new Date(item.jadwalKunjungan).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : 'Belum diset'}
                    {item.jadwalKunjungan && <span className="time" style={{marginLeft: 'auto'}}>{new Date(item.jadwalKunjungan).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>}
                  </div>
                  
                  {/* Name */}
                  <div className="mobile-card-name" style={{marginTop: '0.8rem'}}>{item.namaPelaku}</div>
                  
                  {/* Business */}
                  {item.namaUsaha && (
                    <div className="mobile-card-business" style={{color: '#2563eb'}}>
                      <span style={{fontSize:'0.9rem'}}>🏪</span> {item.namaUsaha}
                    </div>
                  )}

                  {/* Keterangan / Info (Matches the address area style in screenshot) */}
                  <div className="mobile-card-row" style={{marginTop: '0.6rem'}}>
                    <User size={13} style={{color:'#94a3b8', marginTop: '2px'}} />
                    <div style={{display: 'flex', flexDirection: 'column'}}>
                      <span style={{fontSize: '0.75rem', color: '#64748b'}}>Perbaikan Akun / {item.namaPetugas}</span>
                      <span style={{color: '#334155', fontWeight: 500}}>{item.keterangan || '-'}</span>
                    </div>
                    {item.kontak && (
                      <span className="mobile-card-wa" style={{marginLeft:'auto', display: 'flex', alignItems: 'center', gap: '4px'}} onClick={(e) => {e.stopPropagation(); window.open(`https://wa.me/${item.kontak.replace(/\D/g,'')}`); }}>
                        <MessageSquare size={13} /> {item.kontak}
                      </span>
                    )}
                  </div>

                  {/* Footer */}
                  <div className="mobile-card-footer" onClick={e => e.stopPropagation()}>
                    <span className={`mobile-card-badge ${badgeClass}`}>{item.status === 'Selesai' ? 'SELESAI' : 'PERBAIKAN AKUN'}</span>
                    
                    <div style={{display:'flex', gap:'6px'}}>
                      {item.status !== 'Selesai' && (
                        <>
                          <button className="btn-table-icon text-accent" title="Set Jadwal" onClick={() => handleOpenSchedule(item)}>
                            <Calendar size={15} />
                          </button>
                          <button className="btn-table-icon text-success" title="Tandai Selesai" onClick={() => handleSetSelesai(item.id)}>
                            <CheckCircle2 size={15} />
                          </button>
                        </>
                      )}
                      {(role === 'superadmin' || role === 'Admin') && (
                        <>
                          <button className="btn-table-icon text-primary" title="Edit" onClick={() => handleOpenForm(item)}>
                            <Edit3 size={15} />
                          </button>
                          <button className="btn-table-icon text-danger" title="Hapus" onClick={() => handleDelete(item.id)}>
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      <AnimatePresence>
        {isScheduleOpen && (
          <div className="modal-overlay" onClick={() => setIsScheduleOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="modal-content glass-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Atur Jadwal Kunjungan</h2>
                <button onClick={() => setIsScheduleOpen(false)} className="btn-close"><X size={20}/></button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#64748b' }}>
                  Atur jadwal kunjungan untuk <strong>{selectedItem?.namaPelaku}</strong>. Jadwal akan tampil di widget Dashboard.
                </p>
                {selectedItem?.jadwalKunjungan && (
                  <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#c2410c' }}>
                    <Calendar size={15} />
                    <span>Jadwal aktif: <strong>{new Date(selectedItem.jadwalKunjungan).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></span>
                  </div>
                )}
                <div className="form-group">
                  <label>Tanggal & Waktu</label>
                  <input 
                    type="datetime-local" 
                    className="form-control"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginTop: '1.5rem' }}>
                  {selectedItem?.jadwalKunjungan ? (
                    <button
                      onClick={handleDeleteSchedule}
                      className="btn btn-secondary"
                      style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fff1f2', display: 'flex', alignItems: 'center', gap: '6px' }}
                      title="Hapus jadwal karena pelaku usaha belum bisa dikunjungi"
                    >
                      <Trash2 size={15} /> Hapus Jadwal
                    </button>
                  ) : (
                    <span />
                  )}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setIsScheduleOpen(false)} className="btn btn-secondary">Batal</button>
                    <button onClick={handleSaveSchedule} className="btn btn-primary shadow-glow">Simpan Jadwal</button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {viewDetailItem && (
          <div className="modal-overlay" onClick={() => setViewDetailItem(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="modal-content glass-card"
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Detail Keterangan</h2>
                <button onClick={() => setViewDetailItem(null)} className="btn-close"><X size={20}/></button>
              </div>
              <div style={{ padding: '1.5rem' }}>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{viewDetailItem.keterangan}</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerbaikanAkunSihalal;
