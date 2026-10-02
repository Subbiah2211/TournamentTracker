import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../config';

const VALID_SKILL_LEVELS = ['1.0', '1.5', '2.0', '2.5', '3.0', '3.5', '4.0', '4.5', '5.0'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminPlayers({ user, onNavigate }) {
  // Navigation / Tab state: 'add' (Single / Bulk) | 'directory'
  const [activeTab, setActiveTab] = useState('add');

  // Master players list
  const [players, setPlayers] = useState([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Single player form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [skillLevel, setSkillLevel] = useState('3.0');
  const [formLoading, setFormLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [successToast, setSuccessToast] = useState('');
  const [errorToast, setErrorToast] = useState('');

  // Bulk upload state
  const fileInputRef = useRef(null);
  const errorSectionRef = useRef(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [validationReport, setValidationReport] = useState(null); // { valid: boolean, errors: [], players: [], totalRows: 0 }
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isSubmittingBulk, setIsSubmittingBulk] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch all players on mount
  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    setLoadingPlayers(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/players`);
      if (res.ok) {
        const data = await res.json();
        // Sort descending by id so newly added players show first
        data.sort((a, b) => (b.id || 0) - (a.id || 0));
        setPlayers(data);
      }
    } catch (err) {
      console.error('Failed to fetch players', err);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const showNotification = (msg, isError = false) => {
    if (isError) {
      setErrorToast(msg);
      setTimeout(() => setErrorToast(''), 5000);
    } else {
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(''), 4000);
    }
  };

  const scrollToErrors = () => {
    setTimeout(() => {
      if (errorSectionRef.current) {
        errorSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Set focus for accessibility and keyboard navigation
        errorSectionRef.current.focus?.({ preventScroll: true });
      }
    }, 120);
  };

  // ----------------------------------------------------------------------
  // Single Player Submission
  // ----------------------------------------------------------------------
  const validateSinglePlayer = () => {
    const errors = {};
    if (!firstName.trim()) errors.firstName = 'First Name is required';
    if (!lastName.trim()) errors.lastName = 'Last Name is required';
    if (!email.trim()) {
      errors.email = 'Email Address is required';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    } else if (players.some(p => p.email && p.email.toLowerCase() === email.trim().toLowerCase())) {
      errors.email = 'A player with this email already exists in the system';
    }

    if (age.trim()) {
      const parsedAge = parseInt(age.trim(), 10);
      if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
        errors.age = 'Age must be a valid number between 1 and 120';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      showNotification(firstError, true);
    }
    return Object.keys(errors).length === 0;
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    if (!validateSinglePlayer()) return;

    setFormLoading(true);
    setErrorToast('');

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone.trim() || null,
      gender: gender || null,
      age: age.trim() || null,
      skillLevel: skillLevel || '3.0'
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        // Non-JSON response
      }

      if (res.ok && data.success) {
        showNotification(`Player "${payload.firstName} ${payload.lastName}" added successfully!`);
        // Reset form
        setFirstName('');
        setLastName('');
        setEmail('');
        setPhone('');
        setGender('');
        setAge('');
        setSkillLevel('3.0');
        setFormErrors({});
        fetchPlayers();
      } else {
        const errorMsg = data.message 
          || data.detail 
          || data.error 
          || data.title 
          || (res.status === 405 ? 'Request method POST is not supported. Please restart the backend server so the new endpoint is loaded.' : `Server error (${res.status}): ${res.statusText || 'Failed to add player'}`);
        
        showNotification(errorMsg, true);

        // Highlight offending field if mentioned
        const lowerErr = errorMsg.toLowerCase();
        if (lowerErr.includes('email')) {
          setFormErrors(prev => ({ ...prev, email: errorMsg }));
        }
        if (lowerErr.includes('first name')) {
          setFormErrors(prev => ({ ...prev, firstName: errorMsg }));
        }
        if (lowerErr.includes('last name')) {
          setFormErrors(prev => ({ ...prev, lastName: errorMsg }));
        }
        if (lowerErr.includes('age')) {
          setFormErrors(prev => ({ ...prev, age: errorMsg }));
        }
        if (lowerErr.includes('gender')) {
          setFormErrors(prev => ({ ...prev, gender: errorMsg }));
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('A network error occurred while adding the player. Please verify the backend is running.', true);
    } finally {
      setFormLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Sample Excel Template Generator
  // ----------------------------------------------------------------------
  const handleDownloadTemplate = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Gender',
      'Age',
      'Skill Level'
    ];

    const sampleData = [
      ['Alex', 'Morgan', 'alex.morgan@example.com', '555-0101', 'Female', 28, '3.5'],
      ['David', 'Smith', 'david.smith@example.com', '555-0102', 'Male', 34, '4.0'],
      ['Taylor', 'Swift', 'taylor.swift@example.com', '555-0103', 'Female', 31, '3.0']
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);

    // Format column widths for great usability
    ws['!cols'] = [
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 28 }, // Email
      { wch: 16 }, // Phone
      { wch: 12 }, // Gender
      { wch: 10 }, // Age
      { wch: 14 }  // Skill Level
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Players');
    XLSX.writeFile(wb, 'Players_Upload_Template.xlsx');
  };

  // ----------------------------------------------------------------------
  // Bulk Excel Upload & In-Depth Validation
  // ----------------------------------------------------------------------
  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setIsProcessingFile(true);
    setValidationReport(null);
    setShowConfirmModal(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Parse as raw 2D array to preserve exact row indices
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rows || rows.length <= 1) {
          setValidationReport({
            valid: false,
            errors: [{ row: 1, field: 'File Content', value: '', message: 'The uploaded file is empty or only contains headers.' }],
            players: [],
            totalRows: 0
          });
          showNotification('The uploaded file is empty or only contains headers.', true);
          scrollToErrors();
          setIsProcessingFile(false);
          return;
        }

        // Validate headers row (Row 1)
        const headerRow = rows[0].map(h => String(h || '').trim().toLowerCase());
        const findColIndex = (names, fallbackIndex) => {
          for (let name of names) {
            const idx = headerRow.findIndex(h => h.includes(name.toLowerCase()));
            if (idx !== -1) return idx;
          }
          return fallbackIndex;
        };

        const firstNameCol = findColIndex(['first name', 'firstname', 'first'], 0);
        const lastNameCol = findColIndex(['last name', 'lastname', 'last'], 1);
        const emailCol = findColIndex(['email', 'email address'], 2);
        const phoneCol = findColIndex(['phone', 'contact number', 'mobile'], 3);
        const genderCol = findColIndex(['gender', 'sex'], 4);
        const ageCol = findColIndex(['age'], 5);
        const skillCol = findColIndex(['skill level', 'skill', 'rating'], 6);

        const errors = [];
        const parsedPlayers = [];
        const seenEmailsInFile = new Map();
        const existingEmailsSet = new Set(players.map(p => (p.email || '').toLowerCase().trim()));

        let dataRowCount = 0;

        for (let r = 1; r < rows.length; r++) {
          const rowData = rows[r];
          // Skip completely empty lines
          if (!rowData || rowData.every(c => String(c).trim() === '')) {
            continue;
          }

          dataRowCount++;
          const rowNum = r + 1; // 1-based Excel row number

          const rawFirstName = String(rowData[firstNameCol] ?? '').trim();
          const rawLastName = String(rowData[lastNameCol] ?? '').trim();
          const rawEmail = String(rowData[emailCol] ?? '').trim();
          const rawPhone = String(rowData[phoneCol] ?? '').trim();
          const rawGender = String(rowData[genderCol] ?? '').trim();
          const rawAge = String(rowData[ageCol] ?? '').trim();
          const rawSkill = String(rowData[skillCol] ?? '').trim();

          // 1. Validate First Name
          if (!rawFirstName) {
            errors.push({
              row: rowNum,
              field: 'First Name',
              value: 'EMPTY',
              message: 'First Name is missing'
            });
          }

          // 2. Validate Last Name
          if (!rawLastName) {
            errors.push({
              row: rowNum,
              field: 'Last Name',
              value: 'EMPTY',
              message: 'Last Name is missing'
            });
          }

          // 3. Validate Email
          if (!rawEmail) {
            errors.push({
              row: rowNum,
              field: 'Email',
              value: 'EMPTY',
              message: 'Email address is missing'
            });
          } else {
            const lowerEmail = rawEmail.toLowerCase();
            if (!EMAIL_REGEX.test(rawEmail)) {
              errors.push({
                row: rowNum,
                field: 'Email',
                value: rawEmail,
                message: 'Invalid email format'
              });
            } else if (seenEmailsInFile.has(lowerEmail)) {
              errors.push({
                row: rowNum,
                field: 'Email',
                value: rawEmail,
                message: `Duplicate email (previously seen on Row ${seenEmailsInFile.get(lowerEmail)})`
              });
            } else if (existingEmailsSet.has(lowerEmail)) {
              errors.push({
                row: rowNum,
                field: 'Email',
                value: rawEmail,
                message: 'A player with this email already exists in the database'
              });
            } else {
              seenEmailsInFile.set(lowerEmail, rowNum);
            }
          }

          // 4. Validate Gender (optional)
          let standardizedGender = null;
          if (rawGender) {
            const gLower = rawGender.toLowerCase();
            if (gLower === 'male' || gLower === 'm') {
              standardizedGender = 'Male';
            } else if (gLower === 'female' || gLower === 'f') {
              standardizedGender = 'Female';
            } else {
              errors.push({
                row: rowNum,
                field: 'Gender',
                value: rawGender,
                message: "Must be 'Male' or 'Female' (or blank)"
              });
            }
          }

          // 5. Validate Age (optional)
          let standardizedAge = null;
          if (rawAge) {
            const parsedAge = parseInt(rawAge, 10);
            if (isNaN(parsedAge) || parsedAge <= 0 || parsedAge > 120) {
              errors.push({
                row: rowNum,
                field: 'Age',
                value: rawAge,
                message: 'Age must be a positive integer between 1 and 120'
              });
            } else {
              standardizedAge = String(parsedAge);
            }
          }

          // 6. Validate Skill Level (optional, defaults to 3.0)
          let standardizedSkill = '3.0';
          if (rawSkill) {
            const numSkill = parseFloat(rawSkill);
            if (isNaN(numSkill) || numSkill < 1.0 || numSkill > 5.0) {
              errors.push({
                row: rowNum,
                field: 'Skill Level',
                value: rawSkill,
                message: 'Skill level must be between 1.0 and 5.0'
              });
            } else {
              standardizedSkill = numSkill.toFixed(1);
            }
          }

          // Add to parsed batch
          parsedPlayers.push({
            rowNumber: rowNum,
            firstName: rawFirstName,
            lastName: rawLastName,
            email: rawEmail,
            phone: rawPhone || null,
            gender: standardizedGender,
            age: standardizedAge,
            skillLevel: standardizedSkill
          });
        }

        const isValid = errors.length === 0 && dataRowCount > 0;
        setValidationReport({
          valid: isValid,
          errors,
          players: parsedPlayers,
          totalRows: dataRowCount
        });

        if (isValid) {
          setShowConfirmModal(true);
        } else {
          showNotification(`Validation failed: ${errors.length} issue(s) detected in "${file.name}". Shifted focus to error details below.`, true);
          scrollToErrors();
        }
      } catch (err) {
        console.error('Excel parse error', err);
        setValidationReport({
          valid: false,
          errors: [{ row: 1, field: 'Excel Parser', value: file.name, message: 'Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.' }],
          players: [],
          totalRows: 0
        });
        showNotification('Failed to read Excel file. Please ensure it is a valid .xlsx or .xls file.', true);
        scrollToErrors();
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const handleConfirmBulkUpload = async () => {
    if (!validationReport || !validationReport.valid || validationReport.players.length === 0) return;

    setIsSubmittingBulk(true);
    setErrorToast('');

    // Clean payload for backend
    const payload = validationReport.players.map(p => ({
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email.trim().toLowerCase(),
      phone: p.phone,
      gender: p.gender,
      age: p.age,
      skillLevel: p.skillLevel
    }));

    try {
      const res = await fetch(`${API_BASE_URL}/api/players/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showNotification(`Success! ${data.count} players added to the database.`);
        setShowConfirmModal(false);
        setValidationReport(null);
        setUploadFileName('');
        fetchPlayers();
      } else {
        showNotification(data.message || 'Bulk upload failed on server validation.', true);
        if (data.errors && data.errors.length > 0) {
          setValidationReport({
            valid: false,
            errors: data.errors,
            players: validationReport.players,
            totalRows: validationReport.totalRows
          });
          setShowConfirmModal(false);
          scrollToErrors();
        }
      }
    } catch (err) {
      console.error(err);
      showNotification('A network error occurred during bulk upload.', true);
    } finally {
      setIsSubmittingBulk(false);
    }
  };

  // Filtered players directory
  const filteredPlayers = players.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const fullName = `${p.firstName || ''} ${p.lastName || ''}`.toLowerCase();
    const emailStr = (p.email || '').toLowerCase();
    const phoneStr = (p.phone || '').toLowerCase();
    const skillStr = (p.skillLevel || '').toLowerCase();
    return fullName.includes(q) || emailStr.includes(q) || phoneStr.includes(q) || skillStr.includes(q);
  });

  return (
    <div className="divisions-container" style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Toast Notifications */}
      {successToast && (
        <div className="status-toast success" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{successToast}</span>
        </div>
      )}

      {errorToast && (
        <div className="status-toast error" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{errorToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="divisions-header" style={{ alignItems: 'center' }}>
        <div>
          <h1 className="divisions-title">Add / Upload Players</h1>
          <p className="divisions-subtitle">
            Create standalone players or bulk import players via Excel without assigning them to a tournament division.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className={`admin-btn ${activeTab === 'add' ? 'active-btn' : ''}`}
            onClick={() => setActiveTab('add')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <line x1="19" y1="8" x2="19" y2="14"></line>
              <line x1="22" y1="11" x2="16" y2="11"></line>
            </svg>
            Add & Upload
          </button>
          <button 
            className={`admin-btn ${activeTab === 'directory' ? 'active-btn' : ''}`}
            onClick={() => setActiveTab('directory')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            Directory ({players.length})
          </button>
        </div>
      </div>

      {activeTab === 'add' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Top Section: Split Card - Left: Single Player Form, Right: Bulk Upload Excel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.75rem', alignItems: 'start' }}>
            
            {/* CARD 1: Add Singles Player (Minimal Fields) */}
            <div className="form-card" style={{ margin: 0 }}>
              <header className="form-header-section" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--primary-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                  </div>
                  <div>
                    <h2 className="form-title" style={{ fontSize: '1.4rem' }}>Add Single Player</h2>
                    <p className="form-subtitle" style={{ fontSize: '0.85rem' }}>Enter minimal player details to save directly into master players database.</p>
                  </div>
                </div>
              </header>

              <form onSubmit={handleSingleSubmit} className="tournament-editor-form" noValidate>
                {/* Name Fields */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="adminFirstName" className="form-label">
                      First Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="adminFirstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. John"
                      className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {formErrors.firstName && <span className="error-text">{formErrors.firstName}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="adminLastName" className="form-label">
                      Last Name <span className="required-star">*</span>
                    </label>
                    <input
                      id="adminLastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Doe"
                      className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {formErrors.lastName && <span className="error-text">{formErrors.lastName}</span>}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="adminEmail" className="form-label">
                      Email Address <span className="required-star">*</span>
                    </label>
                    <input
                      id="adminEmail"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. john.doe@example.com"
                      className={`form-input ${formErrors.email ? 'error' : ''}`}
                      disabled={formLoading}
                      required
                    />
                    {formErrors.email && <span className="error-text">{formErrors.email}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="adminPhone" className="form-label">Phone Number</label>
                    <input
                      id="adminPhone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. (555) 012-3456"
                      className="form-input"
                      disabled={formLoading}
                    />
                  </div>
                </div>

                {/* Gender, Age, Skill Level */}
                <div className="form-row">
                  <div className="form-group flex-1">
                    <label htmlFor="adminGender" className="form-label">Gender</label>
                    <select
                      id="adminGender"
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="form-input form-select"
                      disabled={formLoading}
                    >
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="adminAge" className="form-label">Age</label>
                    <input
                      id="adminAge"
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="e.g. 28"
                      className={`form-input ${formErrors.age ? 'error' : ''}`}
                      disabled={formLoading}
                    />
                    {formErrors.age && <span className="error-text">{formErrors.age}</span>}
                  </div>

                  <div className="form-group flex-1">
                    <label htmlFor="adminSkillLevel" className="form-label">
                      Skill Level <span className="required-star">*</span>
                    </label>
                    <select
                      id="adminSkillLevel"
                      value={skillLevel}
                      onChange={(e) => setSkillLevel(e.target.value)}
                      className="form-input form-select"
                      disabled={formLoading}
                      required
                    >
                      {VALID_SKILL_LEVELS.map(lvl => (
                        <option key={lvl} value={lvl}>{lvl}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Submit Action */}
                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                  <button
                    type="button"
                    className="form-cancel-btn"
                    onClick={() => {
                      setFirstName('');
                      setLastName('');
                      setEmail('');
                      setPhone('');
                      setGender('');
                      setAge('');
                      setSkillLevel('3.0');
                      setFormErrors({});
                    }}
                    disabled={formLoading}
                  >
                    Clear Form
                  </button>
                  <button
                    type="submit"
                    className="admin-btn active-btn"
                    disabled={formLoading}
                    style={{ minWidth: '140px' }}
                  >
                    {formLoading ? 'Adding Player...' : 'Add Player'}
                  </button>
                </div>
              </form>
            </div>

            {/* CARD 2: Bulk Upload Players (Excel) */}
            <div className="form-card" style={{ margin: 0, display: 'flex', flexDirection: 'column' }}>
              <header className="form-header-section" style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#22c55e' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div>
                    <h2 className="form-title" style={{ fontSize: '1.4rem' }}>Bulk Upload Players</h2>
                    <p className="form-subtitle" style={{ fontSize: '0.85rem' }}>Import multiple players simultaneously using a spreadsheet (.xlsx, .xls).</p>
                  </div>
                </div>
              </header>

              {/* Upload Button & Action Hub */}
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.02)', 
                border: '2px dashed var(--glass-border)', 
                borderRadius: '16px', 
                padding: '1.75rem', 
                textAlign: 'center', 
                marginBottom: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '12px'
              }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".xlsx, .xls, .csv"
                  style={{ display: 'none' }}
                />

                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'var(--primary-glow)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--primary)'
                }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>

                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '4px' }}>
                    Select Excel File to Validate & Upload
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Supported formats: <strong>.xlsx, .xls, .csv</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                  <button
                    type="button"
                    className="admin-btn active-btn"
                    onClick={triggerFileInput}
                    disabled={isProcessingFile}
                    style={{ minWidth: '180px', padding: '12px 20px', fontSize: '0.95rem' }}
                  >
                    {isProcessingFile ? 'Reading & Validating...' : 'Bulk Upload Players'}
                  </button>

                  <button
                    type="button"
                    className="admin-btn"
                    onClick={handleDownloadTemplate}
                    style={{ 
                      background: 'rgba(255, 255, 255, 0.05)', 
                      borderColor: 'var(--glass-border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Excel Template
                  </button>
                </div>

                {uploadFileName && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Loaded file: <strong style={{ color: 'var(--text-primary)' }}>{uploadFileName}</strong>
                  </div>
                )}

                {validationReport && !validationReport.valid && (
                  <div 
                    onClick={scrollToErrors}
                    style={{ 
                      cursor: 'pointer',
                      padding: '10px 16px', 
                      background: 'rgba(239, 68, 68, 0.15)', 
                      border: '1px solid var(--color-error)', 
                      borderRadius: '10px', 
                      color: '#fca5a5', 
                      fontSize: '0.85rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginTop: '8px',
                      transition: 'background 0.2s',
                      userSelect: 'none'
                    }}
                    title="Click to jump to error details"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span><strong>Validation Failed:</strong> {validationReport.errors.length} issue(s) found. <span style={{ textDecoration: 'underline' }}>Jump to error details below ↓</span></span>
                  </div>
                )}
              </div>

              {/* Instructions and Validation Rules Box */}
              <div style={{ 
                background: 'rgba(99, 102, 241, 0.05)', 
                border: '1px solid rgba(99, 102, 241, 0.2)', 
                borderRadius: '14px', 
                padding: '1.25rem',
                fontSize: '0.85rem',
                lineHeight: '1.6'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--primary)', fontWeight: '700', fontSize: '0.9rem' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  Excel File Column Order & Validation Rules
                </div>

                <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                  The first row of your Excel file must contain the column headers in the following order:
                </div>

                <ol style={{ paddingLeft: '1.25rem', color: 'var(--text-primary)', marginBottom: '10px' }}>
                  <li><strong>First Name</strong> <span style={{ color: 'var(--color-error)' }}>*Required</span> (text)</li>
                  <li><strong>Last Name</strong> <span style={{ color: 'var(--color-error)' }}>*Required</span> (text)</li>
                  <li><strong>Email</strong> <span style={{ color: 'var(--color-error)' }}>*Required</span> (valid email format, unique across file and database)</li>
                  <li><strong>Phone</strong> <span style={{ color: 'var(--text-muted)' }}>(Optional)</span> (e.g. 555-0101)</li>
                  <li><strong>Gender</strong> <span style={{ color: 'var(--text-muted)' }}>(Optional)</span> (allowed: <code>Male</code> or <code>Female</code>)</li>
                  <li><strong>Age</strong> <span style={{ color: 'var(--text-muted)' }}>(Optional)</span> (positive integer e.g. <code>28</code>)</li>
                  <li><strong>Skill Level</strong> <span style={{ color: 'var(--text-muted)' }}>(Optional, Default: 3.0)</span> (scale: <code>1.0</code> to <code>5.0</code> in 0.5 steps)</li>
                </ol>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '8px' }}>
                  💡 <em>Note: If any row is missing mandatory fields or has invalid formats, the system will highlight the exact row and field and block import until resolved.</em>
                </div>
              </div>

            </div>
          </div>

          {/* Validation Failure Card / Error List */}
          {validationReport && !validationReport.valid && (
            <div 
              ref={errorSectionRef}
              tabIndex={-1}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: '0 0 25px rgba(239, 68, 68, 0.25)',
                borderRadius: '16px',
                padding: '1.5rem',
                outline: 'none',
                scrollMarginTop: '24px',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--color-error)', fontWeight: '700' }}>
                      Validation Failed: Found {validationReport.errors.length} Issue(s)
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Please correct the following errors in your Excel spreadsheet and upload again. No players have been saved to the database.
                    </p>
                  </div>
                </div>

                <button 
                  className="admin-btn active-btn"
                  onClick={triggerFileInput}
                  style={{ background: 'var(--color-error)' }}
                >
                  Upload Corrected File
                </button>
              </div>

              {/* Error Table */}
              <div style={{ overflowX: 'auto', maxHeight: '360px', overflowY: 'auto', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--text-primary)', borderBottom: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      <th style={{ padding: '10px 14px' }}>Excel Row #</th>
                      <th style={{ padding: '10px 14px' }}>Field</th>
                      <th style={{ padding: '10px 14px' }}>Value in Sheet</th>
                      <th style={{ padding: '10px 14px' }}>Validation Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationReport.errors.map((err, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: idx % 2 === 0 ? 'rgba(0, 0, 0, 0.1)' : 'transparent' }}>
                        <td style={{ padding: '8px 14px', fontWeight: '700', color: 'var(--color-error)' }}>
                          Row {err.row}
                        </td>
                        <td style={{ padding: '8px 14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {err.field}
                        </td>
                        <td style={{ padding: '8px 14px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {err.value || '<Empty>'}
                        </td>
                        <td style={{ padding: '8px 14px', color: '#fca5a5' }}>
                          {err.message}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Directory Tab View */}
      {activeTab === 'directory' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Search bar and counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search players by name, email, phone, or skill level..."
                className="form-input"
                style={{ paddingLeft: '2.5rem' }}
              />
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="18" 
                height="18" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>

            <button 
              className="admin-btn"
              onClick={fetchPlayers}
              disabled={loadingPlayers}
              style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <polyline points="1 20 1 14 7 14"></polyline>
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
              </svg>
              Refresh List
            </button>
          </div>

          {/* Master Table */}
          <div style={{ 
            background: 'var(--glass-bg)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid var(--glass-border)', 
            borderRadius: '16px', 
            overflow: 'hidden',
            boxShadow: 'var(--glass-shadow)'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(255, 255, 255, 0.03)', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>ID</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Player Name</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Email Address</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Phone</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Gender</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Age</th>
                    <th style={{ padding: '14px 18px', fontWeight: '600' }}>Skill Level</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPlayers ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        Loading master player database...
                      </td>
                    </tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        {searchQuery ? 'No players found matching your query.' : 'No players in database yet. Use Add or Bulk Upload to get started.'}
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((p, index) => (
                      <tr key={p.id || index} style={{ borderBottom: '1px solid var(--glass-border)', transition: 'background 0.2s' }}>
                        <td style={{ padding: '12px 18px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          #{p.id}
                        </td>
                        <td style={{ padding: '12px 18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {p.firstName} {p.lastName}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                          {p.email}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                          {p.phone || '—'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          {p.gender ? (
                            <span className="badge badge-type" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                              {p.gender}
                            </span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '12px 18px', color: 'var(--text-secondary)' }}>
                          {p.age || '—'}
                        </td>
                        <td style={{ padding: '12px 18px' }}>
                          <span style={{ 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            background: 'var(--primary-glow)', 
                            color: 'var(--primary)', 
                            fontWeight: '700', 
                            fontSize: '0.8rem' 
                          }}>
                            {p.skillLevel || '3.0'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation & Preview Modal for Bulk Upload */}
      {showConfirmModal && validationReport && validationReport.valid && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--glass-border)',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '750px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--glass-shadow)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                </div>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--text-primary)' }}>
                    File Validated Successfully!
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Ready to import <strong>{validationReport.players.length}</strong> player(s) from <em>{uploadFileName}</em>
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Body: Preview Table */}
            <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  Preview of First {Math.min(10, validationReport.players.length)} of {validationReport.players.length} Players:
                </span>
                <span className="badge badge-type" style={{ fontSize: '0.8rem', background: 'rgba(16, 185, 129, 0.2)', color: 'var(--color-success)' }}>
                  0 Errors Detected
                </span>
              </div>

              <div style={{ border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.04)', color: 'var(--text-secondary)', borderBottom: '1px solid var(--glass-border)' }}>
                      <th style={{ padding: '10px 12px' }}>Row</th>
                      <th style={{ padding: '10px 12px' }}>Name</th>
                      <th style={{ padding: '10px 12px' }}>Email</th>
                      <th style={{ padding: '10px 12px' }}>Gender</th>
                      <th style={{ padding: '10px 12px' }}>Age</th>
                      <th style={{ padding: '10px 12px' }}>Skill</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationReport.players.slice(0, 10).map((p, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.03)' }}>
                        <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{p.rowNumber}</td>
                        <td style={{ padding: '8px 12px', fontWeight: '600', color: 'var(--text-primary)' }}>{p.firstName} {p.lastName}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{p.email}</td>
                        <td style={{ padding: '8px 12px' }}>{p.gender || '—'}</td>
                        <td style={{ padding: '8px 12px' }}>{p.age || '—'}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--primary)', fontWeight: '700' }}>{p.skillLevel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1.25rem 1.75rem', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'flex-end', gap: '12px', background: 'rgba(0, 0, 0, 0.2)' }}>
              <button
                type="button"
                className="form-cancel-btn"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmittingBulk}
              >
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn active-btn"
                onClick={handleConfirmBulkUpload}
                disabled={isSubmittingBulk}
                style={{ minWidth: '180px' }}
              >
                {isSubmittingBulk ? 'Adding to Database...' : `Confirm & Add ${validationReport.players.length} Players`}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
