import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

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
        <Outlet />
      </main>
    </div>
  );
};


export default Layout;
