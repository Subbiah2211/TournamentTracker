import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Standings({ tournamentId, onNavigate }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Fetch Divisions for the tournament
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/divisions`);
        if (!response.ok) throw new Error('Failed to load divisions');
        const data = await response.json();
        setDivisions(data);
        if (data.length > 0) {
          setSelectedDivisionId(data[0].id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        setError('Failed to load divisions. Please check if the backend is running.');
        setLoading(false);
      }
    };
    loadDivisions();
  }, [tournamentId]);

  // 2. Fetch Groups when selected division changes
  useEffect(() => {
    if (!selectedDivisionId) return;

    const loadGroups = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivisionId}/groups`);
        if (res.ok) {
          const data = await res.json();
          setGroups(data);
          if (data.length > 0) {
            setSelectedGroupId(data[0].id);
          } else {
            setSelectedGroupId(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch groups', err);
        setSelectedGroupId(null);
        setGroups([]);
      }
    };
    loadGroups();
  }, [selectedDivisionId]);

  // 3. Fetch Participants when selected group (or division) changes
  useEffect(() => {
    if (!selectedDivisionId) return;

    const loadParticipants = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = selectedGroupId
          ? `${API_BASE_URL}/api/divisions/${selectedDivisionId}/participants?groupId=${selectedGroupId}`
          : `${API_BASE_URL}/api/divisions/${selectedDivisionId}/participants`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load standings data');
        const data = await response.json();
        setParticipants(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load standings. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadParticipants();
  }, [selectedDivisionId, selectedGroupId]);

  // Sort participants by won descending, then pointsDiff descending, then pointsFor descending
  const sortedParticipants = [...participants].sort((a, b) => {
    const winsA = a.won || 0;
    const winsB = b.won || 0;
    if (winsA !== winsB) return winsB - winsA;
    const diffA = a.pointsDiff || 0;
    const diffB = b.pointsDiff || 0;
    if (diffA !== diffB) return diffB - diffA;
    return (b.pointsFor || 0) - (a.pointsFor || 0);
  });

  if (loading && divisions.length === 0) {
    return (
      <div className="loading-state-wrapper">
        <div className="spinner" aria-label="Loading" />
        <p className="loading-text">Loading Standings...</p>
      </div>
    );
  }

  if (error && divisions.length === 0) {
    return (
      <div className="error-state-wrapper">
        <p className="error-text">{error}</p>
        <button className="back-btn" onClick={() => onNavigate('home')}>
          Go back home
        </button>
      </div>
    );
  }

  return (
    <div className="matches-page-container">
      <header className="page-header-section">
        <h1 className="title">
          Tournament Standings
        </h1>
        <p className="subtitle">
          View ranks, points, and records of division participants.
        </p>
      </header>

      {divisions.length === 0 ? (
        <div className="empty-state-card">
          <p className="subtitle" style={{ marginBottom: '1.5rem' }}>There are no divisions yet. Add a division to view standings.</p>
        </div>
      ) : (
        <div className="matches-list-layout">
          {/* Division + Group filter row */}
          <div className="matches-actions-bar" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '2rem' }}>
            <div className="form-group" style={{ margin: 0, minWidth: '220px', flex: '1' }}>
              <label htmlFor="divSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Division</label>
              <select
                id="divSelect"
                className="form-input form-select"
                value={selectedDivisionId || ''}
                onChange={(e) => {
                  setSelectedDivisionId(parseInt(e.target.value));
                  setSelectedGroupId(null);
                  setGroups([]);
                }}
                style={{ minHeight: '48px', cursor: 'pointer' }}
              >
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>{div.name}</option>
                ))}
              </select>
            </div>

            {groups.length > 0 && (
              <div className="form-group" style={{ margin: 0, minWidth: '180px', flex: '1' }}>
                <label htmlFor="groupSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Group</label>
                <select
                  id="groupSelect"
                  className="form-input form-select"
                  value={selectedGroupId || ''}
                  onChange={(e) => setSelectedGroupId(parseInt(e.target.value))}
                  style={{ minHeight: '48px', cursor: 'pointer' }}
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="loading-state-wrapper" style={{ padding: '3rem 0' }}>
              <div className="spinner" aria-label="Loading" />
            </div>
          ) : sortedParticipants.length === 0 ? (
            <div className="empty-section-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'var(--glass-bg)', border: '1px dashed var(--glass-border)', borderRadius: '16px' }}>
              No participants registered in this {groups.length > 0 ? 'group' : 'division'} yet.
            </div>
          ) : (
            <div className="standings-table-wrapper">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th style={{ width: '50px', textAlign: 'center' }}>Rank</th>
                    <th>Participant</th>
                    <th style={{ textAlign: 'center' }}>Played</th>
                    <th style={{ textAlign: 'center' }}>Won</th>
                    <th style={{ textAlign: 'center' }}>Lost</th>
                    <th style={{ textAlign: 'center' }}>Points For</th>
                    <th style={{ textAlign: 'center' }}>Points Against</th>
                    <th style={{ textAlign: 'center' }}>Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedParticipants.map((p, idx) => {
                    const diff = p.pointsDiff || 0;
                    const diffClass = diff > 0 ? 'points-diff-positive' : diff < 0 ? 'points-diff-negative' : 'points-diff-zero';
                    const diffPrefix = diff > 0 ? '+' : '';

                    return (
                      <tr key={p.id} className="standings-row">
                        <td className={`rank-cell ${idx === 0 ? 'rank-first' : 'rank-other'}`}>
                          {idx + 1}
                        </td>
                        <td className="participant-cell">
                          {p.playerTeamName}
                          <span className="participant-subtext">{p.type}</span>
                        </td>
                        <td style={{ textAlign: 'center', color: 'var(--text-primary)' }}>{p.matchesPlayed || 0}</td>
                        <td style={{ textAlign: 'center', color: 'var(--accent-tennis)', fontWeight: '600' }}>{p.won || 0}</td>
                        <td style={{ textAlign: 'center', color: 'var(--color-error)', fontWeight: '600' }}>{p.lost || 0}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-primary)' }}>{p.pointsFor || 0}</td>
                        <td style={{ textAlign: 'center', color: 'var(--text-primary)' }}>{p.pointsAgaint || 0}</td>
                        <td className={diffClass} style={{ textAlign: 'center' }}>
                          {diffPrefix}{diff}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
