import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const navigate = useNavigate();

  // Try to get user from localStorage
  const user = JSON.parse(localStorage.getItem('user')) || { name: 'Sarah' };
  const firstName = user.name.split(' ')[0];

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
            />
          </div>
          <button className="filter-btn">
             <span>⚙️</span> Filters
          </button>
          <select className="category-select">
            <option>All</option>
            <option>Cleanup</option>
            <option>Tree Planting</option>
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
            <div className="event-card">
              <div className="event-card-header">
                <h3>Necklace Road Plastic Pickup</h3>
                <div className="event-reward">
                  <span className="reward-icon">🏵️</span>
                  <span className="reward-points">50</span>
                </div>
                <button className="join-btn">Join</button>
              </div>
              <span className="event-badge">cleanup</span>
              <div className="event-details">
                <p>📅 Sun Feb 15 2026</p>
                <p>📍 Necklace Road, Hyderabad</p>
              </div>
            </div>

            <div className="event-card">
              <div className="event-card-header">
                <h3>Gachibowli Park Beach Cleanup</h3>
                <div className="event-reward">
                  <span className="reward-icon">🏵️</span>
                  <span className="reward-points">45</span>
                </div>
                <button className="join-btn">Join</button>
              </div>
              <span className="event-badge">cleanup</span>
              <div className="event-details">
                <p>📅 Mon Feb 16 2026</p>
                <p>📍 Gachibowli Stadium Park, Hyderabad</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
