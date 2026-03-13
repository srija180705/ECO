import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { mockDB } from '../data/mockData'

function Profile() {
  const location = useLocation()
  const navigate = useNavigate()

  const fallbackUser = mockDB.users[0]
  const incomingUser = location.state && location.state.user

  const resolvedUser = useMemo(() => {
    if (!incomingUser && fallbackUser) return fallbackUser

    if (!incomingUser) return null

    const byEmail = mockDB.users.find((u) => u.email === incomingUser.email)
    const base = byEmail || fallbackUser || {}

    return { ...base, ...incomingUser }
  }, [incomingUser, fallbackUser])

  const joinedEvents = useMemo(() => {
    if (!resolvedUser) return []
    const ids = resolvedUser.joinedEventIds || []
    return ids
      .map((id) => mockDB.events.find((e) => e.id === id))
      .filter(Boolean)
      .sort((a, b) => new Date(b.dateISO) - new Date(a.dateISO))
  }, [resolvedUser])

  const totalPoints = resolvedUser?.points ?? joinedEvents.reduce((sum, ev) => sum + (ev.points || 0), 0)

  const earnedBadges = useMemo(() => {
    if (!resolvedUser) return []
    const badgeIds = resolvedUser.badges || []
    return badgeIds
      .map((id) => mockDB.badges.find((b) => b.id === id))
      .filter(Boolean)
  }, [resolvedUser])

  const [formData, setFormData] = useState(() => ({
    name: resolvedUser?.name || '',
    email: resolvedUser?.email || '',
    city: resolvedUser?.city || '',
    interests: (resolvedUser?.interests || []).join(', '),
    phone: resolvedUser?.phone || '',
    bio: resolvedUser?.bio || '',
    availability: resolvedUser?.availability || '',
    skills: (resolvedUser?.skills || []).join(', '),
  }))
  const [status, setStatus] = useState('')

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setStatus('')
  }

  const handleSave = (e) => {
    e.preventDefault()
    setStatus('Profile updated locally (not persisted).')
  }

  const handleBackToDashboard = () => {
    const updatedUser = {
      ...resolvedUser,
      name: formData.name,
      email: formData.email,
      city: formData.city,
      interests: formData.interests
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      phone: formData.phone,
      bio: formData.bio,
      availability: formData.availability,
      skills: formData.skills
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    }

    navigate('/dashboard', { state: { fromAuth: true, user: updatedUser } })
  }

  if (!resolvedUser) {
    return (
      <div style={{ padding: '32px' }}>
        <h2>Profile</h2>
        <p>No user data available.</p>
        <button onClick={() => navigate('/auth')} className="btn-primary">
          Go to Auth
        </button>
      </div>
    )
  }

  return (
    <div className="dashboard-layout profile-page">
      <main className="dashboard-main profile-main">
        <header className="profile-header">
          <div className="profile-hero">
            <div className="profile-avatar">
              <span>{resolvedUser.name?.[0] ?? 'V'}</span>
            </div>
            <div className="profile-meta">
              <h2>{resolvedUser.name}</h2>
              <p>{resolvedUser.city || 'Eco Volunteer Match'}</p>
              <div className="profile-meta-tags">
                <span>{resolvedUser.email}</span>
                <span>{(resolvedUser.interests || []).join(' • ') || 'Add your interests'}</span>
              </div>
            </div>
          </div>
          <button className="profile-back-btn" onClick={handleBackToDashboard}>
            Back to dashboard
          </button>
        </header>

        <section className="profile-grid">
          <div className="profile-card profile-card-main">
            <form onSubmit={handleSave} className="profile-form">
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  disabled
                />
                <small style={{ color: '#777' }}>Email comes from your account and is not editable here.</small>
              </div>

              <div className="form-group">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  name="city"
                  type="text"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Your city"
                />
              </div>

              <div className="form-group">
                <label htmlFor="interests">Interests</label>
                <input
                  id="interests"
                  name="interests"
                  type="text"
                  value={formData.interests}
                  onChange={handleChange}
                  placeholder="e.g. cleanup, planting, recycling"
                />
                <small style={{ color: '#777' }}>Comma-separated list. Used to personalize event recommendations.</small>
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone (optional)</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="Contact number for organizers"
                />
              </div>

              <div className="form-group">
                <label htmlFor="availability">Availability</label>
                <input
                  id="availability"
                  name="availability"
                  type="text"
                  value={formData.availability}
                  onChange={handleChange}
                  placeholder="e.g. Weekends, Evenings after 6 PM"
                />
              </div>

              <div className="form-group">
                <label htmlFor="skills">Skills</label>
                <input
                  id="skills"
                  name="skills"
                  type="text"
                  value={formData.skills}
                  onChange={handleChange}
                  placeholder="e.g. coordination, first aid, photography"
                />
                <small style={{ color: '#777' }}>Comma-separated list of skills you bring to events.</small>
              </div>

              <div className="form-group">
                <label htmlFor="bio">About you</label>
                <textarea
                  id="bio"
                  name="bio"
                  rows="3"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Short bio that organizers and community members will see."
                  style={{ resize: 'vertical' }}
                />
              </div>

              <button type="submit" className="btn-primary profile-save-btn">
                Save Changes
              </button>

              {status && (
                <p style={{ marginTop: '12px', color: '#2e7d32', fontWeight: 500 }}>
                  {status}
                </p>
              )}
            </form>
          </div>

          <div className="profile-secondary">
            <div className="profile-card profile-summary-card">
              <h3>Overview</h3>
              <p>
                <strong>Name:</strong> {resolvedUser.name}
              </p>
              <p>
                <strong>Total Points:</strong> {totalPoints}
              </p>
            </div>

            <div className="profile-card profile-badges-card">
              <h3>Earned Badges</h3>
              {earnedBadges.length === 0 ? (
                <p>No badges yet. Join events to start earning them!</p>
              ) : (
                <ul className="profile-badge-list">
                  {earnedBadges.map((badge) => (
                    <li key={badge.id} className="profile-badge-pill">
                      <span className="profile-badge-icon">{badge.icon}</span>
                      {badge.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <section className="profile-card profile-history-card">
          <h3>Volunteering History</h3>
          {joinedEvents.length === 0 ? (
            <p className="profile-history-empty">No volunteering activities recorded yet.</p>
          ) : (
            <div className="profile-history-scroll">
              <table className="profile-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Activity</th>
                    <th>Category</th>
                    <th>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {joinedEvents.map((ev) => (
                    <tr key={ev.id}>
                      <td>{new Date(ev.dateISO).toDateString()}</td>
                      <td>{ev.title}</td>
                      <td className="profile-history-category">{ev.category}</td>
                      <td className="profile-history-points">{ev.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Profile

