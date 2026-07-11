import { useState, useEffect } from 'react';

export default function AddResult({ tournamentId, user, onNavigate, searchQuery }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [matches, setMatches] = useState([]);
  const [selectedMatchId, setSelectedMatchId] = useState('');
  const [matchDetails, setMatchDetails] = useState(null);

  // Score states
  const [set1P1, setSet1P1] = useState('');
  const [set1P2, setSet1P2] = useState('');
  const [set2P1, setSet2P1] = useState('');
  const [set2P2, setSet2P2] = useState('');
  const [set3P1, setSet3P1] = useState('');
  const [set3P2, setSet3P2] = useState('');

  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [formError, setFormError] = useState('');

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
      return;
    }

    const loadMatchDetailsAndResult = async () => {
      try {
        setFormLoading(true);
        setFormError('');
        setValidationErrors({});

        // If not already set by query pre-population
        if (!matchDetails || matchDetails.matchId !== parseInt(selectedMatchId)) {
          const matchResp = await fetch(`http://localhost:8080/api/matches/${selectedMatchId}`);
          if (matchResp.ok) {
            const matchData = await matchResp.json();
            setMatchDetails(matchData);
          }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMatchId]);

  const clearScores = () => {
    setSet1P1('');
    setSet1P2('');
    setSet2P1('');
    setSet2P2('');
    setSet3P1('');
    setSet3P2('');
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
      // Set 1 validation
      if (set1P1 === '' || set1P2 === '') {
        errors.set1 = 'Set 1 scores are required';
      } else if (isNaN(set1P1) || isNaN(set1P2) || parseInt(set1P1) < 0 || parseInt(set1P2) < 0) {
        errors.set1 = 'Scores must be positive numbers';
      } else if (parseInt(set1P1) === parseInt(set1P2)) {
        errors.set1 = 'Set 1 cannot be a tie';
      }

      // Set 2 validation
      if (set2P1 === '' || set2P2 === '') {
        errors.set2 = 'Set 2 scores are required';
      } else if (isNaN(set2P1) || isNaN(set2P2) || parseInt(set2P1) < 0 || parseInt(set2P2) < 0) {
        errors.set2 = 'Scores must be positive numbers';
      } else if (parseInt(set2P1) === parseInt(set2P2)) {
        errors.set2 = 'Set 2 cannot be a tie';
      }

      // If sets are split (1-1), Set 3 is required
      if (set1P1 !== '' && set1P2 !== '' && set2P1 !== '' && set2P2 !== '') {
        const p1Set1Won = parseInt(set1P1) > parseInt(set1P2);
        const p1Set2Won = parseInt(set2P1) > parseInt(set2P2);

        if (p1Set1Won !== p1Set2Won) {
          // Split sets, check Set 3
          if (set3P1 === '' || set3P2 === '') {
            errors.set3 = 'Set 3 scores are required for a split match';
          } else if (isNaN(set3P1) || isNaN(set3P2) || parseInt(set3P1) < 0 || parseInt(set3P2) < 0) {
            errors.set3 = 'Scores must be positive numbers';
          } else if (parseInt(set3P1) === parseInt(set3P2)) {
            errors.set3 = 'Set 3 cannot be a tie';
          }
        } else {
          // Decided in 2 sets, Set 3 must be empty or cleared
          if (set3P1 !== '' || set3P2 !== '') {
            errors.set3 = 'Match decided in 2 sets; Set 3 scores should be left empty';
          }
        }
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
    const payload = {
      matchId: parseInt(selectedMatchId),
      set1P1: parseInt(set1P1),
      set1P2: parseInt(set1P2),
      set2P1: parseInt(set2P1),
      set2P2: parseInt(set2P2),
      set3P1: set3P1 !== '' ? parseInt(set3P1) : null,
      set3P2: set3P2 !== '' ? parseInt(set3P2) : null
    };

    try {
      const response = await fetch('http://localhost:8080/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Result successfully saved');
        onNavigate('matches', { tournamentId });
      } else {
        const errorData = await response.json();
        setFormError(errorData.error || 'Failed to save result. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to save result. Please check if the backend is running.');
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

  return (
    <div className="matches-page-container" style={{ maxWidth: '800px' }}>
      <header className="page-header-section" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'left', background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Add Match Result
        </h1>
        <p className="subtitle" style={{ textAlign: 'left' }}>
          Enter score results for completed tournament matches.
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
            <div style={{ animation: 'slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}>
              <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>Score Entry Sheet</h3>
              
              <div className="scores-grid" style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center', margin: '1.5rem 0' }}>
                <div style={{ fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Participant</div>
                <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 1</div>
                <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 2</div>
                <div style={{ textAlign: 'center', fontWeight: '600', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Set 3 (if split)</div>

                {/* Row for Participant 1 */}
                <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {matchDetails.participant1Name}
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
                <div style={{ fontSize: '1.05rem', fontWeight: '600', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {matchDetails.participant2Name}
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

              <button
                type="submit"
                className="submit-btn"
                disabled={formLoading}
                style={{ marginTop: '1.5rem', minHeight: '48px', width: '100%' }}
              >
                {formLoading ? <div className="spinner" aria-label="Saving" /> : 'Save Result'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
