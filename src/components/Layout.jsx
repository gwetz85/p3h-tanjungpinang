import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import NotificationManager from './NotificationManager';

import { Menu, X } from 'lucide-react';

const Layout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <div className="layout">
      {/* Tombol Mobile Menu */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <Sidebar isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      
      <main className="main-content" onClick={() => setIsMobileMenuOpen(false)}>
        <Topbar />
        <div className="layout-content-wrapper">
          <NotificationManager />
          <Outlet />
        </div>
      </main>
    </div>
  );
};


export default Layout;
