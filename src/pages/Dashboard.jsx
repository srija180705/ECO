import { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { apiFetch } from '../api.js';
import { formatTimeAgo } from '../utils/formatTimeAgo.js';
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

function storageKeyTotalPoints(userId) {
  return userId ? `eco_total_points:${userId}` : 'eco_total_points';
}

function storageKeyJoined(userId) {
  return userId ? `eco_joined_events:${userId}` : 'eco_joined_events';
}

function storageKeyAttended(userId) {
  return userId ? `eco_attended_events:${userId}` : 'eco_attended_events';
}

function readInitialTotalPoints(storedUser) {
  const uid = storedUser?._id ? String(storedUser._id) : '';
  const eco = parseInt(localStorage.getItem(storageKeyTotalPoints(uid)) || '0', 10);
  try {
    const up = typeof storedUser?.points === 'number' ? storedUser.points : 0;
    return Math.max(eco, up);
  } catch {
    return eco;
  }
}

function normalizeJoinedEvents(ids) {
  if (!Array.isArray(ids)) return [];
  return ids.map((id) => String(id));
}

function normalizeEvent(event) {
  const id = String(event._id || event.id);
  const dateISO = event.dateISO || event.date || event.startDateISO || event.endDateISO || '';
  const volunteerCount =
    typeof event.volunteerCount === 'number'
      ? event.volunteerCount
      : Math.max((event.volunteers || []).length, Number(event.applicantCount) || 0);
  const maxVolunteers = Number(event.maxVolunteers ?? event.volunteerSlots ?? 0) || 0;
  return {
    ...event,
    id,
    dateISO,
    organizationName: event.organizationName || '',
    category: event.category || 'cleanup',
    location: event.location || 'Hyderabad',
    address: event.address || '',
    distanceKm: Number(event.distanceKm) || 0,
    points: Number(event.points) || 0,
    volunteerCount,
    maxVolunteers,
  };
}

function volunteerSummaryLine(event) {
  const n = event.volunteerCount ?? 0;
  const max = event.maxVolunteers;
  if (max && max > 0) return `👥 ${n} / ${max} volunteers`;
  return `👥 ${n} volunteers`;
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

function isPastEvent(event) {
  const end = parseDateOnly(event.endDateISO || event.dateISO || event.startDateISO);
  if (!end) return false;
  return end < startOfToday();
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
  const initialUserId = initialUser?._id ? String(initialUser._id) : '';
  const [user, setUser] = useState(initialUser);
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);

  /** @type {{ id: string, title: string, text: string, time: string, read: boolean }[]} */
  const [notifications, setNotifications] = useState([]);
  const [entryBanner, setEntryBanner] = useState('');
  const [events, setEvents] = useState([]);
  const [staleAttendedEvents, setStaleAttendedEvents] = useState([]);
  const [staleRegisteredEventsCount, setStaleRegisteredEventsCount] = useState(0);

  const unreadNotificationCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const [eventsLoading, setEventsLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState('');

  const [joinedEvents, setJoinedEvents] = useState(() => {
    if (initialUser?.joinedEvents?.length > 0) return normalizeJoinedEvents(initialUser.joinedEvents);
    if (initialUserId) {
      try {
        const saved = localStorage.getItem(storageKeyJoined(initialUserId));
        if (saved) return normalizeJoinedEvents(JSON.parse(saved));
      } catch {
        /* noop */
      }
    }
    return [];
  });

  const [attendedEvents, setAttendedEvents] = useState(() => {
    if (initialUser?.attendedEvents?.length > 0) {
      return initialUser.attendedEvents.map((id) => String(id));
    }
    if (initialUserId) {
      try {
        const saved = localStorage.getItem(storageKeyAttended(initialUserId));
        if (saved) return JSON.parse(saved).map((id) => String(id));
      } catch {
        /* noop */
      }
    }
    return [];
  });

  const [totalPoints, setTotalPoints] = useState(() => readInitialTotalPoints(initialUser));

  const syncUserLocal = (updated) => {
    try {
      const current = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...current, ...updated }));
    } catch {
      /* noop */
    }
  };

  const handleAchievementBadges = useCallback((badges) => {
    setUser((prev) => (prev ? { ...prev, badges } : prev));
    try {
      const cur = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...cur, badges }));
    } catch {
      /* noop */
    }
  }, []);

  const loadDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setEventsLoading(false);
      return;
    }

    setEventsLoading(true);
    try {
      let profileData = null;
      const [profileRes, eventsRes, notifRes] = await Promise.all([
        apiFetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/events', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (profileRes.ok) {
        profileData = await profileRes.json();
        setUser(profileData);
        syncUserLocal(profileData);
        if (Array.isArray(profileData.joinedEvents)) {
          setJoinedEvents(normalizeJoinedEvents(profileData.joinedEvents));
        }
        if (Array.isArray(profileData.attendedEvents)) {
          setAttendedEvents(profileData.attendedEvents.map((id) => String(id)));
        }
        if (typeof profileData.points === 'number') {
          setTotalPoints(profileData.points);
          try {
            const uid = profileData._id ? String(profileData._id) : '';
            if (uid) localStorage.setItem(storageKeyTotalPoints(uid), String(profileData.points));
          } catch {
            /* noop */
          }
        }
      }

      if (eventsRes.ok) {
        const eventData = await eventsRes.json();
        const list = Array.isArray(eventData) ? eventData : [];
        setEvents(list.map(normalizeEvent));
        setDashboardError('');

        const visibleEventIds = list.map((ev) => String(ev._id));
        const currentJoinedIds = profileData && Array.isArray(profileData.joinedEvents)
          ? profileData.joinedEvents.map((id) => String(id))
          : joinedEvents;
        setStaleRegisteredEventsCount(
          currentJoinedIds.filter((id) => !visibleEventIds.includes(id)).length,
        );

        if (profileData && Array.isArray(profileData.attendedEvents)) {
          const missingAttendedIds = profileData.attendedEvents
            .map((id) => String(id))
            .filter((id) => !visibleEventIds.includes(id));

          if (missingAttendedIds.length > 0) {
            const detailsRes = await apiFetch(`/api/events/details?ids=${missingAttendedIds.join(',')}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (detailsRes.ok) {
              const extraEvents = await detailsRes.json();
              setStaleAttendedEvents(Array.isArray(extraEvents) ? extraEvents.map(normalizeEvent) : []);
            } else {
              setStaleAttendedEvents([]);
            }
          } else {
            setStaleAttendedEvents([]);
          }
        } else {
          setStaleAttendedEvents([]);
        }
      } else {
        const errorData = await eventsRes.json().catch(() => ({}));
        setDashboardError(errorData.message || 'Unable to load events.');
        setEvents([]);
        setStaleAttendedEvents([]);
        setStaleRegisteredEventsCount(0);
      }

      if (notifRes.ok) {
        const nd = await notifRes.json();
        const raw = Array.isArray(nd.items) ? nd.items : [];
        setNotifications(
          raw.map((n) => ({
            id: String(n._id),
            type: n.type || '',
            title: n.title || 'Notification',
            text: n.body || '',
            time: formatTimeAgo(n.createdAt),
            read: Boolean(n.read),
          }))
        );
        const unread = typeof nd.unreadCount === 'number' ? nd.unreadCount : raw.filter((n) => !n.read).length;
        const unpublishedNotifications = raw.filter((n) => !n.read && n.type === 'event_unpublished');
        if (unpublishedNotifications.length > 0) {
          setEntryBanner(
            unpublishedNotifications.length === 1
              ? `🔔 ${unpublishedNotifications[0].body}`
              : `🔔 ${unpublishedNotifications.length} events you registered for are no longer happening.`,
          );
        } else if (unread > 0) {
          const previews = raw
            .filter((n) => !n.read)
            .slice(0, 3)
            .map((n) => n.title)
            .join(' · ');
          setEntryBanner(previews ? `${unread} new notification(s): ${previews}` : `${unread} new notification(s) — open the bell.`);
        } else {
          setEntryBanner('');
        }
      }
    } catch {
      setDashboardError('Unable to load dashboard data.');
      setEvents([]);
      setStaleRegisteredEventsCount(0);
      setStaleAttendedEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const onWindowFocus = () => {
      loadDashboardData();
    };
    window.addEventListener('focus', onWindowFocus);
    return () => window.removeEventListener('focus', onWindowFocus);
  }, []);

  useEffect(() => {
    if (location.state?.openCommunity) setActiveTab('community');
  }, [location.state?.openCommunity]);

  useEffect(() => {
    if (!entryBanner) return undefined;
    const t = setTimeout(() => setEntryBanner(''), 14000);
    return () => clearTimeout(t);
  }, [entryBanner]);

  useEffect(() => {
    const uid = user?._id ? String(user._id) : '';
    if (!uid) return;
    localStorage.setItem(storageKeyJoined(uid), JSON.stringify(joinedEvents));
  }, [joinedEvents, user?._id]);

  useEffect(() => {
    const uid = user?._id ? String(user._id) : '';
    if (!uid) return;
    localStorage.setItem(storageKeyAttended(uid), JSON.stringify(attendedEvents));
  }, [attendedEvents, user?._id]);

  useEffect(() => {
    const uid = user?._id ? String(user._id) : '';
    if (!uid) return;
    localStorage.setItem(storageKeyTotalPoints(uid), totalPoints.toString());
  }, [totalPoints, user?._id]);

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
        (ev.title || '').toLowerCase().includes(q.toLowerCase()) ||
        (ev.location || '').toLowerCase().includes(q.toLowerCase()) ||
        (ev.category || '').toLowerCase().includes(q.toLowerCase());
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
    return events
      .filter((ev) => joinedEvents.includes(ev.id) && (!attendedEvents.includes(ev.id) || !isPastEvent(ev)))
      .sort((a, b) => (a.startDateISO || '').localeCompare(b.startDateISO || ''));
  }, [events, joinedEvents, attendedEvents]);

  const attendedEventsData = useMemo(() => {
    const current = events.filter((ev) => attendedEvents.includes(ev.id));
    const allEvents = [...current, ...staleAttendedEvents];
    return Array.from(new Map(allEvents.map((ev) => [ev.id, ev])).values())
      .filter((ev) => isPastEvent(ev))
      .sort((a, b) => {
        if (a.startDateISO && b.startDateISO) return b.startDateISO.localeCompare(a.startDateISO);
        if (a.startDateISO) return -1;
        if (b.startDateISO) return 1;
        return 0;
      });
  }, [events, attendedEvents, staleAttendedEvents]);

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
      const meRes = await apiFetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      if (meRes.ok) {
        const profileData = await meRes.json();
        setUser(profileData);
        syncUserLocal(profileData);
        if (Array.isArray(profileData.joinedEvents)) {
          setJoinedEvents(normalizeJoinedEvents(profileData.joinedEvents));
        }
      } else {
        setJoinedEvents([...joinedEvents, eventId]);
        setUser((prev) => (prev ? { ...prev, joinedEvents: [...(prev.joinedEvents || []), eventId] } : prev));
      }
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

      const meRes = await apiFetch('/api/users/me', { headers: { Authorization: `Bearer ${token}` } });
      if (meRes.ok) {
        const profileData = await meRes.json();
        setUser(profileData);
        syncUserLocal(profileData);
        if (Array.isArray(profileData.joinedEvents)) {
          setJoinedEvents(normalizeJoinedEvents(profileData.joinedEvents));
        }
        if (Array.isArray(profileData.attendedEvents)) {
          setAttendedEvents(profileData.attendedEvents.map((id) => String(id)));
        }
      } else {
        setJoinedEvents(joinedEvents.filter((id) => id !== eventId));
        setAttendedEvents(attendedEvents.filter((id) => id !== eventId));
        setUser((prev) =>
          prev
            ? {
                ...prev,
                joinedEvents: (prev.joinedEvents || []).filter((id) => String(id) !== String(eventId)),
                attendedEvents: (prev.attendedEvents || []).filter((id) => String(id) !== String(eventId)),
              }
            : prev,
        );
      }
      alert('✓ You have cancelled this event registration.');
    } catch {
      alert('Unable to cancel registration. Please try again.');
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

  const openEventLocationOnMap = (event) => {
    navigate('/map', {
      state: {
        fromAuth: true,
        user,
        selectedEvent: {
          title: event.title || 'Event',
          location: event.location || '',
          address: event.address || event.location || '',
        },
      },
    });
  };

  const handleClearAllNotifications = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      await apiFetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setEntryBanner('');
    } catch {
      /* noop */
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-scroll">
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
              <button type="button" className="nav-item" onClick={() => navigate('/complaints')}>
                <span className="nav-icon">📋</span>
                <span>Complaints</span>
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
        </div>

        <div className="sidebar-footer-portal">
          <button type="button" className="sidebar-footer-btn sidebar-footer-btn-primary" onClick={() => loadDashboardData()}>
            Refresh
          </button>
          <button type="button" className="sidebar-footer-btn" onClick={handleLogout}>
            Logout
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">😊</div>
            <div className="user-info">
              <span className="user-name">{firstName}</span>
              <span className="user-points">{userStats.totalPoints} points</span>
            </div>
            <div className="sidebar-buttons">
              <button type="button" className="reset-btn" onClick={handleResetPoints} title="Reset points (local)">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-9 9 9.76 9.76 0 0 1-6.74-2.74L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {activeTab === 'rewards' ? (
          <Rewards
            userId={user?._id ? String(user._id) : null}
            userPoints={totalPoints}
            attendedCount={Array.isArray(attendedEvents) ? attendedEvents.length : 0}
            onBadgesUpdated={handleAchievementBadges}
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
                    {unreadNotificationCount > 0 ? (
                      <div style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', color: 'white', fontSize: 10, minWidth: 16, height: 16, padding: '0 4px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                      </div>
                    ) : null}
                  </button>
                  {showNotifications && (
                    <div style={{ position: 'absolute', top: 40, right: 0, width: 320, maxHeight: 380, overflowY: 'auto', background: 'white', borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000, padding: 16, border: '1px solid #e5e7eb', textAlign: 'left' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f3f4f6', paddingBottom: 8, marginBottom: 12 }}>
                        <h4 style={{ margin: 0, color: '#111827' }}>Notifications</h4>
                        {notifications.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => handleClearAllNotifications()}
                            style={{ background: 'none', border: 'none', color: '#6366f1', fontSize: 12, cursor: 'pointer', padding: 0 }}
                          >
                            Mark all read
                          </button>
                        ) : null}
                      </div>

                      {notifications.length === 0 ? (
                        <div style={{ padding: '16px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Nothing yet — new events and admin replies appear here.</div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            style={{
                              padding: '10px 0',
                              borderBottom: '1px solid #f3f4f6',
                              fontSize: 14,
                              opacity: n.read ? 0.65 : 1,
                            }}
                          >
                            <div style={{ fontWeight: 600, color: '#111827' }}>{n.title}</div>
                            <div style={{ fontWeight: 400, color: '#374151', marginTop: 4 }}>{n.text}</div>
                            <div style={{ color: '#9ca3af', fontSize: 12, marginTop: 4 }}>{n.time}</div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button type="button" className="map-view-btn" onClick={() => navigate('/complaints')}>
                  📋 Complaints
                </button>
              </div>
            </header>

            {entryBanner ? (
              <div
                className="feedback"
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  background: '#eef2ff',
                  borderColor: '#c7d2fe',
                  color: '#312e81',
                }}
              >
                <span>🔔 {entryBanner}</span>
                <button type="button" className="filter-btn" onClick={() => setEntryBanner('')}>
                  Dismiss
                </button>
              </div>
            ) : null}

            {staleRegisteredEventsCount > 0 ? (
              <div className="feedback" style={{ background: '#fef3c7', borderColor: '#fde68a', color: '#92400e' }}>
                🔔 Some events you registered for were removed by the organizer and are no longer available on your dashboard.
              </div>
            ) : null}

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

            {eventsLoading && <div className="feedback">Loading events from the server…</div>}
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

            {registeredEventsData.length > 0 && (
              <section className="registered-events">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
                  <h2 style={{ margin: 0 }}>My Registered Events</h2>
                  <button type="button" className="filter-btn" onClick={() => loadDashboardData()}>
                    Refresh status
                  </button>
                </div>
                <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
                  You&apos;re signed up — when the event runs, take part as planned. After it ends, your organizer confirms attendance and points are added.
                </p>
                <div className="events-grid">
                  {registeredEventsData.map((event) => (
                    <div className="event-card registered" key={event.id}>
                      <div className="event-card-header">
                        <h3>{event.title}</h3>
                        <div className="event-reward">
                          <span>⭐</span>
                          <span className="reward-points">{event.points} pts after the event</span>
                        </div>
                      </div>
                      <span className="event-badge registered-badge">{event.category}</span>
                      <div className="event-details">
                        {event.organizationName?.trim() ? (
                          <p className="event-org-name">🏢 {event.organizationName.trim()}</p>
                        ) : null}
                        {event.postedByName ? (
                          <p className="event-posted-by">📤 Posted by {event.postedByName}</p>
                        ) : null}
                        <p>📅 {formatEventDate(event)}</p>
                        <p>
                          📍{' '}
                          <button
                            type="button"
                            className="event-location-link"
                            onClick={() => openEventLocationOnMap(event)}
                          >
                            {event.location}
                          </button>
                        </p>
                        <p>{volunteerSummaryLine(event)}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <div className="event-actions">
                        {attendedEvents.includes(event.id) ? (
                          <span className="event-badge attended-badge" style={{ cursor: 'default' }}>
                            ✓ Marked attended
                          </span>
                        ) : (
                          <>
                            <span className="event-badge attended-badge" style={{ cursor: 'default' }}>
                              ✓ Registered — waiting for the event
                            </span>
                            <button type="button" className="cancel-btn" onClick={() => handleUnjoinEvent(event.id)}>
                              Cancel registration
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

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
                        {event.organizationName?.trim() ? (
                          <p className="event-org-name">🏢 {event.organizationName.trim()}</p>
                        ) : null}
                        {event.postedByName ? (
                          <p className="event-posted-by">📤 Posted by {event.postedByName}</p>
                        ) : null}
                        <p>📅 {formatEventDate(event)}</p>
                        <p>
                          📍{' '}
                          <button
                            type="button"
                            className="event-location-link"
                            onClick={() => openEventLocationOnMap(event)}
                          >
                            {event.location}
                          </button>
                        </p>
                        <p>{volunteerSummaryLine(event)}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <button className="join-btn" onClick={() => handleJoinEvent(event.id)} disabled={eventsLoading}>Join Event</button>
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
                        {event.organizationName?.trim() ? (
                          <p className="event-org-name">🏢 {event.organizationName.trim()}</p>
                        ) : null}
                        {event.postedByName ? (
                          <p className="event-posted-by">📤 Posted by {event.postedByName}</p>
                        ) : null}
                        <p>📅 {formatEventDate(event)}</p>
                        <p>
                          📍{' '}
                          <button
                            type="button"
                            className="event-location-link"
                            onClick={() => openEventLocationOnMap(event)}
                          >
                            {event.location}
                          </button>
                        </p>
                        <p>{volunteerSummaryLine(event)}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <button className="join-btn" onClick={() => handleJoinEvent(event.id)} disabled={eventsLoading}>Join Event</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {attendedEventsData.length > 0 && (
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
                        {event.organizationName?.trim() ? (
                          <p className="event-org-name">🏢 {event.organizationName.trim()}</p>
                        ) : null}
                        {event.postedByName ? (
                          <p className="event-posted-by">📤 Posted by {event.postedByName}</p>
                        ) : null}
                        <p>📅 {formatEventDate(event)}</p>
                        <p>
                          📍{' '}
                          <button
                            type="button"
                            className="event-location-link"
                            onClick={() => openEventLocationOnMap(event)}
                          >
                            {event.location}
                          </button>
                        </p>
                        <p>{volunteerSummaryLine(event)}</p>
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
