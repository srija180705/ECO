import { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { mockDB } from '../data/mockData';
import { apiFetch } from '../api.js';
import Rewards from './Rewards';
import Community from './community';

function readStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readInitialTotalPoints() {
  const eco = parseInt(localStorage.getItem('eco_total_points') || '0', 10);
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    const up = typeof u?.points === 'number' ? u.points : 0;
    return Math.max(eco, up);
  } catch {
    return eco;
  }
}

function normalizeJoinedEvents(ids) {
  if (!Array.isArray(ids)) return [];
  const mockIds = mockDB.events.map((event) => event.id);
  const hasEveryMockEvent = mockIds.length > 0 && mockIds.every((id) => ids.includes(id));
  return hasEveryMockEvent ? [] : ids;
}

function normalizeEvent(event) {
  const id = String(event._id || event.id);
  const dateISO = event.dateISO || event.startDateISO || event.endDateISO || '';
  return {
    ...event,
    id,
    dateISO,
    category: event.category || 'cleanup',
    location: event.location || 'Hyderabad',
    distanceKm: Number(event.distanceKm) || 0,
    points: Number(event.points) || 0,
  };
}

function mergeEvents(primaryEvents, fallbackEvents) {
  const byId = new Map();
  [...primaryEvents, ...fallbackEvents].forEach((event) => {
    const normalized = normalizeEvent(event);
    byId.set(normalized.id, normalized);
  });
  return Array.from(byId.values());
}

