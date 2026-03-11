import React, { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import './Dashboard.css';
import { mockDB } from '../data/mockData';

function Dashboard() {
  const location = useLocation();
  const user = location.state && location.state.user;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");

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

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">
            {/* Leaf SVG */}
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
          <a href="#" className="nav-item active">
            <span className="nav-icon">🏠</span>
            Home
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">👥</span>
            Community
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">📍</span>
            Map
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">🎁</span>
            Rewards
          </a>
          <a href="#" className="nav-item">
            <span className="nav-icon">👤</span>
            Profile
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
            <p>Find your next volunteering opportunity</p>
          </div>
          <button className="map-view-btn">
            <span className="icon">🗺️</span> Map View
          </button>
        </header>

        <div className="search-filter-bar">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search events by name, location, or category..." 
              className="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <button className="filter-btn">
             <span>⚙️</span> Filters
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

        <div className="stats-grid">
          <div className="stat-card stat-green">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">🏵️</span>
            </div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Total Points</p>
            </div>
          </div>
          <div className="stat-card stat-blue">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">📅</span>
            </div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Events Joined</p>
            </div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">📍</span>
            </div>
            <div className="stat-info">
              <h3>0</h3>
              <p>Nearby Events</p>
            </div>
          </div>
          <div className="stat-card stat-orange">
            <div className="stat-icon-wrapper">
              <span className="stat-icon">🏆</span>
            </div>
            <div className="stat-info">
              <h3>1</h3>
              <p>Badges Earned</p>
            </div>
          </div>
        </div>

        <section className="upcoming-events">
          <h2>Upcoming Events Near You</h2>
          <div className="events-grid">
            {filteredEvents.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "#666", gridColumn: "1 / -1" }}>
                No events found. Try adjusting your search or filters.
              </div>
            ) : (
              filteredEvents.map(event => (
                <div className="event-card" key={event.id}>
                  <div className="event-card-header">
                    <h3>{event.title}</h3>
                    <div className="event-reward">
                      <span className="reward-icon">🏵️</span>
                      <span className="reward-points">{event.points}</span>
                    </div>
                    <button className="join-btn">Join</button>
                  </div>
                  <span className="event-badge">{event.category}</span>
                  <div className="event-details">
                    <p>📅 {new Date(event.dateISO).toDateString()}</p>
                    <p>📍 {event.location} {event.distanceKm ? `(${event.distanceKm} km)` : ''}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
