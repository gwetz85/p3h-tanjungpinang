import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Info, ShieldCheck, Search, ChevronDown, ChevronRight, Layers } from 'lucide-react';

const PositiveList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState({});

  // Detailed KMA 1360/2021 Data Structure
  const kmaData = [
    {
      kategoriUtama: "1. Bahan Berasal dari Alam (Kelompok Tumbuhan)",
      deskripsi: "Bahan dari tumbuhan tanpa proses pengolahan, atau diolah secara fisik tanpa penambahan bahan penolong/tambahan.",
      rincian: [
        { sub: "Buah-buahan", bahan: "Semua jenis buah segar, buah potong segar, buah kering alami, buah beku." },
        { sub: "Sayuran", bahan: "Semua jenis sayur segar, sayur potong segar, sayur kering alami, sayur beku." },
        { sub: "Serealia", bahan: "Beras (putih, merah, hitam), ketan, jagung (biji, pipil, tongkol), gandum utuh, sorgum, jali, haver (oat) utuh." },
        { sub: "Kacang-kacangan", bahan: "Kacang tanah, kedelai, kacang hijau, kacang merah, kacang mede, kacang almond, kacang arab." },
        { sub: "Umbi-umbian", bahan: "Singkong, ubi jalar, kentang, talas, gembili, bengkuang, porang, umbi garut." },
        { sub: "Rempah-rempah & Bumbu", bahan: "Bawang (merah, putih, bombay), cabai, jahe, kunyit, lengkuas, serai, lada, ketumbar, jintan, kapulaga, kayu manis, cengkeh, pala, vanili utuh." },
        { sub: "Biji-bijian & Kopi/Teh", bahan: "Kopi biji (green bean, roasted bean murni), daun teh segar/kering murni, biji cokelat (kakao) murni, biji selasih, biji wijen." },
        { sub: "Produk Olahan Fisik", bahan: "Tepung beras murni, tepung singkong (tapioka) murni, tepung jagung (maizena) murni, gaplek, kopra." },
        { sub: "Hasil Getah/Eksudat", bahan: "Getah karet, gum arab, resin alami." }
      ]
    },
    {
      kategoriUtama: "2. Bahan Berasal dari Alam (Kelompok Hewan Non-Sembelihan)",
      deskripsi: "Bahan dari hewan yang habitatnya di air dan hewan non-sembelihan lain yang halal, tanpa pengolahan tambahan bahan haram.",
      rincian: [
        { sub: "Ikan & Hewan Air", bahan: "Semua jenis ikan segar/beku (air tawar, payau, laut), udang, kepiting, cumi-cumi, gurita, kerang, tripang segar/beku." },
        { sub: "Produk Hewani Langsung", bahan: "Susu perah segar murni (sapi, kambing, domba, unta), telur unggas segar (ayam, bebek, burung puyuh), madu lebah murni, propolis murni, royal jelly." },
        { sub: "Hewan Laut Lainnya", bahan: "Rumput laut segar/kering (Gracilaria, Eucheuma), agar-agar alami." }
      ]
    },
    {
      kategoriUtama: "3. Bahan Berasal dari Alam (Kelompok Air & Mineral)",
      deskripsi: "Air dan mineral alami dari bumi yang tidak mengalami proses kimiawi dengan bahan haram/najis.",
      rincian: [
        { sub: "Air Alami", bahan: "Air sumur, air mata air pegunungan, air sungai/danau murni, air hujan, air embun, air laut, es batu murni." },
        { sub: "Mineral & Tambang", bahan: "Garam laut murni, garam gunung murni, pasir vulkanik, kapur (kalsium karbonat alami), tanah liat (clay), kaolin, bentonit." }
      ]
    },
    {
      kategoriUtama: "4. Bahan Kimia & Hasil Sintesis (Tidak Berbahaya & Tidak Berisiko)",
      deskripsi: "Bahan kimia yang proses pembuatannya dipastikan tidak menggunakan turunan hewan haram atau bahan najis.",
      rincian: [
        { sub: "Gas & Udara", bahan: "Gas oksigen (O2), nitrogen (N2), karbon dioksida (CO2), hidrogen (H2), udara tekan murni." },
        { sub: "Bahan Kimia Anorganik", bahan: "Natrium klorida (NaCl), Natrium bikarbonat (Baking Soda), Kalsium oksida, Natrium hidroksida, Asam fosfat (sintetik murni)." },
        { sub: "Zat Pelarut & Media", bahan: "Air demineralisasi, air untuk injeksi (Water for Injection), etanol murni (jika bukan dari industri khamr/minuman keras untuk keperluan non-konsumsi langsung secara syariat)." }
      ]
    },
    {
      kategoriUtama: "5. Bahan Kelompok Mikroba",
      deskripsi: "Mikroba yang digunakan untuk starter/fermentasi yang dipelihara pada media halal dan suci.",
      rincian: [
        { sub: "Ragi & Starter", bahan: "Ragi tape tradisional (murni dari bahan alam), kultur bakteri asam laktat (Lactobacillus sp.) murni tanpa media haram." }
      ]
    }
  ];

  const toggleCategory = (idx) => {
    setExpandedCategories(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const getFilteredData = () => {
    if (!searchTerm) return kmaData;
    
    const lowerSearch = searchTerm.toLowerCase();
    
    return kmaData.map(group => {
      // Check if group title or desc matches
      if (group.kategoriUtama.toLowerCase().includes(lowerSearch) || 
          group.deskripsi.toLowerCase().includes(lowerSearch)) {
        return group; // Return whole group if title matches
      }
      
      // Filter rincian
      const filteredRincian = group.rincian.filter(item => 
        item.sub.toLowerCase().includes(lowerSearch) || 
        item.bahan.toLowerCase().includes(lowerSearch)
      );
      
      if (filteredRincian.length > 0) {
        return { ...group, rincian: filteredRincian };
      }
      
      return null;
    }).filter(group => group !== null);
  };

  const filteredData = getFilteredData();

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="title-gradient" style={{ marginBottom: '0.2rem' }}>Daftar Terperinci Positive List</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Rincian Lengkap Bahan Dikecualikan Sertifikat Halal (KMA No. 1360 Tahun 2021)
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '12px' }}>
        <Info style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} size={20} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Informasi Regulasi</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Berdasarkan Keputusan Menteri Agama (KMA) Nomor 1360 Tahun 2021, daftar di bawah ini adalah rincian bahan yang 
            <strong> tidak wajib memiliki Sertifikat Halal </strong> karena dikategorikan sebagai bahan yang aman dari risiko tidak halal.
          </p>
        </div>
      </div>

      <div className="search-bar-container" style={{ marginBottom: '1.5rem' }}>
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari rincian bahan, sayur, buah, atau nama spesifik..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: 'white' }}
          />
        </div>
      </div>

      <div className="positive-list-container">
        {filteredData.length === 0 ? (
           <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
             Tidak ada rincian bahan yang cocok dengan pencarian "{searchTerm}".
           </div>
        ) : (
          filteredData.map((group, gIdx) => {
            // Expand automatically if searching, otherwise use state
            const isExpanded = searchTerm ? true : expandedCategories[gIdx] !== false;
            
            return (
              <motion.div 
                key={gIdx} 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                transition={{ delay: gIdx * 0.05 }}
                className="glass-card"
                style={{ marginBottom: '1rem', overflow: 'hidden' }}
              >
                <div 
                  onClick={() => toggleCategory(gIdx)}
                  style={{ 
                    padding: '1.2rem', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: 'rgba(0,0,0,0.1)',
                    borderBottom: isExpanded ? '1px solid rgba(255,255,255,0.05)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <Layers size={20} style={{ color: '#60a5fa', marginTop: '2px' }} />
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem 0', color: '#60a5fa', fontSize: '1.1rem' }}>{group.kategoriUtama}</h3>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{group.deskripsi}</p>
                    </div>
                  </div>
                  <div style={{ color: 'var(--text-muted)' }}>
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ padding: '0' }}>
                    <table className="custom-table" style={{ margin: 0, background: 'transparent' }}>
                      <thead style={{ background: 'rgba(255,255,255,0.02)' }}>
                        <tr>
                          <th style={{ width: '30%', paddingLeft: '1.5rem' }}>Sub Kategori</th>
                          <th>Rincian Bahan (Contoh Spesifik)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rincian.map((item, iIdx) => (
                          <tr key={iIdx} style={{ borderBottom: iIdx === group.rincian.length - 1 ? 'none' : '' }}>
                            <td style={{ paddingLeft: '1.5rem', fontWeight: '500', color: 'var(--text)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ShieldCheck size={14} style={{ color: '#10b981' }} />
                                {item.sub}
                              </div>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.5' }}>
                              {item.bahan}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PositiveList;
