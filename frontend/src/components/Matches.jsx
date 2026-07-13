import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

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
  const [round, setRound] = useState('');
  const [selectedRoundFilter, setSelectedRoundFilter] = useState('all');
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

  // 2. Fetch Groups when selected division changes (list view)
  useEffect(() => {
    if (!selectedDivisionId) return;
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivisionId}/groups`);
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
          url = `${API_BASE_URL}/api/groups/${selectedGroupId}/matches`;
        } else {
          url = `${API_BASE_URL}/api/divisions/${selectedDivisionId}/matches`;
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
      const res = await fetch(`${API_BASE_URL}/api/divisions/${divId}/groups`);
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
        ? `${API_BASE_URL}/api/divisions/${divId}/participants?groupId=${groupId}`
        : `${API_BASE_URL}/api/divisions/${divId}/participants`;
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
    setRound('');
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

  // Extract distinct rounds from the full matches list
  const availableRounds = [...new Set(matches.map(m => m.round).filter(Boolean))].sort((a, b) => a - b);

  // Apply round filter
  const filteredMatches = selectedRoundFilter === 'all'
    ? matches
    : matches.filter(m => m.round === parseInt(selectedRoundFilter));

  // Partition matches into Upcoming vs Completed (handling null matchDate as upcoming)
  const upcomingMatches = filteredMatches.filter(m => !m.matchDate || m.matchDate >= todayStr);
  const completedMatches = filteredMatches.filter(m => m.matchDate && m.matchDate < todayStr);

  // Sorting descending by date and time, ascending by round
  const sortMatches = (list) => {
    return [...list].sort((a, b) => {
      const roundA = a.round !== null && a.round !== undefined ? a.round : Infinity;
      const roundB = b.round !== null && b.round !== undefined ? b.round : Infinity;
      if (roundA !== roundB) return roundA - roundB;

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

  const handleAutoSchedule = async () => {
    if (!selectedGroupId || !selectedDivisionId) return;

    const division = divisions.find(d => d.id === selectedDivisionId);
    if (!division) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Fetch group participants to check maxTeams capacity validation
      const partResp = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivisionId}/participants?groupId=${selectedGroupId}`);
      if (!partResp.ok) throw new Error('Failed to retrieve group participants');
      const groupParticipants = await partResp.json();

      if (groupParticipants.length < 2) {
        alert("At least 2 participants are required in the group to auto-schedule matches.");
        setLoading(false);
        return;
      }

      if (groupParticipants.length < division.maxTeams) {
        const proceed = window.confirm("The number of participants in the group is less than the maximum capacity. Do you still want to go ahead and create matches?");
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      // 2. Check if there are existing matches for the group
      if (matches.length > 0) {
        const proceed = window.confirm("There are existing matches in the group. This action will remove the already existing matches and create new ones. Is it Ok to Proceed?");
        if (!proceed) {
          setLoading(false);
          return;
        }
      }

      // 3. Call auto-schedule endpoint
      const scheduleResp = await fetch(`${API_BASE_URL}/api/groups/${selectedGroupId}/auto-schedule`, {
        method: 'POST'
      });

      if (!scheduleResp.ok) {
        const errMsg = await scheduleResp.text();
        throw new Error(errMsg || 'Failed to auto-schedule matches.');
      }

      const updatedMatches = await scheduleResp.json();
      setMatches(updatedMatches);
      alert("Matches created successfully");
    } catch (err) {
      console.error(err);
      alert(err.message || 'Failed to auto-schedule matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
    if (round && (isNaN(parseInt(round)) || parseInt(round) < 1)) {
      errors.round = 'Round must be 1 or greater';
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
      endTime: endTime || null,
      round: round ? parseInt(round) : null
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Match successfully created');
        // Reload matches for the current view
        if (parseInt(formDivisionId) === parseInt(selectedDivisionId)) {
          const url = selectedGroupId
            ? `${API_BASE_URL}/api/groups/${selectedGroupId}/matches`
            : `${API_BASE_URL}/api/divisions/${selectedDivisionId}/matches`;
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
                  <div className="form-group" style={{ margin: 0, minWidth: '280px', flex: '1' }}>
                    <label htmlFor="divSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Division</label>
                    <select
                      id="divSelect"
                      className="form-input form-select"
                      value={selectedDivisionId || ''}
                      onChange={(e) => {
                        setSelectedDivisionId(parseInt(e.target.value));
                        setSelectedGroupId(null);
                        setSelectedRoundFilter('all');
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
                          setSelectedRoundFilter('all');
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

                  {availableRounds.length > 0 && (
                    <div className="form-group" style={{ margin: 0, minWidth: '150px', flex: '1' }}>
                      <label htmlFor="roundSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Round</label>
                      <select
                        id="roundSelect"
                        className="form-input form-select"
                        value={selectedRoundFilter}
                        onChange={(e) => setSelectedRoundFilter(e.target.value)}
                        style={{ minHeight: '48px', cursor: 'pointer' }}
                      >
                        <option value="all">All Rounds</option>
                        {availableRounds.map((r) => (
                          <option key={r} value={r}>Round {r}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {selectedGroupId && (
                      <button
                        className="admin-btn auto-schedule-btn"
                        onClick={handleAutoSchedule}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', padding: '0 1.25rem', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '600', transition: 'all 0.25s' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                          <line x1="16" y1="2" x2="16" y2="6"></line>
                          <line x1="8" y1="2" x2="8" y2="6"></line>
                          <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        Auto-schedule Group matches
                      </button>
                    )}
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
                  </div>
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
                              {canEditResults ? (
                                <a
                                  href={`/add-result?tournamentId=${tournamentId}&matchId=${m.matchId}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onNavigate('add-result', { matchId: m.matchId });
                                  }}
                                  style={{ color: 'var(--primary)', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                >
                                  {m.participant1Name} vs {m.participant2Name}
                                </a>
                              ) : (
                                <span>{m.participant1Name} vs {m.participant2Name}</span>
                              )}
                              {m.round && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '8px' }}>
                                  Round {m.round}
                                </span>
                              )}
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
                              {canEditResults ? (
                                <a
                                  href={`/add-result?tournamentId=${tournamentId}&matchId=${m.matchId}`}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    onNavigate('add-result', { matchId: m.matchId });
                                  }}
                                  style={{ color: 'var(--primary)', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s' }}
                                  onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                  onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                >
                                  {m.participant1Name} vs {m.participant2Name}
                                </a>
                              ) : (
                                <span>{m.participant1Name} vs {m.participant2Name}</span>
                              )}
                              {m.round && (
                                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '8px' }}>
                                  Round {m.round}
                                </span>
                              )}
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

              {/* Match Date and Round */}
              <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
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
                <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                  <label htmlFor="mRound" className="form-label">Round</label>
                  <input
                    id="mRound"
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    className={`form-input ${validationErrors.round ? 'error' : ''}`}
                    value={round}
                    onChange={(e) => setRound(e.target.value)}
                    disabled={formLoading}
                  />
                  {validationErrors.round && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.round}</span>}
                </div>
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
