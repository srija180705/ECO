import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { apiFetch } from '../api.js';

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const [user, setUser] = useState(location.state?.user || storedUser);
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [createStatus, setCreateStatus] = useState('');
  const [createError, setCreateError] = useState('');
  const [eventForm, setEventForm] = useState({
    title: '',
    organizationName: '',
    category: 'cleanup',
    location: '',
    address: '',
    description: '',
    startDateISO: '',
    endDateISO: '',
    startHour: 9,
    endHour: 17,
    points: 50,
    permissionPdf: null,
  });

  useEffect(() => {
    const loadEvents = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setFetchError('Login required to load events.');
        setLoadingEvents(false);
        return;
      }

      try {
        const response = await apiFetch('/api/events', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          setFetchError(errorData.message || 'Failed to load events.');
          return;
        }
        const data = await response.json();
        setEvents(data);
      } catch (err) {
        setFetchError(err.message || 'Failed to load events.');
      } finally {
        setLoadingEvents(false);
      }
    };

    loadEvents();
  }, []);

  const userStats = useMemo(
    () => ({
      totalPoints: user?.points ?? 0,
      eventsJoined: 0, // Temporarily set to 0 as join functionality is removed
      nearbyEvents: events.length,
      badgesEarned: user?.badges?.length ?? 0,
    }),
    [user, events.length]
  );

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      const matchQ =
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        ev.location.toLowerCase().includes(q.toLowerCase()) ||
        ev.category.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === 'all' || ev.category.toLowerCase() === category.toLowerCase();
      return matchQ && matchCat;
    });
  }, [events, q, category]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth', { replace: true });
  };

  const handleOpenMap = () => {
    navigate('/map', { state: { fromAuth: true, user } });
  };

  const handleEventChange = (e) => {
    const { name, value } = e.target;
    setEventForm((prev) => ({ ...prev, [name]: value }));
    setCreateStatus('');
    setCreateError('');
  };

  const handleFileChange = (e) => {
    setEventForm((prev) => ({ ...prev, permissionPdf: e.target.files[0] || null }));
    setCreateStatus('');
    setCreateError('');
  };

  const formatTwoDigits = (value) => String(value).padStart(2, '0');
  const formatEventTime = (ev) => {
    const startDay = ev.startDateISO ? new Date(ev.startDateISO).toDateString() : '';
    const endDay = ev.endDateISO ? new Date(ev.endDateISO).toDateString() : '';
    const startHour = formatTwoDigits(ev.startHour || 9);
    const endHour = formatTwoDigits(ev.endHour || 17);
    return `${startDay} ${startHour}:00 — ${endDay} ${endHour}:00`;
  };

  const handleEventLocationClick = (event) => {
    navigate('/map', {
      state: {
        fromAuth: true,
        user,
        selectedEvent: {
          title: event.title,
          location: event.location,
          address: event.address,
        },
      },
    });
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateStatus('');

    const token = localStorage.getItem('token');
    if (!token) {
      setCreateError('Login required to submit an event.');
      return;
    }

    const formData = new FormData();
    formData.append('title', eventForm.title);
    formData.append('organizationName', eventForm.organizationName);
    formData.append('category', eventForm.category);
    formData.append('location', eventForm.location);
    formData.append('address', eventForm.address);
    formData.append('description', eventForm.description);
    formData.append('startDateISO', eventForm.startDateISO);
    formData.append('endDateISO', eventForm.endDateISO);
    formData.append('startHour', eventForm.startHour);
    formData.append('endHour', eventForm.endHour);
    formData.append('points', eventForm.points);
    if (eventForm.permissionPdf) {
      formData.append('permissionPdf', eventForm.permissionPdf);
    }

    try {
      const response = await apiFetch('/api/events', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCreateError(errorData.message || 'Unable to submit event.');
        return;
      }

      setCreateStatus('Event submitted successfully and is awaiting admin approval.');
      setEventForm({
        title: '',
        organizationName: '',
        category: 'cleanup',
        location: '',
        address: '',
        description: '',
        startDateISO: '',
        endDateISO: '',
        startHour: 9,
        endHour: 17,
        points: 50,
        permissionPdf: null,
      });
    } catch (err) {
      setCreateError(err.message || 'Unable to submit event.');
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.5 2.5C17.5 2.5 12 2.5 8 6.5C4.5 10 4.5 16 4.5 16C4.5 16 10.5 16 14 12.5C18 8.5 17.5 2.5 17.5 2.5ZM12 11.5L8 15.5C8 15.5 9 16.5 10 17.5L14 13.5L12 11.5Z" />
              </svg>
            </div>
            <div>
              <h1 className="brand-name">Eco-Volunteer</h1>
              <span className="brand-subtitle">Match</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button type="button" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <span className="nav-icon">🏠</span>
              <span>Dashboard</span>
            </button>
            <button type="button" className={`nav-item ${activeTab === 'create' ? 'active' : ''}`} onClick={() => setActiveTab('create')}>
              <span className="nav-icon">📝</span>
              <span>Create Event</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('map');
                navigate('/map', { state: { fromAuth: true, user } });
              }}
            >
              <span className="nav-icon">📍</span>
              <span>Map</span>
            </button>
            <button type="button" className={`nav-item ${activeTab === 'rewards' ? 'active' : ''}`} onClick={() => setActiveTab('rewards')}>
              <span className="nav-icon">🎁</span>
              <span>Rewards</span>
            </button>
            <button
              type="button"
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('profile');
                navigate('/profile', { state: { fromAuth: true, user } });
              }}
            >
              <span className="nav-icon">👤</span>
              <span>Profile</span>
            </button>
            {user?.role === 'admin' && (
              <button
                type="button"
                className={`nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('admin');
                  navigate('/admin', { state: { fromAuth: true, user } });
                }}
              >
                <span className="nav-icon">⚙️</span>
                <span>Admin</span>
              </button>
            )}
          </nav>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">😊</div>
          <div className="user-info">
            <span className="user-name">{firstName}</span>
            <span className="user-points">{userStats.totalPoints} points</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        {activeTab === 'dashboard' && (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
                <p>Find your next volunteering opportunity</p>
              </div>
              <button className="map-view-btn" onClick={handleOpenMap}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                </svg>
                Map View
              </button>
            </header>

            <div className="search-filter-bar">
              <div className="search-wrapper">
                <span className="search-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </span>
                <input
                  type="text"
                  placeholder="Search events by name, location, or category..."
                  className="search-input"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <button className="filter-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="4" y1="6" x2="20" y2="6" />
                  <line x1="8" y1="12" x2="16" y2="12" />
                  <line x1="11" y1="18" x2="13" y2="18" />
                </svg>
                Filters
              </button>
              <select className="category-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="all">All</option>
                <option value="cleanup">Cleanup</option>
                <option value="planting">Planting</option>
                <option value="recycling">Recycling</option>
              </select>
            </div>

            <div className="stats-grid">
              <div className="stat-card stat-green">
                <div className="stat-icon-wrapper">🏅</div>
                <div className="stat-info">
                  <h3>{userStats.totalPoints}</h3>
                  <p>Total Points</p>
                </div>
              </div>
              <div className="stat-card stat-blue">
                <div className="stat-icon-wrapper">📋</div>
                <div className="stat-info">
                  <h3>{userStats.eventsJoined}</h3>
                  <p>Events Joined</p>
                </div>
              </div>
              <div className="stat-card stat-pink">
                <div className="stat-icon-wrapper">📍</div>
                <div className="stat-info">
                  <h3>{userStats.nearbyEvents}</h3>
                  <p>Nearby Events</p>
                </div>
              </div>
              <div className="stat-card stat-orange">
                <div className="stat-icon-wrapper">🏆</div>
                <div className="stat-info">
                  <h3>{userStats.badgesEarned}</h3>
                  <p>Badges Earned</p>
                </div>
              </div>
            </div>

            <section className="upcoming-events">
              <h2>Upcoming Events Near You</h2>
              {loadingEvents ? (
                <div className="no-events">
                  <p>Loading events...</p>
                </div>
              ) : fetchError ? (
                <div className="no-events">
                  <p>{fetchError}</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="no-events">
                  <p>No approved events are available yet.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {filteredEvents.map((event) => (
                    <div className="event-card" key={event._id || event.id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <div className="event-reward">
                          <span>⭐</span>
                          <span className="reward-points">{event.points} pts</span>
                        </div>
                      </div>
                      <span className="event-badge">{event.category}</span>
                      <div className="event-details">
                        <p>� <button
                          type="button"
                          style={{ border: 'none', background: 'none', padding: 0, color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}
                          onClick={() => handleEventLocationClick(event)}
                        >
                          {event.address || event.location}
                        </button></p>
                        <p>🗓️ {formatEventTime(event)}</p>
                        <p>🏙️ {event.location}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {activeTab === 'create' && (
          <section className="create-event-section">
            <header className="dashboard-header create-header">
              <div className="header-title">
                <h2>Submit a New Event</h2>
                <p>Provide the event details and attach permission documentation for admin review.</p>
              </div>
            </header>

            <div className="form-card">
              <form className="create-event-form" onSubmit={handleCreateEvent}>
                <div className="form-grid">
                  <label>
                    Event Title
                    <input name="title" value={eventForm.title} onChange={handleEventChange} required />
                  </label>
                  <label>
                    Organization Name
                    <input name="organizationName" value={eventForm.organizationName} onChange={handleEventChange} required />
                  </label>
                  <label>
                    Category
                    <select name="category" value={eventForm.category} onChange={handleEventChange} required>
                      <option value="cleanup">Cleanup</option>
                      <option value="planting">Planting</option>
                      <option value="recycling">Recycling</option>
                      <option value="awareness">Awareness</option>
                    </select>
                  </label>
                  <label>
                    Location (Area Name, City, State)
                    <input name="location" value={eventForm.location} onChange={handleEventChange} required />
                  </label>
                  <label className="full-width">
                    Description
                    <textarea name="description" value={eventForm.description} onChange={handleEventChange} rows="4" required />
                  </label>
                  <label>
                    Start Date
                    <input type="date" name="startDateISO" value={eventForm.startDateISO} onChange={handleEventChange} required />
                  </label>
                  <label>
                    End Date
                    <input type="date" name="endDateISO" value={eventForm.endDateISO} onChange={handleEventChange} required />
                  </label>
                  <label>
                    Start Hour (1-24)
                    <input type="number" name="startHour" value={eventForm.startHour} onChange={handleEventChange} min="1" max="24" required />
                  </label>
                  <label>
                    End Hour (1-24)
                    <input type="number" name="endHour" value={eventForm.endHour} onChange={handleEventChange} min="1" max="24" required />
                  </label>
                  <label>
                    Points
                    <input type="number" name="points" value={eventForm.points} onChange={handleEventChange} min="0" required />
                  </label>
                  <label className="full-width">
                    Address
                    <textarea name="address" value={eventForm.address} onChange={handleEventChange} rows="3" required />
                  </label>
                </div>

                <div className="file-upload-card">
                  <h3>Permission Document</h3>
                  <p>Attach the PDF permission letter for the event.</p>
                  <input type="file" accept="application/pdf" onChange={handleFileChange} className="file-input" />
                  {eventForm.permissionPdf && <span className="file-name">Selected: {eventForm.permissionPdf.name}</span>}
                </div>

                {createError && <div className="feedback feedback-error">{createError}</div>}
                {createStatus && <div className="feedback feedback-success">{createStatus}</div>}

                <button className="primary-btn" type="submit">Submit for Approval</button>
              </form>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
