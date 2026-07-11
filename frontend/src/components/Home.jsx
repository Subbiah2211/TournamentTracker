import { useState, useEffect } from 'react';

export default function Home({ user, onNavigate, onTileClick }) {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/tournaments');
        if (!response.ok) {
          throw new Error('Failed to fetch tournaments');
        }
        const data = await response.json();
        setTournaments(data);
      } catch (err) {
        console.error('Error loading tournaments:', err);
        setError('Could not load tournaments. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  // Filter and sort tournaments based on requested rules
  const activeTournaments = tournaments
    .filter(t => t.status && t.status.trim().toLowerCase() === 'active')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
      const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
      return dateB - dateA; // Descending order of start date
    });

  const upcomingTournaments = tournaments
    .filter(t => t.status && t.status.trim().toLowerCase() === 'upcoming')
    .sort((a, b) => {
      const dateA = a.startDate ? new Date(a.startDate) : new Date(0);
      const dateB = b.startDate ? new Date(b.startDate) : new Date(0);
      return dateA - dateB; // Ascending order of start date
    });

  const completedTournaments = tournaments
    .filter(t => t.status && t.status.trim().toLowerCase() === 'completed')
    .sort((a, b) => {
      const dateA = a.endDate ? new Date(a.endDate) : new Date(0);
      const dateB = b.endDate ? new Date(b.endDate) : new Date(0);
      return dateB - dateA; // Descending order of end date
    });

  const renderTournamentTile = (tournament) => (
    <a
      key={tournament.id}
      href={`/tour-details?id=${tournament.id}`}
      onClick={(e) => {
        e.preventDefault();
        onTileClick(tournament.id);
      }}
      className="tournament-tile"
      title={`${tournament.title} - ${tournament.description || ''}`}
    >
      <img
        src={tournament.thumbnail}
        alt={tournament.title}
        className="tournament-image"
        onError={(e) => {
          // Fallback if the image doesn't load
          e.target.src = 'https://placehold.co/192x192/1e1b4b/bef264?text=Pickleball';
        }}
      />
    </a>
  );

  return (
    <div className="home-container">
      <header className="home-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="home-title">Tournaments Directory</h1>
          <p className="home-subtitle">
            Browse and manage your tournament competitions. Click on any tile to visit the tournament page.
          </p>
        </div>
        {isAdmin && (
          <button 
            className="create-match-btn"
            onClick={() => onNavigate('create-tournament')}
            style={{ margin: 0, padding: '0 1.5rem', height: '46px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create New Tournament
          </button>
        )}
      </header>

      {loading && (
        <div className="status-loading">
          <div className="spinner" aria-label="Loading tournaments"></div>
          <span>Loading tournaments...</span>
        </div>
      )}

      {error && (
        <div className="status-toast error" style={{ marginTop: 0 }}>
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
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Active Section */}
          <section className="home-section">
            <h2 className="home-section-title">
              <span className="pulse-indicator"></span> Active Tournaments
            </h2>
            {activeTournaments.length === 0 ? (
              <div className="empty-section-card">No active tournaments at the moment.</div>
            ) : (
              <div className="tournaments-grid">
                {activeTournaments.map(renderTournamentTile)}
              </div>
            )}
          </section>

          {/* Upcoming Section */}
          <section className="home-section">
            <h2 className="home-section-title">
              🕒 Upcoming Tournaments
            </h2>
            {upcomingTournaments.length === 0 ? (
              <div className="empty-section-card">No upcoming tournaments scheduled.</div>
            ) : (
              <div className="tournaments-grid">
                {upcomingTournaments.map(renderTournamentTile)}
              </div>
            )}
          </section>

          {/* Completed Section */}
          <section className="home-section">
            <h2 className="home-section-title">
              🏆 Completed Tournaments
            </h2>
            {completedTournaments.length === 0 ? (
              <div className="empty-section-card">No completed tournaments found.</div>
            ) : (
              <div className="tournaments-grid">
                {completedTournaments.map(renderTournamentTile)}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
