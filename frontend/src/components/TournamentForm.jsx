import { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

export default function TournamentForm({ mode, tournamentId, onNavigate, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState('active');
  const [thumbnailUrl, setThumbnailUrl] = useState(''); // Stores URL from database (if editing)
  
  // File upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // If in edit mode, fetch existing details
  useEffect(() => {
    if (mode === 'edit' && tournamentId) {
      const fetchTournament = async () => {
        try {
          setFetching(true);
          const response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`);
          if (!response.ok) {
            throw new Error('Failed to load tournament data');
          }
          const data = await response.json();
          setTitle(data.title || '');
          setDescription(data.description || '');
          setStartDate(data.startDate || '');
          setEndDate(data.endDate || '');
          setStartTime(data.startTime || '');
          setEndTime(data.endTime || '');
          setOrganizer(data.organizer || '');
          setEmail(data.email || '');
          setPhone(data.phone || '');
          setStatus(data.status || 'active');
          setThumbnailUrl(data.thumbnail || '');
          setPreviewUrl(data.thumbnail || '');
        } catch (err) {
          console.error(err);
          setSubmitError('Failed to load tournament details for editing.');
        } finally {
          setFetching(false);
        }
      };
      fetchTournament();
    }
  }, [mode, tournamentId]);

  // Clean up object URL to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Create local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    }
  };

  // Generate modern gradient SVG/Canvas image if no thumbnail is selected
  const generatePlaceholderBlob = (tournamentTitle) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 400;
      const ctx = canvas.getContext('2d');

      // Modern gradients
      const gradients = [
        ['#4f46e5', '#818cf8'], // Indigo
        ['#0d9488', '#2dd4bf'], // Teal
        ['#e11d48', '#fb7185'], // Rose
        ['#0891b2', '#22d3ee'], // Cyan
        ['#65a30d', '#a3e635']  // Lime/Pickleball
      ];

      // Pick index based on title characters
      let charSum = 0;
      for (let i = 0; i < tournamentTitle.length; i++) {
        charSum += tournamentTitle.charCodeAt(i);
      }
      const colorPair = gradients[charSum % gradients.length];

      // Draw background gradient
      const grad = ctx.createLinearGradient(0, 0, 400, 400);
      grad.addColorStop(0, colorPair[0]);
      grad.addColorStop(1, colorPair[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 400, 400);

      // Subtle abstract overlay circle
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(200, 200, 160, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.arc(200, 200, 100, 0, Math.PI * 2);
      ctx.fill();

      // Get Initials
      const words = tournamentTitle.trim().split(/\s+/);
      const initials = words.slice(0, 2).map(w => w[0] || '').join('').toUpperCase();

      // Draw Initials
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 84px Outfit, Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials || 'TT', 200, 180);

      // Draw Subtitle (truncated if too long)
      ctx.font = '500 20px Inter, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      const displayTitle = tournamentTitle.length > 22 ? tournamentTitle.substring(0, 19) + '...' : tournamentTitle;
      ctx.fillText(displayTitle, 200, 260);

      canvas.toBlob((blob) => {
        resolve(blob);
      }, 'image/png');
    });
  };

  const uploadFile = async (fileObj) => {
    const formData = new FormData();
    formData.append('file', fileObj);

    const response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error('Image upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  const validate = () => {
    const errors = {};
    
    if (!title.trim()) errors.title = 'Title is required';
    if (!startDate) errors.startDate = 'Start date is required';
    if (!endDate) errors.endDate = 'End date is required';
    if (startDate && endDate && startDate > endDate) {
      errors.endDate = 'End date cannot be earlier than start date';
    }
    
    if (!organizer.trim()) errors.organizer = 'Organizer is required';
    
    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Invalid email address';
    }
    
    if (!phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[0-9\s\-()]{7,18}$/.test(phone)) {
      errors.phone = 'Invalid phone number format';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      let finalThumbnail = thumbnailUrl;

      // Handle thumbnail uploading/creation
      if (selectedFile) {
        // User selected a custom image
        finalThumbnail = await uploadFile(selectedFile);
      } else if (!thumbnailUrl && mode === 'create') {
        // No thumbnail selected in create mode -> generate one automatically
        const generatedBlob = await generatePlaceholderBlob(title);
        const generatedFile = new File([generatedBlob], 'autogenerated-thumbnail.png', { type: 'image/png' });
        finalThumbnail = await uploadFile(generatedFile);
      }

      // Format times to HH:mm:ss if present
      const formattedStartTime = startTime ? (startTime.length === 5 ? startTime + ':00' : startTime) : null;
      const formattedEndTime = endTime ? (endTime.length === 5 ? endTime + ':00' : endTime) : null;

      const payload = {
        title,
        description,
        startDate,
        endDate,
        startTime: formattedStartTime,
        endTime: formattedEndTime,
        organizer,
        email,
        phone,
        status,
        thumbnail: finalThumbnail
      };

      let response;
      if (mode === 'create') {
        response = await fetch(`${API_BASE_URL}/api/tournaments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/tournaments/${tournamentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (!response.ok) {
        throw new Error('Failed to save tournament details');
      }

      const savedTournament = await response.json();
      
      // Redirect to tour-details page of the tournament
      onNavigate('tour-details', { id: savedTournament.id });

    } catch (err) {
      console.error(err);
      setSubmitError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="status-loading">
        <div className="spinner" aria-label="Loading data"></div>
        <span>Loading tournament data...</span>
      </div>
    );
  }

  return (
    <div className="form-container">
      <div className="form-card">
        <header className="form-header-section">
          <h1 className="form-title">
            {mode === 'create' ? 'Create New Tournament' : 'Edit Tournament Details'}
          </h1>
          <p className="form-subtitle">
            {mode === 'create' 
              ? 'Fill in the information below to register a new competition.' 
              : 'Modify the tournament attributes and save updates.'}
          </p>
        </header>

        {submitError && (
          <div className="status-toast error" style={{ marginBottom: '1.5rem', marginTop: 0 }}>
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="tournament-editor-form" noValidate>
          {/* Title */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">Tournament Title *</label>
            <input
              id="title"
              type="text"
              className={`form-input ${validationErrors.title ? 'error' : ''}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Summer Pickleball Open"
              disabled={loading}
              required
            />
            {validationErrors.title && <span className="error-text">{validationErrors.title}</span>}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description" className="form-label">Description</label>
            <textarea
              id="description"
              className="form-input form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Write a brief overview of the tournament..."
              disabled={loading}
              rows={4}
            />
          </div>

          {/* Dates Row */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="startDate" className="form-label">Start Date *</label>
              <input
                id="startDate"
                type="date"
                className={`form-input ${validationErrors.startDate ? 'error' : ''}`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
                required
              />
              {validationErrors.startDate && <span className="error-text">{validationErrors.startDate}</span>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="endDate" className="form-label">End Date *</label>
              <input
                id="endDate"
                type="date"
                className={`form-input ${validationErrors.endDate ? 'error' : ''}`}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={loading}
                required
              />
              {validationErrors.endDate && <span className="error-text">{validationErrors.endDate}</span>}
            </div>
          </div>

          {/* Times Row */}
          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="startTime" className="form-label">Daily Start Time</label>
              <input
                id="startTime"
                type="time"
                className="form-input"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group flex-1">
              <label htmlFor="endTime" className="form-label">Daily End Time</label>
              <input
                id="endTime"
                type="time"
                className="form-input"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          {/* Contact Details Grid */}
          <div className="form-group">
            <label htmlFor="organizer" className="form-label">Organizer Name *</label>
            <input
              id="organizer"
              type="text"
              className={`form-input ${validationErrors.organizer ? 'error' : ''}`}
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="e.g. John Doe"
              disabled={loading}
              required
            />
            {validationErrors.organizer && <span className="error-text">{validationErrors.organizer}</span>}
          </div>

          <div className="form-row">
            <div className="form-group flex-1">
              <label htmlFor="email" className="form-label">Contact Email *</label>
              <input
                id="email"
                type="email"
                className={`form-input ${validationErrors.email ? 'error' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="organizer@example.com"
                disabled={loading}
                required
              />
              {validationErrors.email && <span className="error-text">{validationErrors.email}</span>}
            </div>

            <div className="form-group flex-1">
              <label htmlFor="phone" className="form-label">Contact Phone *</label>
              <input
                id="phone"
                type="tel"
                className={`form-input ${validationErrors.phone ? 'error' : ''}`}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 019-2834"
                disabled={loading}
                required
              />
              {validationErrors.phone && <span className="error-text">{validationErrors.phone}</span>}
            </div>
          </div>

          {/* Status & Thumbnail Row */}
          <div className="form-row align-end">
            <div className="form-group flex-1">
              <label htmlFor="status" className="form-label">Tournament Status</label>
              <select
                id="status"
                className="form-input form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={loading}
              >
                <option value="active">Active</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div className="form-group flex-1">
              <label className="form-label">Thumbnail Image</label>
              <button
                type="button"
                className="custom-file-upload-btn"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={loading}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="17 8 12 3 7 8"></polyline>
                  <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                {selectedFile ? 'Change File' : 'Upload Image'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Image Preview Box */}
          {previewUrl && (
            <div className="form-image-preview-wrapper">
              <span className="info-label" style={{ marginBottom: '8px', display: 'block' }}>Thumbnail Preview</span>
              <div className="form-image-preview-box">
                <img src={previewUrl} alt="Thumbnail preview" />
                <button
                  type="button"
                  className="remove-preview-btn"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(thumbnailUrl || '');
                  }}
                  disabled={loading || previewUrl === thumbnailUrl}
                  title="Restore Original"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                    <polyline points="3 3 3 8 8 8"></polyline>
                  </svg>
                </button>
              </div>
            </div>
          )}

          {!previewUrl && (
            <div className="placeholder-info-box">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary)' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span>If no image is uploaded, a custom gradient tile with initials will be generated automatically.</span>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions-row">
            <button
              type="button"
              className="form-cancel-btn"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-btn"
              style={{ marginTop: 0, flex: 1 }}
              disabled={loading}
            >
              {loading ? (
                <div className="spinner" aria-label="Saving details" />
              ) : mode === 'create' ? (
                'Create Tournament'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
