import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Search, PlusCircle, Edit3, Trash2, Calendar, FileText, Factory, Truck, X, Eye, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GudangBahan = () => {
  const { role } = useAuth();
  const [bahanList, setBahanList] = useState([]);
  const [filteredBahan, setFilteredBahan] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMerek, setSelectedMerek] = useState(null);
  
  const [formData, setFormData] = useState({
    merek: '',
    produsen: '',
    sertifikatHalal: '',
    expiredDate: '',
    supplier: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const bahanRef = ref(rtdb, 'gudang_bahan');
    const unsubscribe = onValue(bahanRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        
        // Grouping logic based on Merek similarity
        const grouped = [];
        
        const getWords = (str) => {
          return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !['merk', 'merek', 'cap', 'dan', 'pt', 'cv'].includes(w));
        };

        const isSimilar = (a, b) => {
          const wordsA = getWords(a.merek);
          const wordsB = getWords(b.merek);
          
          if (wordsA.length === 0 || wordsB.length === 0) return false;
          
          const common = wordsA.filter(w => wordsB.includes(w));
          if (common.length >= 2) return true;
          if (wordsA.length === 1 && wordsB.length === 1 && wordsA[0] === wordsB[0]) return true;

          const normA = (a.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          const normB = (b.merek || '').toLowerCase().replace(/[^a-z0-9]/g, '');
          if (normA && normB && normA === normB) return true;

          return false;
        };

        list.forEach(item => {
          let foundIdx = -1;
          for (let i = 0; i < grouped.length; i++) {
            if (isSimilar(grouped[i], item)) {
              foundIdx = i;
              break;
            }
          }
          
          if (foundIdx === -1) {
            grouped.push({
              id: item.id,
              merek: item.merek || 'Tanpa Merek',
              variants: [item]
            });
          } else {
            grouped[foundIdx].variants.push(item);
          }
        });
        
        // Sort variants by date inside each group
        grouped.forEach(g => {
          g.variants.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0));
          
          // Deduplicate by produsen (keep only the newest)
          const seenProdusen = new Set();
          g.variants = g.variants.filter(v => {
            const produsenName = (v.produsen || '').toLowerCase().trim();
            if (seenProdusen.has(produsenName)) {
              return false;
            }
            seenProdusen.add(produsenName);
            return true;
          });
        });

        // Sort alphabetically by merek
        grouped.sort((a, b) => {
          const merekA = (a.merek || '').toLowerCase();
          const merekB = (b.merek || '').toLowerCase();
          if (merekA < merekB) return -1;
          if (merekA > merekB) return 1;
          return 0;
        });
        
        setBahanList(grouped);
        setFilteredBahan(grouped);
      } else {
        setBahanList([]);
        setFilteredBahan([]);
      }
      setInitialLoading(false);
    }, (error) => {
      console.error(error);
      setInitialLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const lowercasedTerm = searchTerm.toLowerCase();
      const filtered = bahanList.filter(group => {
        if (group.merek && group.merek.toLowerCase().includes(lowercasedTerm)) return true;
        return group.variants.some(v => 
          (v.produsen && v.produsen.toLowerCase().includes(lowercasedTerm)) ||
          (v.sertifikatHalal && v.sertifikatHalal.toLowerCase().includes(lowercasedTerm)) ||
          (v.supplier && v.supplier.toLowerCase().includes(lowercasedTerm))
        );
      });
      setFilteredBahan(filtered);
    } else {
      setFilteredBahan(bahanList);
    }
  }, [searchTerm, bahanList]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const dataToSave = { 
        ...formData
      };

      if (editingId) {
        await update(ref(rtdb, `gudang_bahan/${editingId}`), dataToSave);
        setEditingId(null);
      } else {
        dataToSave.tanggalInput = Date.now();
        await push(ref(rtdb, 'gudang_bahan'), dataToSave);
      }
      setFormData({ merek: '', produsen: '', sertifikatHalal: '', expiredDate: '', supplier: '' });
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan data bahan.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Hapus bahan ini?')) {
      await remove(ref(rtdb, `gudang_bahan/${id}`));
    }
  };

  const handleEdit = (bahan) => {
    setFormData({ 
      merek: bahan.merek || '', 
      produsen: bahan.produsen || '', 
      sertifikatHalal: bahan.sertifikatHalal || '', 
      expiredDate: bahan.expiredDate || '', 
      supplier: bahan.supplier || '' 
    });
    setEditingId(bahan.id);
    setSelectedMerek(null); // Close modal when editing
    
    // Scroll to form if on desktop
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  const activeGroup = selectedMerek ? bahanList.find(g => g.merek === selectedMerek) : null;

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title-gradient" style={{ marginBottom: 0 }}>Gudang Bahan</h1>
        {!initialLoading && (
          <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: '500', fontSize: '0.9rem' }}>
            Total Merek: {filteredBahan.length}
          </div>
        )}
      </div>
      
      <div className="search-bar-container" style={{ marginBottom: '1.5rem', display: 'flex', gap: '10px' }}>
        <div className="search-input-wrapper" style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari merek, produsen, supplier atau sertifikat..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
      </div>

      <div className="table-container glass-card desktop-only">
        <table className="custom-table">
          <thead>
            <tr>
              <th><Package size={16} /> Merek Bahan</th>
              <th><Factory size={16} /> Jumlah Varian Produsen</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              [1, 2, 3].map(n => (
                <tr key={n} className="skeleton-pulse">
                  <td><div className="skeleton" style={{ width: '150px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '100px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '80px', height: '14px', margin: '0 auto' }}></div></td>
                </tr>
              ))
            ) : filteredBahan.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  {searchTerm ? 'Tidak ada bahan yang cocok dengan pencarian.' : 'Belum ada data bahan.'}
                </td>
              </tr>
            ) : (
              filteredBahan.map((group) => (
                <motion.tr key={group.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ cursor: 'pointer' }} onClick={() => setSelectedMerek(group.merek)} className="hover-row">
                  <td><strong style={{ fontSize: '1.1rem' }}>{group.merek}</strong></td>
                  <td>
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 500 }}>
                      {group.variants.length} Varian
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={(e) => { e.stopPropagation(); setSelectedMerek(group.merek); }} className="btn-icon text-accent" title="Lihat Detail" style={{ padding: '6px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Eye size={16} /> Detail
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mobile-card-list mobile-only" style={{ marginTop: '1rem' }}>
        {initialLoading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Memuat...</div>
        ) : filteredBahan.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
            {searchTerm ? 'Tidak ada bahan.' : 'Belum ada data bahan.'}
          </div>
        ) : (
          filteredBahan.map((group) => (
            <div key={group.id} className="mobile-data-card hover-row" onClick={() => setSelectedMerek(group.merek)} style={{ display: 'flex', flexDirection: 'column', cursor: 'pointer', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="mobile-card-name" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{group.merek}</span>
                <span style={{ fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', padding: '4px 10px', borderRadius: '12px', fontWeight: 500 }}>
                  {group.variants.length} Varian
                </span>
              </div>
              <div style={{ fontSize: '0.9rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Eye size={14} /> Ketuk untuk melihat detail produsen
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeGroup && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setSelectedMerek(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="glass-card" 
              style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem', position: 'relative', background: 'linear-gradient(145deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.95) 100%)', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setSelectedMerek(null)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: '50%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}>
                <X size={20} />
              </button>
              
              <h2 style={{ color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '1.8rem', fontWeight: 'bold' }}>
                <Package size={28} color="#60a5fa" /> {activeGroup.merek}
              </h2>
              <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>Menampilkan semua varian produsen untuk merek ini</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {activeGroup.variants.map((bahan, idx) => (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     key={bahan.id} 
                     style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.08)' }}
                   >
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: role === 'superadmin' ? '1.5rem' : '0' }}>
                         <div>
                           <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px' }}><Factory size={14} style={{ marginRight: '6px' }}/> Produsen / Pabrik</span>
                           <strong style={{ fontSize: '1.1rem', color: '#e2e8f0' }}>{bahan.produsen || '-'}</strong>
                         </div>
                         <div>
                           <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px' }}><FileText size={14} style={{ marginRight: '6px' }}/> Sertifikat Halal</span>
                           {bahan.sertifikatHalal ? (
                             <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '4px 10px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500 }}>
                               {bahan.sertifikatHalal}
                             </span>
                           ) : <span style={{ color: '#94a3b8' }}>-</span>}
                         </div>
                         <div>
                           <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px' }}><Calendar size={14} style={{ marginRight: '6px' }}/> Expired Date</span>
                           <span style={{ color: '#e2e8f0' }}>{bahan.expiredDate || '-'}</span>
                         </div>
                         <div>
                           <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px' }}><Truck size={14} style={{ marginRight: '6px' }}/> Supplier / Swalayan</span>
                           <span style={{ color: '#e2e8f0' }}>{bahan.supplier || '-'}</span>
                         </div>
                         <div>
                           <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', marginBottom: '6px' }}><Clock size={14} style={{ marginRight: '6px' }}/> Terakhir Diinput/Digunakan</span>
                           <span style={{ color: '#e2e8f0' }}>{bahan.tanggalInput ? new Date(bahan.tanggalInput).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                         </div>
                      </div>
                      {role === 'superadmin' && (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.25rem' }}>
                          <button onClick={() => handleEdit(bahan)} className="btn-icon text-accent" title="Edit Data" style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '8px 16px', borderRadius: '8px' }}>
                            <Edit3 size={16} style={{ marginRight: '8px' }} /> Edit
                          </button>
                          <button onClick={() => handleDelete(bahan.id)} className="btn-delete" title="Hapus Data" style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '8px 16px', borderRadius: '8px' }}>
                            <Trash2 size={16} style={{ marginRight: '8px' }} /> Hapus
                          </button>
                        </div>
                      )}
                   </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {role === 'superadmin' && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="form-card glass-card mt-8" style={{ maxWidth: '800px', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{editingId ? 'Edit Data Bahan' : 'Tambah Bahan Baru'}</h3>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setFormData({ merek: '', produsen: '', sertifikatHalal: '', expiredDate: '', supplier: '' }); }} className="text-muted" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', fontSize: '0.9rem', padding: '6px 12px', borderRadius: '6px' }}>Batal Edit</button>
            )}
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            
            <div className="input-group" style={{ gridColumn: 'span 2' }}>
              <label>Merek Bahan</label>
              <input type="text" placeholder="Contoh: Tepung Segitiga Biru" value={formData.merek} onChange={(e) => setFormData({...formData, merek: e.target.value})} required style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>
            
            <div className="input-group">
              <label>Produsen / Pabrik</label>
              <input type="text" placeholder="Contoh: PT Bogasari" value={formData.produsen} onChange={(e) => setFormData({...formData, produsen: e.target.value})} required style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>

            <div className="input-group">
              <label>Nomor Sertifikat Halal</label>
              <input type="text" placeholder="Contoh: ID1234567890" value={formData.sertifikatHalal} onChange={(e) => setFormData({...formData, sertifikatHalal: e.target.value})} required style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>

            <div className="input-group">
              <label>Expired Date</label>
              <input type="date" value={formData.expiredDate} onChange={(e) => setFormData({...formData, expiredDate: e.target.value})} required style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>

            <div className="input-group">
              <label>Supplier / Toko Pembelian</label>
              <input type="text" placeholder="Contoh: Toko Berkah" value={formData.supplier} onChange={(e) => setFormData({...formData, supplier: e.target.value})} required style={{ background: 'rgba(0,0,0,0.2)' }} />
            </div>

            <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '0.5rem', padding: '12px', fontSize: '1.05rem', justifyContent: 'center' }} disabled={loading}>
              <PlusCircle size={20} style={{ marginRight: '8px' }} /> {loading ? 'Menyimpan...' : (editingId ? 'Update Data Bahan' : 'Simpan Data Bahan')}
            </button>
          </form>
        </motion.div>
      )}
    </div>
  );
};

export default GudangBahan;
