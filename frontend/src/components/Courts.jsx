import { useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

export default function Courts({ user, onNavigate }) {
  const [courts, setCourts] = useState([]);
  const [newCourtName, setNewCourtName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [editingCourtId, setEditingCourtId] = useState(null);
  const [editCourtName, setEditCourtName] = useState('');

  useEffect(() => {
    fetchCourts();
  }, []);

  const fetchCourts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/courts`);
      const data = await response.json();
      setCourts(data);
    } catch (err) {
      console.error('Failed to fetch courts', err);
    }
  };

  const handleAddCourt = async () => {
    const trimmedName = newCourtName.trim();
    if (!trimmedName) {
      setErrorMsg('Court name cannot be empty.');
      return;
    }

    if (courts.some(c => c.courtName.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg('Court name exists already!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/courts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtName: trimmedName })
      });

      if (response.ok) {
        setNewCourtName('');
        setErrorMsg('');
        fetchCourts();
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Failed to add court');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while adding the court.');
    }
  };

  const startEditing = (court) => {
    setEditingCourtId(court.id);
    setEditCourtName(court.courtName);
    setErrorMsg('');
  };

  const cancelEditing = () => {
    setEditingCourtId(null);
    setEditCourtName('');
    setErrorMsg('');
  };

  const saveEdit = async (id) => {
    const trimmedName = editCourtName.trim();
    if (!trimmedName) {
      setErrorMsg('Court name cannot be empty.');
      return;
    }

    if (courts.some(c => c.id !== id && c.courtName.toLowerCase() === trimmedName.toLowerCase())) {
      setErrorMsg('Court name exists already!');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/courts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courtName: trimmedName })
      });

      if (response.ok) {
        setEditingCourtId(null);
        setEditCourtName('');
        setErrorMsg('');
        fetchCourts();
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Failed to update court');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while updating the court.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure want to delete the court?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/courts/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchCourts();
      } else {
        setErrorMsg('Failed to delete the court.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while deleting the court.');
    }
  };

  return (
    <div className="divisions-container">
      <header className="header-section" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 className="title">Manage Courts</h1>
          <p className="subtitle">Add, edit, or remove courts.</p>
        </div>
      </header>

      {errorMsg && (
        <div className="status-toast error" style={{ position: 'relative', marginBottom: '1rem', top: 0, transform: 'none' }}>
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="form-card" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '2rem', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', maxWidth: '600px' }}>
          <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
            <label className="form-label" style={{ textAlign: 'left', display: 'block' }}>Court Name</label>
            <input 
              type="text" 
              className="form-input" 
              style={{ width: '100%', minHeight: '48px' }}
              value={newCourtName}
              onChange={(e) => setNewCourtName(e.target.value)}
              placeholder="e.g. Center Court"
            />
          </div>
          <button className="submit-btn" style={{ minHeight: '48px', padding: '0 1.5rem', whiteSpace: 'nowrap', marginTop: 0 }} onClick={handleAddCourt}>
            Add New Court
          </button>
        </div>
      </div>

      <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
        <h2 className="section-title" style={{ fontFamily: 'var(--font-title)', fontSize: '1.5rem', fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem', display: 'inline-block', width: '100%' }}>
          Available Courts
        </h2>
      </div>

      <div className="courts-grid" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {courts.map(court => (
          <div key={court.id} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.25s' }}>
            {editingCourtId === court.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  value={editCourtName}
                  onChange={(e) => setEditCourtName(e.target.value)}
                  style={{ flex: 1, marginBottom: 0, minHeight: '44px' }}
                />
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="submit-btn" onClick={() => saveEdit(court.id)} style={{ padding: '0 1.25rem', minHeight: '44px', marginTop: 0 }}>Save</button>
                  <button className="form-cancel-btn" onClick={cancelEditing} style={{ padding: '0 1.25rem', minHeight: '44px' }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '10px', borderRadius: '12px', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="12" y1="3" x2="12" y2="21"></line>
                      <line x1="3" y1="12" x2="21" y2="12"></line>
                    </svg>
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: '600', color: 'var(--text-primary)' }}>{court.courtName}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => startEditing(court)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'} aria-label="Edit Court">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                  </button>
                  <button onClick={() => handleDelete(court.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '8px', transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-error)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'} aria-label="Delete Court">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {courts.length === 0 && (
          <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--glass-border)', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No courts available.
          </div>
        )}
      </div>
    </div>
  );
}
