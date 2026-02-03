import React from 'react';
import Navigation from './Navigation';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Navigation />
      <main role="main">
        <div style={{ marginTop: '80px', marginBottom: '50px', marginLeft: 'auto', marginRight: 'auto', maxWidth: '1200px', padding: '0 15px' }}>
          {children}
        </div>
      </main>
    </>
  );
};

export default Layout;
