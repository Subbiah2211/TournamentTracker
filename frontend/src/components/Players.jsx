import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Players({ tournamentId, user, onNavigate }) {
  const [participants, setParticipants] = useState([]);
  const [divisions, setDivisions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [expandedDivisions, setExpandedDivisions] = useState({});
  const [groupsByDivision, setGroupsByDivision] = useState({}); // cache: divisionId -> [groups]

  // Sub-view state: 'list' | 'add-singles' | 'add-doubles' | 'add-generic' | 'detail' | 'edit-singles' | 'edit-doubles' | 'edit-generic'
  const [subView, setSubView] = useState('list');
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [selectedTeamPlayers, setSelectedTeamPlayers] = useState([]);

  // Group-related state
  const [groupId, setGroupId] = useState('');
  const [groupsForDivision, setGroupsForDivision] = useState([]);

  // Form states (Singles)
  const [divisionId, setDivisionId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [skillLevel, setSkillLevel] = useState('3.0'); // default to 3.0

  // Form states (Doubles Team)
  const [teamName, setTeamName] = useState('');
  const [p1FirstName, setP1FirstName] = useState('');
  const [p1LastName, setP1LastName] = useState('');
  const [p1Email, setP1Email] = useState('');
  const [p1Phone, setP1Phone] = useState('');
  const [p1Gender, setP1Gender] = useState('');
  const [p1Age, setP1Age] = useState('');
  const [p1SkillLevel, setP1SkillLevel] = useState('3.0');
  const [p1SearchQuery, setP1SearchQuery] = useState('');
  const [p1SearchResults, setP1SearchResults] = useState([]);

  const [p2FirstName, setP2FirstName] = useState('');
  const [p2LastName, setP2LastName] = useState('');
  const [p2Email, setP2Email] = useState('');
  const [p2Phone, setP2Phone] = useState('');
  const [p2Gender, setP2Gender] = useState('');
  const [p2Age, setP2Age] = useState('');
  const [p2SkillLevel, setP2SkillLevel] = useState('3.0');
  const [p2SearchQuery, setP2SearchQuery] = useState('');
  const [p2SearchResults, setP2SearchResults] = useState([]);

  // Form states (Generic Team)
  const [genericTeamName, setGenericTeamName] = useState('');

  const [g1FirstName, setG1FirstName] = useState('');
  const [g1LastName, setG1LastName] = useState('');
  const [g1Email, setG1Email] = useState('');
  const [g1Phone, setG1Phone] = useState('');
  const [g1Gender, setG1Gender] = useState('');
  const [g1Age, setG1Age] = useState('');
  const [g1SkillLevel, setG1SkillLevel] = useState('3.0');
  const [g1SearchQuery, setG1SearchQuery] = useState('');
  const [g1SearchResults, setG1SearchResults] = useState([]);

  const [g2FirstName, setG2FirstName] = useState('');
  const [g2LastName, setG2LastName] = useState('');
  const [g2Email, setG2Email] = useState('');
  const [g2Phone, setG2Phone] = useState('');
  const [g2Gender, setG2Gender] = useState('');
  const [g2Age, setG2Age] = useState('');
  const [g2SkillLevel, setG2SkillLevel] = useState('3.0');
  const [g2SearchQuery, setG2SearchQuery] = useState('');
  const [g2SearchResults, setG2SearchResults] = useState([]);

  const [g3FirstName, setG3FirstName] = useState('');
  const [g3LastName, setG3LastName] = useState('');
  const [g3Email, setG3Email] = useState('');
  const [g3Phone, setG3Phone] = useState('');
  const [g3Gender, setG3Gender] = useState('');
  const [g3Age, setG3Age] = useState('');
  const [g3SkillLevel, setG3SkillLevel] = useState('3.0');
  const [g3SearchQuery, setG3SearchQuery] = useState('');
  const [g3SearchResults, setG3SearchResults] = useState([]);

  const [g4FirstName, setG4FirstName] = useState('');
  const [g4LastName, setG4LastName] = useState('');
  const [g4Email, setG4Email] = useState('');
  const [g4Phone, setG4Phone] = useState('');
  const [g4Gender, setG4Gender] = useState('');
  const [g4Age, setG4Age] = useState('');
  const [g4SkillLevel, setG4SkillLevel] = useState('3.0');
  const [g4SearchQuery, setG4SearchQuery] = useState('');
  const [g4SearchResults, setG4SearchResults] = useState([]);

  const [formLoading, setFormLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [formError, setFormError] = useState('');

  const isAdmin = user && user.role === 'admin';

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        if (active) {
          setLoading(true);
          setError(null);
        }

        // Fetch participants
        const partRes = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/participants`);
        if (!partRes.ok) throw new Error('Failed to load participants');
        const partData = await partRes.json();

        // Fetch divisions
        const divRes = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/divisions`);
        if (!divRes.ok) throw new Error('Failed to load divisions');
        const divData = await divRes.json();

        // Fetch players
        const playerRes = await fetch(`${API_BASE_URL}/api/players`);
        if (!playerRes.ok) throw new Error('Failed to load players');
        const playerData = await playerRes.json();

        if (active) {
          setParticipants(partData);
          setDivisions(divData);
          setPlayers(playerData);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setError('Could not load players & teams data. Make sure the backend is running.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [tournamentId, reloadTrigger]);

  // Debounced search for Player 1 (Doubles)
  useEffect(() => {
    if (!p1SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(p1SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setP1SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [p1SearchQuery]);

  // Debounced search for Player 2 (Doubles)
  useEffect(() => {
    if (!p2SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(p2SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setP2SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [p2SearchQuery]);

  // Debounced search for Player 1 (Generic)
  useEffect(() => {
    if (!g1SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(g1SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setG1SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [g1SearchQuery]);

  // Debounced search for Player 2 (Generic)
  useEffect(() => {
    if (!g2SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(g2SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setG2SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [g2SearchQuery]);

  // Debounced search for Player 3 (Generic)
  useEffect(() => {
    if (!g3SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(g3SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setG3SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [g3SearchQuery]);

  // Debounced search for Player 4 (Generic)
  useEffect(() => {
    if (!g4SearchQuery.trim()) return;
    const delay = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/players/search?query=${encodeURIComponent(g4SearchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setG4SearchResults(data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 250);
    return () => clearTimeout(delay);
  }, [g4SearchQuery]);

  const filterSearchResultsByGender = (results) => {
    if (!divisionId) return results;
    const div = divisions.find(d => d.id.toString() === divisionId);
    if (!div) return results;
    const divGender = div.gender;
    if (!divGender || divGender === 'Mixed' || divGender === 'Open') return results;
    return results.filter(player => player.gender === divGender);
  };

  const fetchGroupsForDivision = async (divId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/divisions/${divId}/groups`);
      if (res.ok) {
        const data = await res.json();
        setGroupsForDivision(data);
        if (data.length > 0) {
          setGroupId(data[0].id.toString());
        } else {
          setGroupId('');
        }
      }
    } catch (err) {
      console.error('Failed to fetch groups', err);
    }
  };

  const handleAddGroup = async () => {
    if (!divisionId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/divisions/${divisionId}/groups`, { method: 'POST' });
      if (res.ok) {
        const newGroup = await res.json();
        setGroupsForDivision(prev => [...prev, newGroup]);
        setGroupId(newGroup.id.toString());
      }
    } catch (err) {
      console.error('Failed to add group', err);
    }
  };

  const scrollToFirstError = () => {
    setTimeout(() => {
      const firstErrorEl = document.querySelector('.error, .error-text');
      if (firstErrorEl) {
        firstErrorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        if (firstErrorEl.tagName === 'INPUT' || firstErrorEl.tagName === 'SELECT') {
          firstErrorEl.focus();
        } else {
          const formGroup = firstErrorEl.closest('.form-group');
          if (formGroup) {
            const input = formGroup.querySelector('input, select');
            if (input) input.focus();
          }
        }
      }
    }, 50);
  };

  const handleShowDetails = async (participant) => {
    setSelectedParticipant(participant);
    setSelectedTeamPlayers([]);
    setLoading(true);
    try {
      if (participant.type !== 'Singles') {
        const res = await fetch(`${API_BASE_URL}/api/teams/${participant.playerTeamId}/players`);
        if (res.ok) {
          const playersList = await res.json();
          setSelectedTeamPlayers(playersList);
        }
      }
      setSubView('detail');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const enterAddSinglesMode = () => {
    const singlesDivisions = divisions.filter(d => d.divisionType === 'Singles');
    const firstDiv = singlesDivisions.length > 0 ? singlesDivisions[0] : null;

    setDivisionId(firstDiv ? firstDiv.id.toString() : '');
    setGroupId('');
    setGroupsForDivision([]);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setGender('');
    setAge('');
    setSkillLevel('3.0');
    setValidationErrors({});
    setFormError('');
    setSubView('add-singles');
    if (firstDiv) fetchGroupsForDivision(firstDiv.id);
  };

  const enterAddDoublesMode = () => {
    const doublesDivisions = divisions.filter(d => d.divisionType === 'Doubles');
    const firstDiv = doublesDivisions.length > 0 ? doublesDivisions[0] : null;

    setDivisionId(firstDiv ? firstDiv.id.toString() : '');
    setGroupId('');
    setGroupsForDivision([]);
    setTeamName('');
    setP1FirstName(''); setP1LastName(''); setP1Email(''); setP1Phone(''); setP1Gender(''); setP1Age(''); setP1SkillLevel('3.0'); setP1SearchQuery(''); setP1SearchResults([]);
    setP2FirstName(''); setP2LastName(''); setP2Email(''); setP2Phone(''); setP2Gender(''); setP2Age(''); setP2SkillLevel('3.0'); setP2SearchQuery(''); setP2SearchResults([]);
    setValidationErrors({});
    setFormError('');
    setSubView('add-doubles');
    if (firstDiv) fetchGroupsForDivision(firstDiv.id);
  };

  const enterAddGenericMode = () => {
    const teamDivisions = divisions.filter(d => d.divisionType === 'Team');
    const firstDiv = teamDivisions.length > 0 ? teamDivisions[0] : null;

    setDivisionId(firstDiv ? firstDiv.id.toString() : '');
    setGroupId('');
    setGroupsForDivision([]);
    setGenericTeamName('');
    setG1FirstName(''); setG1LastName(''); setG1Email(''); setG1Phone(''); setG1Gender(''); setG1Age(''); setG1SkillLevel('3.0'); setG1SearchQuery(''); setG1SearchResults([]);
    setG2FirstName(''); setG2LastName(''); setG2Email(''); setG2Phone(''); setG2Gender(''); setG2Age(''); setG2SkillLevel('3.0'); setG2SearchQuery(''); setG2SearchResults([]);
    setG3FirstName(''); setG3LastName(''); setG3Email(''); setG3Phone(''); setG3Gender(''); setG3Age(''); setG3SkillLevel('3.0'); setG3SearchQuery(''); setG3SearchResults([]);
    setG4FirstName(''); setG4LastName(''); setG4Email(''); setG4Phone(''); setG4Gender(''); setG4Age(''); setG4SkillLevel('3.0'); setG4SearchQuery(''); setG4SearchResults([]);
    setValidationErrors({});
    setFormError('');
    setSubView('add-generic');
    if (firstDiv) fetchGroupsForDivision(firstDiv.id);
  };

  const selectPlayer1 = (player) => {
    setP1FirstName(player.firstName || '');
    setP1LastName(player.lastName || '');
    setP1Email(player.email || '');
    setP1Phone(player.phone || '');
    setP1Gender(player.gender || '');
    setP1Age(player.age || '');
    setP1SkillLevel(player.skillLevel || '3.0');
    setP1SearchQuery('');
    setP1SearchResults([]);
  };

  const selectPlayer2 = (player) => {
    setP2FirstName(player.firstName || '');
    setP2LastName(player.lastName || '');
    setP2Email(player.email || '');
    setP2Phone(player.phone || '');
    setP2Gender(player.gender || '');
    setP2Age(player.age || '');
    setP2SkillLevel(player.skillLevel || '3.0');
    setP2SearchQuery('');
    setP2SearchResults([]);
  };

  const selectGenericPlayer1 = (player) => {
    setG1FirstName(player.firstName || '');
    setG1LastName(player.lastName || '');
    setG1Email(player.email || '');
    setG1Phone(player.phone || '');
    setG1Gender(player.gender || '');
    setG1Age(player.age || '');
    setG1SkillLevel(player.skillLevel || '3.0');
    setG1SearchQuery('');
    setG1SearchResults([]);
  };

  const selectGenericPlayer2 = (player) => {
    setG2FirstName(player.firstName || '');
    setG2LastName(player.lastName || '');
    setG2Email(player.email || '');
    setG2Phone(player.phone || '');
    setG2Gender(player.gender || '');
    setG2Age(player.age || '');
    setG2SkillLevel(player.skillLevel || '3.0');
    setG2SearchQuery('');
    setG2SearchResults([]);
  };

  const selectGenericPlayer3 = (player) => {
    setG3FirstName(player.firstName || '');
    setG3LastName(player.lastName || '');
    setG3Email(player.email || '');
    setG3Phone(player.phone || '');
    setG3Gender(player.gender || '');
    setG3Age(player.age || '');
    setG3SkillLevel(player.skillLevel || '3.0');
    setG3SearchQuery('');
    setG3SearchResults([]);
  };

  const selectGenericPlayer4 = (player) => {
    setG4FirstName(player.firstName || '');
    setG4LastName(player.lastName || '');
    setG4Email(player.email || '');
    setG4Phone(player.phone || '');
    setG4Gender(player.gender || '');
    setG4Age(player.age || '');
    setG4SkillLevel(player.skillLevel || '3.0');
    setG4SearchQuery('');
    setG4SearchResults([]);
  };

  const validateSingles = () => {
    const errors = {};
    if (!divisionId) {
      errors.divisionId = 'Division is required';
    } else {
      const div = divisions.find(d => d.id.toString() === divisionId);
      if (div) {
        if (div.gender && div.gender !== 'Open' && div.gender !== 'Mixed') {
          if (gender !== div.gender) {
            errors.gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
        }
      }
    }
    if (!groupId) {
      errors.groupId = 'Group is required';
    }

    if (!firstName.trim()) errors.firstName = 'First Name is required';
    if (!lastName.trim()) errors.lastName = 'Last Name is required';
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errors.email = 'Please enter a valid email address';
      }
    }

    if (!skillLevel) errors.skillLevel = 'Skill Level is required';

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDoubles = () => {
    const errors = {};
    if (!divisionId) {
      errors.divisionId = 'Division is required';
    } else {
      const div = divisions.find(d => d.id.toString() === divisionId);
      if (div) {
        if (div.gender && div.gender !== 'Open' && div.gender !== 'Mixed') {
          if (p1Gender !== div.gender) {
            errors.p1Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
          if (p2Gender !== div.gender) {
            errors.p2Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
        }
      }
    }
    if (!groupId) {
      errors.groupId = 'Group is required';
    }

    if (!teamName.trim()) errors.teamName = 'Team Name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Player 1 validations
    if (!p1FirstName.trim()) errors.p1FirstName = 'First Name is required';
    if (!p1LastName.trim()) errors.p1LastName = 'Last Name is required';
    if (!p1Email.trim()) {
      errors.p1Email = 'Email is required';
    } else if (!emailRegex.test(p1Email.trim())) {
      errors.p1Email = 'Please enter a valid email address';
    }

    // Player 2 validations
    if (!p2FirstName.trim()) errors.p2FirstName = 'First Name is required';
    if (!p2LastName.trim()) errors.p2LastName = 'Last Name is required';
    if (!p2Email.trim()) {
      errors.p2Email = 'Email is required';
    } else if (!emailRegex.test(p2Email.trim())) {
      errors.p2Email = 'Please enter a valid email address';
    }

    if (p1Email.trim() && p2Email.trim() && p1Email.trim().toLowerCase() === p2Email.trim().toLowerCase()) {
      errors.p2Email = 'Player 1 and Player 2 cannot have the same email address';
      setFormError('Player 1 and Player 2 cannot have the same email address');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateGeneric = () => {
    const errors = {};
    if (!divisionId) {
      errors.divisionId = 'Division is required';
    } else {
      const div = divisions.find(d => d.id.toString() === divisionId);
      if (div) {
        if (div.gender && div.gender !== 'Open' && div.gender !== 'Mixed') {
          if (g1Gender !== div.gender) {
            errors.g1Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
          if (g2Gender !== div.gender) {
            errors.g2Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
          if (g3Gender !== div.gender) {
            errors.g3Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
          if (g4Gender !== div.gender) {
            errors.g4Gender = `The selected division is only for ${div.gender}. Please add a ${div.gender} player or choose a matching division`;
          }
        }
      }
    }
    if (!groupId) {
      errors.groupId = 'Group is required';
    }

    if (!genericTeamName.trim()) errors.genericTeamName = 'Team Name is required';

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Player validation utility
    const validatePlayer = (num, first, last, email) => {
      if (!first.trim()) errors[`g${num}FirstName`] = 'First Name is required';
      if (!last.trim()) errors[`g${num}LastName`] = 'Last Name is required';
      if (!email.trim()) {
        errors[`g${num}Email`] = 'Email is required';
      } else if (!emailRegex.test(email.trim())) {
        errors[`g${num}Email`] = 'Please enter a valid email address';
      }
    };

    validatePlayer(1, g1FirstName, g1LastName, g1Email);
    validatePlayer(2, g2FirstName, g2LastName, g2Email);
    validatePlayer(3, g3FirstName, g3LastName, g3Email);
    validatePlayer(4, g4FirstName, g4LastName, g4Email);

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSinglesSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateSingles()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      groupId: groupId ? parseInt(groupId) : null,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      gender: gender || null,
      age: age ? age.toString() : null,
      skillLevel: skillLevel
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/players/singles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Player successfully created');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to create player';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('email')) {
          setValidationErrors(prev => ({ ...prev, email: 'User email already exists' }));
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDoublesSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateDoubles()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      groupId: groupId ? parseInt(groupId) : null,
      teamName: teamName.trim(),
      player1: {
        firstName: p1FirstName.trim(),
        lastName: p1LastName.trim(),
        email: p1Email.trim(),
        phone: p1Phone.trim() || null,
        gender: p1Gender || null,
        age: p1Age ? p1Age.toString() : null,
        skillLevel: p1SkillLevel
      },
      player2: {
        firstName: p2FirstName.trim(),
        lastName: p2LastName.trim(),
        email: p2Email.trim(),
        phone: p2Phone.trim() || null,
        gender: p2Gender || null,
        age: p2Age ? p2Age.toString() : null,
        skillLevel: p2SkillLevel
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/doubles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Team successfully created');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to create team';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('team')) {
          setValidationErrors(prev => ({ ...prev, teamName: errMsg }));
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Error in creating the team. Please try again!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenericSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateGeneric()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      groupId: groupId ? parseInt(groupId) : null,
      teamName: genericTeamName.trim(),
      players: [
        {
          firstName: g1FirstName.trim(),
          lastName: g1LastName.trim(),
          email: g1Email.trim(),
          phone: g1Phone.trim() || null,
          gender: g1Gender || null,
          age: g1Age ? g1Age.toString() : null,
          skillLevel: g1SkillLevel
        },
        {
          firstName: g2FirstName.trim(),
          lastName: g2LastName.trim(),
          email: g2Email.trim(),
          phone: g2Phone.trim() || null,
          gender: g2Gender || null,
          age: g2Age ? g2Age.toString() : null,
          skillLevel: g2SkillLevel
        },
        {
          firstName: g3FirstName.trim(),
          lastName: g3LastName.trim(),
          email: g3Email.trim(),
          phone: g3Phone.trim() || null,
          gender: g3Gender || null,
          age: g3Age ? g3Age.toString() : null,
          skillLevel: g3SkillLevel
        },
        {
          firstName: g4FirstName.trim(),
          lastName: g4LastName.trim(),
          email: g4Email.trim(),
          phone: g4Phone.trim() || null,
          gender: g4Gender || null,
          age: g4Age ? g4Age.toString() : null,
          skillLevel: g4SkillLevel
        }
      ]
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/generic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Team successfully created');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to create team';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('team')) {
          setValidationErrors(prev => ({ ...prev, genericTeamName: errMsg }));
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Error in creating the team. Please try again!');
    } finally {
      setFormLoading(false);
    }
  };

  const enterEditSinglesMode = () => {
    if (!selectedParticipant) return;
    const pData = getPlayerData(selectedParticipant.playerTeamId);
    
    setDivisionId(selectedParticipant.divisionId.toString());
    setFirstName(pData.firstName || '');
    setLastName(pData.lastName || '');
    setEmail(pData.email || '');
    setPhone(pData.phone || '');
    setGender(pData.gender || '');
    setAge(pData.age || '');
    setSkillLevel(pData.skillLevel || '3.0');
    setValidationErrors({});
    setFormError('');
    setSubView('edit-singles');
  };

  const triggerEdit = async (participant) => {
    if (!participant) return;
    setLoading(true);
    setFormError('');
    setSelectedParticipant(participant);
    try {
      if (participant.type === 'Singles') {
        const pData = getPlayerData(participant.playerTeamId) || {};
        setDivisionId(participant.divisionId.toString());
        // Fetch groups for this division and set groupId
        fetchGroupsForDivision(participant.divisionId).then(() => {
          if (participant.groupId) setGroupId(participant.groupId.toString());
        });
        if (participant.groupId) setGroupId(participant.groupId.toString());
        setFirstName(pData.firstName || '');
        setLastName(pData.lastName || '');
        setEmail(pData.email || '');
        setPhone(pData.phone || '');
        setGender(pData.gender || '');
        setAge(pData.age || '');
        setSkillLevel(pData.skillLevel || '3.0');
        setValidationErrors({});
        setFormError('');
        setSubView('edit-singles');
      } else {
        const resTeam = await fetch(`${API_BASE_URL}/api/teams/${participant.playerTeamId}`);
        if (!resTeam.ok) throw new Error("Failed to load team details");
        const teamObj = await resTeam.json();

        // Fetch team players
        const resPlayers = await fetch(`${API_BASE_URL}/api/teams/${participant.playerTeamId}/players`);
        let teamPlayers = [];
        if (resPlayers.ok) teamPlayers = await resPlayers.json();

        setDivisionId(participant.divisionId.toString());
        // Fetch groups for this division and set groupId
        fetchGroupsForDivision(participant.divisionId).then(() => {
          if (participant.groupId) setGroupId(participant.groupId.toString());
        });
        if (participant.groupId) setGroupId(participant.groupId.toString());

        if (teamObj.type === 'Doubles') {
          setTeamName(teamObj.name || '');
          const p1 = teamPlayers[0] || {};
          const p2 = teamPlayers[1] || {};

          setP1FirstName(p1.firstName || '');
          setP1LastName(p1.lastName || '');
          setP1Email(p1.email || '');
          setP1Phone(p1.phone || '');
          setP1Gender(p1.gender || '');
          setP1Age(p1.age || '');
          setP1SkillLevel(p1.skillLevel || '3.0');
          setP1SearchQuery('');
          setP1SearchResults([]);

          setP2FirstName(p2.firstName || '');
          setP2LastName(p2.lastName || '');
          setP2Email(p2.email || '');
          setP2Phone(p2.phone || '');
          setP2Gender(p2.gender || '');
          setP2Age(p2.age || '');
          setP2SkillLevel(p2.skillLevel || '3.0');
          setP2SearchQuery('');
          setP2SearchResults([]);

          setValidationErrors({});
          setSubView('edit-doubles');
        } else {
          setGenericTeamName(teamObj.name || '');
          const g1 = teamPlayers[0] || {};
          const g2 = teamPlayers[1] || {};
          const g3 = teamPlayers[2] || {};
          const g4 = teamPlayers[3] || {};

          setG1FirstName(g1.firstName || '');
          setG1LastName(g1.lastName || '');
          setG1Email(g1.email || '');
          setG1Phone(g1.phone || '');
          setG1Gender(g1.gender || '');
          setG1Age(g1.age || '');
          setG1SkillLevel(g1.skillLevel || '3.0');
          setG1SearchQuery('');
          setG1SearchResults([]);

          setG2FirstName(g2.firstName || '');
          setG2LastName(g2.lastName || '');
          setG2Email(g2.email || '');
          setG2Phone(g2.phone || '');
          setG2Gender(g2.gender || '');
          setG2Age(g2.age || '');
          setG2SkillLevel(g2.skillLevel || '3.0');
          setG2SearchQuery('');
          setG2SearchResults([]);

          setG3FirstName(g3.firstName || '');
          setG3LastName(g3.lastName || '');
          setG3Email(g3.email || '');
          setG3Phone(g3.phone || '');
          setG3Gender(g3.gender || '');
          setG3Age(g3.age || '');
          setG3SkillLevel(g3.skillLevel || '3.0');
          setG3SearchQuery('');
          setG3SearchResults([]);

          setG4FirstName(g4.firstName || '');
          setG4LastName(g4.lastName || '');
          setG4Email(g4.email || '');
          setG4Phone(g4.phone || '');
          setG4Gender(g4.gender || '');
          setG4Age(g4.age || '');
          setG4SkillLevel(g4.skillLevel || '3.0');
          setG4SearchQuery('');
          setG4SearchResults([]);

          setValidationErrors({});
          setSubView('edit-generic');
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Failed to load team edit details.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditDetails = async () => {
    if (!selectedParticipant) return;
    await triggerEdit(selectedParticipant);
  };

  const handleDeleteParticipant = async (participant) => {
    const confirmMsg = participant.type === 'Singles'
      ? `Are you sure you want to remove player "${participant.playerTeamName}" from this division?`
      : `Are you sure you want to delete team "${participant.playerTeamName}"? This will delete the team and remove it from this division.`;
      
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/participants/${participant.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error("Failed to delete participant");

      // Reload lists
      await loadData();
      alert("Participant deleted successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to delete participant. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSinglesEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateSingles()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || null,
      gender: gender || null,
      age: age ? age.toString() : null,
      skillLevel: skillLevel
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/players/singles/${selectedParticipant.playerTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Edit details successful');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to update player';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('email')) {
          setValidationErrors(prev => ({ ...prev, email: 'User email already exists' }));
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Network error occurred. Please try again.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDoublesEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateDoubles()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      groupId: groupId ? parseInt(groupId) : null,
      teamName: teamName.trim(),
      player1: {
        firstName: p1FirstName.trim(),
        lastName: p1LastName.trim(),
        email: p1Email.trim(),
        phone: p1Phone.trim() || null,
        gender: p1Gender || null,
        age: p1Age ? p1Age.toString() : null,
        skillLevel: p1SkillLevel
      },
      player2: {
        firstName: p2FirstName.trim(),
        lastName: p2LastName.trim(),
        email: p2Email.trim(),
        phone: p2Phone.trim() || null,
        gender: p2Gender || null,
        age: p2Age ? p2Age.toString() : null,
        skillLevel: p2SkillLevel
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/doubles/${selectedParticipant.playerTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Edit details successful');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to update team';
        setFormError(errMsg);
        if (errMsg.toLowerCase().includes('team')) {
          setValidationErrors(prev => ({ ...prev, teamName: errMsg }));
        }
      }
    } catch (err) {
      console.error(err);
      setFormError('Error in updating the team. Please try again!');
    } finally {
      setFormLoading(false);
    }
  };

  const handleGenericEditSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validateGeneric()) {
      scrollToFirstError();
      return;
    }

    setFormLoading(true);
    const payload = {
      divisionId: parseInt(divisionId),
      groupId: groupId ? parseInt(groupId) : null,
      teamName: genericTeamName.trim(),
      players: [
        {
          firstName: g1FirstName.trim(),
          lastName: g1LastName.trim(),
          email: g1Email.trim(),
          phone: g1Phone.trim() || null,
          gender: g1Gender || null,
          age: g1Age ? g1Age.toString() : null,
          skillLevel: g1SkillLevel
        },
        {
          firstName: g2FirstName.trim(),
          lastName: g2LastName.trim(),
          email: g2Email.trim(),
          phone: g2Phone.trim() || null,
          gender: g2Gender || null,
          age: g2Age ? g2Age.toString() : null,
          skillLevel: g2SkillLevel
        },
        {
          firstName: g3FirstName.trim(),
          lastName: g3LastName.trim(),
          email: g3Email.trim(),
          phone: g3Phone.trim() || null,
          gender: g3Gender || null,
          age: g3Age ? g3Age.toString() : null,
          skillLevel: g3SkillLevel
        },
        {
          firstName: g4FirstName.trim(),
          lastName: g4LastName.trim(),
          email: g4Email.trim(),
          phone: g4Phone.trim() || null,
          gender: g4Gender || null,
          age: g4Age ? g4Age.toString() : null,
          skillLevel: g4SkillLevel
        }
      ]
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/generic/${selectedParticipant.playerTeamId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok && data.success) {
        alert('Edit details successful');
        setSubView('list');
        setReloadTrigger(prev => prev + 1);
      } else {
        const errMsg = data.message || 'Failed to update team';
        setFormError(errMsg);
      }
    } catch (err) {
      console.error(err);
      setFormError('Error in updating the team. Please try again!');
    } finally {
      setFormLoading(false);
    }
  };

  // Helper mapping helper functions
  const getDivisionName = (divId) => {
    const division = divisions.find(d => d.id === divId);
    return division ? division.name : `Division #${divId}`;
  };

  const getPlayerData = (playerId) => {
    const player = players.find(p => p.id === playerId);
    return player || {};
  };

  if (loading) {
    return (
      <div className="divisions-container">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem' }}>
          <div className="spinner" aria-label="Loading players data" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="divisions-container">
        <div className="no-divisions-card" style={{ color: 'var(--color-error)' }}>
          <p>{error}</p>
          <button className="back-btn" style={{ marginTop: '1rem' }} onClick={() => setReloadTrigger(prev => prev + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="divisions-container">
      {subView === 'list' ? (
        <>
          {/* Header */}
          <div className="divisions-header">
            <div>
              <h1 className="divisions-title">Players & Teams</h1>
              <p className="divisions-subtitle">Manage players and teams for your tournament.</p>
            </div>
            {isAdmin && (
              <div className="players-action-buttons">
                <button className="admin-btn active-btn" onClick={enterAddSinglesMode}>
                  Add Singles Player
                </button>
                <button className="admin-btn active-btn" onClick={enterAddDoublesMode}>
                  Add Team - Doubles
                </button>
                <button className="admin-btn active-btn" onClick={enterAddGenericMode}>
                  Add Team
                </button>
              </div>
            )}
          </div>

          {/* List of Divisions with Segregated Collapsible Participants */}
          {divisions.length === 0 ? (
            <div className="no-divisions-card">
              <p>No divisions configured for this tournament yet.</p>
              {isAdmin && (
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '1.25rem' }}>
                  <button className="admin-btn active-btn" onClick={() => onNavigate('divisions', { tournamentId, action: 'create' })}>
                    Create Division
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="divisions-collapsible-list">
              {divisions.map((div) => {
                // Group participants by their groupId
                const divParticipants = participants.filter(p => p.divisionId === div.id);
                const isExpanded = !!expandedDivisions[div.id];

                // Group participants by groupId
                const groupsInDiv = [...new Map(divParticipants
                  .filter(p => p.groupId)
                  .map(p => [p.groupId, { id: p.groupId }])
                  .concat(divParticipants.filter(p => !p.groupId).length > 0 ? [[-1, { id: -1 }]] : [])
                ).values()];

                return (
                  <div key={div.id} className="division-collapsible-item" style={{ marginBottom: '1rem', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden', background: 'var(--glass-bg)' }}>
                    <div 
                      onClick={async () => {
                        const willExpand = !expandedDivisions[div.id];
                        setExpandedDivisions(prev => ({ ...prev, [div.id]: willExpand }));
                        // Fetch groups for this division if not already cached
                        if (willExpand && !groupsByDivision[div.id]) {
                          try {
                            const res = await fetch(`${API_BASE_URL}/api/divisions/${div.id}/groups`);
                            if (res.ok) {
                              const data = await res.json();
                              setGroupsByDivision(prev => ({ ...prev, [div.id]: data }));
                            }
                          } catch (err) { /* silent */ }
                        }
                      }}
                      style={{ 
                        padding: '1rem 1.5rem', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        cursor: 'pointer',
                        background: 'rgba(255, 255, 255, 0.02)',
                        transition: 'background 0.2s',
                        userSelect: 'none'
                      }}
                      className="division-collapsible-header"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {div.name}
                        </span>
                        <span className="badge badge-type" style={{ fontSize: '0.75rem', padding: '0.15rem 0.5rem' }}>
                          {div.divisionType}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Gender: <strong style={{ color: 'var(--text-primary)' }}>{div.gender || 'Open'}</strong>
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Skill: <strong style={{ color: 'var(--text-primary)' }}>{div.minSkillLevel || 'Any'} - {div.maxSkillLevel || 'Any'}</strong>
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Age: <strong style={{ color: 'var(--text-primary)' }}>{div.ageGroup || 'Open to All'}</strong>
                        </span>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Registered: <strong style={{ color: 'var(--primary)' }}>{divParticipants.length}</strong> {div.maxTeams ? `/ ${div.maxTeams}` : ''}
                        </span>
                        <svg 
                          style={{ 
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', 
                            transition: 'transform 0.2s ease-in-out',
                            color: 'var(--text-secondary)'
                          }} 
                          xmlns="http://www.w3.org/2000/svg" 
                          width="18" 
                          height="18" 
                          viewBox="0 0 24 24" 
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2.5" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                        >
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div style={{ borderTop: '1px solid var(--glass-border)', padding: '0' }} className="division-collapsible-content">
                        {divParticipants.length === 0 ? (
                          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <p style={{ margin: 0 }}>No players or teams registered in this division yet.</p>
                          </div>
                        ) : (
                          // Render participants grouped by group
                          (() => {
                            // Build a map: groupId -> group participants
                            const groupMap = new Map();
                            divParticipants.forEach(p => {
                              const gKey = p.groupId != null ? p.groupId : 'ungrouped';
                              if (!groupMap.has(gKey)) groupMap.set(gKey, { label: null, participants: [] });
                              groupMap.get(gKey).participants.push(p);
                            });

                            // Fetch group names from groupsForDivision when available; we use a different approach:
                            // We render group sections with a label from participant.groupId
                            // Since we may not have group names here, fetch them on expand
                            return Array.from(groupMap.entries()).map(([gKey, { participants: gParticipants }]) => (
                              <div key={gKey} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <div style={{ padding: '0.6rem 1.5rem', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)', flexShrink: 0 }}>
                                    <rect x="3" y="3" width="7" height="7"></rect>
                                    <rect x="14" y="3" width="7" height="7"></rect>
                                    <rect x="3" y="14" width="7" height="7"></rect>
                                    <rect x="14" y="14" width="7" height="7"></rect>
                                  </svg>
                                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                    {gKey === 'ungrouped'
                                      ? 'Unassigned'
                                      : (groupsByDivision[div.id]?.find(g => g.id === gKey)?.name || `Group ${gKey}`)
                                    }
                                  </span>
                                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                                    {gParticipants.length} {gParticipants.length === 1 ? 'participant' : 'participants'}
                                  </span>
                                </div>
                                <div className="players-table-wrapper" style={{ margin: 0, borderRadius: 0, border: 'none' }}>
                                  <table className="players-table" style={{ width: '100%' }}>
                                    <thead>
                                      <tr>
                                        <th>Name / Team</th>
                                        <th>Type</th>
                                        <th>Gender</th>
                                        <th>Skill Level</th>
                                        <th>Matches</th>
                                        <th>Record (W-L)</th>
                                        {isAdmin && <th>Actions</th>}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {gParticipants.map((p) => {
                                        const pData = p.type === 'Singles' ? getPlayerData(p.playerTeamId) : {};
                                        return (
                                          <tr key={p.id}>
                                            <td>
                                              <div className="player-name-cell">
                                                <span className="player-avatar">
                                                  {p.playerTeamName.charAt(0).toUpperCase()}
                                                </span>
                                                <div>
                                                  <div className="player-name-main">
                                                    <a
                                                      href="#"
                                                      onClick={(e) => {
                                                        e.preventDefault();
                                                        handleShowDetails(p);
                                                      }}
                                                      style={{ color: 'inherit', textDecoration: 'none', fontWeight: '600' }}
                                                      className="player-details-link"
                                                    >
                                                      {p.playerTeamName}
                                                    </a>
                                                  </div>
                                                  {pData.email && <div className="player-email-sub">{pData.email}</div>}
                                                </div>
                                              </div>
                                            </td>
                                            <td>
                                              <span className="badge badge-type" style={p.type === 'Team' ? { background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' } : {}}>
                                                {p.type}
                                              </span>
                                            </td>
                                            <td>{pData.gender || '-'}</td>
                                            <td>
                                              <span className="badge badge-skill">{pData.skillLevel || '-'}</span>
                                            </td>
                                            <td>{p.matchesPlayed !== null ? p.matchesPlayed : 0}</td>
                                            <td>
                                              <span className="record-badge">
                                                {p.won !== null ? p.won : 0}W - {p.lost !== null ? p.lost : 0}L
                                              </span>
                                            </td>
                                            {isAdmin && (
                                              <td>
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                  <button
                                                    onClick={() => triggerEdit(p)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s, transform 0.2s', borderRadius: '6px' }}
                                                    title="Edit Details"
                                                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'none'; }}
                                                  >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                                                    </svg>
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteParticipant(p)}
                                                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.2s, transform 0.2s', borderRadius: '6px' }}
                                                    title="Delete Participant"
                                                    onMouseOver={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                                                    onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.transform = 'none'; }}
                                                  >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                                      <polyline points="3 6 5 6 21 6"></polyline>
                                                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                      <line x1="10" y1="11" x2="10" y2="17"></line>
                                                      <line x1="14" y1="11" x2="14" y2="17"></line>
                                                    </svg>
                                                  </button>
                                                </div>
                                              </td>
                                            )}
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            ));
                          })()
                        )}

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (subView === 'add-singles' || subView === 'edit-singles') ? (
        /* 'add-singles' or 'edit-singles' View */
        <div className="division-form-view">
          <button className="back-btn" onClick={() => setSubView('list')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Cancel
          </button>

          <div className="form-card">
            <header className="form-header-section">
              <h1 className="form-title">{subView === 'edit-singles' ? 'Edit Player Details' : 'Add Player'}</h1>
              <p className="form-subtitle">{subView === 'edit-singles' ? 'Modify singles player registration details.' : 'Register a new player in a division for the current tournament.'}</p>
            </header>

            {formError && (
              <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={subView === 'edit-singles' ? handleSinglesEditSubmit : handleSinglesSubmit} className="tournament-editor-form" noValidate>
              {/* Division dropdown */}
              <div className="form-group">
                <label htmlFor="divisionId" className="form-label">Division <span className="required-star">*</span></label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    id="divisionId"
                    value={divisionId}
                    onChange={(e) => {
                      setDivisionId(e.target.value);
                      fetchGroupsForDivision(e.target.value);
                    }}
                    className={`form-input form-select ${validationErrors.divisionId ? 'error' : ''}`}
                    disabled={formLoading || divisions.filter(d => d.divisionType === 'Singles').length === 0}
                    style={{ flex: 1 }}
                    required
                  >
                    {divisions.filter(d => d.divisionType === 'Singles').length === 0 ? (
                      <option value="">No divisions yet. Create one to add players.</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Division</option>
                        {divisions.filter(d => d.divisionType === 'Singles').map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.gender || 'Open'} - {d.minSkillLevel || 'Any'}-{d.maxSkillLevel || 'Any'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    className="admin-btn active-btn"
                    onClick={() => onNavigate('divisions', { tournamentId })}
                    style={{ whiteSpace: 'nowrap', minHeight: '52px' }}
                  >
                    New Division
                  </button>
                </div>
                {validationErrors.divisionId && <span className="error-text">{validationErrors.divisionId}</span>}
              </div>

              {/* Group dropdown */}
              {divisionId && (
                <div className="form-group">
                  <label htmlFor="groupIdSingles" className="form-label">Group <span className="required-star">*</span></label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        id="groupIdSingles"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className={`form-input form-select ${validationErrors.groupId ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      >
                        <option value="" disabled>Select Group</option>
                        {groupsForDivision.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {validationErrors.groupId && <span className="error-text">{validationErrors.groupId}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      disabled={formLoading}
                      style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap', marginTop: '0' }}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="firstName" className="form-label">First Name <span className="required-star">*</span></label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="e.g. John"
                    className={`form-input ${validationErrors.firstName ? 'error' : ''}`}
                    disabled={formLoading}
                    required
                  />
                  {validationErrors.firstName && <span className="error-text">{validationErrors.firstName}</span>}
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="lastName" className="form-label">Last Name <span className="required-star">*</span></label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className={`form-input ${validationErrors.lastName ? 'error' : ''}`}
                    disabled={formLoading}
                    required
                  />
                  {validationErrors.lastName && <span className="error-text">{validationErrors.lastName}</span>}
                </div>
              </div>

              {/* Email & Phone */}
              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="email" className="form-label">Email Address <span className="required-star">*</span></label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. name@example.com"
                    className={`form-input ${validationErrors.email ? 'error' : ''}`}
                    disabled={formLoading}
                    required
                  />
                  {validationErrors.email && <span className="error-text">{validationErrors.email}</span>}
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="phone" className="form-label">Phone Number</label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (555) 000-0000"
                    className="form-input"
                    disabled={formLoading}
                  />
                </div>
              </div>

              {/* Gender, Age & Skill Level */}
              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="gender" className="form-label">Gender</label>
                  <select
                    id="gender"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className={`form-input form-select ${validationErrors.gender ? 'error' : ''}`}
                    disabled={formLoading}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                  {validationErrors.gender && <span className="error-text">{validationErrors.gender}</span>}
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="age" className="form-label">Age</label>
                  <input
                    id="age"
                    type="number"
                    min="1"
                    max="120"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="e.g. 28"
                    className="form-input"
                    disabled={formLoading}
                  />
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="skillLevel" className="form-label">Skill Level <span className="required-star">*</span></label>
                  <select
                    id="skillLevel"
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className="form-input form-select"
                    disabled={formLoading}
                    required
                  >
                    <option value="1.0">1.0</option>
                    <option value="1.5">1.5</option>
                    <option value="2.0">2.0</option>
                    <option value="2.5">2.5</option>
                    <option value="3.0">3.0</option>
                    <option value="3.5">3.5</option>
                    <option value="4.0">4.0</option>
                    <option value="4.5">4.5</option>
                    <option value="5.0">5.0</option>
                  </select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions-row">
                <button
                  type="button"
                  className="form-cancel-btn"
                  onClick={() => setSubView('list')}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: 0, flex: 1 }}
                  disabled={formLoading || divisions.length === 0}
                >
                  {formLoading ? (
                    <div className="spinner" aria-label={subView === 'edit-singles' ? 'Saving player' : 'Creating player'} />
                  ) : (
                    subView === 'edit-singles' ? 'Save Changes' : 'Create Player'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (subView === 'add-doubles' || subView === 'edit-doubles') ? (
        /* 'add-doubles' or 'edit-doubles' View */
        <div className="division-form-view">
          <button className="back-btn" onClick={() => setSubView('list')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Cancel
          </button>

          <div className="form-card">
            <header className="form-header-section">
              <h1 className="form-title">{subView === 'edit-doubles' ? 'Edit Doubles Team' : 'Add Doubles Team'}</h1>
              <p className="form-subtitle">{subView === 'edit-doubles' ? 'Modify doubles team and player details.' : 'Register a new doubles team and their players.'}</p>
            </header>

            {formError && (
              <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={subView === 'edit-doubles' ? handleDoublesEditSubmit : handleDoublesSubmit} className="tournament-editor-form" noValidate>
              {/* Division Dropdown with redirect button */}
              <div className="form-group">
                <label htmlFor="divisionIdDoubles" className="form-label">Division <span className="required-star">*</span></label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    id="divisionIdDoubles"
                    value={divisionId}
                    onChange={(e) => {
                      setDivisionId(e.target.value);
                      fetchGroupsForDivision(e.target.value);
                    }}
                    className={`form-input form-select ${validationErrors.divisionId ? 'error' : ''}`}
                    disabled={formLoading || divisions.filter(d => d.divisionType === 'Doubles').length === 0}
                    style={{ flex: 1 }}
                    required
                  >
                    {divisions.filter(d => d.divisionType === 'Doubles').length === 0 ? (
                      <option value="">There are no divisions yet. Add a division to add teams</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Division</option>
                        {divisions.filter(d => d.divisionType === 'Doubles').map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.gender || 'Open'} - {d.minSkillLevel || 'Any'}-{d.maxSkillLevel || 'Any'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    className="admin-btn active-btn"
                    onClick={() => onNavigate('divisions', { tournamentId })}
                    style={{ whiteSpace: 'nowrap', minHeight: '52px' }}
                  >
                    New Division
                  </button>
                </div>
                {validationErrors.divisionId && <span className="error-text">{validationErrors.divisionId}</span>}
              </div>

              {/* Group dropdown */}
              {divisionId && (
                <div className="form-group">
                  <label htmlFor="groupIdDoubles" className="form-label">Group <span className="required-star">*</span></label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        id="groupIdDoubles"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className={`form-input form-select ${validationErrors.groupId ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      >
                        <option value="" disabled>Select Group</option>
                        {groupsForDivision.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {validationErrors.groupId && <span className="error-text">{validationErrors.groupId}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      disabled={formLoading}
                      style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="teamName" className="form-label">Team Name <span className="required-star">*</span></label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. Smash Brothers"
                  className={`form-input ${validationErrors.teamName ? 'error' : ''}`}
                  disabled={formLoading}
                  required
                />
                {validationErrors.teamName && <span className="error-text">{validationErrors.teamName}</span>}
              </div>

              <hr className="form-section-divider" />

              {/* Player 1 Section */}
              <div>
                <h3 className="form-section-title">Player 1 Details</h3>
                
                {/* Autocomplete Search */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="p1Search" className="form-label">Search existing players</label>
                  <input
                    id="p1Search"
                    type="text"
                    placeholder="Type name to search existing players..."
                    value={p1SearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setP1SearchQuery(val);
                      if (!val.trim()) setP1SearchResults([]);
                    }}
                    className="form-input"
                    disabled={formLoading}
                  />
                  {filterSearchResultsByGender(p1SearchResults).length > 0 && (
                    <div className="search-suggestions-list">
                      {filterSearchResultsByGender(p1SearchResults).map((player) => (
                        <div
                          key={player.id}
                          className="search-suggestion-item"
                          onClick={() => selectPlayer1(player)}
                        >
                          <div className="suggestion-name">{player.firstName} {player.lastName}</div>
                          <div className="suggestion-email">{player.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p1FirstName" className="form-label">First Name <span className="required-star">*</span></label>
                    <input
                      id="p1FirstName"
                      type="text"
                      value={p1FirstName}
                      onChange={(e) => setP1FirstName(e.target.value)}
                      placeholder="First Name"
                      className={`form-input ${validationErrors.p1FirstName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p1FirstName && <span className="error-text">{validationErrors.p1FirstName}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p1LastName" className="form-label">Last Name <span className="required-star">*</span></label>
                    <input
                      id="p1LastName"
                      type="text"
                      value={p1LastName}
                      onChange={(e) => setP1LastName(e.target.value)}
                      placeholder="Last Name"
                      className={`form-input ${validationErrors.p1LastName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p1LastName && <span className="error-text">{validationErrors.p1LastName}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p1Email" className="form-label">Email Address <span className="required-star">*</span></label>
                    <input
                      id="p1Email"
                      type="email"
                      value={p1Email}
                      onChange={(e) => setP1Email(e.target.value)}
                      placeholder="name@example.com"
                      className={`form-input ${validationErrors.p1Email ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p1Email && <span className="error-text">{validationErrors.p1Email}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p1Phone" className="form-label">Phone Number</label>
                    <input
                      id="p1Phone"
                      type="tel"
                      value={p1Phone}
                      onChange={(e) => setP1Phone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="form-input"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p1Gender" className="form-label">Gender</label>
                    <select
                      id="p1Gender"
                      value={p1Gender}
                      onChange={(e) => setP1Gender(e.target.value)}
                      className={`form-input form-select ${validationErrors.p1Gender ? 'error' : ''}`}
                      disabled={formLoading}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {validationErrors.p1Gender && <span className="error-text">{validationErrors.p1Gender}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p1Age" className="form-label">Age</label>
                    <input
                      id="p1Age"
                      type="number"
                      min="1"
                      max="120"
                      value={p1Age}
                      onChange={(e) => setP1Age(e.target.value)}
                      placeholder="Age"
                      className="form-input"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p1Skill" className="form-label">Skill Level <span className="required-star">*</span></label>
                    <select
                      id="p1Skill"
                      value={p1SkillLevel}
                      onChange={(e) => setP1SkillLevel(e.target.value)}
                      className="form-input form-select"
                      disabled={formLoading}
                      required
                    >
                      <option value="1.0">1.0</option>
                      <option value="1.5">1.5</option>
                      <option value="2.0">2.0</option>
                      <option value="2.5">2.5</option>
                      <option value="3.0">3.0</option>
                      <option value="3.5">3.5</option>
                      <option value="4.0">4.0</option>
                      <option value="4.5">4.5</option>
                      <option value="5.0">5.0</option>
                    </select>
                  </div>
                </div>
              </div>

              <hr className="form-section-divider" />

              {/* Player 2 Section */}
              <div>
                <h3 className="form-section-title">Player 2 Details</h3>
                
                {/* Autocomplete Search */}
                <div className="form-group" style={{ position: 'relative' }}>
                  <label htmlFor="p2Search" className="form-label">Search existing players</label>
                  <input
                    id="p2Search"
                    type="text"
                    placeholder="Type name to search existing players..."
                    value={p2SearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setP2SearchQuery(val);
                      if (!val.trim()) setP2SearchResults([]);
                    }}
                    className="form-input"
                    disabled={formLoading}
                  />
                  {filterSearchResultsByGender(p2SearchResults).length > 0 && (
                    <div className="search-suggestions-list">
                      {filterSearchResultsByGender(p2SearchResults).map((player) => (
                        <div
                          key={player.id}
                          className="search-suggestion-item"
                          onClick={() => selectPlayer2(player)}
                        >
                          <div className="suggestion-name">{player.firstName} {player.lastName}</div>
                          <div className="suggestion-email">{player.email}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p2FirstName" className="form-label">First Name <span className="required-star">*</span></label>
                    <input
                      id="p2FirstName"
                      type="text"
                      value={p2FirstName}
                      onChange={(e) => setP2FirstName(e.target.value)}
                      placeholder="First Name"
                      className={`form-input ${validationErrors.p2FirstName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p2FirstName && <span className="error-text">{validationErrors.p2FirstName}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p2LastName" className="form-label">Last Name <span className="required-star">*</span></label>
                    <input
                      id="p2LastName"
                      type="text"
                      value={p2LastName}
                      onChange={(e) => setP2LastName(e.target.value)}
                      placeholder="Last Name"
                      className={`form-input ${validationErrors.p2LastName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p2LastName && <span className="error-text">{validationErrors.p2LastName}</span>}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p2Email" className="form-label">Email Address <span className="required-star">*</span></label>
                    <input
                      id="p2Email"
                      type="email"
                      value={p2Email}
                      onChange={(e) => setP2Email(e.target.value)}
                      placeholder="name@example.com"
                      className={`form-input ${validationErrors.p2Email ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {validationErrors.p2Email && <span className="error-text">{validationErrors.p2Email}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p2Phone" className="form-label">Phone Number</label>
                    <input
                      id="p2Phone"
                      type="tel"
                      value={p2Phone}
                      onChange={(e) => setP2Phone(e.target.value)}
                      placeholder="(555) 000-0000"
                      className="form-input"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="p2Gender" className="form-label">Gender</label>
                    <select
                      id="p2Gender"
                      value={p2Gender}
                      onChange={(e) => setP2Gender(e.target.value)}
                      className={`form-input form-select ${validationErrors.p2Gender ? 'error' : ''}`}
                      disabled={formLoading}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                    {validationErrors.p2Gender && <span className="error-text">{validationErrors.p2Gender}</span>}
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p2Age" className="form-label">Age</label>
                    <input
                      id="p2Age"
                      type="number"
                      min="1"
                      max="120"
                      value={p2Age}
                      onChange={(e) => setP2Age(e.target.value)}
                      placeholder="Age"
                      className="form-input"
                      disabled={formLoading}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label htmlFor="p2Skill" className="form-label">Skill Level <span className="required-star">*</span></label>
                    <select
                      id="p2Skill"
                      value={p2SkillLevel}
                      onChange={(e) => setP2SkillLevel(e.target.value)}
                      className="form-input form-select"
                      disabled={formLoading}
                      required
                    >
                      <option value="1.0">1.0</option>
                      <option value="1.5">1.5</option>
                      <option value="2.0">2.0</option>
                      <option value="2.5">2.5</option>
                      <option value="3.0">3.0</option>
                      <option value="3.5">3.5</option>
                      <option value="4.0">4.0</option>
                      <option value="4.5">4.5</option>
                      <option value="5.0">5.0</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="form-actions-row">
                <button
                  type="button"
                  className="form-cancel-btn"
                  onClick={() => setSubView('list')}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: 0, flex: 1 }}
                  disabled={formLoading || divisions.length === 0}
                >
                  {formLoading ? (
                    <div className="spinner" aria-label={subView === 'edit-doubles' ? 'Saving team' : 'Creating doubles team'} />
                  ) : (
                    subView === 'edit-doubles' ? 'Save Changes' : 'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (subView === 'add-generic' || subView === 'edit-generic') ? (
        /* 'add-generic' or 'edit-generic' View */
        <div className="division-form-view">
          <button className="back-btn" onClick={() => setSubView('list')}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Cancel
          </button>

          <div className="form-card">
            <header className="form-header-section">
              <h1 className="form-title">{subView === 'edit-generic' ? 'Edit Team Details' : 'Add Team'}</h1>
              <p className="form-subtitle">{subView === 'edit-generic' ? 'Modify 4-player team and player details.' : 'Register a new 4-player team and their players.'}</p>
            </header>

            {formError && (
              <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={subView === 'edit-generic' ? handleGenericEditSubmit : handleGenericSubmit} className="tournament-editor-form" noValidate>
              {/* Division Dropdown with redirect button */}
              <div className="form-group">
                <label htmlFor="genericDivisionId" className="form-label">Division <span className="required-star">*</span></label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <select
                    id="genericDivisionId"
                    value={divisionId}
                    onChange={(e) => {
                      setDivisionId(e.target.value);
                      fetchGroupsForDivision(e.target.value);
                    }}
                    className={`form-input form-select ${validationErrors.divisionId ? 'error' : ''}`}
                    disabled={formLoading || divisions.filter(d => d.divisionType === 'Team').length === 0}
                    style={{ flex: 1 }}
                    required
                  >
                    {divisions.filter(d => d.divisionType === 'Team').length === 0 ? (
                      <option value="">There are no divisions yet. Add a division to add teams</option>
                    ) : (
                      <>
                        <option value="" disabled>Select Division</option>
                        {divisions.filter(d => d.divisionType === 'Team').map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.gender || 'Open'} - {d.minSkillLevel || 'Any'}-{d.maxSkillLevel || 'Any'})
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    className="admin-btn active-btn"
                    onClick={() => onNavigate('divisions', { tournamentId })}
                    style={{ whiteSpace: 'nowrap', minHeight: '52px' }}
                  >
                    New Division
                  </button>
                </div>
                {validationErrors.divisionId && <span className="error-text">{validationErrors.divisionId}</span>}
              </div>

              {/* Group dropdown */}
              {divisionId && (
                <div className="form-group">
                  <label htmlFor="groupIdGeneric" className="form-label">Group <span className="required-star">*</span></label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <select
                        id="groupIdGeneric"
                        value={groupId}
                        onChange={(e) => setGroupId(e.target.value)}
                        className={`form-input form-select ${validationErrors.groupId ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      >
                        <option value="" disabled>Select Group</option>
                        {groupsForDivision.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      {validationErrors.groupId && <span className="error-text">{validationErrors.groupId}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={handleAddGroup}
                      disabled={formLoading}
                      style={{ padding: '10px 14px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                    >
                      + Add Group
                    </button>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="genericTeamName" className="form-label">Team Name <span className="required-star">*</span></label>
                <input
                  id="genericTeamName"
                  type="text"
                  value={genericTeamName}
                  onChange={(e) => setGenericTeamName(e.target.value)}
                  placeholder="e.g. SF Giants"
                  className={`form-input ${validationErrors.genericTeamName ? 'error' : ''}`}
                  disabled={formLoading}
                  required
                />
                {validationErrors.genericTeamName && <span className="error-text">{validationErrors.genericTeamName}</span>}
              </div>

              {/* RENDER 4 PLAYERS */}
              {[
                { num: 1, first: g1FirstName, setFirst: setG1FirstName, last: g1LastName, setLast: setG1LastName, email: g1Email, setEmail: setG1Email, phone: g1Phone, setPhone: setG1Phone, gender: g1Gender, setGender: setG1Gender, age: g1Age, setAge: setG1Age, skill: g1SkillLevel, setSkill: setG1SkillLevel, query: g1SearchQuery, setQuery: setG1SearchQuery, results: g1SearchResults, select: selectGenericPlayer1 },
                { num: 2, first: g2FirstName, setFirst: setG2FirstName, last: g2LastName, setLast: setG2LastName, email: g2Email, setEmail: setG2Email, phone: g2Phone, setPhone: setG2Phone, gender: g2Gender, setGender: setG2Gender, age: g2Age, setAge: setG2Age, skill: g2SkillLevel, setSkill: setG2SkillLevel, query: g2SearchQuery, setQuery: setG2SearchQuery, results: g2SearchResults, select: selectGenericPlayer2 },
                { num: 3, first: g3FirstName, setFirst: setG3FirstName, last: g3LastName, setLast: setG3LastName, email: g3Email, setEmail: setG3Email, phone: g3Phone, setPhone: setG3Phone, gender: g3Gender, setGender: setG3Gender, age: g3Age, setAge: setG3Age, skill: g3SkillLevel, setSkill: setG3SkillLevel, query: g3SearchQuery, setQuery: setG3SearchQuery, results: g3SearchResults, select: selectGenericPlayer3 },
                { num: 4, first: g4FirstName, setFirst: setG4FirstName, last: g4LastName, setLast: setG4LastName, email: g4Email, setEmail: setG4Email, phone: g4Phone, setPhone: setG4Phone, gender: g4Gender, setGender: setG4Gender, age: g4Age, setAge: setG4Age, skill: g4SkillLevel, setSkill: setG4SkillLevel, query: g4SearchQuery, setQuery: setG4SearchQuery, results: g4SearchResults, select: selectGenericPlayer4 }
              ].map((p) => (
                <div key={p.num}>
                  <hr className="form-section-divider" />
                  <h3 className="form-section-title">Player {p.num} Details</h3>

                  {/* Autocomplete Search */}
                  <div className="form-group" style={{ position: 'relative' }}>
                    <label htmlFor={`g${p.num}Search`} className="form-label">Search existing players</label>
                    <input
                      id={`g${p.num}Search`}
                      type="text"
                      placeholder="Type name to search existing players..."
                      value={p.query}
                      onChange={(e) => {
                        const val = e.target.value;
                        p.setQuery(val);
                        if (!val.trim()) p.select({ id: null });
                      }}
                      className="form-input"
                      disabled={formLoading}
                    />
                    {filterSearchResultsByGender(p.results).length > 0 && (
                      <div className="search-suggestions-list">
                        {filterSearchResultsByGender(p.results).map((player) => (
                          <div
                            key={player.id}
                            className="search-suggestion-item"
                            onClick={() => p.select(player)}
                          >
                            <div className="suggestion-name">{player.firstName} {player.lastName}</div>
                            <div className="suggestion-email">{player.email}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}FirstName`} className="form-label">First Name <span className="required-star">*</span></label>
                      <input
                        id={`g${p.num}FirstName`}
                        type="text"
                        value={p.first}
                        onChange={(e) => p.setFirst(e.target.value)}
                        placeholder="First Name"
                        className={`form-input ${validationErrors[`g${p.num}FirstName`] ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      />
                      {validationErrors[`g${p.num}FirstName`] && <span className="error-text">{validationErrors[`g${p.num}FirstName`]}</span>}
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}LastName`} className="form-label">Last Name <span className="required-star">*</span></label>
                      <input
                        id={`g${p.num}LastName`}
                        type="text"
                        value={p.last}
                        onChange={(e) => p.setLast(e.target.value)}
                        placeholder="Last Name"
                        className={`form-input ${validationErrors[`g${p.num}LastName`] ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      />
                      {validationErrors[`g${p.num}LastName`] && <span className="error-text">{validationErrors[`g${p.num}LastName`]}</span>}
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}Email`} className="form-label">Email Address <span className="required-star">*</span></label>
                      <input
                        id={`g${p.num}Email`}
                        type="email"
                        value={p.email}
                        onChange={(e) => p.setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={`form-input ${validationErrors[`g${p.num}Email`] ? 'error' : ''}`}
                        disabled={formLoading}
                        required
                      />
                      {validationErrors[`g${p.num}Email`] && <span className="error-text">{validationErrors[`g${p.num}Email`]}</span>}
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}Phone`} className="form-label">Phone Number</label>
                      <input
                        id={`g${p.num}Phone`}
                        type="tel"
                        value={p.phone}
                        onChange={(e) => p.setPhone(e.target.value)}
                        placeholder="(555) 000-0000"
                        className="form-input"
                        disabled={formLoading}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}Gender`} className="form-label">Gender</label>
                      <select
                        id={`g${p.num}Gender`}
                        value={p.gender}
                        onChange={(e) => p.setGender(e.target.value)}
                        className={`form-input form-select ${validationErrors[`g${p.num}Gender`] ? 'error' : ''}`}
                        disabled={formLoading}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {validationErrors[`g${p.num}Gender`] && <span className="error-text">{validationErrors[`g${p.num}Gender`]}</span>}
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}Age`} className="form-label">Age</label>
                      <input
                        id={`g${p.num}Age`}
                        type="number"
                        min="1"
                        max="120"
                        value={p.age}
                        onChange={(e) => p.setAge(e.target.value)}
                        placeholder="Age"
                        className="form-input"
                        disabled={formLoading}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label htmlFor={`g${p.num}Skill`} className="form-label">Skill Level <span className="required-star">*</span></label>
                      <select
                        id={`g${p.num}Skill`}
                        value={p.skill}
                        onChange={(e) => p.setSkill(e.target.value)}
                        className="form-input form-select"
                        disabled={formLoading}
                        required
                      >
                        <option value="1.0">1.0</option>
                        <option value="1.5">1.5</option>
                        <option value="2.0">2.0</option>
                        <option value="2.5">2.5</option>
                        <option value="3.0">3.0</option>
                        <option value="3.5">3.5</option>
                        <option value="4.0">4.0</option>
                        <option value="4.5">4.5</option>
                        <option value="5.0">5.0</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {/* Action Buttons */}
              <div className="form-actions-row">
                <button
                  type="button"
                  className="form-cancel-btn"
                  onClick={() => setSubView('list')}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: 0, flex: 1 }}
                  disabled={formLoading || divisions.length === 0}
                >
                  {formLoading ? (
                    <div className="spinner" aria-label={subView === 'edit-generic' ? 'Saving team' : 'Creating team'} />
                  ) : (
                    subView === 'edit-generic' ? 'Save Changes' : 'Create Team'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : subView === 'detail' ? (
        /* 'detail' View */
        <div className="division-form-view">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '12px' }}>
            <button className="back-btn" onClick={() => setSubView('list')} style={{ marginBottom: 0 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
              Back
            </button>
            {isAdmin && selectedParticipant && (
              <button 
                className="admin-btn active-btn"
                onClick={handleEditDetails}
              >
                Edit Details
              </button>
            )}
          </div>

          {selectedParticipant && (
            <div className="form-card" style={{ padding: '2rem' }}>
              <header className="form-header-section" style={{ borderBottom: '1px solid var(--glass-border)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className="player-avatar" style={{ width: '48px', height: '48px', fontSize: '1.25rem' }}>
                    {selectedParticipant.playerTeamName.charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <h1 className="form-title" style={{ margin: 0 }}>{selectedParticipant.playerTeamName}</h1>
                    <p className="form-subtitle" style={{ margin: '0.25rem 0 0 0' }}>
                      {selectedParticipant.type} • {getDivisionName(selectedParticipant.divisionId)}
                    </p>
                  </div>
                </div>
              </header>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Matches Played</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedParticipant.matchesPlayed || 0}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-success)' }}>{selectedParticipant.won || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>Won</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--color-error)' }}>{selectedParticipant.lost || 0}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '0.25rem' }}>Lost</div>
                </div>
              </div>

              {selectedParticipant.type === 'Singles' ? (
                <div>
                  <h3 className="form-section-title" style={{ fontSize: '1.2rem', marginBottom: '1.25rem' }}>Player Information</h3>
                  {(() => {
                    const pData = getPlayerData(selectedParticipant.playerTeamId);
                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                          <label className="form-label" style={{ opacity: 0.7 }}>Email</label>
                          <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{pData.email || '-'}</div>
                        </div>
                        <div>
                          <label className="form-label" style={{ opacity: 0.7 }}>Phone</label>
                          <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{pData.phone || '-'}</div>
                        </div>
                        <div>
                          <label className="form-label" style={{ opacity: 0.7 }}>Gender</label>
                          <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{pData.gender || '-'}</div>
                        </div>
                        <div>
                          <label className="form-label" style={{ opacity: 0.7 }}>Age</label>
                          <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>{pData.age || '-'}</div>
                        </div>
                        <div>
                          <label className="form-label" style={{ opacity: 0.7 }}>Skill Level</label>
                          <div style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                            <span className="badge badge-skill">{pData.skillLevel || '-'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div>
                  <h3 className="form-section-title" style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Team Roster</h3>
                  {selectedTeamPlayers.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)' }}>Loading roster...</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                      {selectedTeamPlayers.map((player, idx) => (
                        <div key={player.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: 'var(--primary)', fontWeight: '600' }}>Player {idx + 1}: {player.firstName} {player.lastName}</h4>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem' }}>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Email</label>
                              <div style={{ fontSize: '0.95rem' }}>{player.email || '-'}</div>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Phone</label>
                              <div style={{ fontSize: '0.95rem' }}>{player.phone || '-'}</div>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Gender</label>
                              <div style={{ fontSize: '0.95rem' }}>{player.gender || '-'}</div>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Age</label>
                              <div style={{ fontSize: '0.95rem' }}>{player.age || '-'}</div>
                            </div>
                            <div>
                              <label className="form-label" style={{ fontSize: '0.8rem', opacity: 0.6 }}>Skill Level</label>
                              <div>
                                <span className="badge badge-skill">{player.skillLevel || '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {isAdmin && (
                <div style={{ marginTop: '3rem', borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button 
                    className="admin-btn active-btn"
                    onClick={handleEditDetails}
                  >
                    Edit Details
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
