import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Info, ShieldCheck, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PositiveList = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const kmaData = [
    {
      kategori: "Bahan Alam: Tumbuhan",
      deskripsi: "Bahan yang berasal dari tumbuhan tanpa proses pengolahan, atau diolah secara fisik tanpa penambahan bahan.",
      contoh: "Buah segar, sayur segar, biji-bijian, kopi biji, teh daun, rempah-rempah kering/segar, umbi-umbian."
    },
    {
      kategori: "Bahan Alam: Hewan Non-Sembelihan",
      deskripsi: "Hewan yang secara syariat tidak memerlukan proses penyembelihan.",
      contoh: "Ikan segar, udang, cumi, gurita, rumput laut, dan hewan air lainnya (segar atau beku tanpa tambahan bahan)."
    },
    {
      kategori: "Bahan Alam: Air dari alam",
      deskripsi: "Air yang bersumber dari alam murni tanpa penambahan zat kimia lainnya.",
      contoh: "Air sumur, air mata air pegunungan, air hujan, air laut."
    },
    {
      kategori: "Bahan Alam: Mikroba",
      deskripsi: "Mikroba yang digunakan untuk proses fermentasi (jika ditumbuhkan pada media yang suci dan halal).",
      contoh: "Ragi tape murni (dengan syarat tertentu)."
    },
    {
      kategori: "Bahan Tambang / Mineral Alam",
      deskripsi: "Bahan-bahan yang diambil dari bumi/tambang tanpa campuran bahan haram.",
      contoh: "Garam laut murni, garam gunung, pasir, kapur, tanah liat."
    },
    {
      kategori: "Bahan Kimia Tidak Berbahaya",
      deskripsi: "Bahan kimia yang proses sintesisnya tidak melibatkan bahan dari babi atau hewan yang tidak disembelih secara syariat.",
      contoh: "Soda kue murni (Baking Soda - Natrium Bikarbonat), gas oksigen, nitrogen."
    }
  ];

  const filteredData = kmaData.filter(item => 
    item.kategori.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.deskripsi.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.contoh.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="title-gradient" style={{ marginBottom: '0.2rem' }}>Positive List</h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            Daftar Bahan yang Dikecualikan dari Kewajiban Bersertifikat Halal (KMA 1360/2021)
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'flex', gap: '12px' }}>
        <Info style={{ color: '#10b981', flexShrink: 0, marginTop: '2px' }} size={20} />
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#10b981' }}>Informasi Regulasi</h4>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
            Berdasarkan Keputusan Menteri Agama (KMA) Nomor 1360 Tahun 2021, terdapat bahan-bahan yang 
            <strong> tidak wajib memiliki Sertifikat Halal </strong> karena dikategorikan sebagai bahan yang aman dan tidak berisiko mengandung bahan yang diharamkan.
            Bahan ini dapat langsung digunakan dalam produksi.
          </p>
        </div>
      </div>

      <div className="search-bar-container" style={{ marginBottom: '1.5rem' }}>
        <div className="search-input-wrapper" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Cari kategori, deskripsi, atau contoh bahan..." 
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
              <th><BookOpen size={16} /> Kategori Jenis Barang</th>
              <th><Info size={16} /> Penjelasan Singkat</th>
              <th><ShieldCheck size={16} /> Contoh Bahan</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                  Tidak ada data yang cocok dengan pencarian.
                </td>
              </tr>
            ) : (
              filteredData.map((item, idx) => (
                <motion.tr key={idx} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.05 }}>
                  <td style={{ fontWeight: '600', color: '#60a5fa' }}>{item.kategori}</td>
                  <td style={{ fontSize: '0.9rem' }}>{item.deskripsi}</td>
                  <td style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>{item.contoh}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile view */}
      <div className="mobile-job-cards mobile-only">
        {filteredData.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
            Tidak ada data.
          </div>
        ) : (
          filteredData.map((item, idx) => (
            <div key={idx} className="visit-card-compact glass-card" style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h4 style={{ margin: '0', fontSize: '1.05rem', fontWeight: '700', color: '#60a5fa', lineHeight: '1.3' }}>
                {item.kategori}
              </h4>
              <p style={{ margin: '0.2rem 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                {item.deskripsi}
              </p>
              <div style={{ marginTop: '0.5rem', padding: '0.8rem', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem' }}>
                <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--text-muted)' }}>Contoh:</strong>
                <span style={{ fontStyle: 'italic' }}>{item.contoh}</span>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default PositiveList;
