import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Divisions({ tournamentId, user, onNavigate, searchQuery }) {
  const [divisions, setDivisions] = useState([]);
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Sub-view state: 'list' | 'detail' | 'create' | 'edit'
  const [subView, setSubView] = useState('list');

  // Form states
  const [name, setName] = useState('');
  const [divisionType, setDivisionType] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gender, setGender] = useState('');
  const [ageGroup, setAgeGroup] = useState('Open to All');
  const [minSkillLevel, setMinSkillLevel] = useState('');
  const [maxSkillLevel, setMaxSkillLevel] = useState('');
  const [maxTeams, setMaxTeams] = useState('');
  const [groupCount, setGroupCount] = useState(1);
  const [numSets, setNumSets] = useState(3);
  const [status, setStatus] = useState('active');

  const [formLoading, setFormLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successAlert, setSuccessAlert] = useState(false);

  const isAdmin = user && user.role === 'admin';

  // Read URL parameters to detect selected division
  useEffect(() => {
    const params = new URLSearchParams(searchQuery);
    const divisionId = params.get('divisionId');

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch list of divisions
        const listResponse = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/divisions`);
        if (!listResponse.ok) {
          throw new Error('Failed to load divisions list');
        }
        const listData = await listResponse.json();
        setDivisions(listData);

        const action = params.get('action');

        // Fetch details of specific division if selected in URL
        if (action === 'create') {
          setSelectedDivision(null);
          setName('');
          setDivisionType('');
          setDescription('');
          setStartDate('');
          setEndDate('');
          setGender('');
          setAgeGroup('Open to All');
          setMinSkillLevel('');
          setMaxSkillLevel('');
          setMaxTeams('');
          setValidationErrors({});
          setFormError('');
          setSubView('create');
        } else if (divisionId) {
          const detailResponse = await fetch(`${API_BASE_URL}/api/divisions/${divisionId}`);
          if (detailResponse.ok) {
            const detailData = await detailResponse.json();
            setSelectedDivision(detailData);
            setSubView('detail');
          } else {
            // If failed to load detail, fallback to list view and clear param
            onNavigate('divisions', { tournamentId });
            setSubView('list');
          }
        } else {
          setSelectedDivision(null);
          setSubView('list');
        }
      } catch (err) {
        console.error(err);
        setError('Could not load divisions. Please check if the backend is running.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, window.location.search, onNavigate]);

  // Handle setting edit form fields
  const enterEditMode = () => {
    if (!selectedDivision) return;
    setName(selectedDivision.name || '');
    setDivisionType(selectedDivision.divisionType || '');
    setDescription(selectedDivision.description || '');
    setStartDate(selectedDivision.startDate || '');
    setEndDate(selectedDivision.endDate || '');
    setGender(selectedDivision.gender || '');
    setAgeGroup(selectedDivision.ageGroup || 'Open to All');
    setMinSkillLevel(selectedDivision.minSkillLevel || '');
    setMaxSkillLevel(selectedDivision.maxSkillLevel || '');
    setMaxTeams(selectedDivision.maxTeams || '');
    setGroupCount(selectedDivision.groupCount || 1);
    setNumSets(selectedDivision.numSets || 3);
    setStatus(selectedDivision.status || 'active');
    
    setValidationErrors({});
    setFormError('');
    setSubView('edit');
  };

  // Handle setting create form fields
  const enterCreateMode = () => {
    setName('');
    setDivisionType('');
    setDescription('');
    setStartDate('');
    setEndDate('');
    setGender('');
    setAgeGroup('Open to All');
    setMinSkillLevel('');
    setMaxSkillLevel('');
    setMaxTeams('');
    setGroupCount(1);
    setNumSets(3);
    setStatus('active');
    
    setValidationErrors({});
    setFormError('');
    setSubView('create');
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Division Name is required';
    if (!divisionType) errors.divisionType = 'Division Type is required';
    if (!gender) errors.gender = 'Gender is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (startDate && endDate && startDate > endDate) {
      errors.endDate = 'End date cannot be earlier than start date';
    }
    if (!maxTeams) {
      errors.maxTeams = 'Max Teams is required';
    } else if (isNaN(maxTeams) || parseInt(maxTeams) <= 0) {
      errors.maxTeams = 'Max Teams must be a positive number';
    }
    if (!groupCount || isNaN(groupCount) || parseInt(groupCount) < 1) {
      errors.groupCount = 'Number of Groups must be at least 1';
    }
    if (minSkillLevel && maxSkillLevel && parseFloat(minSkillLevel) > parseFloat(maxSkillLevel)) {
      errors.skillLevel = 'Minimum skill level cannot be greater than maximum skill level';
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!validate()) return;

    setFormLoading(true);
    const payload = {
      tournamentId,
      name,
      divisionType,
      description,
      startDate,
      endDate,
      gender,
      ageGroup,
      minSkillLevel,
      maxSkillLevel,
      maxTeams: maxTeams ? parseInt(maxTeams) : null,
      groupCount: groupCount ? parseInt(groupCount) : 1,
      numSets: numSets ? parseInt(numSets) : 3,
      status
    };

    try {
      let response;
      if (subView === 'create') {
        response = await fetch(`${API_BASE_URL}/api/divisions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        // Check if groupCount is being reduced — warn user but submit ignoring the change
        if (selectedDivision && parseInt(groupCount) < (selectedDivision.groupCount || 1)) {
          alert('Group count cannot be reduced');
          payload.groupCount = selectedDivision.groupCount;
        }
        response = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivision.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }
      if (!response.ok) {
        throw new Error('Failed to save division details');
      }

      const savedDivision = await response.json();
      
      // Fetch updated divisions list to ensure the list state contains the new division
      try {
        const listResponse = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}/divisions`);
        if (listResponse.ok) {
          const listData = await listResponse.json();
          setDivisions(listData);
        }
      } catch (listErr) {
        console.error('Failed to update divisions list:', listErr);
      }

      if (subView === 'create') {
        setSuccessAlert(true);
      } else {
        setSelectedDivision(savedDivision);
        setSubView('detail');
        onNavigate('divisions', { tournamentId, divisionId: savedDivision.id });
      }
    } catch (err) {
      console.error(err);
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleRegenerateCode = async () => {
    if (!selectedDivision || !window.confirm("Are you sure you want to regenerate the guest access code for this division? Existing guests may need to enter the new code.")) return;
    try {
      setLoading(true);
      const resp = await fetch(`${API_BASE_URL}/api/divisions/${selectedDivision.id}/regenerate-code`, {
        method: 'POST'
      });
      if (resp.ok) {
        const data = await resp.json();
        setSelectedDivision({ ...selectedDivision, accessCode: data.accessCode });
        setDivisions(divisions.map(d => d.id === selectedDivision.id ? { ...d, accessCode: data.accessCode } : d));
        alert('Access code regenerated successfully.');
      } else {
        throw new Error('Failed to regenerate code');
      }
    } catch (err) {
      console.error(err);
      alert('Error regenerating access code');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="status-loading">
        <div className="spinner" aria-label="Loading divisions"></div>
        <span>Loading divisions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="home-container">
        <div className="status-toast error" style={{ marginTop: '1.5rem' }}>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="divisions-container">
      {/* Sub-view: LIST */}
      {subView === 'list' && (
        <div className="divisions-list-view">
          <header className="divisions-header">
            <div>
              <h1 className="divisions-title">Tournament Divisions</h1>
              <p className="divisions-subtitle">
                Browse match formats and classifications registered for this event.
              </p>
            </div>
            {isAdmin && (
              <button className="admin-btn edit-btn" onClick={enterCreateMode}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                New Division
              </button>
            )}
          </header>

          {divisions.length === 0 ? (
            <div className="no-divisions-card">
              <p>No divisions have been set up for this tournament yet.</p>
              {isAdmin && (
                <button className="back-btn" style={{ marginTop: '1rem' }} onClick={enterCreateMode}>
                  Create First Division
                </button>
              )}
            </div>
          ) : (
            <div className="divisions-grid">
              {divisions.map((div) => (
                <div 
                  key={div.id} 
                  className="division-card" 
                  onClick={() => onNavigate('divisions', { tournamentId, divisionId: div.id })}
                >
                  <div className="division-card-header">
                    <h3 className="division-card-name">{div.name}</h3>
                    <span className={`status-badge ${div.status?.toLowerCase() || 'active'}`}>
                      {div.status || 'active'}
                    </span>
                  </div>
                  <div className="division-card-dates">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', color: 'var(--text-muted)' }}>
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <span>{div.startDate} to {div.endDate}</span>
                  </div>
                  {(div.minSkillLevel || div.maxSkillLevel) && (
                    <span className="division-card-meta">
                      Skill Level: {div.minSkillLevel || 'Any'} - {div.maxSkillLevel || 'Any'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-view: DETAIL */}
      {subView === 'detail' && selectedDivision && (
        <div className="division-detail-view">
          <button className="back-btn" onClick={() => onNavigate('divisions', { tournamentId })}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Divisions List
          </button>

          <div className="details-card">
            <div className="division-details-top">
              <div>
                <h1 className="details-title" style={{ textAlign: 'left', margin: '4px 0 10px' }}>{selectedDivision.name}</h1>
              </div>
              {isAdmin && (
                <button className="admin-btn edit-btn" onClick={enterEditMode}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path>
                  </svg>
                  Edit Details
                </button>
              )}
            </div>

            <div className="details-grid" style={{ marginTop: '2rem' }}>
              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Division Type</span>
                  <span className="info-value">{selectedDivision.divisionType || 'Singles'}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12c0-2.5 1-4.8 2.7-6.4"></path>
                    <path d="M12 6V2"></path>
                    <path d="M12 22v-4"></path>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Gender</span>
                  <span className="info-value">{selectedDivision.gender || 'Open'}</span>
                </div>
              </div>

              {selectedDivision.description && (
                <div className="info-item" style={{ gridColumn: '1 / -1', alignItems: 'flex-start' }}>
                  <div className="info-icon-wrapper" style={{ marginTop: '3px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div className="info-content">
                    <span className="info-label">Description</span>
                    <span className="info-value" style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{selectedDivision.description}</span>
                  </div>
                </div>
              )}

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
                  <span className="info-label">Division Dates</span>
                  <span className="info-value">{selectedDivision.startDate} to {selectedDivision.endDate}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Age Group</span>
                  <span className="info-value">{selectedDivision.ageGroup || 'All Ages'}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Max Teams (per Group)</span>
                  <span className="info-value">{selectedDivision.maxTeams} Teams Max</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"></rect>
                    <rect x="14" y="3" width="7" height="7"></rect>
                    <rect x="3" y="14" width="7" height="7"></rect>
                    <rect x="14" y="14" width="7" height="7"></rect>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Number of Groups</span>
                  <span className="info-value">{selectedDivision.groupCount || 1}</span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Skill Level</span>
                  <span className="info-value">
                    {selectedDivision.minSkillLevel || 'Any'} to {selectedDivision.maxSkillLevel || 'Any'}
                  </span>
                </div>
              </div>

              <div className="info-item">
                <div className="info-icon-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                </div>
                <div className="info-content">
                  <span className="info-label">Status</span>
                  <span className="info-value" style={{ textTransform: 'capitalize' }}>{selectedDivision.status || 'active'}</span>
                </div>
              </div>

              {isAdmin && (
                <div className="info-item" style={{ gridColumn: '1 / -1', background: 'rgba(var(--primary-rgb), 0.05)', border: '1px solid rgba(var(--primary-rgb), 0.2)', borderRadius: '12px', padding: '1rem' }}>
                  <div className="info-icon-wrapper" style={{ color: 'var(--primary)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                  </div>
                  <div className="info-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexDirection: 'row' }}>
                    <div>
                      <span className="info-label" style={{ color: 'var(--primary)' }}>Guest Access Code</span>
                      <span className="info-value" style={{ fontFamily: 'monospace', fontSize: '1.25rem', letterSpacing: '4px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {selectedDivision.accessCode || 'Not Generated'}
                      </span>
                    </div>
                    <button className="admin-btn edit-btn" onClick={handleRegenerateCode} style={{ padding: '8px 16px', fontSize: '0.85rem', margin: 0, minHeight: 'auto' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="1 4 1 10 7 10"></polyline>
                        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                      </svg>
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sub-view: CREATE or EDIT Form */}
      {(subView === 'create' || subView === 'edit') && (
        <div className="division-form-view">
          <button 
            className="back-btn" 
            onClick={() => {
              if (subView === 'create') {
                setSubView('list');
              } else {
                setSubView('detail');
              }
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Cancel
          </button>

          <div className="form-card">
            <header className="form-header-section">
              <h1 className="form-title">
                {subView === 'create' ? 'Create New Division' : 'Edit Division Details'}
              </h1>
              <p className="form-subtitle">
                Configure competition constraints and date schedules below.
              </p>
            </header>

            {formError && (
              <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="tournament-editor-form" noValidate>
              <div className="form-group">
                <label htmlFor="divName" className="form-label">Division Name *</label>
                <input
                  id="divName"
                  type="text"
                  className={`form-input ${validationErrors.name ? 'error' : ''}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Men's Singles 4.0"
                  disabled={formLoading}
                  required
                />
                {validationErrors.name && <span className="error-text">{validationErrors.name}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Division Type *</label>
                <div className="radio-group" style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {['Singles', 'Doubles', 'Team'].map((type) => (
                    <label key={type} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="divisionType" 
                        value={type} 
                        checked={divisionType === type}
                        onChange={(e) => setDivisionType(e.target.value)}
                        disabled={formLoading}
                      />
                      {type}
                    </label>
                  ))}
                </div>
                {validationErrors.divisionType && <span className="error-text">{validationErrors.divisionType}</span>}
              </div>

              <div className="form-group">
                <label className="form-label">Gender *</label>
                <div className="radio-group" style={{ display: 'flex', gap: '15px', marginTop: '5px', flexWrap: 'wrap' }}>
                  {['Open', 'Male', 'Female', 'Mixed'].map((g) => (
                    <label key={g} className="radio-label" style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                      <input 
                        type="radio" 
                        name="gender" 
                        value={g} 
                        checked={gender === g}
                        onChange={(e) => setGender(e.target.value)}
                        disabled={formLoading}
                      />
                      {g}
                    </label>
                  ))}
                </div>
                {validationErrors.gender && <span className="error-text">{validationErrors.gender}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="divDesc" className="form-label">Description</label>
                <textarea
                  id="divDesc"
                  className="form-input form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Scoring format, requirements, etc..."
                  disabled={formLoading}
                  rows={3}
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="divStart" className="form-label">Start Date *</label>
                  <input
                    id="divStart"
                    type="date"
                    className={`form-input ${validationErrors.startDate ? 'error' : ''}`}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    disabled={formLoading}
                    required
                  />
                  {validationErrors.startDate && <span className="error-text">{validationErrors.startDate}</span>}
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="divEnd" className="form-label">End Date *</label>
                  <input
                    id="divEnd"
                    type="date"
                    className={`form-input ${validationErrors.endDate ? 'error' : ''}`}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={formLoading}
                    required
                  />
                  {validationErrors.endDate && <span className="error-text">{validationErrors.endDate}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label htmlFor="divAge" className="form-label">Age Group</label>
                  <select
                    id="divAge"
                    className="form-input form-select"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value)}
                    disabled={formLoading}
                  >
                    <option value="Under 18">Under 18</option>
                    <option value="18 to 40">18 to 40</option>
                    <option value="40 to 55">40 to 55</option>
                    <option value="Above 55">Above 55</option>
                    <option value="Open to All">Open to All</option>
                  </select>
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="divMax" className="form-label">Max Teams per Group *</label>
                  <input
                    id="divMax"
                    type="number"
                    className={`form-input ${validationErrors.maxTeams ? 'error' : ''}`}
                    value={maxTeams}
                    onChange={(e) => setMaxTeams(e.target.value)}
                    placeholder="e.g. 16"
                    disabled={formLoading}
                  />
                  {validationErrors.maxTeams && <span className="error-text">{validationErrors.maxTeams}</span>}
                </div>

                <div className="form-group flex-1">
                  <label htmlFor="divGroupCount" className="form-label">Number of Groups *</label>
                  <input
                    id="divGroupCount"
                    type="number"
                    min="1"
                    className={`form-input ${validationErrors.groupCount ? 'error' : ''}`}
                    value={groupCount}
                    onChange={(e) => setGroupCount(e.target.value)}
                    placeholder="e.g. 2"
                    disabled={formLoading}
                  />
                  {validationErrors.groupCount && <span className="error-text">{validationErrors.groupCount}</span>}
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>Groups will be named Group A, Group B, etc.</span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Skill Level</label>
                <div className="form-row">
                  <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                    <label htmlFor="minSkill" className="form-label" style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Minimum</label>
                    <select
                      id="minSkill"
                      className="form-input form-select"
                      value={minSkillLevel}
                      onChange={(e) => setMinSkillLevel(e.target.value)}
                      disabled={formLoading}
                    >
                      <option value="">Any</option>
                      {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => (
                        <option key={`min-${val}`} value={val.toFixed(1)}>{val.toFixed(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                    <label htmlFor="maxSkill" className="form-label" style={{ fontSize: '0.85em', color: 'var(--text-muted)' }}>Maximum</label>
                    <select
                      id="maxSkill"
                      className="form-input form-select"
                      value={maxSkillLevel}
                      onChange={(e) => setMaxSkillLevel(e.target.value)}
                      disabled={formLoading}
                    >
                      <option value="">Any</option>
                      {[1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0].map(val => (
                        <option key={`max-${val}`} value={val.toFixed(1)}>{val.toFixed(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {validationErrors.skillLevel && <span className="error-text">{validationErrors.skillLevel}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="divStatus" className="form-label">Status</label>
                <select
                  id="divStatus"
                  className="form-input form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  disabled={formLoading}
                >
                  <option value="active">Active</option>
                  <option value="upcoming">Upcoming</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="divNumSets" className="form-label">Number of Sets</label>
                <select
                  id="divNumSets"
                  className="form-input form-select"
                  value={numSets}
                  onChange={(e) => setNumSets(parseInt(e.target.value))}
                  disabled={formLoading}
                >
                  <option value={3}>3 Sets (Best of 3)</option>
                  <option value={4}>4 Sets (with Singles Set)</option>
                </select>
              </div>

              <div className="form-actions-row">
                <button
                  type="button"
                  className="form-cancel-btn"
                  onClick={() => {
                    if (subView === 'create') {
                      setSubView('list');
                    } else {
                      setSubView('detail');
                    }
                  }}
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="submit-btn"
                  style={{ marginTop: 0, flex: 1 }}
                  disabled={formLoading}
                >
                  {formLoading ? (
                    <div className="spinner" aria-label="Saving details" />
                  ) : subView === 'create' ? (
                    'Create Division'
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {successAlert && (
        <div className="custom-alert-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div className="custom-alert-box" style={{ background: '#fff', padding: '30px 40px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', textAlign: 'center', minWidth: '350px' }}>
            <h3 style={{ marginTop: 0, color: '#16a34a', fontSize: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              Success
            </h3>
            <p style={{ margin: '20px 0 25px', color: '#4b5563', fontSize: '18px', fontWeight: '500' }}>Division created successfully!</p>
            <button 
              onClick={() => {
                setSuccessAlert(false);
                setSubView('list');
                onNavigate('divisions', { tournamentId });
              }}
              style={{ padding: '12px 32px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'background-color 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              Ok
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
