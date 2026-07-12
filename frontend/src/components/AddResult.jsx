import { useState, useEffect } from 'react';

export default function AddResult({ tournamentId, user, onNavigate, searchQuery }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchDetails, setMatchDetails] = useState(null);

  // Match details states
  const [matchDate, setMatchDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [round, setRound] = useState('');

  // Score states
  const [set1P1, setSet1P1] = useState('');
  const [set1P2, setSet1P2] = useState('');
  const [set2P1, setSet2P1] = useState('');
  const [set2P2, setSet2P2] = useState('');
  const [set3P1, setSet3P1] = useState('');
  const [set3P2, setSet3P2] = useState('');

  // Transition scores (at 11) states for Team matches
  const [set1P1At11, setSet1P1At11] = useState('');
  const [set1P2At11, setSet1P2At11] = useState('');
  const [set2P1At11, setSet2P1At11] = useState('');
  const [set2P2At11, setSet2P2At11] = useState('');
  const [set3P1At11, setSet3P1At11] = useState('');
  const [set3P2At11, setSet3P2At11] = useState('');

  // Players list for team division
  const [teamPlayers1, setTeamPlayers1] = useState([]);
  const [teamPlayers2, setTeamPlayers2] = useState([]);

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formError, setFormError] = useState('');

  const [participants, setParticipants] = useState([]);

  // Fetch participants when selectedDivisionId changes
  useEffect(() => {
    if (!selectedDivisionId) {
      setParticipants([]);
      return;
    }
    const loadParticipants = async () => {
      try {
        const resp = await fetch(`http://localhost:8080/api/divisions/${selectedDivisionId}/participants`);
        if (resp.ok) {
          const data = await resp.json();
          setParticipants(data);
        }
      } catch (err) {
        console.error('Error loading division participants:', err);
      }
    };
    loadParticipants();
  }, [selectedDivisionId]);

  const canEditResults = user && (user.role === 'admin' || user.role === 'editor');

  // Parse query parameters
  const params = new URLSearchParams(searchQuery);
  const queryMatchId = params.get('matchId');

  // Access check
  useEffect(() => {
    if (!canEditResults) {
      setLoading(false);
    }
  }, [canEditResults]);

  // 1. Fetch Divisions & Pre-populate if queryMatchId exists
  useEffect(() => {
    if (!canEditResults) return;

    const initializeForm = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load divisions
        const divResponse = await fetch(`http://localhost:8080/api/tournaments/${tournamentId}/divisions`);
        if (!divResponse.ok) {
          throw new Error('Failed to load divisions');
        }
        const divData = await divResponse.json();
        setDivisions(divData);

        if (queryMatchId) {
          // Fetch match details to find division
          const matchResponse = await fetch(`http://localhost:8080/api/matches/${queryMatchId}`);
          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            setMatchDetails(matchData);
            setSelectedDivisionId(matchData.divisionId);
            setSelectedMatchId(matchData.matchId);
            
            // Fetch matches for that division
            const matchesResp = await fetch(`http://localhost:8080/api/divisions/${matchData.divisionId}/matches`);
            if (matchesResp.ok) {
              const matchesData = await matchesResp.json();
              setMatches(matchesData);
            }
          } else {
            // Fallback if match not found
            if (divData.length > 0) {
              setSelectedDivisionId(divData[0].id);
            }
          }
        } else {
          if (divData.length > 0) {
            setSelectedDivisionId(divData[0].id);
          }
        }
      } catch (err) {
        console.error(err);
        setError('Failed to initialize page details.');
      } finally {
        setLoading(false);
      }
    };

    initializeForm();
  }, [tournamentId, queryMatchId, canEditResults]);

  // 2. Fetch Matches when division selection changes (only for manual dropdown selection)
  useEffect(() => {
    if (!selectedDivisionId || queryMatchId) return;

    const loadMatches = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/divisions/${selectedDivisionId}/matches`);
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
          setSelectedMatchId('');
          setMatchDetails(null);
          clearScores();
        }
      } catch (err) {
        console.error('Error loading division matches:', err);
      }
    };

    loadMatches();
  }, [selectedDivisionId, queryMatchId]);

  // 3. Fetch Match Details and existing scores when match selection changes
  useEffect(() => {
    if (!selectedMatchId) {
      setMatchDetails(null);
      clearScores();
      setMatchDate('');
      setStartTime('');
      setEndTime('');
      setRound('');
      return;
    }

    const loadMatchDetailsAndResult = async () => {
      try {
        setFormLoading(true);
        setFormError('');
        setValidationErrors({});

        let activeMatchData = matchDetails;
        if (!activeMatchData || activeMatchData.matchId !== parseInt(selectedMatchId)) {
          const matchResp = await fetch(`http://localhost:8080/api/matches/${selectedMatchId}`);
          if (matchResp.ok) {
            const matchData = await matchResp.json();
            setMatchDetails(matchData);
            activeMatchData = matchData;
          }
        }

        if (activeMatchData) {
          setMatchDate(activeMatchData.matchDate || '');
          setStartTime(activeMatchData.startTime || '');
          setEndTime(activeMatchData.endTime || '');
          setRound(activeMatchData.round !== null && activeMatchData.round !== undefined ? String(activeMatchData.round) : '');
        }

        // Fetch result for the match
        const resultResp = await fetch(`http://localhost:8080/api/matches/${selectedMatchId}/result`);
        if (resultResp.ok) {
          const resData = await resultResp.json();
          setSet1P1(resData.set1P1 !== null ? String(resData.set1P1) : '');
          setSet1P2(resData.set1P2 !== null ? String(resData.set1P2) : '');
          setSet2P1(resData.set2P1 !== null ? String(resData.set2P1) : '');
          setSet2P2(resData.set2P2 !== null ? String(resData.set2P2) : '');
          setSet3P1(resData.set3P1 !== null ? String(resData.set3P1) : '');
          setSet3P2(resData.set3P2 !== null ? String(resData.set3P2) : '');
          setSet1P1At11(resData.set1P1At11 !== null ? String(resData.set1P1At11) : '');
          setSet1P2At11(resData.set1P2At11 !== null ? String(resData.set1P2At11) : '');
          setSet2P1At11(resData.set2P1At11 !== null ? String(resData.set2P1At11) : '');
          setSet2P2At11(resData.set2P2At11 !== null ? String(resData.set2P2At11) : '');
          setSet3P1At11(resData.set3P1At11 !== null ? String(resData.set3P1At11) : '');
          setSet3P2At11(resData.set3P2At11 !== null ? String(resData.set3P2At11) : '');
        } else {
          clearScores();
        }
      } catch (err) {
        console.error('Error loading match details/results:', err);
      } finally {
        setFormLoading(false);
      }
    };

    loadMatchDetailsAndResult();
  }, [selectedMatchId]);

  // Fetch team players for Team division when match or participants are loaded
  useEffect(() => {
    if (!selectedMatchId || !matchDetails || participants.length === 0 || divisions.length === 0) {
      setTeamPlayers1([]);
      setTeamPlayers2([]);
      return;
    }

    const currentDivisionLocal = divisions.find(d => String(d.id) === String(selectedDivisionId));
    if (currentDivisionLocal?.divisionType !== 'Team') {
      return;
    }

    const loadTeamPlayers = async () => {
      try {
        const p1 = participants.find(p => p.id === matchDetails.participant1);
        const p2 = participants.find(p => p.id === matchDetails.participant2);
        if (p1 && p2) {
          const p1PlayersResp = await fetch(`http://localhost:8080/api/teams/${p1.playerTeamId}/players`);
          if (p1PlayersResp.ok) {
            const p1Players = await p1PlayersResp.json();
            setTeamPlayers1(p1Players);
          }
          const p2PlayersResp = await fetch(`http://localhost:8080/api/teams/${p2.playerTeamId}/players`);
          if (p2PlayersResp.ok) {
            const p2Players = await p2PlayersResp.json();
            setTeamPlayers2(p2Players);
          }
        }
      } catch (err) {
        console.error('Error loading team players:', err);
      }
    };

    loadTeamPlayers();
  }, [selectedMatchId, matchDetails, participants, divisions, selectedDivisionId]);

  const clearScores = () => {
    setSet1P1('');
    setSet1P2('');
    setSet2P1('');
    setSet2P2('');
    setSet3P1('');
    setSet3P2('');
    setSet1P1At11('');
    setSet1P2At11('');
    setSet2P1At11('');
    setSet2P2At11('');
    setSet3P1At11('');
    setSet3P2At11('');
    setTeamPlayers1([]);
    setTeamPlayers2([]);
  };

  const handleDivisionChange = (divId) => {
    // If user changes division, remove any query parameters
    if (queryMatchId) {
      onNavigate('add-result', { tournamentId });
    }
    setSelectedDivisionId(divId);
  };

  const handleMatchChange = (matchId) => {
    if (queryMatchId && parseInt(matchId) !== parseInt(queryMatchId)) {
      onNavigate('add-result', { tournamentId });
    }
    setSelectedMatchId(matchId);
  };

  // Score validation helper
  const validateForm = () => {
    const errors = {};
    if (!selectedDivisionId) errors.division = 'Division is required';
    if (!selectedMatchId) errors.match = 'Match is required';

    if (selectedMatchId) {
      const hasScores = set1P1 !== '' || set1P2 !== '' || set2P1 !== '' || set2P2 !== '' || set3P1 !== '' || set3P2 !== '';

      if (hasScores) {
        const isTeam = currentDivision?.divisionType === 'Team';

        // Helper to validate set transition and final scores
        const validateSet = (setP1, setP2, setP1At11, setP2At11, setLabel) => {
          if (setP1 === '' || setP2 === '') {
            return `${setLabel} scores are required`;
          }
          const p1Val = parseInt(setP1);
          const p2Val = parseInt(setP2);
          if (isNaN(p1Val) || isNaN(p2Val) || p1Val < 0 || p2Val < 0) {
            return 'Scores must be positive numbers';
          }
          if (p1Val === p2Val) {
            return `${setLabel} cannot be a tie`;
          }

          if (isTeam) {
            if (setP1At11 === '' || setP2At11 === '') {
              return `${setLabel} 11-point mark scores are required`;
            }
            const p1At11Val = parseInt(setP1At11);
            const p2At11Val = parseInt(setP2At11);
            if (isNaN(p1At11Val) || isNaN(p2At11Val) || p1At11Val < 0 || p2At11Val < 0) {
              return '11-point mark scores must be positive numbers';
            }
            if (!((p1At11Val === 11 && p2At11Val < 11) || (p2At11Val === 11 && p1At11Val < 11))) {
              return 'One team must score exactly 11 points at the transition mark, and the other must score less than 11';
            }
            if (p1Val < p1At11Val || p2Val < p2At11Val) {
              return 'Final scores must be greater than or equal to 11-point mark scores';
            }
          }
          return null;
        };

        // Set 1 validation
        const set1Err = validateSet(set1P1, set1P2, set1P1At11, set1P2At11, 'Set 1');
        if (set1Err) errors.set1 = set1Err;

        // Set 2 validation
        const set2Err = validateSet(set2P1, set2P2, set2P1At11, set2P2At11, 'Set 2');
        if (set2Err) errors.set2 = set2Err;

        if (isTeam) {
          // Set 3 is always validated/required for Team matches if scores are entered
          const set3Err = validateSet(set3P1, set3P2, set3P1At11, set3P2At11, 'Set 3');
          if (set3Err) errors.set3 = set3Err;
        } else {
          // If sets are split (1-1), Set 3 is required
          if (set1P1 !== '' && set1P2 !== '' && set2P1 !== '' && set2P2 !== '') {
            const p1Set1Won = parseInt(set1P1) > parseInt(set1P2);
            const p1Set2Won = parseInt(set2P1) > parseInt(set2P2);

            if (p1Set1Won !== p1Set2Won) {
              // Split sets, check Set 3
              const set3Err = validateSet(set3P1, set3P2, set3P1At11, set3P2At11, 'Set 3');
              if (set3Err) {
                errors.set3 = set3Err;
              }
            } else {
              // Decided in 2 sets, Set 3 must be empty or cleared
              if (set3P1 !== '' || set3P2 !== '' || set3P1At11 !== '' || set3P2At11 !== '') {
                errors.set3 = 'Match decided in 2 sets; Set 3 scores should be left empty';
              }
            }
          }
        }
      }

      if (round && (isNaN(parseInt(round)) || parseInt(round) < 1)) {
        errors.round = 'Round must be 1 or greater';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateForm()) return;

    setFormLoading(true);

    const hasScores = set1P1 !== '' || set1P2 !== '' || set2P1 !== '' || set2P2 !== '' || set3P1 !== '' || set3P2 !== '';

    try {
      // 1. Update Match Details
      const matchPayload = {
        matchDate: matchDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        round: round ? parseInt(round) : null
      };

      const matchResponse = await fetch(`http://localhost:8080/api/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchPayload)
      });

      if (!matchResponse.ok) {
        throw new Error('Failed to update match details.');
      }

      // 2. Update Scores if present
      if (hasScores) {
        const resultPayload = {
          matchId: parseInt(selectedMatchId),
          set1P1: parseInt(set1P1),
          set1P2: parseInt(set1P2),
          set2P1: parseInt(set2P1),
          set2P2: parseInt(set2P2),
          set3P1: set3P1 !== '' ? parseInt(set3P1) : null,
          set3P2: set3P2 !== '' ? parseInt(set3P2) : null,
          set1P1At11: set1P1At11 !== '' ? parseInt(set1P1At11) : null,
          set1P2At11: set1P2At11 !== '' ? parseInt(set1P2At11) : null,
          set2P1At11: set2P1At11 !== '' ? parseInt(set2P1At11) : null,
          set2P2At11: set2P2At11 !== '' ? parseInt(set2P2At11) : null,
          set3P1At11: set3P1At11 !== '' ? parseInt(set3P1At11) : null,
          set3P2At11: set3P2At11 !== '' ? parseInt(set3P2At11) : null
        };

        const resultResponse = await fetch('http://localhost:8080/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultPayload)
        });

        if (!resultResponse.ok) {
          const errorData = await resultResponse.json();
          throw new Error(errorData.error || 'Failed to save match results.');
        }
      }

      alert('Match details and results saved successfully');
      onNavigate('matches', { tournamentId });
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to save changes. Please check if the backend is running.');
    } finally {
      setFormLoading(false);
    }
  };

  if (!canEditResults) {
    return (
      <div className="error-state-wrapper" style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 className="title" style={{ color: 'var(--color-error)' }}>Access Denied</h2>
        <p className="subtitle" style={{ margin: '1rem 0 2rem' }}>You do not have permissions to add or edit results.</p>
        <button className="back-btn" onClick={() => onNavigate('home')}>
          Go back home
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-state-wrapper">
        <div className="spinner" aria-label="Loading" />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state-wrapper">
        <p className="error-text">{error}</p>
        <button className="back-btn" onClick={() => onNavigate('home')}>
          Go back home
        </button>
      </div>
    );
  }

  const renderTeamSetCard = (setNum, setP1At11, setSetP1At11, setP2At11, setSetP2At11, setP1, setSetP1, setP2, setSetP2, p1Players, p2Players) => {
    // Determine player rotation designations based on setNum
    let firstHalfPairs1 = "";
    let firstHalfPairs2 = "";
    let secondHalfPairs1 = "";
    let secondHalfPairs2 = "";

    if (p1Players.length >= 4 && p2Players.length >= 4) {
      const getPlayerName = (list, index) => list[index] ? `${list[index].firstName} ${list[index].lastName}` : `Player ${index + 1}`;
      if (setNum === 1) {
        firstHalfPairs1 = `${getPlayerName(p1Players, 1)} / ${getPlayerName(p1Players, 2)}`;
        firstHalfPairs2 = `${getPlayerName(p2Players, 1)} / ${getPlayerName(p2Players, 2)}`;
        secondHalfPairs1 = `${getPlayerName(p1Players, 0)} / ${getPlayerName(p1Players, 3)}`;
        secondHalfPairs2 = `${getPlayerName(p2Players, 0)} / ${getPlayerName(p2Players, 3)}`;
      } else if (setNum === 2) {
        firstHalfPairs1 = `${getPlayerName(p1Players, 1)} / ${getPlayerName(p1Players, 3)}`;
        firstHalfPairs2 = `${getPlayerName(p2Players, 1)} / ${getPlayerName(p2Players, 3)}`;
        secondHalfPairs1 = `${getPlayerName(p1Players, 0)} / ${getPlayerName(p1Players, 2)}`;
        secondHalfPairs2 = `${getPlayerName(p2Players, 0)} / ${getPlayerName(p2Players, 2)}`;
      } else if (setNum === 3) {
        firstHalfPairs1 = `${getPlayerName(p1Players, 2)} / ${getPlayerName(p1Players, 3)}`;
        firstHalfPairs2 = `${getPlayerName(p2Players, 2)} / ${getPlayerName(p2Players, 3)}`;
        secondHalfPairs1 = `${getPlayerName(p1Players, 0)} / ${getPlayerName(p1Players, 1)}`;
        secondHalfPairs2 = `${getPlayerName(p2Players, 0)} / ${getPlayerName(p2Players, 1)}`;
      }
    } else {
      // Fallback description if players list not loaded
      if (setNum === 1) {
        firstHalfPairs1 = firstHalfPairs2 = "Player 2 & Player 3";
        secondHalfPairs1 = secondHalfPairs2 = "Player 1 & Player 4";
      } else if (setNum === 2) {
        firstHalfPairs1 = firstHalfPairs2 = "Player 2 & Player 4";
        secondHalfPairs1 = secondHalfPairs2 = "Player 1 & Player 3";
      } else if (setNum === 3) {
        firstHalfPairs1 = firstHalfPairs2 = "Player 3 & Player 4";
        secondHalfPairs1 = secondHalfPairs2 = "Player 1 & Player 2";
      }
    }

    return (
      <div className="team-set-card" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--primary)', marginBottom: '1.25rem', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '0.5rem' }}>
          Set {setNum} {setNum === 3 ? '(if split)' : ''}
        </h4>

        {/* Rotation helper display */}
        <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.825rem', fontWeight: '600', color: 'var(--accent-pickleball)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Team Pairings
          </div>
          <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div>
              <strong style={{ color: 'var(--text-primary)' }}>First Half (0-0 to 11 points mark):</strong>
              <div style={{ color: 'var(--text-secondary)', paddingLeft: '8px', marginTop: '2px' }}>
                <div>• {matchDetails.participant1Name}: {firstHalfPairs1}</div>
                <div>• {matchDetails.participant2Name}: {firstHalfPairs2}</div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>Second Half (transition up to 22 points):</strong>
              <div style={{ color: 'var(--text-secondary)', paddingLeft: '8px', marginTop: '2px' }}>
                <div>• {matchDetails.participant1Name}: {secondHalfPairs1}</div>
                <div>• {matchDetails.participant2Name}: {secondHalfPairs2}</div>
              </div>
            </div>
          </div>
        </div>

        {/* 11-Point Mark Row */}
        <div style={{ marginBottom: '1.25rem' }}>
          <h5 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Scores at 11-Point Mark (Transition)
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{matchDetails.participant1Name}</label>
              <input
                type="number"
                min="0"
                max="11"
                placeholder="e.g. 11"
                className="form-input"
                value={setP1At11}
                onChange={(e) => setSetP1At11(e.target.value)}
                disabled={formLoading}
              />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-muted)', paddingTop: '18px' }}>-</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{matchDetails.participant2Name}</label>
              <input
                type="number"
                min="0"
                max="11"
                placeholder="e.g. 8"
                className="form-input"
                value={setP2At11}
                onChange={(e) => setSetP2At11(e.target.value)}
                disabled={formLoading}
              />
            </div>
          </div>
        </div>

        {/* Final score Row */}
        <div style={{ marginBottom: '0.5rem' }}>
          <h5 style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
            Final Set Scores
          </h5>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{matchDetails.participant1Name}</label>
              <input
                type="number"
                min="0"
                max="22"
                placeholder="e.g. 22"
                className="form-input"
                value={setP1}
                onChange={(e) => setSetP1(e.target.value)}
                disabled={formLoading}
              />
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-muted)', paddingTop: '18px' }}>-</div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{matchDetails.participant2Name}</label>
              <input
                type="number"
                min="0"
                max="22"
                placeholder="e.g. 15"
                className="form-input"
                value={setP2}
                onChange={(e) => setSetP2(e.target.value)}
                disabled={formLoading}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const currentDivision = divisions.find(d => String(d.id) === String(selectedDivisionId));

  return (
    <div className="matches-page-container" style={{ maxWidth: '800px' }}>
      <header className="page-header-section" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'left', background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Edit Match Details / Add Results
        </h1>
        <p className="subtitle" style={{ textAlign: 'left' }}>
          Edit match details (date, time, round) or enter/modify match scores.
        </p>
      </header>

      <div className="form-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '2rem' }}>
        {formError && (
          <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group flex-1" style={{ minWidth: '240px' }}>
              <label htmlFor="divSelect" className="form-label">Select Division *</label>
              <select
                id="divSelect"
                className={`form-input form-select ${validationErrors.division ? 'error' : ''}`}
                value={selectedDivisionId}
                onChange={(e) => handleDivisionChange(e.target.value)}
                disabled={formLoading}
                required
              >
                <option value="" disabled>Choose division...</option>
                {divisions.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name}
                  </option>
                ))}
              </select>
              {validationErrors.division && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.division}</span>}
            </div>

            <div className="form-group flex-1" style={{ minWidth: '240px' }}>
              <label htmlFor="matchSelect" className="form-label">Select Match *</label>
              <select
                id="matchSelect"
                className={`form-input form-select ${validationErrors.match ? 'error' : ''}`}
                value={selectedMatchId}
                onChange={(e) => handleMatchChange(e.target.value)}
                disabled={formLoading || !selectedDivisionId}
                required
              >
                <option value="">Choose match...</option>
                {matches.map((m) => (
                  <option key={m.matchId} value={m.matchId}>
                    {m.participant1Name} vs {m.participant2Name} ({m.matchDate})
                  </option>
                ))}
              </select>
              {validationErrors.match && <span className="error-text" style={{ fontSize: '0.8rem', color: 'var(--color-error)', marginTop: '4px' }}>{validationErrors.match}</span>}
            </div>
          </div>

          {selectedMatchId && matchDetails && (
             <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>Match Details</h3>
                <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="mDate" className="form-label">Match Date</label>
                    <input
                      id="mDate"
                      type="date"
                      className="form-input"
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
                <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="sTime" className="form-label">Start Time</label>
                    <input
                      id="sTime"
                      type="time"
                      className="form-input"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="eTime" className="form-label">End Time</label>
                    <input
                      id="eTime"
                      type="time"
                      className="form-input"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      disabled={formLoading}
                    />
                  </div>
                </div>
              </div>

              {currentDivision?.divisionType === 'Team' ? (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1.25rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>Score Entry Sheet (Team Format)</h3>
                  {renderTeamSetCard(1, set1P1At11, setSet1P1At11, set1P2At11, setSet1P2At11, set1P1, setSet1P1, set1P2, setSet1P2, teamPlayers1, teamPlayers2)}
                  {renderTeamSetCard(2, set2P1At11, setSet2P1At11, set2P2At11, setSet2P2At11, set2P1, setSet2P1, set2P2, setSet2P2, teamPlayers1, teamPlayers2)}
                  {renderTeamSetCard(3, set3P1At11, setSet3P1At11, set3P2At11, setSet3P2At11, set3P1, setSet3P1, set3P2, setSet3P2, teamPlayers1, teamPlayers2)}

                  {validationErrors.set1 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 1: {validationErrors.set1}</div>}
                  {validationErrors.set2 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 2: {validationErrors.set2}</div>}
                  {validationErrors.set3 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 3: {validationErrors.set3}</div>}
                </div>
              ) : (
                <div>
                  <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>Score Entry Sheet</h3>
                  
                  <div className="scores-grid" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center', margin: '1.5rem 0' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Participant</div>
                    <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 1</div>
                    <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 2</div>
                    <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 3 (if split)</div>

                    {/* Row for Participant 1 */}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {matchDetails.participant1Name}
                      </span>
                      {currentDivision?.divisionType === 'Doubles' && matchDetails.participant1PlayerNames && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {matchDetails.participant1PlayerNames}
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set1P1}
                        onChange={(e) => setSet1P1(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set2P1}
                        onChange={(e) => setSet2P1(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set3P1}
                        onChange={(e) => setSet3P1(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>

                    {/* Row for Participant 2 */}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', textOverflow: 'ellipsis', whiteSpace: 'nowrap', overflow: 'hidden' }}>
                        {matchDetails.participant2Name}
                      </span>
                      {currentDivision?.divisionType === 'Doubles' && matchDetails.participant2PlayerNames && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {matchDetails.participant2PlayerNames}
                        </span>
                      )}
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set1P2}
                        onChange={(e) => setSet1P2(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set2P2}
                        onChange={(e) => setSet2P2(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        className="form-input"
                        value={set3P2}
                        onChange={(e) => setSet3P2(e.target.value)}
                        placeholder="0"
                        min="0"
                        disabled={formLoading}
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                  </div>

                  {validationErrors.set1 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 1: {validationErrors.set1}</div>}
                  {validationErrors.set2 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 2: {validationErrors.set2}</div>}
                  {validationErrors.set3 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 3: {validationErrors.set3}</div>}
                </div>
              )}

            <button
              type="submit"
              className="submit-btn"
              disabled={formLoading}
              style={{ marginTop: '1.5rem', minHeight: '48px', width: '100%' }}
            >
              {formLoading ? <div className="spinner" aria-label="Saving" /> : 'Save Changes'}
            </button>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
