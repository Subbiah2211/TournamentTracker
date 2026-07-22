import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Home from './components/Home';
import TournamentDetails from './components/TournamentDetails';
import TournamentForm from './components/TournamentForm';
import Divisions from './components/Divisions';
import Players from './components/Players';
import Matches from './components/Matches';
import AddResult from './components/AddResult';
import Standings from './components/Standings';
import Courts from './components/Courts';
import GuestAccessModal from './components/GuestAccessModal';
import { API_BASE_URL } from './config';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [guestSession, setGuestSession] = useState(null);

  // Router specific state
  const [selectedTournamentId, setSelectedTournamentId] = useState(null);
  const [previousPage, setPreviousPage] = useState({ page: 'home', id: null });
  const [redirectAfterLogin, setRedirectAfterLogin] = useState(null);
  const [currentSearchQuery, setCurrentSearchQuery] = useState(window.location.search);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null
  const [message, setMessage] = useState('');

  // Routing navigation helper
  const navigate = (page, params = {}, replace = false) => {
    let url = '/';
    if (page === 'tour-details' && params.id) {
      url = `/tour-details?id=${params.id}`;
    } else if (page === 'create-tournament') {
      url = '/create-tournament';
    } else if (page === 'edit-tournament' && params.id) {
      url = `/edit-tournament?id=${params.id}`;
    } else if (page === 'divisions') {
      const tId = params.tournamentId || selectedTournamentId;
      url = `/divisions?tournamentId=${tId}`;
      if (params.divisionId) {
        url += `&divisionId=${params.divisionId}`;
      }
      if (params.action) {
        url += `&action=${params.action}`;
      }
    } else if (page === 'players') {
      const tId = params.tournamentId || selectedTournamentId;
      url = `/players?tournamentId=${tId}`;
    } else if (page === 'matches') {
      const tId = params.tournamentId || selectedTournamentId;
      url = `/matches?tournamentId=${tId}`;
      if (params.divisionId) {
        url += `&divisionId=${params.divisionId}`;
      }
    } else if (page === 'add-result') {
      const tId = params.tournamentId || selectedTournamentId;
      url = `/add-result?tournamentId=${tId}`;
      if (params.matchId) {
        url += `&matchId=${params.matchId}`;
      }
    } else if (page === 'standings') {
      const tId = params.tournamentId || selectedTournamentId;
      url = `/standings?tournamentId=${tId}`;
    } else if (page === 'home') {
      url = '/home';
    } else if (page === 'courts') {
      url = '/courts';
    } else if (page === 'login') {
      url = '/';
    }

    if (replace) {
      window.history.replaceState({ page, ...params }, '', url);
    } else {
      window.history.pushState({ page, ...params }, '', url);
    }

    // Capture previous page info before switching (useful for cancel button redirection)
    if (page === 'create-tournament' || page === 'edit-tournament') {
      setPreviousPage({ page: currentPage, id: selectedTournamentId });
    }

    setCurrentPage(page);
    
    // Set active tournament ID context
    if (page === 'divisions' || page === 'players' || page === 'matches' || page === 'add-result' || page === 'standings') {
      setSelectedTournamentId(params.tournamentId || selectedTournamentId);
    } else if (params.id) {
      setSelectedTournamentId(params.id);
    } else if (page === 'home' || page === 'login') {
      setSelectedTournamentId(null);
    }

    // Capture and set new query parameters to trigger layout re-renders
    const queryStart = url.indexOf('?');
    const searchPart = queryStart !== -1 ? url.substring(queryStart) : '';
    setCurrentSearchQuery(searchPart);
  };

  // URL Popstate Sync & Initial Load Router
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;

      let targetPage = 'home';
      let targetId = null;
      let targetTournamentId = null;
      let targetDivisionId = null;

      if (path === '/tour-details') {
        targetPage = 'tour-details';
        targetId = params.get('id');
      } else if (path === '/edit-tournament') {
        targetPage = 'edit-tournament';
        targetId = params.get('id');
      } else if (path === '/create-tournament') {
        targetPage = 'create-tournament';
      } else if (path === '/divisions') {
        targetPage = 'divisions';
        targetTournamentId = params.get('tournamentId');
        targetDivisionId = params.get('divisionId');
      } else if (path === '/players') {
        targetPage = 'players';
        targetTournamentId = params.get('tournamentId');
      } else if (path === '/matches') {
        targetPage = 'matches';
        targetTournamentId = params.get('tournamentId');
      } else if (path === '/add-result') {
        targetPage = 'add-result';
        targetTournamentId = params.get('tournamentId');
      } else if (path === '/standings') {
        targetPage = 'standings';
        targetTournamentId = params.get('tournamentId');
      } else if (path === '/courts') {
        targetPage = 'courts';
      } else if (path === '/home') {
        targetPage = 'home';
      } else if (path === '/') {
        targetPage = 'login';
      }

      setCurrentSearchQuery(window.location.search);

      const isGuestAllowedPage = targetPage === 'matches' || targetPage === 'add-result';
      if (!user && targetPage !== 'login' && !isGuestAllowedPage) {
        setRedirectAfterLogin({ 
          page: targetPage, 
          params: { 
            id: targetId, 
            tournamentId: targetTournamentId, 
            divisionId: targetDivisionId 
          } 
        });
        setCurrentPage('login');
      } else {
        setCurrentPage(targetPage);
        if (targetPage === 'divisions' || targetPage === 'players' || targetPage === 'matches' || targetPage === 'add-result' || targetPage === 'standings') {
          setSelectedTournamentId(targetTournamentId);
        } else if (targetId) {
          setSelectedTournamentId(targetId);
        } else {
          setSelectedTournamentId(null);
        }
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initial routing logic check deferred to avoid synchronous setState warning
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const path = window.location.pathname;
      
      const isGuestAllowedPath = path === '/matches' || path === '/add-result';
      if (path !== '/' && !user && !isGuestAllowedPath) {
        let targetPage = 'home';
        let targetId = null;
        let targetTournamentId = null;
        let targetDivisionId = null;

        if (path === '/tour-details') {
          targetPage = 'tour-details';
          targetId = params.get('id');
        } else if (path === '/edit-tournament') {
          targetPage = 'edit-tournament';
          targetId = params.get('id');
        } else if (path === '/create-tournament') {
          targetPage = 'create-tournament';
        } else if (path === '/divisions') {
          targetPage = 'divisions';
          targetTournamentId = params.get('tournamentId');
          targetDivisionId = params.get('divisionId');
        } else if (path === '/players') {
          targetPage = 'players';
          targetTournamentId = params.get('tournamentId');
        } else if (path === '/matches') {
          targetPage = 'matches';
          targetTournamentId = params.get('tournamentId');
        } else if (path === '/add-result') {
          targetPage = 'add-result';
          targetTournamentId = params.get('tournamentId');
        } else if (path === '/standings') {
          targetPage = 'standings';
          targetTournamentId = params.get('tournamentId');
        } else if (path === '/courts') {
          targetPage = 'courts';
        } else if (path === '/home') {
          targetPage = 'home';
        }
        
        setRedirectAfterLogin({ 
          page: targetPage, 
          params: { 
            id: targetId, 
            tournamentId: targetTournamentId, 
            divisionId: targetDivisionId 
          } 
        });
        setCurrentPage('login');
      } else if (user && path === '/') {
        navigate('home', {}, true);
      } else {
        handlePopState();
      }
    }, 0);

    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    setMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStatus('success');
        setMessage('Login Successful');
        
        // Set user and route after delay to allow success toast to render
        setTimeout(() => {
          setUser({ userName: data.userName, role: data.role });
          if (redirectAfterLogin) {
            navigate(redirectAfterLogin.page, redirectAfterLogin.params, true);
            setRedirectAfterLogin(null);
          } else {
            navigate('home', {}, true);
          }
        }, 800);
      } else {
        setStatus('error');
        setMessage('login failed');
      }
    } catch (err) {
      console.error('Login request error:', err);
      setStatus('error');
      setMessage('login failed');
    } finally {
      setLoading(false);
    }
  };

  const showSidebar = user != null && currentPage !== 'login' && currentPage !== 'home';

  return (
    <div className="app-layout-wrapper">
      {showSidebar && (
        <Sidebar 
          currentPage={currentPage}
          setCurrentPage={(page) => {
            if (page === 'login') {
              setUser(null);
              navigate('login');
            } else if (page === 'divisions') {
              navigate('divisions', { tournamentId: selectedTournamentId });
            } else if (page === 'players') {
              navigate('players', { tournamentId: selectedTournamentId });
            } else if (page === 'matches') {
              navigate('matches', { tournamentId: selectedTournamentId });
            } else if (page === 'add-result') {
              navigate('add-result', { tournamentId: selectedTournamentId });
            } else if (page === 'standings') {
              navigate('standings', { tournamentId: selectedTournamentId });
            } else {
              navigate(page);
            }
          }}
          selectedTournamentId={selectedTournamentId}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isSidebarMobileOpen}
          setIsMobileOpen={setIsSidebarMobileOpen}
          user={user}
        />
      )}
      <div className={`main-content-layout ${!showSidebar ? 'no-sidebar' : ''} ${isSidebarCollapsed && showSidebar ? 'sidebar-collapsed' : ''}`}>
        {currentPage === 'login' ? (
          <div className="login-card-container">
            <main className="login-card">
              <header className="header-section">
                <h1 className="title">Tournaments Tracker</h1>
                <p className="subtitle">
                  Track your pickle ball, tennis tournaments and more.
                </p>
              </header>

              <form onSubmit={handleLogin} className="login-form" noValidate>
                <div className="form-group">
                  <div className="label-container">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="form-input"
                    autoComplete="username"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <div className="label-container">
                    <label htmlFor="password" className="form-label">
                      Password
                    </label>
                  </div>
                  <div className="input-wrapper">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="form-input"
                      autoComplete="current-password"
                      required
                      disabled={loading}
                      style={{ paddingRight: '44px' }}
                    />
                    <button
                      type="button"
                      className="password-toggle-btn"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      disabled={loading}
                    >
                      {showPassword ? (
                        /* Eye Off Icon */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                          <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                          <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                          <line x1="2" y1="2" x2="22" y2="22" />
                        </svg>
                      ) : (
                        /* Eye Icon */
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="submit-btn"
                  disabled={loading || !email || !password}
                >
                  {loading ? <div className="spinner" aria-label="Loading" /> : 'Log In'}
                </button>
              </form>

              {status && (
                <div
                  className={`status-toast ${status}`}
                  role="alert"
                  aria-live="polite"
                >
                  {status === 'success' ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  <span>{message}</span>
                </div>
              )}
            </main>
          </div>
        ) : currentPage === 'home' ? (
          <Home 
            user={user} 
            onNavigate={navigate} 
            onTileClick={(id) => navigate('tour-details', { id })} 
          />
        ) : currentPage === 'tour-details' ? (
          <TournamentDetails 
            tournamentId={selectedTournamentId}
            user={user}
            onNavigate={navigate}
            onBack={() => navigate('home')}
          />
        ) : currentPage === 'create-tournament' ? (
          <TournamentForm
            mode="create"
            onNavigate={navigate}
            onCancel={() => {
              // Redirect to previous page he was in
              if (previousPage.page) {
                navigate(previousPage.page, { id: previousPage.id });
              } else {
                navigate('home');
              }
            }}
          />
        ) : currentPage === 'edit-tournament' ? (
          <TournamentForm
            mode="edit"
            tournamentId={selectedTournamentId}
            onNavigate={navigate}
            onCancel={() => navigate('tour-details', { id: selectedTournamentId })}
          />
        ) : currentPage === 'divisions' ? (
          <Divisions 
            key={`${selectedTournamentId}-${currentSearchQuery}`}
            tournamentId={selectedTournamentId}
            user={user}
            onNavigate={navigate}
            searchQuery={currentSearchQuery}
          />
        ) : currentPage === 'players' ? (
          <Players 
            key={`${selectedTournamentId}-${currentSearchQuery}`}
            tournamentId={selectedTournamentId}
            user={user}
            onNavigate={navigate}
          />
        ) : currentPage === 'matches' ? (
          <>
            <Matches 
              key={`${selectedTournamentId}-${currentSearchQuery}`}
              tournamentId={selectedTournamentId}
              user={user}
              guestSession={guestSession}
              onNavigate={navigate}
              searchQuery={currentSearchQuery}
            />
            {!user && !guestSession && (
              <GuestAccessModal 
                isOpen={true} 
                expectedDivisionId={new URLSearchParams(currentSearchQuery).get('divisionId')}
                onVerify={(session) => {
                  setGuestSession(session);
                  setSelectedTournamentId(session.tournamentId);
                }}
                onCancel={() => navigate('login')}
              />
            )}
          </>
        ) : currentPage === 'add-result' ? (
          <>
            <AddResult 
              key={`${selectedTournamentId}-${currentSearchQuery}`}
              tournamentId={selectedTournamentId}
              user={user}
              guestSession={guestSession}
              onNavigate={navigate}
              searchQuery={currentSearchQuery}
            />
            {!user && !guestSession && (
              <GuestAccessModal 
                isOpen={true} 
                expectedDivisionId={new URLSearchParams(currentSearchQuery).get('divisionId')}
                onVerify={(session) => {
                  setGuestSession(session);
                  setSelectedTournamentId(session.tournamentId);
                }}
                onCancel={() => navigate('login')}
              />
            )}
          </>
        ) : currentPage === 'standings' ? (
          <Standings 
            key={`${selectedTournamentId}-${currentSearchQuery}`}
            tournamentId={selectedTournamentId}
            user={user}
            onNavigate={navigate}
          />
        ) : currentPage === 'courts' ? (
          <Courts 
            user={user}
            onNavigate={navigate}
          />
        ) : (
          <div className="home-container">
            <h1 className="home-title">Page Not Found</h1>
            <p className="home-subtitle">The requested resource could not be found.</p>
            <button className="back-btn" style={{ marginTop: '1.5rem' }} onClick={() => navigate('home')}>
              Go back home
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
