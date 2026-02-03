import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import config from '../../config/explorer';
import logo from '../../assets/logo.png';
import {
  faTachometerAlt,
  faCubes,
  faMoneyBillAlt,
  faTools,
  faChartBar,
  faSearch,
  faBars,
  faTimes,
  faHandHoldingDollar
} from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

interface NavItem {
  path: string;
  label: string;
  icon: IconDefinition;
  mobileOnly?: boolean;
}

const Navigation: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', icon: faTachometerAlt },
    { path: '/blocks', label: 'Blocks', icon: faCubes },
    { path: '/transactions', label: 'Transactions', icon: faMoneyBillAlt },
    { path: '/richlist', label: 'Richlist', icon: faChartBar },
    { path: '/staking', label: 'Staking', icon: faHandHoldingDollar },
    { path: '/tools', label: 'Tools', icon: faTools },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
    setSearchTerm('');
    setMobileMenuOpen(false);
  };

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        background: '#282729',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', paddingLeft: '24px', width: '100%' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            height: '64px',
            width: '100%'
          }}>
            {/* Logo */}
            <Link
              to="/"
              className="navbar-brand-custom"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                textDecoration: 'none',
                fontSize: '1.25rem',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.5px',
                flexShrink: 0,
                marginRight: '24px'
              }}
            >
              <img
                src={logo}
                alt={config.name}
                style={{
                  width: '27px',
                  height: '27px',
                  borderRadius: '6px',
                  objectFit: 'contain'
                }}
              />
              <span className="logo-text">
                <span style={{ color: 'rgb(255 192 251)' }}>Pas</span>tella
              </span>
            </Link>

            {/* Desktop Menu */}
            <div className="desktop-menu" style={{
              flex: 1,
              minWidth: 0
            } as React.CSSProperties}>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    color: isActive(item.path) ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.7)',
                    background: isActive(item.path) ? 'rgba(255, 192, 251, 0.1)' : 'transparent',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                    }
                  }}
                >
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize: '0.875rem' }} />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Search & Mobile Menu Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, marginLeft: 'auto', paddingRight: '24px' }}>
              {/* Search Bar (Desktop - Inline) */}
              <div className="search-container-desktop">
                <div style={{ position: 'relative', width: '300px', minWidth: 0 }}>
                  <FontAwesomeIcon
                    icon={faSearch}
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'rgba(255, 255, 255, 0.5)',
                      fontSize: '0.875rem',
                      pointerEvents: 'none'
                    }}
                  />
                  <input
                    type="text"
                    placeholder={`Search by TXID, block, or ${config.ticker} address...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchTerm.trim()) {
                        navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
                        setSearchTerm('');
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      background: 'rgba(0, 0, 0, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.5)'}
                    onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
                  />
                </div>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="mobile-menu-toggle"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                } as React.CSSProperties}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
              >
                <FontAwesomeIcon icon={mobileMenuOpen ? faTimes : faBars} style={{ fontSize: '1rem' }} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              backdropFilter: 'blur(4px)',
              zIndex: 999,
              animation: 'fadeIn 0.3s ease'
            }}
          />
          <div style={{
            position: 'fixed',
            top: 0,
            right: 0,
            bottom: 0,
            width: '300px',
            maxWidth: '85vw',
            background: '#282729',
            zIndex: 1000,
            boxShadow: '-4px 0 30px rgba(0, 0, 0, 0.5)',
            animation: 'slideInRight 0.3s ease',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            {/* Mobile Menu Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#ffffff'
              }}>
                <img
                  src={logo}
                  alt={config.name}
                  style={{
                    width: '27px',
                    height: '27px',
                    borderRadius: '6px',
                    objectFit: 'contain'
                  }}
                />
                <span style={{ color: 'rgb(255 192 251)' }}>Pas</span>tella
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: 'none',
                  borderRadius: '6px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <FontAwesomeIcon icon={faTimes} style={{ fontSize: '0.875rem' }} />
              </button>
            </div>

            {/* Search Bar (Mobile) */}
            <div style={{ padding: '16px 24px' }}>
              <form onSubmit={handleSearch} style={{ position: 'relative' }}>
                <FontAwesomeIcon
                  icon={faSearch}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '0.875rem'
                  }}
                />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px 12px 12px 44px',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '0.875rem',
                    outline: 'none'
                  }}
                />
              </form>
            </div>

            {/* Navigation Items */}
            <div style={{ flex: 1, padding: '8px 0' }}>
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    setMobileMenuOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 24px',
                    textDecoration: 'none',
                    fontSize: '0.9375rem',
                    fontWeight: 500,
                    color: isActive(item.path) ? 'rgb(255 192 251)' : 'rgba(255, 255, 255, 0.8)',
                    background: isActive(item.path) ? 'rgba(255, 192, 251, 0.1)' : 'transparent',
                    borderLeft: isActive(item.path) ? '3px solid rgb(200, 130, 200)' : '3px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.path)) {
                      e.currentTarget.style.background = 'transparent';
                    }
                  }}
                >
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize: '1rem', width: '20px', textAlign: 'center' }} />
                  {item.label}
                </Link>
              ))}
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              fontSize: '0.75rem',
              color: 'rgba(255, 255, 255, 0.5)',
              textAlign: 'center'
            }}>
              © 2026 {config.name} Explorer
            </div>
          </div>
        </>
      )}

      {/* Add spacing for main content */}
      <div style={{ height: '64px' }} />

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        .logo-text {
          display: none;
        }

        @media (min-width: 768px) {
          .logo-text {
            display: block;
          }
        }

        .desktop-menu {
          display: none;
        }

        @media (min-width: 1024px) {
          .desktop-menu {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            flex: 1;
            min-width: 0;
          }
        }

        @media (min-width: 1024px) {
          .desktop-menu a {
            padding: 6px 10px !important;
            font-size: 0.8rem !important;
          }
        }

        @media (max-width: 1200px) {
          .desktop-menu a {
            padding: 6px 8px !important;
            font-size: 0.75rem !important;
          }
          .desktop-menu span {
            display: none;
          }
        }

        .search-container-desktop {
          display: none;
        }

        @media (min-width: 1024px) {
          .search-container-desktop {
            display: flex;
            flex: 0 0 auto;
          }
        }

        @media (max-width: 1300px) {
          .search-container-desktop input {
            width: 250px !important;
          }
        }

        @media (max-width: 1150px) {
          .search-container-desktop input {
            width: 200px !important;
          }
        }

        @media (max-width: 1050px) {
          .search-container-desktop input {
            width: 150px !important;
          }
        }

        .mobile-menu-toggle {
          display: flex;
        }

        @media (min-width: 1024px) {
          .mobile-menu-toggle {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};

export default Navigation;
