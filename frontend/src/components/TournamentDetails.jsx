import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function TournamentDetails({ tournamentId, user, onNavigate, onBack }) {
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTournamentDetails = async () => {
      if (!tournamentId) {
        setError('No tournament ID provided.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`);
        if (!response.ok) {
          throw new Error('Tournament not found or server error');
        }
        const data = await response.json();
        setTournament(data);
      } catch (err) {
        console.error('Error fetching tournament:', err);
        setError('Could not load tournament details. Please verify the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentDetails();
  }, [tournamentId]);

  const isAdmin = user && user.role === 'admin';

  if (loading) {
    return (
      <div className="status-loading">
        <div className="spinner" aria-label="Loading details"></div>
        <span>Loading tournament details...</span>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="home-container">
        <button className="back-btn" onClick={onBack}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Active Tournaments
        </button>
        <div className="status-toast error" style={{ marginTop: '1.5rem' }}>
          <span>{error || 'Tournament not found.'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="details-container">
      {/* Back Button */}
      <button className="back-btn" onClick={onBack}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Active Tournaments
      </button>

      <div className="details-card">
        {/* Elegant top center-justified section */}
        <div className="details-header">
          <img
            src={tournament.thumbnail}
            alt={tournament.title}
            className="details-thumbnail"
            onError={(e) => {
              e.target.src = 'https://placehold.co/192x192/1e1b4b/bef264?text=Tournament';
            }}
          />
          <h1 className="details-title">{tournament.title}</h1>
          {tournament.description && (
            <p className="details-description">{tournament.description}</p>
          )}
        </div>

        {/* Info Grid */}
        <div className="details-grid">
          <div className="info-item">
            <div className="info-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
              </svg>
            </div>
            <div className="info-content">
              <span className="info-label">Tournament Dates</span>
              <span className="info-value">
                {tournament.startDate} to {tournament.endDate}
              </span>
            </div>
          </div>

          {(tournament.startTime || tournament.endTime) && (
            <div className="info-item">
              <div className="info-icon-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
              </div>
              <div className="info-content">
                <span className="info-label">Daily Schedule</span>
                <span className="info-value">
                  {tournament.startTime ? tournament.startTime.substring(0, 5) : 'N/A'} - {tournament.endTime ? tournament.endTime.substring(0, 5) : 'N/A'}
                </span>
              </div>
            </div>
          )}

          <div className="info-item">
            <div className="info-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="info-content">
              <span className="info-label">Organizer</span>
              <span className="info-value">{tournament.organizer}</span>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <div className="info-content">
              <span className="info-label">Email Address</span>
              <a href={`mailto:${tournament.email}`} className="info-link">{tournament.email}</a>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div className="info-content">
              <span className="info-label">Phone Number</span>
              <a href={`tel:${tournament.phone}`} className="info-link">{tournament.phone}</a>
            </div>
          </div>

          <div className="info-item">
            <div className="info-icon-wrapper">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                <path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path>
              </svg>
            </div>
            <div className="info-content">
              <span className="info-label">Status</span>
              <span className={`status-badge ${tournament.status?.toLowerCase() || 'active'}`}>
                {tournament.status || 'active'}
              </span>
            </div>
          </div>
        </div>

        {/* Autogenerated URL field displayed elegantly */}
        {tournament.url && (
          <div className="details-url-section">
            <span className="info-label">Tournament Page Link</span>
            <div className="url-copy-box">
              <input type="text" readOnly value={tournament.url} className="url-copy-input" />
              <button 
                className="url-copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(tournament.url);
                  alert('URL copied to clipboard!');
                }}
                title="Copy Link"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Admin actions buttons */}
        {isAdmin && (
          <div className="admin-actions-section">
            <button 
              className="admin-btn edit-btn" 
              onClick={() => onNavigate('edit-tournament', { id: tournamentId })}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
              </svg>
              Edit Details
            </button>
            <button 
              className="admin-btn create-btn"
              onClick={() => onNavigate('create-tournament')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Tournament
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
