import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function AddResult({ tournamentId, user, guestSession, onNavigate, searchQuery }) {
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
  const [courtId, setCourtId] = useState('');
  const [courts, setCourts] = useState([]);

  // Score states
  const [set1P1, setSet1P1] = useState('');
  const [set1P2, setSet1P2] = useState('');
  const [set2P1, setSet2P1] = useState('');
  const [set2P2, setSet2P2] = useState('');
  const [set3P1, setSet3P1] = useState('');
  const [set3P2, setSet3P2] = useState('');

  // Set 4 scores (Singles Set — only for 4-set divisions)
  const [set4P1, setSet4P1] = useState('');
  const [set4P2, setSet4P2] = useState('');

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
  const [isSuccess, setIsSuccess] = useState(false);
  const [hasExistingResult, setHasExistingResult] = useState(false);
  const [existingP1Status, setExistingP1Status] = useState(null);
  const [savedSets, setSavedSets] = useState({ 1: false, 2: false, 3: false, 4: false });
  const [savingSet, setSavingSet] = useState(null);
  const [setSuccessToast, setSetSuccessToast] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // Special result type — admin only
  const [resultType, setResultType] = useState('Normal'); // 'Normal' | 'Forfeit' | 'Cancelled'
  const [forfeitingParticipantId, setForfeitingParticipantId] = useState('');

  const [participants, setParticipants] = useState([]);

  // ── Player Availability Override state ──────────────────────────────────────
  // Saved overrides loaded from DB: [{ slotPosition, absentPlayerId, absentPlayerName, subPlayerId, subPlayerName, subPlayerSkillLevel }]
  const [team1Overrides, setTeam1Overrides] = useState([]);
  const [team2Overrides, setTeam2Overrides] = useState([]);
  // Pending (UI-editing) overrides — before the admin presses "Save Availability"
  // Structure: { [slotPosition]: { absentPlayerId, absentPlayerName, subPlayerId, subPlayerName } }
  const [pendingOverrides1, setPendingOverrides1] = useState({});
  const [pendingOverrides2, setPendingOverrides2] = useState({});
  // Track which team's override panel is currently open (1 or 2 or null)
  const [savingOverride, setSavingOverride] = useState(null); // 1 | 2 | null
  // Substitute search
  const [subSearch, setSubSearch] = useState({ teamNum: null, slot: null, query: '', results: [], loading: false });
  // Team IDs (playerTeamId) — stored so availability panel can reference them in JSX
  const [team1Id, setTeam1Id] = useState(null);
  const [team2Id, setTeam2Id] = useState(null);
  // Availability modal
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [modalSaveError, setModalSaveError] = useState('');

  const currentDivision = divisions.find(d => String(d.id) === String(selectedDivisionId));
  const isMatchCompleted = hasExistingResult && existingP1Status !== null;

  // Fetch participants when selectedDivisionId changes
  useEffect(() => {
    if (!selectedDivisionId) {
      setParticipants([]);
      return;
    }
    const loadParticipants = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivisionId}/participants`);
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

  const canEditResults = (user && (user.role === 'admin' || user.role === 'editor')) || !!guestSession;

  // Parse query parameters
  const params = new URLSearchParams(searchQuery);
  const queryMatchId = params.get('matchId');

  // Access check
  useEffect(() => {
    if (!canEditResults) {
      setLoading(false);
    }
  }, [canEditResults]);

  useEffect(() => {
    const fetchCourts = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/courts`);
        if (res.ok) setCourts(await res.json());
      } catch (err) {
        console.error('Failed to fetch courts', err);
      }
    };
    if (canEditResults) fetchCourts();
  }, [canEditResults]);

  // 1. Fetch Divisions & Pre-populate if queryMatchId exists
  useEffect(() => {
    if (!canEditResults) return;

    const initializeForm = async () => {
      try {
        setLoading(true);
        setError(null);

        // Load divisions
        const divResponse = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/divisions`);
        if (!divResponse.ok) {
          throw new Error('Failed to load divisions');
        }
        const divData = await divResponse.json();
        setDivisions(divData);

        if (queryMatchId) {
          // Fetch match details to find division
          const matchResponse = await fetch(`${API_BASE_URL}/api/matches/${queryMatchId}`);
          if (matchResponse.ok) {
            const matchData = await matchResponse.json();
            setMatchDetails(matchData);
            setSelectedDivisionId(matchData.divisionId);
            setSelectedMatchId(matchData.matchId);
            
            // Fetch matches for that division
            const matchesResp = await fetch(`${API_BASE_URL}/api/divisions/${matchData.divisionId}/matches`);
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
        } else if (guestSession) {
          setSelectedDivisionId(guestSession.divisionId);
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
        const response = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivisionId}/matches`);
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
      setCourtId('');
      return;
    }

    const loadMatchDetailsAndResult = async () => {
      try {
        setFormLoading(true);
        setFormError('');
        setValidationErrors({});

        let activeMatchData = matchDetails;
        if (!activeMatchData || activeMatchData.matchId !== parseInt(selectedMatchId)) {
          const matchResp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}`);
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
          setCourtId(activeMatchData.courtId ? String(activeMatchData.courtId) : '');
        }

        // Fetch result for the match
        const resultResp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/result`);
        if (resultResp.ok) {
          const resData = await resultResp.json();
          setSet1P1(resData.set1P1 !== null ? String(resData.set1P1) : '');
          setSet1P2(resData.set1P2 !== null ? String(resData.set1P2) : '');
          setSet2P1(resData.set2P1 !== null ? String(resData.set2P1) : '');
          setSet2P2(resData.set2P2 !== null ? String(resData.set2P2) : '');
          setSet3P1(resData.set3P1 !== null ? String(resData.set3P1) : '');
          setSet3P2(resData.set3P2 !== null ? String(resData.set3P2) : '');
          setSet4P1(resData.set4P1 !== null && resData.set4P1 !== undefined ? String(resData.set4P1) : '');
          setSet4P2(resData.set4P2 !== null && resData.set4P2 !== undefined ? String(resData.set4P2) : '');
          setSet1P1At11(resData.set1P1At11 !== null ? String(resData.set1P1At11) : '');
          setSet1P2At11(resData.set1P2At11 !== null ? String(resData.set1P2At11) : '');
          setSet2P1At11(resData.set2P1At11 !== null ? String(resData.set2P1At11) : '');
          setSet2P2At11(resData.set2P2At11 !== null ? String(resData.set2P2At11) : '');
          setSet3P1At11(resData.set3P1At11 !== null ? String(resData.set3P1At11) : '');
          setSet3P2At11(resData.set3P2At11 !== null ? String(resData.set3P2At11) : '');
          setResultType(resData.resultType || 'Normal');
          setExistingP1Status(resData.p1Status || null);
          setSavedSets({
            1: resData.set1P1 !== null && resData.set1P2 !== null,
            2: resData.set2P1 !== null && resData.set2P2 !== null,
            3: resData.set3P1 !== null && resData.set3P2 !== null,
            4: resData.set4P1 !== null && resData.set4P2 !== null
          });
          // For Forfeit: figure out which participant forfeited (the Lost one)
          if (resData.resultType === 'Forfeit' && resData.p2Status === 'Lost') {
            setForfeitingParticipantId(String(matchDetails?.participant2 || ''));
          } else if (resData.resultType === 'Forfeit' && resData.p1Status === 'Lost') {
            setForfeitingParticipantId(String(matchDetails?.participant1 || ''));
          } else {
            setForfeitingParticipantId('');
          }
          setHasExistingResult(true);
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

  // Fetch team players AND player overrides for Team division when match changes.
  // NOTE: We deliberately do NOT depend on `matchDetails` state here — doing so caused a race
  // condition where this effect fired before the sibling effect had committed matchDetails,
  // leaving team1Id null and hiding the Player Availability button on first visit.
  // Instead, we fetch match data directly from the API using selectedMatchId.
  useEffect(() => {
    if (!selectedMatchId || participants.length === 0 || divisions.length === 0) {
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
        // Fetch match data directly so we don't race with the matchDetails state update
        let activeMatchData = null;
        const matchResp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}`);
        if (matchResp.ok) {
          activeMatchData = await matchResp.json();
          // Keep matchDetails state in sync (idempotent — same data)
          setMatchDetails(activeMatchData);
        }
        if (!activeMatchData) return;

        const p1 = participants.find(p => p.id === activeMatchData.participant1);
        const p2 = participants.find(p => p.id === activeMatchData.participant2);
        if (p1 && p2) {
          // Store team IDs for use in availability panel at render time
          setTeam1Id(p1.playerTeamId);
          setTeam2Id(p2.playerTeamId);

          const p1PlayersResp = await fetch(`${API_BASE_URL}/api/teams/${p1.playerTeamId}/players`);
          if (p1PlayersResp.ok) {
            const p1Players = await p1PlayersResp.json();
            setTeamPlayers1(p1Players);
          }
          const p2PlayersResp = await fetch(`${API_BASE_URL}/api/teams/${p2.playerTeamId}/players`);
          if (p2PlayersResp.ok) {
            const p2Players = await p2PlayersResp.json();
            setTeamPlayers2(p2Players);
          }

          // Load player availability overrides — done here because we need team IDs
          try {
            const ovResp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/player-overrides`);
            if (ovResp.ok) {
              const ovData = await ovResp.json();
              const t1Ov = ovData.filter(o => String(o.teamId) === String(p1.playerTeamId));
              const t2Ov = ovData.filter(o => String(o.teamId) === String(p2.playerTeamId));
              setTeam1Overrides(t1Ov);
              setTeam2Overrides(t2Ov);
              const toPending = (overrides) => {
                const obj = {};
                overrides.forEach(o => {
                  obj[o.slotPosition] = {
                    absentPlayerId: o.absentPlayerId,
                    absentPlayerName: o.absentPlayerName || '',
                    subPlayerId: o.subPlayerId || null,
                    subPlayerName: o.subPlayerName || '',
                    subPlayerSkillLevel: o.subPlayerSkillLevel || '',
                  };
                });
                return obj;
              };
              setPendingOverrides1(toPending(t1Ov));
              setPendingOverrides2(toPending(t2Ov));
            }
          } catch (ovErr) {
            console.error('Error loading player overrides:', ovErr);
          }
        }
      } catch (err) {
        console.error('Error loading team players:', err);
      }
    };

    loadTeamPlayers();
  }, [selectedMatchId, participants, divisions, selectedDivisionId]);

  const clearScores = () => {
    setSet1P1('');
    setSet1P2('');
    setSet2P1('');
    setSet2P2('');
    setSet3P1('');
    setSet3P2('');
    setSet4P1('');
    setSet4P2('');
    setSet1P1At11('');
    setSet1P2At11('');
    setSet2P1At11('');
    setSet2P2At11('');
    setSet3P1At11('');
    setSet3P2At11('');
    setTeamPlayers1([]);
    setTeamPlayers2([]);
    setHasExistingResult(false);
    setExistingP1Status(null);
    setSavedSets({ 1: false, 2: false, 3: false, 4: false });
    setResultType('Normal');
    setForfeitingParticipantId('');
    setTeam1Overrides([]);
    setTeam2Overrides([]);
    setPendingOverrides1({});
    setPendingOverrides2({});
    setSubSearch({ teamNum: null, slot: null, query: '', results: [], loading: false });
    setTeam1Id(null);
    setTeam2Id(null);

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

  const handleSaveSet = async (setNum) => {
    setFormError('');
    setSetSuccessToast('');
    const errors = {};
    const isTeam = currentDivision?.divisionType === 'Team';

    const validateSingleSet = (setP1, setP2, setP1At11, setP2At11, setLabel) => {
      if (setP1 === '' || setP2 === '') {
        return `${setLabel} scores are required to save this set`;
      }
      const val1 = parseInt(setP1);
      const val2 = parseInt(setP2);
      if (isNaN(val1) || isNaN(val2) || val1 < 0 || val2 < 0) {
        return `${setLabel} scores must be positive numbers`;
      }
      if (val1 === val2) {
        return `${setLabel} cannot be a tie`;
      }
      if (isTeam) {
        if (setP1At11 === '' || setP2At11 === '') {
          return `${setLabel} 11-point mark scores are required`;
        }
        const at11Val1 = parseInt(setP1At11);
        const at11Val2 = parseInt(setP2At11);
        if (isNaN(at11Val1) || isNaN(at11Val2) || at11Val1 < 0 || at11Val2 < 0) {
          return `${setLabel} 11-point mark scores must be positive numbers`;
        }
        if (!((at11Val1 === 11 && at11Val2 < 11) || (at11Val2 === 11 && at11Val1 < 11))) {
          return 'One team must score exactly 11 points at the transition mark, and the other must score less than 11';
        }
        if (val1 < at11Val1 || val2 < at11Val2) {
          return 'Final scores must be greater than or equal to 11-point mark scores';
        }
      }
      return null;
    };

    if (setNum === 1) {
      const err = validateSingleSet(set1P1, set1P2, set1P1At11, set1P2At11, 'Set 1');
      if (err) errors.set1 = err;
    } else if (setNum === 2) {
      const err1 = validateSingleSet(set1P1, set1P2, set1P1At11, set1P2At11, 'Set 1');
      if (err1) errors.set1 = err1;
      const err2 = validateSingleSet(set2P1, set2P2, set2P1At11, set2P2At11, 'Set 2');
      if (err2) errors.set2 = err2;
    } else if (setNum === 3) {
      const err1 = validateSingleSet(set1P1, set1P2, set1P1At11, set1P2At11, 'Set 1');
      if (err1) errors.set1 = err1;
      const err2 = validateSingleSet(set2P1, set2P2, set2P1At11, set2P2At11, 'Set 2');
      if (err2) errors.set2 = err2;
      const err3 = validateSingleSet(set3P1, set3P2, set3P1At11, set3P2At11, 'Set 3');
      if (err3) errors.set3 = err3;
    } else if (setNum === 4) {
      const err1 = validateSingleSet(set1P1, set1P2, set1P1At11, set1P2At11, 'Set 1');
      if (err1) errors.set1 = err1;
      const err2 = validateSingleSet(set2P1, set2P2, set2P1At11, set2P2At11, 'Set 2');
      if (err2) errors.set2 = err2;
      const err3 = validateSingleSet(set3P1, set3P2, set3P1At11, set3P2At11, 'Set 3');
      if (err3) errors.set3 = err3;
      if (set4P1 === '' || set4P2 === '') {
        errors.set4 = 'Set 4 scores are required to save this set';
      } else {
        const val1 = parseInt(set4P1);
        const val2 = parseInt(set4P2);
        if (isNaN(val1) || isNaN(val2) || val1 < 0 || val2 < 0) {
          errors.set4 = 'Set 4 scores must be positive numbers';
        } else if (val1 === val2) {
          errors.set4 = 'Set 4 cannot be a tie';
        }
      }
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    setSavingSet(setNum);

    try {
      // 1. Update Match Details
      const matchPayload = {
        matchDate: matchDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        round: round ? parseInt(round) : null,
        courtId: courtId ? parseInt(courtId) : null
      };

      const matchResp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchPayload)
      });
      if (!matchResp.ok) {
        throw new Error('Failed to update match details.');
      }

      // 2. Save partial result
      const resultPayload = {
        matchId: parseInt(selectedMatchId),
        set1P1: set1P1 !== '' ? parseInt(set1P1) : null,
        set1P2: set1P2 !== '' ? parseInt(set1P2) : null,
        set2P1: set2P1 !== '' ? parseInt(set2P1) : null,
        set2P2: set2P2 !== '' ? parseInt(set2P2) : null,
        set3P1: set3P1 !== '' ? parseInt(set3P1) : null,
        set3P2: set3P2 !== '' ? parseInt(set3P2) : null,
        set4P1: set4P1 !== '' ? parseInt(set4P1) : null,
        set4P2: set4P2 !== '' ? parseInt(set4P2) : null,
        set1P1At11: set1P1At11 !== '' ? parseInt(set1P1At11) : null,
        set1P2At11: set1P2At11 !== '' ? parseInt(set1P2At11) : null,
        set2P1At11: set2P1At11 !== '' ? parseInt(set2P1At11) : null,
        set2P2At11: set2P2At11 !== '' ? parseInt(set2P2At11) : null,
        set3P1At11: set3P1At11 !== '' ? parseInt(set3P1At11) : null,
        set3P2At11: set3P2At11 !== '' ? parseInt(set3P2At11) : null,
        lastEditedByPlayerId: guestSession ? guestSession.playerId : (user?.playerId || null),
        resultType: 'Normal',
        isPartial: true
      };

      const resResp = await fetch(`${API_BASE_URL}/api/results`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultPayload)
      });

      if (!resResp.ok) {
        const errData = await resResp.json();
        throw new Error(errData.error || `Failed to save Set ${setNum} score.`);
      }

      setHasExistingResult(true);
      setSavedSets(prev => ({ ...prev, [setNum]: true }));
      setSetSuccessToast(`Set ${setNum} score saved successfully!`);
      setTimeout(() => setSetSuccessToast(''), 4000);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to save set score.');
    } finally {
      setSavingSet(null);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    // For special result types, skip the normal score validation
    if (resultType === 'Normal' && !validateForm()) return;
    if (resultType === 'Forfeit' && !forfeitingParticipantId) {
      setFormError('Please select which team forfeited the match.');
      return;
    }

    setFormLoading(true);

    const hasScores = set1P1 !== '' || set1P2 !== '' || set2P1 !== '' || set2P2 !== '' || set3P1 !== '' || set3P2 !== '';

    try {
      // 1. Update Match Details (always)
      const matchPayload = {
        matchDate: matchDate || null,
        startTime: startTime || null,
        endTime: endTime || null,
        round: round ? parseInt(round) : null,
        courtId: courtId ? parseInt(courtId) : null
      };

      const matchResponse = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchPayload)
      });

      if (!matchResponse.ok) {
        throw new Error('Failed to update match details.');
      }

      // 2. Save result based on resultType
      if (resultType === 'Forfeit') {
        // Determine winner: the team that did NOT forfeit
        const p1Id = String(matchDetails.participant1);
        const p2Id = String(matchDetails.participant2);
        const forfeitedP1 = forfeitingParticipantId === p1Id;
        const resultPayload = {
          matchId: parseInt(selectedMatchId),
          p1Status: forfeitedP1 ? 'Lost' : 'Won',
          p2Status: forfeitedP1 ? 'Won' : 'Lost',
          resultType: 'Forfeit',
          lastEditedByPlayerId: guestSession ? guestSession.playerId : null
        };
        const resp = await fetch(`${API_BASE_URL}/api/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultPayload)
        });
        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(errorData.error || 'Failed to save forfeit result.');
        }

      } else if (resultType === 'Cancelled') {
        const resultPayload = {
          matchId: parseInt(selectedMatchId),
          p1Status: 'Draw',
          p2Status: 'Draw',
          resultType: 'Cancelled',
          lastEditedByPlayerId: guestSession ? guestSession.playerId : null
        };
        const resp = await fetch(`${API_BASE_URL}/api/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultPayload)
        });
        if (!resp.ok) {
          const errorData = await resp.json();
          throw new Error(errorData.error || 'Failed to save cancellation.');
        }

      } else if (hasScores) {
        // Normal match with scores
        const resultPayload = {
          matchId: parseInt(selectedMatchId),
          set1P1: parseInt(set1P1),
          set1P2: parseInt(set1P2),
          set2P1: parseInt(set2P1),
          set2P2: parseInt(set2P2),
          set3P1: set3P1 !== '' ? parseInt(set3P1) : null,
          set3P2: set3P2 !== '' ? parseInt(set3P2) : null,
          set4P1: set4P1 !== '' ? parseInt(set4P1) : null,
          set4P2: set4P2 !== '' ? parseInt(set4P2) : null,
          set1P1At11: set1P1At11 !== '' ? parseInt(set1P1At11) : null,
          set1P2At11: set1P2At11 !== '' ? parseInt(set1P2At11) : null,
          set2P1At11: set2P1At11 !== '' ? parseInt(set2P1At11) : null,
          set2P2At11: set2P2At11 !== '' ? parseInt(set2P2At11) : null,
          set3P1At11: set3P1At11 !== '' ? parseInt(set3P1At11) : null,
          set3P2At11: set3P2At11 !== '' ? parseInt(set3P2At11) : null,
          resultType: 'Normal',
          lastEditedByPlayerId: guestSession ? guestSession.playerId : null
        };

        const resultResponse = await fetch(`${API_BASE_URL}/api/results`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultPayload)
        });

        if (!resultResponse.ok) {
          const errorData = await resultResponse.json();
          throw new Error(errorData.error || 'Failed to save match results.');
        }
      }

      setIsSuccess(true);
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'Failed to save changes. Please check if the backend is running.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetScores = async () => {
    setResetLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/results/match/${selectedMatchId}`, {
        method: 'DELETE'
      });
      if (!resp.ok) {
        const errData = await resp.json();
        setFormError(errData.error || 'Failed to reset scores. Please try again.');
      } else {
        clearScores();
        setFormError('');
        setValidationErrors({});
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error. Failed to reset scores.');
    } finally {
      setResetLoading(false);
      setShowResetModal(false);
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

  if (isSuccess) {
    return (
      <div className="matches-page-container" style={{ maxWidth: '800px', textAlign: 'center', padding: '3rem 1rem' }}>
        <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h2 style={{ fontSize: '2rem', color: 'var(--text-primary)', fontWeight: '700' }}>Result Saved!</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '400px' }}>
            The match details and scores have been successfully updated.
          </p>
          <button 
            className="submit-btn" 
            onClick={() => onNavigate('matches', { tournamentId, divisionId: selectedDivisionId })}
            style={{ marginTop: '1rem', minWidth: '200px' }}
          >
            Back to Matches
          </button>
        </div>
      </div>
    );
  }

  /** Compute effective roster: replace absent slots with subs; remove absent-with-no-sub slots. */
  const getEffectiveRoster = (teamPlayers, savedOverrides) => {
    if (!savedOverrides || savedOverrides.length === 0) return teamPlayers;
    const roster = [...teamPlayers];
    savedOverrides.forEach(ov => {
      const idx = ov.slotPosition - 1;
      if (idx < 0 || idx >= roster.length) return;
      if (ov.subPlayerId) {
        roster[idx] = {
          id: ov.subPlayerId,
          firstName: (ov.subPlayerName || '').split(' ')[0] || 'Sub',
          lastName: (ov.subPlayerName || '').split(' ').slice(1).join(' ') || '',
          skillLevel: ov.subPlayerSkillLevel || '',
          isSubstitute: true,
        };
      } else {
        roster[idx] = null; // absent, no sub
      }
    });
    return roster.filter(Boolean);
  };

  /** Player display name with optional (Sub) tag */
  const playerDisplayName = (player) => {
    if (!player) return '';
    const name = `${player.firstName} ${player.lastName}`.trim();
    return player.isSubstitute ? `${name} (Sub)` : name;
  };

  /** Renders the Player Availability panel for one team — used inside the modal. */
  const renderAvailabilityPanel = (teamNum, teamPlayers, savedOverrides, pendingOverrides, setPendingOverrides, teamId) => {
    if (!teamPlayers || teamPlayers.length === 0 || !matchDetails) return null;

    // Compute effective count from pending state
    const absentWithNoSub = Object.values(pendingOverrides).filter(o => !o.subPlayerId).length;
    const effectiveCount = teamPlayers.length - absentWithNoSub;
    const belowMinimum = effectiveCount < 3;

    const handleToggleAbsent = (slotPosition, player) => {
      setPendingOverrides(prev => {
        const next = { ...prev };
        if (next[slotPosition]) {
          delete next[slotPosition];
        } else {
          next[slotPosition] = {
            absentPlayerId: player.id,
            absentPlayerName: `${player.firstName} ${player.lastName}`,
            subPlayerId: null,
            subPlayerName: '',
            subPlayerSkillLevel: '',
          };
        }
        return next;
      });
      setSubSearch({ teamNum: null, slot: null, query: '', results: [], loading: false });
    };

    const handleSubSearch = async (slot, query) => {
      setSubSearch(prev => ({ ...prev, teamNum, slot, query, loading: true, results: [] }));
      if (query.trim().length < 2) {
        setSubSearch(prev => ({ ...prev, loading: false, results: [] }));
        return;
      }
      try {
        const resp = await fetch(`${API_BASE_URL}/api/players/search?q=${encodeURIComponent(query.trim())}`);
        if (resp.ok) {
          const data = await resp.json();
          setSubSearch(prev => ({ ...prev, loading: false, results: data }));
        }
      } catch (e) {
        setSubSearch(prev => ({ ...prev, loading: false }));
      }
    };

    const handleSelectSub = (slot, player) => {
      setPendingOverrides(prev => ({
        ...prev,
        [slot]: {
          ...prev[slot],
          subPlayerId: player.id,
          subPlayerName: `${player.firstName} ${player.lastName}`,
          subPlayerSkillLevel: player.skillLevel || '',
        }
      }));
      setSubSearch({ teamNum: null, slot: null, query: '', results: [], loading: false });
    };

    const handleClearSub = (slot) => {
      setPendingOverrides(prev => ({
        ...prev,
        [slot]: { ...prev[slot], subPlayerId: null, subPlayerName: '', subPlayerSkillLevel: '' }
      }));
    };

    // Per-team reset button handler (lifted to component scope via handleResetOverride)
    const hasSavedOverrides = savedOverrides.length > 0;

    return (
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '14px', padding: '1.25rem' }}>
        {/* Team label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
          <span style={{ fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-primary)' }}>
            {teamNum === 1 ? matchDetails.participant1Name : matchDetails.participant2Name}
          </span>
          {hasSavedOverrides && (
            <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#fb923c', fontWeight: '600', background: 'rgba(251,146,60,0.15)', padding: '2px 8px', borderRadius: '20px' }}>
              Override Active
            </span>
          )}
          {(hasSavedOverrides || Object.keys(pendingOverrides).length > 0) && (
            <button
              type="button"
              onClick={() => handleResetOverride(teamNum, teamId)}
              disabled={savingOverride !== null}
              style={{ marginLeft: hasSavedOverrides ? '0' : 'auto', padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '600', cursor: savingOverride !== null ? 'not-allowed' : 'pointer', background: 'rgba(239,68,68,0.08)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              Reset
            </button>
          )}
        </div>

        {/* Player rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {teamPlayers.map((player, idx) => {
            const slot = idx + 1;
            const isAbsent = !!pendingOverrides[slot];
            const ovData = pendingOverrides[slot];
            const isSearchingThisSlot = subSearch.teamNum === teamNum && subSearch.slot === slot;

            return (
              <div key={slot} style={{ background: isAbsent ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isAbsent ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: '10px', padding: '0.65rem 0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600', minWidth: '20px' }}>P{slot}</span>
                  <span style={{ flex: 1, fontSize: '0.9rem', color: isAbsent ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isAbsent ? 'line-through' : 'none' }}>
                    {player.firstName} {player.lastName}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleAbsent(slot, player)}
                    style={{
                      padding: '3px 10px', borderRadius: '8px', fontSize: '0.775rem', fontWeight: '600', cursor: 'pointer',
                      border: `1px solid ${isAbsent ? 'rgba(239,68,68,0.5)' : 'rgba(74,222,128,0.5)'}`,
                      background: isAbsent ? 'rgba(239,68,68,0.15)' : 'rgba(74,222,128,0.1)',
                      color: isAbsent ? '#f87171' : '#4ade80', transition: 'all 0.2s'
                    }}
                  >
                    {isAbsent ? '✕ Absent' : '✓ Available'}
                  </button>
                </div>

                {isAbsent && (
                  <div style={{ marginTop: '0.65rem', paddingTop: '0.65rem', borderTop: '1px solid rgba(239,68,68,0.15)' }}>
                    {ovData.subPlayerId ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>Sub: <strong>{ovData.subPlayerName}</strong>{ovData.subPlayerSkillLevel ? ` (${ovData.subPlayerSkillLevel})` : ''}</span>
                        <button type="button" onClick={() => handleClearSub(slot)} style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer' }}>Change</button>
                      </div>
                    ) : (
                      <div style={{ position: 'relative' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '0.4rem 0.7rem' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input
                            type="text"
                            placeholder="Search substitute player... (optional)"
                            value={isSearchingThisSlot ? subSearch.query : ''}
                            onChange={e => handleSubSearch(slot, e.target.value)}
                            onFocus={() => setSubSearch(prev => ({ ...prev, teamNum, slot }))}
                            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                          />
                          {isSearchingThisSlot && subSearch.loading && <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px' }} />}
                        </div>
                        {isSearchingThisSlot && subSearch.results.length > 0 && (
                          <div style={{ position: 'absolute', zIndex: 200, top: 'calc(100% + 4px)', left: 0, right: 0, background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                            {subSearch.results.map(p => (
                              <button key={p.id} type="button" onClick={() => handleSelectSub(slot, p)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', padding: '0.6rem 0.9rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.875rem', textAlign: 'left' }}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >
                                <span style={{ flex: 1 }}>{p.firstName} {p.lastName}</span>
                                {p.skillLevel && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', background: 'rgba(59,130,246,0.12)', padding: '1px 7px', borderRadius: '10px' }}>{p.skillLevel}</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Effective count indicator */}
        <div style={{ marginTop: '1rem', padding: '0.6rem 0.9rem', borderRadius: '8px', background: belowMinimum ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.07)', border: `1px solid ${belowMinimum ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.2)'}`, fontSize: '0.825rem', color: belowMinimum ? '#f87171' : '#4ade80', fontWeight: '600' }}>
          {belowMinimum
            ? `⛔ Effective players: ${effectiveCount} — minimum 3 required`
            : `✓ Effective players: ${effectiveCount} — ${effectiveCount === 3 ? '3-player' : '4-player'} rotation will apply`}
        </div>
      </div>
    );
  };

  /** Lifted save handler — saves overrides for one team. Returns true on success. */
  const handleSaveOverride = async (teamNum, teamId, pendingOverrides, teamPlayers) => {
    const absentWithNoSub = Object.values(pendingOverrides).filter(o => !o.subPlayerId).length;
    const effectiveCount = teamPlayers.length - absentWithNoSub;
    if (effectiveCount < 3) return false;

    const slots = Object.entries(pendingOverrides).map(([slot, ov]) => ({
      slotPosition: parseInt(slot),
      absentPlayerId: ov.absentPlayerId || null,
      subPlayerId: ov.subPlayerId || null,
    }));
    const resp = await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/player-overrides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId, slots }),
    });
    if (resp.ok) {
      const saved = await resp.json();
      if (teamNum === 1) setTeam1Overrides(saved);
      else setTeam2Overrides(saved);
      return true;
    }
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData.error || 'Failed to save availability.');
  };

  /** Lifted reset handler — clears overrides for one team. */
  const handleResetOverride = async (teamNum, teamId) => {
    setSavingOverride(teamNum);
    try {
      await fetch(`${API_BASE_URL}/api/matches/${selectedMatchId}/player-overrides/team/${teamId}`, { method: 'DELETE' });
      if (teamNum === 1) { setTeam1Overrides([]); setPendingOverrides1({}); }
      else { setTeam2Overrides([]); setPendingOverrides2({}); }
    } catch (e) {
      alert('Failed to reset availability.');
    } finally {
      setSavingOverride(null);
    }
  };

  /** Unified save for both teams — called by modal's Save button. */
  const handleSaveAllAvailability = async () => {
    setModalSaveError('');
    setSavingOverride('all');
    try {
      if (team1Id && teamPlayers1.length > 0) {
        await handleSaveOverride(1, team1Id, pendingOverrides1, teamPlayers1);
      }
      if (team2Id && teamPlayers2.length > 0) {
        await handleSaveOverride(2, team2Id, pendingOverrides2, teamPlayers2);
      }
      setShowAvailabilityModal(false);
    } catch (e) {
      setModalSaveError(e.message || 'Failed to save. Check player counts and try again.');
    } finally {
      setSavingOverride(null);
    }
  };

  /** Renders the full availability modal — both teams side by side. */
  const renderAvailabilityModal = () => {
    if (!showAvailabilityModal) return null;
    const bothBelowMin =
      (teamPlayers1.length > 0 && (teamPlayers1.length - Object.values(pendingOverrides1).filter(o => !o.subPlayerId).length) < 3) ||
      (teamPlayers2.length > 0 && (teamPlayers2.length - Object.values(pendingOverrides2).filter(o => !o.subPlayerId).length) < 3);

    return (
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
        onClick={e => { if (e.target === e.currentTarget) setShowAvailabilityModal(false); }}
      >
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--glass-border)', borderRadius: '24px',
          padding: '2rem', width: '100%', maxWidth: '760px', maxHeight: '88vh',
          display: 'flex', flexDirection: 'column', gap: '1.5rem', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
          overflowY: 'auto'
        }}>
          {/* Modal header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <h2 style={{ fontSize: '1.2rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Player Availability</h2>
            <button
              type="button"
              onClick={() => setShowAvailabilityModal(false)}
              style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
            >
              ✕ Close
            </button>
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: '1.5' }}>
            Mark any players who are absent today. Optionally assign a substitute from the registered players list.
            The system will automatically apply 3-player or 4-player pairing rotation based on the effective count.
          </p>

          {/* Two team panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {team1Id && renderAvailabilityPanel(1, teamPlayers1, team1Overrides, pendingOverrides1, setPendingOverrides1, team1Id)}
            {team2Id && renderAvailabilityPanel(2, teamPlayers2, team2Overrides, pendingOverrides2, setPendingOverrides2, team2Id)}
          </div>

          {/* Error */}
          {modalSaveError && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#f87171' }}>
              ⛔ {modalSaveError}
            </div>
          )}

          {/* Modal footer */}
          <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              type="button"
              onClick={() => setShowAvailabilityModal(false)}
              className="form-cancel-btn"
              style={{ flex: '0 0 auto', minWidth: '100px' }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAllAvailability}
              disabled={bothBelowMin || savingOverride === 'all'}
              style={{
                flex: 1, padding: '0.7rem 1rem', borderRadius: '12px', fontWeight: '700', fontSize: '0.95rem',
                cursor: (bothBelowMin || savingOverride === 'all') ? 'not-allowed' : 'pointer',
                background: bothBelowMin ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg, rgba(251,191,36,0.25), rgba(251,191,36,0.12))',
                color: bothBelowMin ? 'var(--text-secondary)' : '#fbbf24',
                border: `1px solid ${bothBelowMin ? 'rgba(255,255,255,0.08)' : 'rgba(251,191,36,0.4)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                opacity: savingOverride === 'all' ? 0.7 : 1,
              }}
            >
              {savingOverride === 'all' ? (
                <><div className="spinner" style={{ width: '14px', height: '14px', borderWidth: '2px' }} /> Saving...</>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Save Availability
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };



  const getTeamPairingsForSet = (players, setNum) => {
    const getPlayerName = (list, index) =>
      list && list[index] ? playerDisplayName(list[index]) : `Player ${index + 1}`;

    const count = players && players.length > 0 ? players.length : 4;

    if (count === 3) {
      if (setNum === 1) {
        return {
          firstHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 2)}`,
          secondHalf: `${getPlayerName(players, 1)} / ${getPlayerName(players, 2)}`
        };
      } else if (setNum === 2) {
        return {
          firstHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 1)}`,
          secondHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 2)}`
        };
      } else if (setNum === 3) {
        return {
          firstHalf: `${getPlayerName(players, 2)} / ${getPlayerName(players, 1)}`,
          secondHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 1)}`
        };
      }
    } else {
      // 4-player team or default
      if (setNum === 1) {
        return {
          firstHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 3)}`,
          secondHalf: `${getPlayerName(players, 1)} / ${getPlayerName(players, 2)}`
        };
      } else if (setNum === 2) {
        return {
          firstHalf: `${getPlayerName(players, 1)} / ${getPlayerName(players, 3)}`,
          secondHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 2)}`
        };
      } else if (setNum === 3) {
        return {
          firstHalf: `${getPlayerName(players, 2)} / ${getPlayerName(players, 3)}`,
          secondHalf: `${getPlayerName(players, 0)} / ${getPlayerName(players, 1)}`
        };
      }
    }
    return { firstHalf: '', secondHalf: '' };
  };

  const renderTeamSetCard = (setNum, setP1At11, setSetP1At11, setP2At11, setSetP2At11, setP1, setSetP1, setP2, setSetP2, p1Players, p2Players) => {
    // Compute effective rosters (applying overrides)
    const effective1 = getEffectiveRoster(p1Players, team1Overrides);
    const effective2 = getEffectiveRoster(p2Players, team2Overrides);
    const pair1 = getTeamPairingsForSet(effective1, setNum);
    const pair2 = getTeamPairingsForSet(effective2, setNum);

    const firstHalfPairs1 = pair1.firstHalf;
    const firstHalfPairs2 = pair2.firstHalf;
    const secondHalfPairs1 = pair1.secondHalf;
    const secondHalfPairs2 = pair2.secondHalf;

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

        {/* Save Set Score Button for this set (hidden if match is already completed) */}
        {!isMatchCompleted && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
            {savedSets[setNum] && (
              <span style={{ fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                Set {setNum} Saved
              </span>
            )}
            <button
              type="button"
              onClick={() => handleSaveSet(setNum)}
              disabled={formLoading || savingSet !== null}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.85rem',
                fontWeight: '600', cursor: (formLoading || savingSet !== null) ? 'not-allowed' : 'pointer',
                border: '1px solid var(--primary)',
                background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => { if (!formLoading && savingSet === null) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.22)'; }}
              onMouseLeave={e => { if (!formLoading && savingSet === null) e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'; }}
            >
              {savingSet === setNum ? (
                <>
                  <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '4px' }} />
                  Saving...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                  Save Set {setNum} Score
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="matches-page-container" style={{ maxWidth: '800px' }}>

      {/* ── Player Availability Modal ── */}
      {renderAvailabilityModal()}

      {/* ── Reset Scores Confirmation Modal ── */}
      {showResetModal && (

        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowResetModal(false); }}
        >
          <div style={{
            background: 'var(--surface)', border: '1px solid rgba(239,68,68,0.35)',
            borderRadius: '20px', padding: '2rem', maxWidth: '440px', width: '100%',
            display: 'flex', flexDirection: 'column', gap: '1.25rem', boxShadow: '0 24px 60px rgba(0,0,0,0.5)'
          }}>
            {/* Warning icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--color-error)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>
                Reset Match Scores?
              </h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.55', margin: 0 }}>
              This will permanently remove the recorded scores for this match and revert the standings for both participants. This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={resetLoading}
                className="form-cancel-btn"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleResetScores}
                disabled={resetLoading}
                style={{
                  flex: 1, padding: '0.7rem 1rem', borderRadius: '10px', fontWeight: '700',
                  fontSize: '0.9rem', cursor: resetLoading ? 'not-allowed' : 'pointer',
                  background: 'var(--color-error)', color: '#fff', border: 'none',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                  opacity: resetLoading ? 0.7 : 1
                }}
              >
                {resetLoading ? <div className="spinner" aria-label="Resetting" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> : 'Yes, Reset Scores'}
              </button>
            </div>
          </div>
        </div>
      )}

      <button className="back-btn" onClick={() => onNavigate('matches', { tournamentId, divisionId: selectedDivisionId })} style={{ marginBottom: '1.5rem' }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Cancel
      </button>

      <header className="page-header-section" style={{ textAlign: 'left', marginBottom: '2rem' }}>
        <h1 className="title" style={{ textAlign: 'left', background: 'linear-gradient(135deg, #fff 30%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Edit Match Details / Add Results
        </h1>
        <p className="subtitle" style={{ textAlign: 'left' }}>
          Edit match details (date, time, round) or enter/modify match scores.
        </p>
      </header>

      <div className="form-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '24px', padding: '2rem' }}>
        {setSuccessToast && (
          <div className="status-toast success" style={{ marginBottom: '1.5rem', marginTop: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <span>{setSuccessToast}</span>
          </div>
        )}
        {formError && (
          <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="form-group flex-1" style={{ minWidth: '240px' }}>
              <label htmlFor="divSelect" className="form-label">Select Division *</label>
              {guestSession ? (
                <div className="form-input form-select" style={{ background: 'var(--surface)', cursor: 'not-allowed', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', minHeight: '48px' }}>
                  {guestSession.divisionName}
                </div>
              ) : (
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
              )}
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
                <h3 style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: 'var(--text-primary)', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.4rem' }}>
                  Match Details
                  {guestSession && (
                    <span style={{ fontSize: '0.75rem', fontWeight: '500', color: 'var(--text-secondary)', marginLeft: '0.75rem', background: 'rgba(255,255,255,0.07)', padding: '2px 8px', borderRadius: '20px', verticalAlign: 'middle' }}>View Only</span>
                  )}
                </h3>
                <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="mDate" className="form-label">Match Date</label>
                    {guestSession ? (
                      <div className="form-input" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }}>
                        {matchDate || <span style={{ opacity: 0.4 }}>Not set</span>}
                      </div>
                    ) : (
                      <input
                        id="mDate"
                        type="date"
                        className="form-input"
                        value={matchDate}
                        onChange={(e) => setMatchDate(e.target.value)}
                        disabled={formLoading}
                      />
                    )}
                  </div>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="mRound" className="form-label">Round</label>
                    {guestSession ? (
                      <div className="form-input" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }}>
                        {round ? `Round ${round}` : <span style={{ opacity: 0.4 }}>Not set</span>}
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
                  </div>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="mCourt" className="form-label">Court</label>
                    {guestSession ? (
                      <div className="form-input" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }}>
                        {courtId ? (courts.find(c => String(c.id) === String(courtId))?.courtName || 'Unknown') : <span style={{ opacity: 0.4 }}>Not assigned</span>}
                      </div>
                    ) : (
                      <select
                        id="mCourt"
                        className="form-input form-select"
                        value={courtId}
                        onChange={(e) => setCourtId(e.target.value)}
                        disabled={formLoading}
                      >
                        <option value="">Select court...</option>
                        {courts.map((c) => (
                          <option key={c.id} value={c.id}>{c.courtName}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
                <div className="form-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="sTime" className="form-label">Start Time</label>
                    {guestSession ? (
                      <div className="form-input" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }}>
                        {startTime || <span style={{ opacity: 0.4 }}>Not set</span>}
                      </div>
                    ) : (
                      <input
                        id="sTime"
                        type="time"
                        className="form-input"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        disabled={formLoading}
                      />
                    )}
                  </div>
                  <div className="form-group flex-1" style={{ minWidth: '200px' }}>
                    <label htmlFor="eTime" className="form-label">End Time</label>
                    {guestSession ? (
                      <div className="form-input" style={{ minHeight: '48px', display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.03)', color: 'var(--text-secondary)', cursor: 'default', userSelect: 'none' }}>
                        {endTime || <span style={{ opacity: 0.4 }}>Not set</span>}
                      </div>
                    ) : (
                      <input
                        id="eTime"
                        type="time"
                        className="form-input"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        disabled={formLoading}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Special Result panel — admin only */}
              {user?.role === 'admin' && (
                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '14px', padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '220px' }}>
                      <label htmlFor="resultTypeSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Match Outcome</label>
                      <select
                        id="resultTypeSelect"
                        className="form-input form-select"
                        value={resultType}
                        onChange={(e) => {
                          setResultType(e.target.value);
                          setForfeitingParticipantId('');
                          setFormError('');
                        }}
                        disabled={formLoading}
                        style={{ minHeight: '44px', cursor: 'pointer' }}
                      >
                        <option value="Normal">Normal Match</option>
                        <option value="Forfeit">Forfeit — one team didn't appear</option>
                        <option value="Cancelled">Match Cancelled / Not Played</option>
                      </select>
                    </div>

                    {resultType === 'Forfeit' && (
                      <div className="form-group" style={{ margin: 0, flex: '1', minWidth: '220px' }}>
                        <label htmlFor="forfeitTeamSelect" className="form-label" style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>Which team forfeited?</label>
                        <select
                          id="forfeitTeamSelect"
                          className="form-input form-select"
                          value={forfeitingParticipantId}
                          onChange={(e) => setForfeitingParticipantId(e.target.value)}
                          disabled={formLoading}
                          style={{ minHeight: '44px', cursor: 'pointer' }}
                        >
                          <option value="">Select forfeiting team...</option>
                          <option value={String(matchDetails.participant1)}>{matchDetails.participant1Name}</option>
                          <option value={String(matchDetails.participant2)}>{matchDetails.participant2Name}</option>
                        </select>
                      </div>
                    )}

                    {resultType === 'Forfeit' && forfeitingParticipantId && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.875rem', color: '#4ade80', flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        {forfeitingParticipantId === String(matchDetails.participant1) ? matchDetails.participant2Name : matchDetails.participant1Name} declared winner
                      </div>
                    )}

                    {resultType === 'Cancelled' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: '10px', padding: '0.6rem 1rem', fontSize: '0.875rem', color: 'var(--text-secondary)', flexShrink: 0 }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        Both teams awarded a Draw — no scores required
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Reset Scores button — admin only, shown only when a result already exists and result type is Normal */}
              {user?.role === 'admin' && hasExistingResult && resultType === 'Normal' && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowResetModal(true)}
                    disabled={formLoading}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem',
                      padding: '0.5rem 1.1rem', borderRadius: '10px', fontSize: '0.85rem',
                      fontWeight: '600', cursor: 'pointer', border: '1px solid var(--color-error)',
                      background: 'rgba(239,68,68,0.08)', color: 'var(--color-error)',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="1 4 1 10 7 10"/>
                      <path d="M3.51 15a9 9 0 1 0 .49-3.51"/>
                    </svg>
                    Reset the Scores
                  </button>
                </div>
              )}

              {/* Score entry — hidden for Forfeit / Cancelled */}
              {resultType === 'Normal' && (currentDivision?.divisionType === 'Team' ? (
                <div>
                  {/* Player Availability trigger button — only for incomplete matches */}
                  {!isMatchCompleted && team1Id && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <button
                        type="button"
                        onClick={() => { setModalSaveError(''); setShowAvailabilityModal(true); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '8px',
                          padding: '0.55rem 1.1rem', borderRadius: '12px', fontSize: '0.875rem',
                          fontWeight: '600', cursor: 'pointer',
                          background: (team1Overrides.length > 0 || team2Overrides.length > 0)
                            ? 'rgba(251,191,36,0.12)' : 'rgba(255,255,255,0.05)',
                          color: (team1Overrides.length > 0 || team2Overrides.length > 0)
                            ? '#fbbf24' : 'var(--text-secondary)',
                          border: `1px solid ${(team1Overrides.length > 0 || team2Overrides.length > 0)
                            ? 'rgba(251,191,36,0.4)' : 'rgba(255,255,255,0.12)'}`,
                          transition: 'all 0.2s'
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                        </svg>
                        Player Availability
                        {(team1Overrides.length > 0 || team2Overrides.length > 0) && (
                          <span style={{ background: 'rgba(251,146,60,0.2)', color: '#fb923c', fontSize: '0.72rem', fontWeight: '700', padding: '1px 8px', borderRadius: '20px', border: '1px solid rgba(251,146,60,0.35)' }}>
                            ⚠ Override Active
                          </span>
                        )}
                      </button>
                    </div>
                  )}

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

                  {/* Per-Set Save Controls for Singles/Doubles (hidden if match is already completed) */}
                  {!isMatchCompleted && (
                    <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1fr', gap: '1rem', alignItems: 'center', marginTop: '0.75rem', marginBottom: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Save progress per set:
                      </div>
                      {[1, 2, 3].map((sNum) => (
                        <div key={sNum} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveSet(sNum)}
                            disabled={formLoading || savingSet !== null}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                              padding: '0.4rem 0.5rem', borderRadius: '8px', fontSize: '0.78rem',
                              fontWeight: '600', cursor: (formLoading || savingSet !== null) ? 'not-allowed' : 'pointer',
                              border: '1px solid var(--primary)',
                              background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)',
                              transition: 'all 0.2s'
                            }}
                          >
                            {savingSet === sNum ? (
                              <div className="spinner" style={{ width: '10px', height: '10px', borderWidth: '2px' }} />
                            ) : (
                              `Save Set ${sNum}`
                            )}
                          </button>
                          {savedSets[sNum] && (
                            <span style={{ fontSize: '0.72rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: '500' }}>
                              ✓ Saved
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {validationErrors.set1 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 1: {validationErrors.set1}</div>}
                  {validationErrors.set2 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 2: {validationErrors.set2}</div>}
                  {validationErrors.set3 && <div style={{ fontSize: '0.85rem', color: 'var(--color-error)', marginBottom: '0.5rem' }}>* Set 3: {validationErrors.set3}</div>}
                </div>
              ))}


              {/* ── Set 4 ── Singles Set (only for 4-set divisions) */}
              {resultType === 'Normal' && currentDivision?.numSets === 4 && matchDetails && (
                <div style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: 'var(--primary)', color: '#fff', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.9rem', flexShrink: 0 }}>4</div>
                    <div>
                      <div style={{ fontWeight: '700', fontSize: '1rem', color: 'var(--text-primary)' }}>Set 4 — Singles Set</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Singles Set. Both teams will swap players at 8. Winning score: 32</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'center' }}>{matchDetails.participant1Name}</div>
                      <input
                        id="set4P1Input"
                        type="number"
                        min="0"
                        className="form-input"
                        value={set4P1}
                        onChange={(e) => setSet4P1(e.target.value)}
                        placeholder="Score"
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                    <div style={{ fontWeight: '700', color: 'var(--text-secondary)', fontSize: '1.2rem' }}>vs</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div style={{ fontWeight: '600', fontSize: '0.875rem', color: 'var(--text-primary)', textAlign: 'center' }}>{matchDetails.participant2Name}</div>
                      <input
                        id="set4P2Input"
                        type="number"
                        min="0"
                        className="form-input"
                        value={set4P2}
                        onChange={(e) => setSet4P2(e.target.value)}
                        placeholder="Score"
                        style={{ textAlign: 'center', minHeight: '44px' }}
                      />
                    </div>
                  </div>
                  
                  {/* Save Set 4 Score Button (hidden if match is already completed) */}
                  {!isMatchCompleted && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
                      {savedSets[4] && (
                        <span style={{ fontSize: '0.8rem', color: '#4ade80', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: '500' }}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                          Set 4 Saved
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSaveSet(4)}
                        disabled={formLoading || savingSet !== null}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '0.45rem 1rem', borderRadius: '10px', fontSize: '0.85rem',
                          fontWeight: '600', cursor: (formLoading || savingSet !== null) ? 'not-allowed' : 'pointer',
                          border: '1px solid var(--primary)',
                          background: 'rgba(59, 130, 246, 0.12)', color: 'var(--primary)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {savingSet === 4 ? (
                          <>
                            <div className="spinner" style={{ width: '12px', height: '12px', borderWidth: '2px', marginRight: '4px' }} />
                            Saving...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                            Save Set 4 Score
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                    {currentDivision?.numSets === 4 && (
                      <span>2-2 tie = <strong>Draw</strong> · 3-1 or 4-0 = outright win</span>
                    )}
                  </div>
                </div>
              )}

            <div className="form-actions-row">
              <button
                type="button"
                className="form-cancel-btn"
                onClick={() => onNavigate('matches', { tournamentId, divisionId: selectedDivisionId })}
                disabled={formLoading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={formLoading}
                style={{ marginTop: 0, flex: 1, minHeight: '48px' }}
              >
                {formLoading ? (
                  <div className="spinner" aria-label="Saving" />
                ) : (
                  isMatchCompleted ? 'Update Scores / Details' : 'Submit All Scores / Details'
                )}
              </button>
            </div>
          </div>
          )}
        </form>
      </div>
    </div>
  );
}
