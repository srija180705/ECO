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
      {/* Sidebar - Kept as team standard */}
      <aside className="sidebar">
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
          <a href="#" className="nav-item active">🏠 Home</a>
          <a href="#" className="nav-item">👥 Community</a>
          <a href="#" className="nav-item">📍 Map</a>
          <a href="#" className="nav-item">🎁 Rewards</a>
          <button
            type="button"
            className="nav-item"
            onClick={() => navigate('/profile', { state: { fromAuth: true, user } })}
            style={{ textAlign: 'left', background: 'none', border: 'none', padding: 0 }}
          >
            👤 Profile
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
            <p>Find your next volunteering opportunity</p>
          </div>
          <button 
            onClick={() => navigate('/auth')} 
            style={{ padding: '8px 16px', backgroundColor: '#d32f2f', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Logout
          </button>
        </header>

        <div className="search-filter-bar">
          <div className="search-wrapper">
            <span className="search-icon">🔍</span>
            <input 
              type="text" 
              placeholder="Search events..." 
              className="search-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
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

        <section className="upcoming-events">
          <h2>Upcoming Events Near You</h2>
          <div className="events-grid">
            {filteredEvents.map(event => (
              <div className="event-card" key={event.id}>
                <h3>{event.title}</h3>
                <p>📅 {new Date(event.dateISO).toDateString()}</p>
                <p>📍 {event.location}</p>
                <button className="join-btn">Join</button>
              </div>
            ))}
          </div>
        </section>

        {/* --- AKARSHAN'S CONTRIBUTION: MISSION & FAQ --- */}
        <section className="info-section" style={{ padding: '30px', backgroundColor: '#f9f9f9', borderRadius: '15px', marginTop: '40px', border: '1px solid #e0e0e0' }}>
          <h2 style={{ color: '#2e7d32', marginBottom: '15px' }}>About Our Mission</h2>
          <p style={{ fontSize: '1.1rem', lineHeight: '1.6' }}>
            The <b>Eco-Volunteer Match</b> platform is designed to streamline the connection between volunteers and local environmental initiatives in Hyderabad.
          </p>
          
          <h3 style={{ color: '#2e7d32', marginTop: '25px' }}>Frequently Asked Questions</h3>
          <details style={{ marginBottom: '12px', cursor: 'pointer', padding: '15px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #eee' }}>
            <summary style={{ fontWeight: 'bold' }}>How do I track my impact?</summary>
            <p style={{ marginTop: '10px', color: '#555' }}>Your dashboard updates automatically once a drive organizer confirms your participation.</p>
          </details>
          <details style={{ cursor: 'pointer', padding: '15px', backgroundColor: '#fff', borderRadius: '10px', border: '1px solid #eee' }}>
            <summary style={{ fontWeight: 'bold' }}>Can I lead my own drive?</summary>
            <p style={{ marginTop: '10px', color: '#555' }}>Currently, drive creation is restricted to verified organizers. You can apply for 'Lead' status in profile settings.</p>
          </details>
        </section>

      </main> 
    </div>
  );
}

export default Dashboard;