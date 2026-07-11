import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { auth } from './firebase';

// Lazy load all pages for code splitting - only loads when user navigates to them
const Login = React.lazy(() => import('./pages/Login'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const DataKoordinator = React.lazy(() => import('./pages/DataKoordinator'));
const InputPekerjaan = React.lazy(() => import('./pages/InputPekerjaan'));
const CekPekerjaan = React.lazy(() => import('./pages/CekPekerjaan'));
const VerifikasiPU = React.lazy(() => import('./pages/VerifikasiPU'));
const Selesai = React.lazy(() => import('./pages/Selesai'));
const Setup = React.lazy(() => import('./pages/Setup'));
const DataUser = React.lazy(() => import('./pages/DataUser'));
const RunningTextSettings = React.lazy(() => import('./pages/RunningTextSettings'));
const Chat = React.lazy(() => import('./pages/Chat'));
const PendaftaranSihalal = React.lazy(() => import('./pages/PendaftaranSihalal'));
const GudangBahan = React.lazy(() => import('./pages/GudangBahan'));
const CatatanAkunSihalal = React.lazy(() => import('./pages/CatatanAkunSihalal'));
const ArsipSH = React.lazy(() => import('./pages/ArsipSH'));
const PerbaikanAkunSihalal = React.lazy(() => import('./pages/PerbaikanAkunSihalal'));
const PopoutSettings = React.lazy(() => import('./pages/PopoutSettings'));
const DaftarHalalPublic = React.lazy(() => import('./pages/DaftarHalalPublic'));
const MenuDaftarHalal = React.lazy(() => import('./pages/MenuDaftarHalal'));
const PengumumanAdmin = React.lazy(() => import('./pages/PengumumanAdmin'));
const PengumumanPublic = React.lazy(() => import('./pages/PengumumanPublic'));

// Lightweight loading spinner
const PageLoader = () => (
  <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
    <div style={{ textAlign: 'center' }}>
      <img src="/icon-192x192.png" alt="Loading" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  </div>
);

// Minimal inline loader for nested pages (no full-screen)
const InlineLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
    <img src="/icon-192x192.png" alt="Loading" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', animation: 'spin 1s linear infinite' }} />
    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
  </div>
);

const PendingApproval = () => {
  const { currentUser } = useAuth();
  return (
    <div className="login-page-container">
      <div className="mesh-background"></div>
      <div className="login-card-modern glass-card" style={{ opacity: 1, transform: 'scale(1)' }}>
        <div className="login-header-modern">
          <img src="/icon-192x192.png" alt="P3H" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
          <h1 className="brand-name">MENUNGGU PERSETUJUAN</h1>
          <p className="brand-tagline">Akun sedang diverifikasi oleh Admin</p>
          
          <div className="info-box" style={{ textAlign: 'left', background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b', marginTop: '1.2rem', padding: '1rem', borderRadius: '8px' }}>
            <p style={{ fontSize: '0.9rem', color: 'white' }}>Halo <strong>{currentUser?.email}</strong>,</p>
            <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>Akun Anda telah berhasil didaftarkan. Silahkan hubungi administrator sistem untuk mengaktifkan akses Anda.</p>
          </div>
        </div>
        <button onClick={() => auth.signOut()} className="btn-logout" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
          Keluar dan Gunakan Akun Lain
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, role, loading } = useAuth();

  if (loading) return <PageLoader />;

  if (!currentUser) return <Navigate to="/login" />;
  
  if (role === 'Pending') return <PendingApproval />;

  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/" />;

  return children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
          <Route path="/setup" element={<Suspense fallback={<PageLoader />}><Setup /></Suspense>} />
          <Route path="/daftar" element={<Suspense fallback={<PageLoader />}><DaftarHalalPublic /></Suspense>} />
          <Route path="/pengumuman" element={<Suspense fallback={<PageLoader />}><PengumumanPublic /></Suspense>} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Suspense fallback={<InlineLoader />}><Dashboard /></Suspense>} />
            
            <Route path="koordinator" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin', 'Petugas', 'petugas']}>
                <Suspense fallback={<InlineLoader />}><DataKoordinator /></Suspense>
              </ProtectedRoute>
            } />


            <Route path="users" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Suspense fallback={<InlineLoader />}><DataUser /></Suspense>
              </ProtectedRoute>
            } />

            <Route path="running-text" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Suspense fallback={<InlineLoader />}><RunningTextSettings /></Suspense>
              </ProtectedRoute>
            } />

            <Route path="admin-pengumuman" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <Suspense fallback={<InlineLoader />}><PengumumanAdmin /></Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="input" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin']}>
                <Suspense fallback={<InlineLoader />}><InputPekerjaan /></Suspense>
              </ProtectedRoute>
            } />

            <Route path="pendaftaran" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin']}>
                <Suspense fallback={<InlineLoader />}><PendaftaranSihalal /></Suspense>
              </ProtectedRoute>
            } />

            <Route path="daftar-halal" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin']}>
                <Suspense fallback={<InlineLoader />}><MenuDaftarHalal /></Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="gudang-bahan" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin', 'Petugas', 'petugas', 'Monitoring']}>
                <Suspense fallback={<InlineLoader />}><GudangBahan /></Suspense>
              </ProtectedRoute>
            } />
            
            <Route path="cek" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Petugas', 'petugas']}>
                <Suspense fallback={<InlineLoader />}><CekPekerjaan /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="verifikasi-pu" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Petugas', 'petugas']}>
                <Suspense fallback={<InlineLoader />}><VerifikasiPU /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="selesai" element={<Suspense fallback={<InlineLoader />}><Selesai /></Suspense>} />
            <Route path="perbaikan-akun" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin', 'Petugas', 'petugas', 'Monitoring']}>
                <Suspense fallback={<InlineLoader />}><PerbaikanAkunSihalal /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="catatan-akun" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin', 'Petugas', 'petugas', 'Monitoring']}>
                <Suspense fallback={<InlineLoader />}><CatatanAkunSihalal /></Suspense>
              </ProtectedRoute>
            } />
            <Route path="arsip-sh" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'admin', 'Petugas', 'petugas', 'Monitoring']}>
                <Suspense fallback={<InlineLoader />}><ArsipSH /></Suspense>
                </ProtectedRoute>
              } />
              <Route path="popout-settings" element={<ProtectedRoute allowedRoles={['superadmin']}><Suspense fallback={<InlineLoader />}><PopoutSettings /></Suspense></ProtectedRoute>} />
              <Route path="chat" element={<Suspense fallback={<InlineLoader />}><Chat /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
