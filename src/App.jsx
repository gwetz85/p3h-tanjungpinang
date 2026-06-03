import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DataKoordinator from './pages/DataKoordinator';
import InputPekerjaan from './pages/InputPekerjaan';
import CekPekerjaan from './pages/CekPekerjaan';
import Selesai from './pages/Selesai';
import Setup from './pages/Setup';
import DataUser from './pages/DataUser';
import RunningTextSettings from './pages/RunningTextSettings';
import Chat from './pages/Chat';
import PendaftaranSihalal from './pages/PendaftaranSihalal';
import { motion } from 'framer-motion';
import { Clock, Award } from 'lucide-react';
import { auth } from './firebase';


const PendingApproval = () => {
  const { currentUser } = useAuth();
  return (
    <div className="login-page-container">
      <div className="mesh-background"></div>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="login-card-modern glass-card"
      >
        <div className="login-header-modern">
          <img src="/logo-p3h.png" alt="P3H" style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', marginBottom: '0.5rem', boxShadow: '0 4px 15px rgba(0,0,0,0.2)' }} />
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
      </motion.div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { currentUser, role, loading } = useAuth();

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <img src="/logo-p3h.png" alt="Loading" style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
      </motion.div>
    </div>
  );

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
          <Route path="/login" element={<Login />} />
          <Route path="/setup" element={<Setup />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            
            <Route path="koordinator" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'Petugas']}>
                <DataKoordinator />
              </ProtectedRoute>
            } />


            <Route path="users" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <DataUser />
              </ProtectedRoute>
            } />

            <Route path="running-text" element={
              <ProtectedRoute allowedRoles={['superadmin']}>
                <RunningTextSettings />
              </ProtectedRoute>
            } />

            
            <Route path="input" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin']}>
                <InputPekerjaan />
              </ProtectedRoute>
            } />

            <Route path="pendaftaran" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin']}>
                <PendaftaranSihalal />
              </ProtectedRoute>
            } />
            
            <Route path="cek" element={
              <ProtectedRoute allowedRoles={['superadmin', 'Admin', 'Petugas']}>
                <CekPekerjaan />
              </ProtectedRoute>
            } />
            <Route path="selesai" element={<Selesai />} />
            <Route path="chat" element={<Chat />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
