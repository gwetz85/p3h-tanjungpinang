import React, { useState, useCallback, memo } from 'react';
import PopoutModal from './PopoutModal';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationManager from './NotificationManager';
import RunningText from './RunningText';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// Ambil preferensi sidebar dari localStorage
const getSavedSidebarState = () => {
  try { return localStorage.getItem('sidebarCollapsed') === 'true'; }
  catch { return false; }
};

// Faster page transition — reduced from 0.3s to 0.18s
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};
const pageTransition = { duration: 0.18, ease: 'easeOut' };

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(getSavedSidebarState);
  const location = useLocation();

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(v => !v), []);

  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try { localStorage.setItem('sidebarCollapsed', String(next)); } catch {}
      return next;
    });
  }, []);

  return (
    <div className={`layout${isSidebarCollapsed ? ' sidebar-collapsed-layout' : ''}`}>
      {/* Tombol toggle mobile */}
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar
        isOpen={isMobileMenuOpen}
        onClose={closeMobileMenu}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
      />
      
      <main
        className="main-content"
        style={{ marginLeft: isSidebarCollapsed ? '72px' : '260px' }}
        onClick={closeMobileMenu}
      >
        <Topbar />
        <div className="layout-content-wrapper">
          <NotificationManager />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              style={{ width: '100%', willChange: 'opacity' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <RunningText />
      <PopoutModal />
    </div>
  );
};

export default memo(Layout);
