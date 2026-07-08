import React, { useState, useCallback, memo } from 'react';
import PopoutModal from './PopoutModal';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationManager from './NotificationManager';
import RunningText from './RunningText';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

// Faster page transition — reduced from 0.3s to 0.18s
const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
};
const pageTransition = { duration: 0.18, ease: 'easeOut' };

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const closeMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const toggleMobileMenu = useCallback(() => setIsMobileMenuOpen(v => !v), []);

  return (
    <div className="layout">
      <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar isOpen={isMobileMenuOpen} onClose={closeMobileMenu} />
      
      <main className="main-content" onClick={closeMobileMenu}>
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
