import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import './GuestAccessModal.css';

export default function GuestAccessModal({ isOpen, expectedDivisionId, onVerify, onCancel }) {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [divisionInfo, setDivisionInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCode('');
      setError(null);
      setDivisionInfo(null);
      setPlayers([]);
      setSelectedPlayerId('');
    }
  }, [isOpen]);

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/divisions/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });
      
      if (response.status === 429) {
        setError('Too many attempts. Please try again later.');
        return;
      }
      
      if (!response.ok) {
        setError('Invalid access code. Please check with your administrator.');
        return;
      }
      
      const data = await response.json();
      
      if (expectedDivisionId && data.divisionId.toString() !== expectedDivisionId.toString()) {
        setError('This code is for a different division. Please enter the correct code.');
        return;
      }
      
      setDivisionInfo(data);
      
      // Fetch players
      const playersRes = await fetch(`${API_BASE_URL}/api/divisions/${data.divisionId}/players`);
      if (playersRes.ok) {
        const playersData = await playersRes.json();
        // deduplicate players by id if needed
        const uniquePlayersMap = new Map();
        playersData.forEach(p => uniquePlayersMap.set(p.id, p));
        const uniquePlayers = Array.from(uniquePlayersMap.values());
        
        // Sort alphabetically by first name
        uniquePlayers.sort((a, b) => (a.firstName || '').localeCompare(b.firstName || ''));
        
        setPlayers(uniquePlayers);
        setStep(2);
      } else {
        setError('Failed to load players for this division.');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlayer = (e) => {
    e.preventDefault();
    if (!selectedPlayerId) {
      setError('Please select who you are.');
      return;
    }
    
    let playerId = null;
    let playerName = 'Team Captain / Manager';
    
    if (selectedPlayerId !== 'other') {
      const player = players.find(p => p.id.toString() === selectedPlayerId.toString());
      if (player) {
        playerId = player.id;
        playerName = `${player.firstName} ${player.lastName}`;
      }
    }
    
    onVerify({
      divisionId: divisionInfo.divisionId,
      divisionName: divisionInfo.divisionName,
      tournamentId: divisionInfo.tournamentId,
      playerId,
      playerName
    });
  };

  if (!isOpen) return null;

  return (
    <div className="guest-modal-overlay">
      <div className="guest-modal-content">
        {onCancel && (
          <button className="guest-modal-close" onClick={onCancel} aria-label="Close modal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
        
        {step === 1 && (
          <form onSubmit={handleVerifyCode}>
            <div className="guest-modal-header">
              <h2><span role="img" aria-label="key">🔑</span> Division Access</h2>
              <p>Enter the 5-character access code provided by the tournament administrator.</p>
            </div>
            
            <div className="guest-form-group">
              <input
                type="text"
                className="guest-code-input"
                placeholder="e.g. AB1C2"
                maxLength={5}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                autoFocus
                disabled={loading}
              />
            </div>
            
            {error && <div className="guest-error-msg">{error}</div>}
            
            <button type="submit" className="guest-submit-btn" disabled={loading || code.length === 0}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>
        )}
        
        {step === 2 && divisionInfo && (
          <form onSubmit={handleSelectPlayer}>
            <div className="guest-modal-header">
              <h2><span role="img" aria-label="check">✅</span> Code Verified</h2>
              <p>You have access to edit matches in <strong>{divisionInfo.divisionName}</strong>.</p>
            </div>
            
            <div className="guest-form-group">
              <label>Select Your Name</label>
              <select 
                className="guest-player-select"
                value={selectedPlayerId}
                onChange={(e) => setSelectedPlayerId(e.target.value)}
                disabled={loading}
              >
                <option value="" disabled>Select your name...</option>
                {players.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.firstName} {p.lastName} ({p.participantName})
                  </option>
                ))}
                <option value="other">Other / Team Manager</option>
              </select>
            </div>
            
            {error && <div className="guest-error-msg">{error}</div>}
            
            <button type="submit" className="guest-submit-btn" disabled={!selectedPlayerId}>
              Enter Matches
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
