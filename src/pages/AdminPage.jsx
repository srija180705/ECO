import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { apiFetch, API_BASE } from '../api.js'

function AdminPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null')
  const user = location.state?.user || storedUser
  const firstName = user?.name ? user.name.split(' ')[0] : 'Admin'

  const resolveUploadUrl = (url) => {
    if (!url) return url
    return url.startsWith('http') ? url : `${API_BASE}${url}`
  }

  const [activeTab, setActiveTab] = useState('events')
  const [events, setEvents] = useState([])
  const [grievances, setGrievances] = useState([])
  const [organizers, setOrganizers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [adminReplyDrafts, setAdminReplyDrafts] = useState({})

  const token = localStorage.getItem('token')

  useEffect(() => {
    const loadAdminData = async () => {
      if (!token) {
        setError('Login required');
        setLoading(false);
        return;
      }

      try {
        const [eventsRes, grievancesRes, organizersRes] = await Promise.all([
          apiFetch('/api/events/admin', { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch('/api/grievances/admin', { headers: { Authorization: `Bearer ${token}` } }),
          apiFetch('/api/auth/admin/organizers', { headers: { Authorization: `Bearer ${token}` } })
        ])

        if (!eventsRes.ok || !grievancesRes.ok || !organizersRes.ok) {
          const errorBody = !eventsRes.ok
            ? await eventsRes.json().catch(() => null)
            : !grievancesRes.ok
            ? await grievancesRes.json().catch(() => null)
            : await organizersRes.json().catch(() => null)
          setError(errorBody?.message || 'Failed to load admin data')
          return
        }

        setEvents(await eventsRes.json())
        setGrievances(await grievancesRes.json())
        setOrganizers(await organizersRes.json())
      } catch (err) {
        setError(err.message || 'Failed to load admin data')
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [token])

  const groupEvents = useMemo(() => {
    const categories = {
      'To Be Approved': [],
      'To Be Happened': [],
      Happening: [],
      Closed: []
    }

    const now = new Date()

    events.forEach((event) => {
      if (!event.approved && event.status !== 'rejected') {
        categories['To Be Approved'].push(event)
        return
      }
      if (event.status === 'rejected') return
      const start = new Date(event.startDateISO)
      const end = new Date(event.endDateISO)
      if (now > end) {
        categories.Closed.push(event)
      } else if (now >= start) {
        categories.Happening.push(event)
      } else {
        categories['To Be Happened'].push(event)
      }
    })

    return categories
  }, [events])

  const refreshAdminData = async () => {
    setLoading(true)
    setError('')
    try {
      const [eventsRes, grievancesRes, organizersRes] = await Promise.all([
        apiFetch('/api/events/admin', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/grievances/admin', { headers: { Authorization: `Bearer ${token}` } }),
        apiFetch('/api/auth/admin/organizers', { headers: { Authorization: `Bearer ${token}` } })
      ])
      if (!eventsRes.ok || !grievancesRes.ok || !organizersRes.ok) {
        const errorBody = !eventsRes.ok
          ? await eventsRes.json().catch(() => null)
          : !grievancesRes.ok
          ? await grievancesRes.json().catch(() => null)
          : await organizersRes.json().catch(() => null)
        setError(errorBody?.message || 'Unable to refresh admin data')
        return
      }
      setEvents(await eventsRes.json())
      setGrievances(await grievancesRes.json())
      setOrganizers(await organizersRes.json())
    } catch (err) {
      setError(err.message || 'Unable to refresh admin data')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (eventId) => {
    try {
      const res = await apiFetch(`/api/events/admin/${eventId}/approve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Unable to approve event')
      }
      refreshAdminData()
    } catch (err) {
      setError(err.message || 'Unable to approve event')
    }
  }

  const handleDecline = async (eventId) => {
    try {
      const res = await apiFetch(`/api/events/admin/${eventId}/reject`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Unable to decline event')
      }
      refreshAdminData()
    } catch (err) {
      setError(err.message || 'Unable to decline event')
    }
  }

  const handleClose = async (eventId) => {
    try {
      const res = await apiFetch(`/api/events/admin/${eventId}/close`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || 'Unable to close event')
      }
      refreshAdminData()
    } catch (err) {
      setError(err.message || 'Unable to close event')
    }
  }

  const handleResolve = async (grievanceId) => {
    try {
      await apiFetch(`/api/grievances/admin/${grievanceId}/resolve`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      })
      refreshAdminData()
    } catch (err) {
      setError(err.message || 'Unable to resolve grievance')
    }
  }

  const handleSendComplaintReply = async (grievanceId) => {
    const messageText = (adminReplyDrafts[grievanceId] ?? '').trim()
    if (!messageText) {
      setError('Write a reply to send to the complainant.')
      return
    }
    setError('')
    try {
      const res = await apiFetch(`/api/grievances/admin/${grievanceId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminResponse: messageText,
          status: 'resolved',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || 'Unable to save reply')
      }
      setAdminReplyDrafts((prev) => ({ ...prev, [grievanceId]: '' }))
      await refreshAdminData()
    } catch (err) {
      setError(err.message || 'Unable to save reply')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/auth', { replace: true })
  }

  if (loading) {
    return <div className="coming-soon-container"><p>Loading admin dashboard...</p></div>
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-top">
            <div className="sidebar-brand">
              <div className="brand-logo">🏢</div>
              <div>
                <h1 className="brand-name">Admin</h1>
                <span className="brand-subtitle">Control Panel</span>
              </div>
            </div>

            <nav className="sidebar-nav">
              <button type="button" className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>
                <span className="nav-icon">🗂️</span>
                <span>Events</span>
              </button>
              <button type="button" className={`nav-item ${activeTab === 'organizers' ? 'active' : ''}`} onClick={() => setActiveTab('organizers')}>
                <span className="nav-icon">🧑‍🤝‍🧑</span>
                <span>Organizers</span>
              </button>
              <button type="button" className={`nav-item ${activeTab === 'grievances' ? 'active' : ''}`} onClick={() => setActiveTab('grievances')}>
                <span className="nav-icon">⚠️</span>
                <span>Grievances</span>
              </button>
            </nav>
          </div>
        </div>
        <div className="sidebar-footer-portal">
          <button type="button" className="sidebar-footer-btn sidebar-footer-btn-primary" onClick={() => refreshAdminData()}>
            Refresh
          </button>
          <button type="button" className="sidebar-footer-btn" onClick={handleLogout}>
            Logout
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">{(firstName && firstName[0]) ? firstName[0] : 'A'}</div>
            <div className="user-info">
              <span className="user-name">{firstName}</span>
              <span className="user-points">Administrator</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h2>Admin panel</h2>
            <p>Welcome back, {firstName}. Manage events and grievances here.</p>
          </div>
        </header>

        {error && <div className="no-events"><p>{error}</p></div>}

        {activeTab === 'events' ? (
          <div>
            <div className="search-filter-bar">
              <div>
                <h3>Event Categories</h3>
                <p>Approved events are shown to users once they enter the schedule category.</p>
              </div>
            </div>

            <div className="stats-grid">
              {Object.entries(groupEvents).map(([key, list]) => (
                <div key={key} className="stat-card stat-blue">
                  <div className="stat-icon-wrapper">{key === 'Closed' ? '✔️' : key === 'Happening' ? '🔥' : key === 'To Be Approved' ? '⏳' : '🕓'}</div>
                  <div className="stat-info">
                    <h3>{list.length}</h3>
                    <p>{key}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="events-grid">
              {Object.entries(groupEvents).map(([categoryTitle, list]) => (
                <div key={categoryTitle} className="event-card">
                  <h3>{categoryTitle}</h3>
                  {list.length === 0 ? (
                    <p>No events in this category.</p>
                  ) : (
                    list.map((event) => (
                      <div key={event._id} className="event-card" style={{ marginBottom: '12px' }}>
                        <div className="event-card-header">
                          <h4>{event.title}</h4>
                          <span className="event-badge">{event.category}</span>
                        </div>
                        <div className="event-details">
                          <p><strong>Org:</strong> {event.organizationName}</p>
                          <p><strong>When:</strong> {new Date(event.startDateISO).toDateString()} - {new Date(event.endDateISO).toDateString()}</p>
                          <p><strong>Location:</strong> {event.location}</p>
                        </div>
                        <div className="event-details">
                          <p>{event.description}</p>
                          {event.permissionPdf && (
                            <p>
                              <strong>Permission PDF:</strong>{' '}
                              <a href={resolveUploadUrl(event.permissionPdf)} target="_blank" rel="noreferrer">View document</a>
                            </p>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          {!event.approved && (
                            <>
                              <button className="join-btn" onClick={() => handleApprove(event._id)}>Approve</button>
                              <button className="join-btn decline-btn" onClick={() => handleDecline(event._id)}>Decline</button>
                            </>
                          )}
                          {event.approved && categoryTitle !== 'Closed' && (
                            <button className="join-btn" onClick={() => handleClose(event._id)}>Close</button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : activeTab === 'organizers' ? (
          <div>
            <div className="search-filter-bar">
              <h3>Registered Organizers</h3>
              <p>All organizers who registered in the platform are listed below.</p>
            </div>

            <div className="events-grid">
              {organizers.length === 0 ? (
                <p>No organizers registered yet.</p>
              ) : (
                organizers.map((organizer) => (
                  <div key={organizer._id} className="event-card">
                    <div className="event-card-header">
                      <h4>{organizer.name}</h4>
                    </div>
                    <div className="event-details">
                      <p><strong>Email:</strong> {organizer.email}</p>
                      <p><strong>City:</strong> {organizer.city}</p>
                      <p><strong>Role:</strong> {organizer.role}</p>
                      <p><strong>Registered:</strong> {organizer.createdAt ? new Date(organizer.createdAt).toLocaleString() : 'N/A'}</p>
                      {organizer.permissionSlipUrl && (
                        <p>
                          <strong>Permission Slip:</strong>{' '}
                          <a href={resolveUploadUrl(organizer.permissionSlipUrl)} target="_blank" rel="noreferrer">View document</a>
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="search-filter-bar">
              <h3>Pending grievances</h3>
            </div>

            <div className="events-grid">
              {grievances.length === 0 ? (
                <p>No grievances yet.</p>
              ) : (
                grievances.map((grievance) => (
                  <div key={grievance._id} className="event-card">
                    <div className="event-card-header">
                      <h4>
                        {grievance.referenceId
                          ? `${grievance.referenceId} — ${grievance.complaintType || 'Complaint'}`
                          : (grievance.eventName || 'Grievance')}
                      </h4>
                      <span className="event-badge">{grievance.status}</span>
                    </div>
                    <div className="event-details">
                      {grievance.referenceId && (
                        <>
                          <p><strong>Name:</strong> {grievance.submitterName || '—'}</p>
                          <p><strong>Role:</strong> {grievance.role || '—'}</p>
                          <p><strong>Type:</strong> {grievance.complaintType || '—'}</p>
                        </>
                      )}
                      <p><strong>Email:</strong> {grievance.userEmail}</p>
                      {(grievance.organizationName || grievance.eventName) && !grievance.referenceId && (
                        <>
                          <p><strong>Event:</strong> {grievance.eventName || '—'}</p>
                          <p><strong>Organization:</strong> {grievance.organizationName || '—'}</p>
                        </>
                      )}
                      <p><strong>Details:</strong> {grievance.description}</p>
                      {grievance.adminResponse ? (
                        <p><strong>Message sent to user:</strong> {grievance.adminResponse}</p>
                      ) : null}
                    </div>
                    {grievance.status === 'open' ? (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                          Reply to complainant (visible on their Complaints page)
                        </label>
                        <textarea
                          rows={4}
                          placeholder="Address their concern and explain next steps…"
                          value={adminReplyDrafts[grievance._id] ?? ''}
                          onChange={(e) =>
                            setAdminReplyDrafts((prev) => ({ ...prev, [grievance._id]: e.target.value }))
                          }
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            borderRadius: 8,
                            border: '1px solid #e5e7eb',
                            marginBottom: 10,
                            resize: 'vertical',
                          }}
                        />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                          <button type="button" className="join-btn" onClick={() => handleSendComplaintReply(grievance._id)}>
                            Send reply & mark resolved
                          </button>
                          <button
                            type="button"
                            className="cancel-btn"
                            onClick={() => handleResolve(grievance._id)}
                          >
                            Mark resolved (no message)
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default AdminPage
