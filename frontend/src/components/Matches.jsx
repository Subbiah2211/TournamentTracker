import { useState, useEffect } from 'react';

export default function Matches({ tournamentId, user, onNavigate }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Group filter state
  const [groupsForSelectedDivision, setGroupsForSelectedDivision] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  // Sub-view: 'list' | 'create'
  const [subView, setSubView] = useState('list');

  // Create form state
  const [formDivisionId, setFormDivisionId] = useState('');
  const [formGroupId, setFormGroupId] = useState('');
  const [formGroupsForDivision, setFormGroupsForDivision] = useState([]);
  const [formParticipant1, setFormParticipant1] = useState('');
  const [formParticipant2, setFormParticipant2] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  const isAdmin = user && user.role === 'admin';
  const canEditResults = user && (user.role === 'admin' || user.role === 'editor');

  // 1. Fetch Divisions for the tournament
  useEffect(() => {
    const loadDivisions = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`http://localhost:8080/api/tournaments/${tournamentId}/divisions`);
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

  // 2. Fetch Groups when selected division changes (list view)
  useEffect(() => {
    if (!selectedDivisionId) return;
    const fetchGroups = async () => {
      try {
        const res = await fetch(`http://localhost:8080/api/divisions/${selectedDivisionId}/groups`);
        if (res.ok) {
          const data = await res.json();
          setGroupsForSelectedDivision(data);
          if (data.length > 0) {
            setSelectedGroupId(data[0].id);
          } else {
            setSelectedGroupId(null);
          }
        }
      } catch (err) {
        console.error('Failed to fetch groups for division', err);
      }
    };
    fetchGroups();
  }, [selectedDivisionId]);

  // 3. Fetch Matches for selected Group (or Division if no groups)
  useEffect(() => {
    if (!selectedDivisionId) return;

    const loadMatches = async () => {
      try {
        setLoading(true);
        setError(null);
        let url;
        if (selectedGroupId) {
          url = `http://localhost:8080/api/groups/${selectedGroupId}/matches`;
        } else {
          url = `http://localhost:8080/api/divisions/${selectedDivisionId}/matches`;
        }
        const response = await fetch(url);
        if (!response.ok) throw new Error('Failed to load matches');
        const data = await response.json();
        setMatches(data);
      } catch (err) {
        console.error(err);
        setError('Failed to load matches. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, [selectedDivisionId, selectedGroupId]);

  // 4. Fetch groups for the create-match form when division changes
  const fetchFormGroupsForDivision = async (divId) => {
    try {
      const res = await fetch(`http://localhost:8080/api/divisions/${divId}/groups`);
      if (res.ok) {
        const data = await res.json();
        setFormGroupsForDivision(data);
        if (data.length > 0) {
          setFormGroupId(data[0].id.toString());
          // Fetch participants for first group
          fetchParticipantsForGroup(data[0].id, divId);
        } else {
          setFormGroupId('');
          setParticipants([]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch groups for form', err);
    }
  };

  const fetchParticipantsForGroup = async (groupId, divId) => {
    try {
      const url = groupId
        ? `http://localhost:8080/api/divisions/${divId}/participants?groupId=${groupId}`
        : `http://localhost:8080/api/divisions/${divId}/participants`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setParticipants(data);
      }
    } catch (err) {
      console.error('Error fetching participants for form:', err);
    }
  };

  // 5. When formGroupId changes, reload participants
  useEffect(() => {
    if (!formDivisionId) {
      setParticipants([]);
      return;
    }
    if (formGroupId) {
      fetchParticipantsForGroup(formGroupId, formDivisionId);
    } else {
      fetchParticipantsForGroup(null, formDivisionId);
    }
  }, [formGroupId]);

  // Handle entering create view
  const enterCreateMode = () => {
    const divId = selectedDivisionId || (divisions.length > 0 ? divisions[0].id : '');
    setFormDivisionId(divId ? divId.toString() : '');
    setFormGroupId('');
    setFormGroupsForDivision([]);
    setFormParticipant1('');
    setFormParticipant2('');
    setMatchDate('');
    setStartTime('');
    setEndTime('');
    setFormError('');
    setValidationErrors({});
    setSubView('create');
    if (divId) fetchFormGroupsForDivision(divId);
  };

  // Local helper to get current date string in local timezone
  const getLocalTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getLocalTodayString();

  // Partition matches into Upcoming vs Completed
  const upcomingMatches = matches.filter(m => m.matchDate >= todayStr);
  const completedMatches = matches.filter(m => m.matchDate < todayStr);

  // Sorting descending by date and time
  const sortMatches = (list) => {
    return [...list].sort((a, b) => {
      const dateA = a.matchDate || '';
      const dateB = b.matchDate || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.startTime || '';
      const timeB = b.startTime || '';
      return timeB.localeCompare(timeA);
    });
  };

  const sortedUpcoming = sortMatches(upcomingMatches);
  const sortedCompleted = sortMatches(completedMatches);

  const displayedUpcoming = upcomingExpanded ? sortedUpcoming : sortedUpcoming.slice(0, 3);
  const displayedCompleted = completedExpanded ? sortedCompleted : sortedCompleted.slice(0, 3);

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!formDivisionId) errors.division = 'Division is required';
    if (!formGroupId) errors.group = 'Group is required';
    if (!formParticipant1) errors.participant1 = 'Participant 1 is required';
    if (!formParticipant2) errors.participant2 = 'Participant 2 is required';
    if (formParticipant1 && formParticipant2 && formParticipant1 === formParticipant2) {
      errors.participant2 = 'Participant 2 must be different from Participant 1';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Match form
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(formDivisionId),
      groupId: formGroupId ? parseInt(formGroupId) : null,
      tournamentId: parseInt(tournamentId),
      participant1: parseInt(formParticipant1),
      participant2: parseInt(formParticipant2),
      matchDate: matchDate || null,
      startTime: startTime || null,
      endTime: endTime || null
    };

    try {
      const response = await fetch('http://localhost:8080/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Match successfully created');
        // Reload matches for the current view
        if (parseInt(formDivisionId) === parseInt(selectedDivisionId)) {
          const url = selectedGroupId
            ? `http://localhost:8080/api/groups/${selectedGroupId}/matches`
            : `http://localhost:8080/api/divisions/${selectedDivisionId}/matches`;
          const matchResponse = await fetch(url);
          if (matchResponse.ok) setMatches(await matchResponse.json());
        } else {
          setSelectedDivisionId(parseInt(formDivisionId));
        }
        setSubView('list');
      } else {
        const errorData = await response.json();
        setFormError(errorData.error || 'Failed to create match. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to save match. Please check if the backend is running.');
    } finally {
      setFormLoading(false);
    }
  };

  if (loading && divisions.length === 0) {
    return (
      <div className="loading-state-wrapper">
        <div className="spinner" aria-label="Loading" />
        <p className="loading-text">Loading Matches...</p>
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
      <header className="page-header-section" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'left', background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Matches
        </h1>
        <p className="subtitle" style={{ textAlign: 'left' }}>
          Manage and track matches for your tournament.
        </p>
      </header>

      {subView === 'list' && (
        <>
          {divisions.length === 0 ? (
            <div className="empty-state-card" style={{ padding: '2rem', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px' }}>
              <p className="subtitle" style={{ marginBottom: '1.5rem' }}>There are no divisions yet. Add a division to view matches.</p>
              {isAdmin && (
                <button className="submit-btn" onClick={() => onNavigate('divisions', { tournamentId })}>
                  Manage Divisions
                </button>
              )}
            </div>
          ) : (
            <div className="matches-list-layout">
              <div className="matches-actions-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
                {/* Division + Group filter row */}
                <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '220px', flex: '1' }}>
                    <label htmlFor="divSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Division</label>
                    <select
                      id="divSelect"
                      className="form-input form-select"
                      value={selectedDivisionId || ''}
                      onChange={(e) => {
                        setSelectedDivisionId(parseInt(e.target.value));
                        setSelectedGroupId(null);
                        setUpcomingExpanded(false);
                        setCompletedExpanded(false);
                      }}
                      style={{ minHeight: '48px', cursor: 'pointer' }}
                    >
                      {divisions.map((div) => (
                        <option key={div.id} value={div.id}>{div.name}</option>
                      ))}
                    </select>
                  </div>

                  {groupsForSelectedDivision.length > 0 && (
                    <div className="form-group" style={{ margin: 0, minWidth: '180px', flex: '1' }}>
                      <label htmlFor="groupSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Group</label>
                      <select
                        id="groupSelect"
                        className="form-input form-select"
                        value={selectedGroupId || ''}
                        onChange={(e) => {
                          setSelectedGroupId(parseInt(e.target.value));
                          setUpcomingExpanded(false);
                          setCompletedExpanded(false);
                        }}
                        style={{ minHeight: '48px', cursor: 'pointer' }}
                      >
                        {groupsForSelectedDivision.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <button
                    className="admin-btn create-match-btn"
                    onClick={enterCreateMode}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', padding: '0 1.25rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.25s' }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create New Match
                  </button>
                )}
              </div>

              {loading ? (
                <div className="loading-state-wrapper" style={{ padding: '3rem 0' }}>
                  <div className="spinner" aria-label="Loading" />
                </div>
              ) : (
                <div className="matches-sections-container" style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
                  <section className="matches-section">
                    <h2 className="section-title" style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Upcoming Matches</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{sortedUpcoming.length}</span>
                    </h2>

                    {sortedUpcoming.length === 0 ? (
                      <div className="empty-section-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--glass-border)', borderRadius: '16px' }}>
                        No upcoming matches.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedUpcoming.map((m) => (
                          <div key={m.matchId} className="match-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all 0.25s' }}>
                            <div className="match-card-line1" style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>{m.participant1Name}</span>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '400' }}>vs</span>
                              <span>{m.participant2Name}</span>
                            </div>
                            {(m.matchDate || m.startTime) && (
                              <div className="match-card-line2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {m.matchDate} {m.startTime ? `@ ${m.startTime}` : ''}
                              </div>
                            )}
                            {(m.p1Status || m.p2Status) && (
                              <div className="match-card-line3" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--accent-pickleball)' }}>
                                {m.p1Status === 'Won' ? `${m.participant1Name} Won` : m.p2Status === 'Won' ? `${m.participant2Name} Won` : ''}
                              </div>
                            )}
                          </div>
                        ))}

                        {sortedUpcoming.length > 3 && (
                          <button className="expand-section-btn" onClick={() => setUpcomingExpanded(!upcomingExpanded)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', padding: '4px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {upcomingExpanded ? 'Show Less' : `Show All (${sortedUpcoming.length})`}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: upcomingExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </section>

                  <section className="matches-section">
                    <h2 className="section-title" style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>Completed Matches</span>
                      <span style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '12px' }}>{sortedCompleted.length}</span>
                    </h2>

                    {sortedCompleted.length === 0 ? (
                      <div className="empty-section-card" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.01)', border: '1px dashed var(--glass-border)', borderRadius: '16px' }}>
                        No completed matches.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {displayedCompleted.map((m) => (
                          <div key={m.matchId} className="match-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', transition: 'all 0.25s' }}>
                            <div className="match-card-line1" style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span>{m.participant1Name}</span>
                              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '400' }}>vs</span>
                              <span>{m.participant2Name}</span>
                            </div>
                            {(m.matchDate || m.startTime) && (
                              <div className="match-card-line2" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                                {m.matchDate} {m.startTime ? `@ ${m.startTime}` : ''}
                              </div>
                            )}
                            {(m.p1Status || m.p2Status) && (
                              <div className="match-card-line3" style={{ fontSize: '0.875rem', fontWeight: '600', color: 'var(--accent-pickleball)' }}>
                                {m.p1Status === 'Won' ? `${m.participant1Name} Won` : m.p2Status === 'Won' ? `${m.participant2Name} Won` : ''}
                              </div>
                            )}
                          </div>
                        ))}

                        {sortedCompleted.length > 3 && (
                          <button className="expand-section-btn" onClick={() => setCompletedExpanded(!completedExpanded)} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '600', cursor: 'pointer', padding: '4px 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {completedExpanded ? 'Show Less' : `Show All (${sortedCompleted.length})`}
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: completedExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </button>
                        )}
                      </div>
                    )}
                  </section>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {subView === 'create' && (
        <div className="division-form-view">
          <button className="back-btn" onClick={() => setSubView('list')} style={{ marginBottom: '1.5rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Cancel
          </button>

          <div className="form-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '2rem' }}>
            <header className="form-header-section" style={{ marginBottom: '1.5rem' }}>
              <h2 className="form-title" style={{ fontFamily: 'var(--font-title)', fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Create New Match</h2>
              <p className="form-subtitle" style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Fill out match details and select participants from the same group.</p>
            </header>

            {formError && (
              <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Division */}
              <div className="form-group">
                <label htmlFor="formDivSelect" className="form-label">Division *</label>
                <select
                  id="formDivSelect"
                  className={`form-input form-select ${validationErrors.division ? 'error' : ''}`}
                  value={formDivisionId}
                  onChange={(e) => {
                    const divId = e.target.value;
                    setFormDivisionId(divId);
                    setFormGroupId('');
                    setFormGroupsForDivision([]);
                    setFormParticipant1('');
                    setFormParticipant2('');
                    setParticipants([]);
                    if (divId) fetchFormGroupsForDivision(divId);
                  }}
                  disabled={formLoading}
                  required
                >
                  <option value="" disabled>Select division...</option>
                  {divisions.map((div) => (
                    <option key={div.id} value={div.id}>{div.name}</option>
                  ))}
                </select>
                {validationErrors.division && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.division}</span>}
              </div>

              {/* Group */}
              {formGroupsForDivision.length > 0 && (
                <div className="form-group">
                  <label htmlFor="formGroupSelect" className="form-label">Group *</label>
                  <select
                    id="formGroupSelect"
                    className={`form-input form-select ${validationErrors.group ? 'error' : ''}`}
                    value={formGroupId}
                    onChange={(e) => {
                      setFormGroupId(e.target.value);
                      setFormParticipant1('');
                      setFormParticipant2('');
                    }}
                    disabled={formLoading || !formDivisionId}
                    required
                  >
                    <option value="" disabled>Select group...</option>
                    {formGroupsForDivision.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                  {validationErrors.group && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.group}</span>}
                </div>
              )}

              {/* Participants */}
              <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                  <label htmlFor="part1Select" className="form-label">Participant 1 *</label>
                  <select
                    id="part1Select"
                    className={`form-input form-select ${validationErrors.participant1 ? 'error' : ''}`}
                    value={formParticipant1}
                    onChange={(e) => setFormParticipant1(e.target.value)}
                    disabled={formLoading || !formDivisionId}
                    required
                  >
                    <option value="">Choose Participant 1...</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.playerTeamName} ({p.type})</option>
                    ))}
                  </select>
                  {validationErrors.participant1 && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.participant1}</span>}
                </div>

                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                  <label htmlFor="part2Select" className="form-label">Participant 2 *</label>
                  <select
                    id="part2Select"
                    className={`form-input form-select ${validationErrors.participant2 ? 'error' : ''}`}
                    value={formParticipant2}
                    onChange={(e) => setFormParticipant2(e.target.value)}
                    disabled={formLoading || !formDivisionId}
                    required
                  >
                    <option value="">Choose Participant 2...</option>
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>{p.playerTeamName} ({p.type})</option>
                    ))}
                  </select>
                  {validationErrors.participant2 && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.participant2}</span>}
                </div>
              </div>

              {/* Match Date */}
              <div className="form-group">
                <label htmlFor="mDate" className="form-label">Match Date</label>
                <input
                  id="mDate"
                  type="date"
                  className={`form-input ${validationErrors.matchDate ? 'error' : ''}`}
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  disabled={formLoading}
                />
              </div>

              {/* Start/End Time */}
              <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                  <label htmlFor="sTime" className="form-label">Start Time</label>
                  <input id="sTime" type="time" className="form-input" value={startTime} onChange={(e) => setStartTime(e.target.value)} disabled={formLoading} />
                </div>
                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                  <label htmlFor="eTime" className="form-label">End Time</label>
                  <input id="eTime" type="time" className="form-input" value={endTime} onChange={(e) => setEndTime(e.target.value)} disabled={formLoading} />
                </div>
              </div>

              <button type="submit" className="submit-btn" disabled={formLoading} style={{ marginTop: '1rem', minHeight: '48px' }}>
                {formLoading ? <div className="spinner" aria-label="Saving" /> : 'Create Match'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
