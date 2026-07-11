export default function Sidebar({ currentPage, setCurrentPage, selectedTournamentId, isCollapsed, setIsCollapsed, isMobileOpen, setIsMobileOpen, user }) {
  const handleNav = (page) => {
    setCurrentPage(page);
    setIsMobileOpen(false); // close mobile sidebar on nav
  };

  const isAdminOrEditor = user && (user.role === 'admin' || user.role === 'editor');

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header">
        <button 
          className="menu-toggle-btn" 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          aria-label="Toggle Menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
        <span className="mobile-title">Tournaments Tracker</span>
      </header>

      {/* Backdrop for mobile view */}
      {isMobileOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsMobileOpen(false)}></div>
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          {!isCollapsed && <span className="logo-text">Tracker</span>}
          {isCollapsed && <span className="logo-text-short">TT</span>}
          <button 
            className="collapse-toggle-btn desktop-only" 
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            )}
          </button>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-item ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => handleNav('home')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            {!isCollapsed && <span className="nav-label">Home</span>}
          </button>

          {selectedTournamentId && (
            <button 
              className={`nav-item ${currentPage === 'divisions' ? 'active' : ''}`}
              onClick={() => handleNav('divisions')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="9" rx="1"></rect>
                <rect x="14" y="3" width="7" height="5" rx="1"></rect>
                <rect x="14" y="12" width="7" height="9" rx="1"></rect>
                <rect x="3" y="16" width="7" height="5" rx="1"></rect>
              </svg>
              {!isCollapsed && <span className="nav-label">Divisions</span>}
            </button>
          )}

          {selectedTournamentId && (
            <button 
              className={`nav-item ${currentPage === 'players' ? 'active' : ''}`}
              onClick={() => handleNav('players')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              {!isCollapsed && <span className="nav-label">Players & Teams</span>}
            </button>
          )}

          {selectedTournamentId && (
            <button 
              className={`nav-item ${currentPage === 'matches' ? 'active' : ''}`}
              onClick={() => handleNav('matches')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
              {!isCollapsed && <span className="nav-label">Matches</span>}
            </button>
          )}

          {selectedTournamentId && isAdminOrEditor && (
            <button 
              className={`nav-item ${currentPage === 'add-result' ? 'active' : ''}`}
              onClick={() => handleNav('add-result')}
              style={!isCollapsed ? { paddingLeft: '2.5rem', width: 'calc(100% - 1.5rem)', marginLeft: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' } : {}}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              {!isCollapsed && <span className="nav-label">Add Result</span>}
            </button>
          )}

          {selectedTournamentId && (
            <button 
              className={`nav-item ${currentPage === 'standings' ? 'active' : ''}`}
              onClick={() => handleNav('standings')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
                <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
                <path d="M4 22h16"></path>
                <path d="M10 14.66V17c0 .55-.45 1-1 1H4v2h16v-2h-5c-.55 0-1-.45-1-1v-2.34"></path>
                <path d="M12 2a6 6 0 0 0-6 6v3.5c0 1.93 1.57 3.5 3.5 3.5h5c1.93 0 3.5-1.57 3.5-3.5V8a6 6 0 0 0-6-6z"></path>
              </svg>
              {!isCollapsed && <span className="nav-label">Standings</span>}
            </button>
          )}
          
          {currentPage !== 'login' && (
            <button 
              className="nav-item logout"
              onClick={() => handleNav('login')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              {!isCollapsed && <span className="nav-label">Log Out</span>}
            </button>
          )}
        </nav>
      </aside>
    </>
  );
}
