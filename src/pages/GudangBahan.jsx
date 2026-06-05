import React, { useState, useEffect } from 'react';
import { rtdb } from '../firebase';
import { ref, push, onValue, remove, update } from 'firebase/database';
import { motion } from 'framer-motion';
import { Package, Search, PlusCircle, Edit3, Trash2, Calendar, FileText, Factory, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const GudangBahan = () => {
  const { role } = useAuth();
  const [bahanList, setBahanList] = useState([]);
  const [filteredBahan, setFilteredBahan] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
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
        
        // Grouping logic to remove duplicates and keep the most complete data
        const grouped = [];
        
        const getScore = (item) => {
          let score = 0;
          if (item.merek) score += 1;
          if (item.produsen) score += 2;
          if (item.sertifikatHalal) score += 3;
          if (item.expiredDate) score += 1;
          if (item.supplier) score += 1;
          return score;
        };

        const getWords = (str) => {
          return (str || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2 && !['merk', 'merek', 'cap', 'dan', 'pt', 'cv'].includes(w));
        };

        const isSimilar = (a, b) => {
          if (a.sertifikatHalal && b.sertifikatHalal && a.sertifikatHalal === b.sertifikatHalal) return true;
          
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
            grouped.push({ ...item });
          } else {
            const existingScore = getScore(grouped[foundIdx]);
            const newScore = getScore(item);
            
            if (newScore > existingScore) {
              // Keep the new more complete item, but preserve original ID for DB operations
              const oldId = grouped[foundIdx].id;
              grouped[foundIdx] = { ...item, id: oldId };
            } else if (newScore === existingScore) {
              // Merge missing fields just in case
              if (!grouped[foundIdx].produsen && item.produsen) grouped[foundIdx].produsen = item.produsen;
              if (!grouped[foundIdx].expiredDate && item.expiredDate) grouped[foundIdx].expiredDate = item.expiredDate;
              if (!grouped[foundIdx].supplier && item.supplier) grouped[foundIdx].supplier = item.supplier;
              if (!grouped[foundIdx].sertifikatHalal && item.sertifikatHalal) grouped[foundIdx].sertifikatHalal = item.sertifikatHalal;
            }
          }
        });

        // Sort descending by input date
        grouped.sort((a, b) => (b.tanggalInput || 0) - (a.tanggalInput || 0));
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
      const filtered = bahanList.filter(bahan => 
        (bahan.merek && bahan.merek.toLowerCase().includes(lowercasedTerm)) ||
        (bahan.produsen && bahan.produsen.toLowerCase().includes(lowercasedTerm)) ||
        (bahan.sertifikatHalal && bahan.sertifikatHalal.toLowerCase().includes(lowercasedTerm)) ||
        (bahan.supplier && bahan.supplier.toLowerCase().includes(lowercasedTerm))
      );
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
  };

  return (
    <div className="page-container">
      <h1 className="title-gradient mb-8">Gudang Bahan</h1>
      
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
              <th><Factory size={16} /> Produsen</th>
              <th><FileText size={16} /> Sertifikat Halal</th>
              <th><Calendar size={16} /> Expired Date</th>
              <th><Truck size={16} /> Supplier</th>
              <th style={{ textAlign: 'center' }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading ? (
              [1, 2, 3].map(n => (
                <tr key={n} className="skeleton-pulse">
                  <td><div className="skeleton" style={{ width: '120px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '100px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '120px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '80px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '100px', height: '14px' }}></div></td>
                  <td><div className="skeleton" style={{ width: '60px', height: '14px', margin: '0 auto' }}></div></td>
                </tr>
              ))
            ) : filteredBahan.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                  {searchTerm ? 'Tidak ada bahan yang cocok dengan pencarian.' : 'Belum ada data bahan.'}
                </td>
              </tr>
            ) : (
              filteredBahan.map((bahan) => (
                <motion.tr key={bahan.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <td><strong>{bahan.merek || '-'}</strong></td>
                  <td>{bahan.produsen || '-'}</td>
                  <td>
                    {bahan.sertifikatHalal ? (
                      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        {bahan.sertifikatHalal}
                      </span>
                    ) : '-'}
                  </td>
                  <td>{bahan.expiredDate || '-'}</td>
                  <td>{bahan.supplier || '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => handleEdit(bahan)} className="btn-icon text-accent" title="Edit" style={{ marginRight: '0.5rem' }}>
                      <Edit3 size={18} />
                    </button>
                    <button onClick={() => handleDelete(bahan.id)} className="btn-delete" title="Hapus">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card Layout */}
      <div className="mobile-job-cards mobile-only">
        {initialLoading ? (
          [1, 2, 3].map(n => (
             <div key={n} className="visit-card-compact glass-card skeleton-pulse" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="skeleton" style={{ width: '150px', height: '16px' }}></div>
                <div className="skeleton" style={{ width: '100px', height: '14px' }}></div>
             </div>
          ))
        ) : filteredBahan.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            {searchTerm ? 'Tidak ada bahan.' : 'Belum ada data bahan.'}
          </div>
        ) : (
          filteredBahan.map((bahan) => (
            <div key={bahan.id} className="visit-card-compact glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h4 style={{ margin: '0', fontSize: '1.1rem', color: 'white' }}>{bahan.merek || '-'}</h4>
                {bahan.sertifikatHalal ? (
                  <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                    {bahan.sertifikatHalal}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>-</span>
                )}
              </div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Factory size={14} /> {bahan.produsen || '-'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Calendar size={14} /> Exp: {bahan.expiredDate || '-'}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Truck size={14} /> Sup: {bahan.supplier || '-'}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px' }}>
                <button onClick={() => handleEdit(bahan)} className="btn-primary-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem' }}>
                  <Edit3 size={16} /> Edit
                </button>
                <button onClick={() => handleDelete(bahan.id)} className="btn-danger-outline" style={{ flex: 1, padding: '8px', fontSize: '0.9rem', justifyContent: 'center' }}>
                  <Trash2 size={16} /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="form-card glass-card mt-8" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>{editingId ? 'Edit Data Bahan' : 'Tambah Bahan Baru'}</h3>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({ merek: '', produsen: '', sertifikatHalal: '', expiredDate: '', supplier: '' }); }} className="text-muted" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.9rem' }}>Batal</button>
          )}
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          
          <div className="input-group" style={{ gridColumn: 'span 2' }}>
            <label>Merek Bahan</label>
            <input type="text" placeholder="Contoh: Tepung Segitiga Biru" value={formData.merek} onChange={(e) => setFormData({...formData, merek: e.target.value})} required />
          </div>
          
          <div className="input-group">
            <label>Produsen / Pabrik</label>
            <input type="text" placeholder="Contoh: PT Bogasari" value={formData.produsen} onChange={(e) => setFormData({...formData, produsen: e.target.value})} required />
          </div>

          <div className="input-group">
            <label>Nomor Sertifikat Halal</label>
            <input type="text" placeholder="Contoh: ID1234567890" value={formData.sertifikatHalal} onChange={(e) => setFormData({...formData, sertifikatHalal: e.target.value})} required />
          </div>

          <div className="input-group">
            <label>Expired Date</label>
            <input type="date" value={formData.expiredDate} onChange={(e) => setFormData({...formData, expiredDate: e.target.value})} required />
          </div>

          <div className="input-group">
            <label>Supplier / Toko Pembelian</label>
            <input type="text" placeholder="Contoh: Toko Berkah" value={formData.supplier} onChange={(e) => setFormData({...formData, supplier: e.target.value})} required />
          </div>

          <button type="submit" className="btn-primary" style={{ gridColumn: 'span 2', marginTop: '0.5rem' }} disabled={loading}>
            <PlusCircle size={18} /> {loading ? 'Menyimpan...' : (editingId ? 'Update Data Bahan' : 'Simpan Data Bahan')}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default GudangBahan;