function parseDateOnly(iso) {
  if (!iso) return null;
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function getEventDateRange(event) {
  const start = parseDateOnly(event.startDateISO || event.dateISO);
  const end = parseDateOnly(event.endDateISO || event.dateISO || event.startDateISO);
  return { start, end };
}

function getEventTiming(event) {
  const { start, end } = getEventDateRange(event);
  const today = startOfToday();
  if (!start || !end) return 'upcoming';
  if (start <= today && end >= today) return 'ongoing';
  if (start > today) return 'upcoming';
  return 'past';
}

function formatEventDate(event) {
  const { start, end } = getEventDateRange(event);
  if (!start) return 'Date not set';
  if (!end || start.getTime() === end.getTime()) return start.toDateString();
  return `${start.toDateString()} - ${end.toDateString()}`;
}

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialUser = location.state?.user ?? readStoredUser();
  const [user, setUser] = useState(initialUser);
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);
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

  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New event in your area: Beach Cleanup', time: '2 hours ago' },
    { id: 2, text: 'You earned 50 points!', time: '1 day ago' },
  ]);
  const [events, setEvents] = useState(() => mockDB.events.map(normalizeEvent));
  const [submittedEvents, setSubmittedEvents] = useState([]);
  const [eventsMetaError, setEventsMetaError] = useState('');
  const [dashboardError, setDashboardError] = useState('');

  const [joinedEvents, setJoinedEvents] = useState(() => {
    if (user?.joinedEvents && user.joinedEvents.length > 0) return normalizeJoinedEvents(user.joinedEvents);
    const saved = localStorage.getItem('eco_joined_events');
    return saved ? normalizeJoinedEvents(JSON.parse(saved)) : [];
  });

  const [attendedEvents, setAttendedEvents] = useState(() => {
    if (initialUser?.attendedEvents && initialUser.attendedEvents.length > 0) return initialUser.attendedEvents;
    const saved = localStorage.getItem('eco_attended_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [totalPoints, setTotalPoints] = useState(readInitialTotalPoints);

  const syncUserLocal = (updated) => {
    try {
      const current = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...current, ...updated }));
    } catch {
      /* noop */
    }
  };

  const loadEventMeta = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const mineRes = await apiFetch('/api/events/mine', { headers: { Authorization: `Bearer ${token}` } });

      if (mineRes.ok) {
        setSubmittedEvents(await mineRes.json());
      }
      if (!mineRes.ok) {
        setEventsMetaError('Could not load event status data.');
      } else {
        setEventsMetaError('');
      }
    } catch {
      setEventsMetaError('Could not load event status data.');
    }
  };

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const [profileRes, eventsRes] = await Promise.all([
        apiFetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/events', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setUser(profileData);
        syncUserLocal(profileData);
        if (Array.isArray(profileData.joinedEvents)) {
          setJoinedEvents(normalizeJoinedEvents(profileData.joinedEvents));
        }
        if (Array.isArray(profileData.attendedEvents)) {
          setAttendedEvents(profileData.attendedEvents);
        }
        if (typeof profileData.points === 'number') {
          setTotalPoints(profileData.points);
        }
      }

      if (eventsRes.ok) {
        const eventData = await eventsRes.json();
        setEvents(
          Array.isArray(eventData) && eventData.length > 0
            ? mergeEvents(eventData, mockDB.events)
            : mockDB.events.map(normalizeEvent)
        );
        setDashboardError('');
      } else {
        const errorData = await eventsRes.json().catch(() => ({}));
        setDashboardError(errorData.message || 'Unable to load events.');
        setEvents(mockDB.events.map(normalizeEvent));
      }

      await loadEventMeta();
    } catch {
      setDashboardError('Unable to load dashboard data.');
      setEvents(mockDB.events.map(normalizeEvent));
      await loadEventMeta();
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    localStorage.setItem('eco_joined_events', JSON.stringify(joinedEvents));
  }, [joinedEvents]);

  useEffect(() => {
    localStorage.setItem('eco_attended_events', JSON.stringify(attendedEvents));
  }, [attendedEvents]);

  useEffect(() => {
    localStorage.setItem('eco_total_points', totalPoints.toString());
  }, [totalPoints]);

  useEffect(() => {
    if (!user?._id) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const timer = setTimeout(() => {
      apiFetch(`/api/users/${user._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ points: totalPoints, joinedEvents, attendedEvents }),
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) {
            try {
              const cur = JSON.parse(localStorage.getItem('user') || '{}');
              localStorage.setItem('user', JSON.stringify({
                ...cur,
                points: typeof data.points === 'number' ? data.points : cur.points,
                joinedEvents: data.joinedEvents || cur.joinedEvents,
                attendedEvents: data.attendedEvents || cur.attendedEvents
              }));
            } catch {
              /* noop */
            }
          }
        })
        .catch(() => { });
    }, 450);

    return () => clearTimeout(timer);
  }, [user, totalPoints, joinedEvents, attendedEvents]);

  const availableEvents = useMemo(() => {
    return events.filter((ev) => {
      const isNotJoined = !joinedEvents.includes(ev.id);
      const matchQ =
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        ev.location.toLowerCase().includes(q.toLowerCase()) ||
        ev.category.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "all" || ev.category.toLowerCase() === category.toLowerCase();
      const isDiscoverable = getEventTiming(ev) !== 'past';
      return isNotJoined && matchQ && matchCat && isDiscoverable;
    });
  }, [q, category, joinedEvents, events]);

  const ongoingEvents = useMemo(() => {
    return availableEvents.filter((event) => getEventTiming(event) === 'ongoing');
  }, [availableEvents]);

  const upcomingEvents = useMemo(() => {
    return availableEvents.filter((event) => getEventTiming(event) === 'upcoming');
  }, [availableEvents]);

  const userStats = useMemo(() => {
    return {
      totalPoints: totalPoints,
      eventsJoined: joinedEvents.length,
      nearbyEvents: availableEvents.length,
      badgesEarned: user?.badges?.length ?? 0,
    };
  }, [totalPoints, joinedEvents, availableEvents, user]);

  const registeredEventsData = useMemo(() => {
    return events.filter(ev => joinedEvents.includes(ev.id) && !attendedEvents.includes(ev.id));
  }, [events, joinedEvents, attendedEvents]);

  const attendedEventsData = useMemo(() => {
    return events.filter(ev => attendedEvents.includes(ev.id));
  }, [events, attendedEvents]);

  const handleJoinEvent = async (eventId) => {
    if (joinedEvents.includes(eventId)) return;

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to join events.');
      return;
    }

    try {
      const response = await apiFetch(`/api/events/${eventId}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Unable to join event.');
        return;
      }
      setJoinedEvents([...joinedEvents, eventId]);
      setUser((prev) => prev ? { ...prev, joinedEvents: [...(prev.joinedEvents || []), eventId] } : prev);
      alert('✓ Event registered successfully!');
    } catch {
      alert('Unable to join event. Please try again.');
    }
  };

  const handleUnjoinEvent = async (eventId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to cancel event registration.');
      return;
    }

    try {
      const response = await apiFetch(`/api/events/${eventId}/unjoin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Unable to cancel registration.');
        return;
      }

      setJoinedEvents(joinedEvents.filter(id => id !== eventId));
      setAttendedEvents(attendedEvents.filter(id => id !== eventId));
      setUser((prev) => prev ? {
        ...prev,
        joinedEvents: (prev.joinedEvents || []).filter((id) => String(id) !== String(eventId)),
        attendedEvents: (prev.attendedEvents || []).filter((id) => String(id) !== String(eventId)),
      } : prev);
      alert('✓ You have cancelled this event registration.');
    } catch {
      alert('Unable to cancel registration. Please try again.');
    }
  };

  const handleMarkAttended = async (eventId) => {
    const event = events.find(e => e.id === eventId || String(e._id) === String(eventId));
    if (!event) return;

    const { end } = getEventDateRange(event);
    const today = startOfToday();

    if (!end || end >= today) {
      alert(`❌ You can only mark this event as attended after ${end ? end.toDateString() : 'the event ends'}!`);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('Please log in to mark attendance.');
      return;
    }

    try {
      const response = await apiFetch(`/api/events/${eventId}/attend`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        alert(errorData.message || 'Unable to mark attendance.');
        return;
      }

      const points = event.points || 0;
      setAttendedEvents([...attendedEvents, eventId]);
      setTotalPoints(totalPoints + points);
      setUser((prev) => prev ? {
        ...prev,
        attendedEvents: [...(prev.attendedEvents || []), eventId],
        points: (Number(prev.points) || 0) + points,
      } : prev);
      alert(`✓ Attendance confirmed! You earned ${points} points!`);
    } catch {
      alert('Unable to mark attendance. Please try again.');
    }
  };

  const handleResetPoints = () => {
    if (window.confirm('Are you sure you want to reset all points and clear all registered events? This cannot be undone.')) {
      setJoinedEvents([]);
      setAttendedEvents([]);
      setTotalPoints(0);
      alert('✓ Points and events have been reset.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
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
      await loadEventMeta();
    } catch (err) {
      setCreateError(err.message || 'Unable to submit event.');
    }
  };

  const handlePublishToggle = async (eventId, publish) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await apiFetch(`/api/events/${eventId}/publish`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ publish })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setCreateError(errorData.message || 'Unable to update publish status.');
        return;
      }
      await loadEventMeta();
      setCreateStatus(publish ? 'Event posted to dashboard successfully.' : 'Event removed from dashboard.');
    } catch {
      setCreateError('Unable to update publish status.');
    }
  };

  const statusLabel = (event) => {
    if (event.approved) return 'approved';
    return event.status || 'pending';
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
            <button type="button" className={`nav-item ${activeTab === 'community' ? 'active' : ''}`} onClick={() => setActiveTab('community')}>
              <span className="nav-icon">👥</span>
              <span>Community</span>
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
          </nav>
        </div>

        <div className="sidebar-user">
          <div className="user-avatar">😊</div>
          <div className="user-info">
            <span className="user-name">{firstName}</span>
            <span className="user-points">{userStats.totalPoints} points</span>
          </div>
          <div className="sidebar-buttons">
            <button className="reset-btn" onClick={handleResetPoints} title="Reset Points">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.76 9.76 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
            </button>
            <button className="logout-btn" onClick={handleLogout} title="Logout">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {activeTab === 'rewards' ? (
          <Rewards
            userId={user?._id ? String(user._id) : null}
            userPoints={totalPoints}
            onPointsUpdated={setTotalPoints}
          />
        ) : activeTab === 'dashboard' ? (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
                <p>Find your next volunteering opportunity</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', display: 'flex', color: '#4b5563' }}
                    onClick={() => setShowNotifications(!showNotifications)}
                  >
                    <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="24" height="24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z"></path>
                    </svg>
                    <div style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: 10, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                      {notifications.length}
                    </div>
                  </button>
                  {showNotifications && (
                    <div style={{ position: 'absolute', top: 40, right: 0, width: 300, background: 'white', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000, padding: 16, border: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 12 }}>
                        <h4 style={{ margin: 0, color: '#111827' }}>Notifications</h4>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => setNotifications([])}
                            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: 0 }}
                          >
                            Clear all
                          </button>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>No new notifications</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: 14 }}>
                            <div style={{ fontWeight: 500, color: '#374151' }}>{n.text}</div>
                            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{n.time}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
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
              </div>
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
              <select
                className="category-select"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="all">All</option>
                <option value="cleanup">Cleanup</option>
                <option value="planting">Planting</option>
                <option value="recycling">Recycling</option>
              </select>
            </div>

            {dashboardError && <div className="feedback feedback-error">{dashboardError}</div>}

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
              <h2>Ongoing Events</h2>
              {ongoingEvents.length === 0 ? (
                <div className="no-events">
                  <p>No ongoing events right now.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {ongoingEvents.map(event => (
                    <div className="event-card" key={event.id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <div className="event-reward">
                          <span>⭐</span>
                          <span className="reward-points">{event.points} pts</span>
                        </div>
                      </div>
                      <span className="event-badge attended-badge">Ongoing</span>
                      <div className="event-details">
                        <p>📅 {formatEventDate(event)}</p>
                        <p>📍 {event.location}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <button className="join-btn" onClick={() => handleJoinEvent(event.id)}>Join Event</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="upcoming-events">
              <h2>Upcoming Events Near You</h2>
              {upcomingEvents.length === 0 ? (
                <div className="no-events">
                  <p>No more available events. You&apos;ve registered for all!</p>
                </div>
              ) : (
                <div className="events-grid">
                  {upcomingEvents.map(event => (
                    <div className="event-card" key={event.id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <div className="event-reward">
                          <span>⭐</span>
                          <span className="reward-points">{event.points} pts</span>
                        </div>
                      </div>
                      <span className="event-badge">{event.category}</span>
                      <div className="event-details">
                        <p>📅 {formatEventDate(event)}</p>
                        <p>📍 {event.location}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <button className="join-btn" onClick={() => handleJoinEvent(event.id)}>Join Event</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {joinedEvents.length > 0 && (
              <section className="registered-events">
                <h2>My Registered Events</h2>
                <div className="events-grid">
                  {registeredEventsData.map(event => {
                    const { end } = getEventDateRange(event);
                    const isPastEvent = end ? end < startOfToday() : false;

                    return (
                      <div className="event-card registered" key={event.id}>
                        <div className="event-card-header">
                          <h3>{event.title}</h3>
                          <div className="event-reward">
                            <span>⭐</span>
                            <span className="reward-points">{event.points} pts (if attended)</span>
                          </div>
                        </div>
                        <span className="event-badge registered-badge">{event.category}</span>
                        <div className="event-details">
                          <p>📅 {formatEventDate(event)}</p>
                          <p>📍 {event.location}</p>
                          <p>📏 {event.distanceKm} km away</p>
                        </div>
                        <div className="event-actions">
                          <button
                            className={`attend-btn ${!isPastEvent ? 'disabled' : ''}`}
                            onClick={() => handleMarkAttended(event.id)}
                            disabled={!isPastEvent}
                          >
                            {isPastEvent ? 'Mark as Attended' : 'Event Not Yet Completed'}
                          </button>
                          <button className="cancel-btn" onClick={() => handleUnjoinEvent(event.id)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {attendedEvents.length > 0 && (
              <section className="attended-events">
                <h2>Events Attended ✓</h2>
                <div className="events-grid">
                  {attendedEventsData.map(event => (
                    <div className="event-card attended" key={event.id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <div className="event-reward attended-reward">
                          <span>✓</span>
                          <span className="reward-points">{event.points} pts Earned</span>
                        </div>
                      </div>
                      <span className="event-badge attended-badge">{event.category}</span>
                      <div className="event-details">
                        <p>📅 {formatEventDate(event)}</p>
                        <p>📍 {event.location}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <div className="attended-confirmation">
                        ✓ Points Earned
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        ) : activeTab === 'create' ? (
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
                {eventsMetaError && <div className="feedback feedback-error">{eventsMetaError}</div>}

                <button className="primary-btn" type="submit">Submit for Approval</button>
              </form>
            </div>

            <section className="registered-events">
              <h2>My Submitted Events</h2>
              {submittedEvents.length === 0 ? (
                <div className="no-events">
                  <p>You have not submitted any events yet.</p>
                </div>
              ) : (
                <div className="events-grid">
                  {submittedEvents.map((event) => (
                    <div className="event-card" key={event._id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <span className="event-badge">{statusLabel(event)}</span>
                      </div>
                      <div className="event-details">
                        <p>📅 {new Date(event.startDateISO).toDateString()} - {new Date(event.endDateISO).toDateString()}</p>
                        <p>📍 {event.location}</p>
                        <p>📣 {event.isPublished ? 'Published on dashboard' : 'Not posted to dashboard'}</p>
                      </div>
                      <div className="event-actions">
                        <button
                          className="join-btn"
                          disabled={!event.approved || event.isPublished}
                          onClick={() => handlePublishToggle(event._id, true)}
                        >
                          Post as Happening
                        </button>
                        <button
                          className="cancel-btn"
                          disabled={!event.isPublished}
                          onClick={() => handlePublishToggle(event._id, false)}
                        >
                          Remove Post
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </section>
        ) : activeTab === 'community' ? (
          <Community />
        ) : (
          <div className="coming-soon-container">
            <div className="coming-soon-icon">🚧</div>
            <h2 className="coming-soon-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p className="coming-soon-text">Coming Soon</p>
            <p className="coming-soon-subtext">We&apos;re working hard to bring this feature to you. Stay tuned!</p>
            <button className="coming-soon-btn" onClick={() => setActiveTab('dashboard')}>Back to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;
