import React, { useState, useMemo } from 'react';
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

  // Calculate user stats
  const userStats = useMemo(() => {
    const mockUser = mockDB.users[0];
    return {
      totalPoints: user?.points ?? 0,
      eventsJoined: user?.joinedEventIds?.length ?? 0,
      nearbyEvents: 0,
      badgesEarned: user?.badges?.length ?? 0,
    };
  }, [user]);

  const filteredEvents = useMemo(() => {
    return mockDB.events.filter((ev) => {
      const matchQ =
        ev.title.toLowerCase().includes(q.toLowerCase()) ||
        ev.location.toLowerCase().includes(q.toLowerCase()) ||
        ev.category.toLowerCase().includes(q.toLowerCase());
      const matchCat = category === "all" || ev.category.toLowerCase() === category.toLowerCase();
      return matchQ && matchCat;
    });
  }, [q, category]);

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
          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
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
                  <p>No events found. Try adjusting your search or filters.</p>
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
                      <button className="join-btn">Join Event</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
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