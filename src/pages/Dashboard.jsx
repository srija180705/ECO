import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css';
import { mockDB } from '../data/mockData';

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state && location.state.user;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showNotifications, setShowNotifications] = useState(false);

  const [notifications, setNotifications] = useState([
    { id: 1, text: 'New event in your area: Beach Cleanup', time: '2 hours ago' },
    { id: 2, text: 'You earned 50 points!', time: '1 day ago' },
  ]);

  // Join event state management with localStorage persistence
  const [joinedEvents, setJoinedEvents] = useState(() => {
    const saved = localStorage.getItem('eco_joined_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [attendedEvents, setAttendedEvents] = useState(() => {
    const saved = localStorage.getItem('eco_attended_events');
    return saved ? JSON.parse(saved) : [];
  });

  const [totalPoints, setTotalPoints] = useState(() => {
    const saved = localStorage.getItem('eco_total_points');
    return saved ? parseInt(saved) : 0;
  });

  // Persist to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('eco_joined_events', JSON.stringify(joinedEvents));
  }, [joinedEvents]);

  useEffect(() => {
    localStorage.setItem('eco_attended_events', JSON.stringify(attendedEvents));
  }, [attendedEvents]);

  useEffect(() => {
    localStorage.setItem('eco_total_points', totalPoints.toString());
  }, [totalPoints]);

  // Calculate user stats
  const userStats = useMemo(() => {
    const mockUser = mockDB.users[0];
    return {
      totalPoints: totalPoints,
      eventsJoined: joinedEvents.length,
      nearbyEvents: 0,
      badgesEarned: user?.badges?.length ?? 0,
    };
  }, [totalPoints, joinedEvents, user]);

  const filteredEvents = useMemo(() => {
    return mockDB.events.filter((ev) => {
      // Show only events user hasn't registered for yet
      const isNotJoined = !joinedEvents.includes(ev.id);
      const matchQ =
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        ev.location.toLowerCase().includes(q.toLowerCase()) ||
        ev.category.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "all" || ev.category.toLowerCase() === category.toLowerCase();
      return isNotJoined && matchQ && matchCat;
    });
  }, [q, category, joinedEvents]);

  const registeredEventsData = useMemo(() => {
    return mockDB.events.filter(ev => joinedEvents.includes(ev.id) && !attendedEvents.includes(ev.id));
  }, [joinedEvents, attendedEvents]);

  const attendedEventsData = useMemo(() => {
    return mockDB.events.filter(ev => attendedEvents.includes(ev.id));
  }, [attendedEvents]);

  // Handle join event
  const handleJoinEvent = (eventId) => {
    if (!joinedEvents.includes(eventId)) {
      setJoinedEvents([...joinedEvents, eventId]);
      alert('✓ Event registered successfully!');
    }
  };

  // Handle unjoin event
  const handleUnjoinEvent = (eventId) => {
    setJoinedEvents(joinedEvents.filter(id => id !== eventId));
    // Also remove from attended if they attended and unjoin
    setAttendedEvents(attendedEvents.filter(id => id !== eventId));
    alert('✓ You have cancelled this event registration.');
  };

  // Handle mark as attended - with date validation
  const handleMarkAttended = (eventId) => {
    const event = mockDB.events.find(e => e.id === eventId);
    if (!event) return;

    const eventDate = new Date(event.dateISO);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    // Only allow marking as attended if event date has passed
    if (eventDate >= today) {
      alert(`❌ You can only mark this event as attended after ${eventDate.toDateString()}!`);
      return;
    }

    // Mark as attended
    setAttendedEvents([...attendedEvents, eventId]);
    // Award points
    const points = event.points || 0;
    setTotalPoints(totalPoints + points);
    alert(`✓ Attendance confirmed! You earned ${points} points!`);
  };

  // Handle reset points
  const handleResetPoints = () => {
    if (window.confirm('Are you sure you want to reset all points and clear all registered events? This cannot be undone.')) {
      setJoinedEvents([]);
      setAttendedEvents([]);
      setTotalPoints(0);
      alert('✓ Points and events have been reset.');
    }
  };

  const handleLogout = () => {
    navigate('/auth');
  };

  const handleOpenMap = () => {
    navigate('/map', { state: { fromAuth: true, user } });
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
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
            <button type="button" className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
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

      {/* Main Content */}
      <main className="dashboard-main">
        {activeTab === 'dashboard' ? (
          <>
            <header className="dashboard-header">
              <div className="header-title">
                <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
                <p>Find your next volunteering opportunity</p>
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                {/* Notification Bell */}
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

            {/* Stats Cards */}
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

            {/* Upcoming Events */}
            <section className="upcoming-events">
              <h2>Upcoming Events Near You</h2>
              {filteredEvents.length === 0 ? (
                <div className="no-events">
                  <p>No more available events. You've registered for all!</p>
                </div>
              ) : (
                <div className="events-grid">
                  {filteredEvents.map(event => (
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
                        <p>📅 {new Date(event.dateISO).toDateString()}</p>
                        <p>📍 {event.location}</p>
                        <p>📏 {event.distanceKm} km away</p>
                      </div>
                      <button className="join-btn" onClick={() => handleJoinEvent(event.id)}>Join Event</button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* My Registered Events */}
            {joinedEvents.length > 0 && (
              <section className="registered-events">
                <h2>My Registered Events</h2>
                <div className="events-grid">
                  {registeredEventsData.map(event => {
                    const eventDate = new Date(event.dateISO);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    eventDate.setHours(0, 0, 0, 0);
                    const isPastEvent = eventDate < today;

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
                          <p>📅 {new Date(event.dateISO).toDateString()}</p>
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

            {/* Events Attended */}
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
                        <p>📅 {new Date(event.dateISO).toDateString()}</p>
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
        ) : (
          <div className="coming-soon-container">
            <div className="coming-soon-icon">🚧</div>
            <h2 className="coming-soon-title">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
            <p className="coming-soon-text">Coming Soon</p>
            <p className="coming-soon-subtext">We're working hard to bring this feature to you. Stay tuned!</p>
            <button className="coming-soon-btn" onClick={() => setActiveTab('dashboard')}>Back to Dashboard</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;