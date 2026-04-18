import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import './Dashboard.css'
import './OrganizerDashboard.css'

const EMPTY_EVENT_FORM = {
  title: '',
  description: '',
  dateISO: '',
  startTime: '',
  endTime: '',
  location: '',
  addressLine1: '',
  area: '',
  city: '',
  state: '',
  postalCode: '',
  landmark: '',
  requiredSkills: '',
  volunteerSlots: '',
  imageUrl: '',
}

function OrganizerDashboard() {
  const location = useLocation()
  const navigate = useNavigate()
  const storedUser = localStorage.getItem('user')
  const user = location.state?.user || (storedUser ? JSON.parse(storedUser) : null)
  const firstName = user?.name ? user.name.split(' ')[0] : 'Organizer'
  const token = localStorage.getItem('token')

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState(null)
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [applications, setApplications] = useState([])
  const [appSkillFilter, setAppSkillFilter] = useState('')
  const [appAvailabilityFilter, setAppAvailabilityFilter] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)
  const [eventConflict, setEventConflict] = useState(null)
  const [announcementMessage, setAnnouncementMessage] = useState('')
  const [annStatus, setAnnStatus] = useState('')
  const [calendarDate, setCalendarDate] = useState(new Date())

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const notifications = useMemo(() => {
    if (!stats) return []
    return [
      { id: 'n1', text: `${stats.appStats?.pending || 0} new applications pending`, time: 'Just now' },
      { id: 'n2', text: `${stats.upcomingEvents || 0} upcoming events require planning`, time: 'Today' },
    ]
  }, [stats])

  const eventsForSelectedDate = useMemo(() => {
    const selectedISO = calendarDate.toISOString().split('T')[0]
    return events.filter((event) => event.dateISO === selectedISO)
  }, [calendarDate, events])

  useEffect(() => {
    if (!token || !user) {
      navigate('/auth')
      return
    }
    if (user.role !== 'organizer' || !user.isVerified) {
      navigate('/dashboard', { state: { fromAuth: true, user } })
      return
    }
    fetchDashboard()
  }, [])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const [statsRes, eventsRes, reportsRes] = await Promise.all([
        fetch('http://localhost:4000/api/organizer/stats', { headers }),
        fetch('http://localhost:4000/api/organizer/events', { headers }),
        fetch('http://localhost:4000/api/organizer/reports', { headers }),
      ])

      if (!statsRes.ok || !eventsRes.ok || !reportsRes.ok) {
        throw new Error('Could not load organizer data')
      }

      setStats(await statsRes.json())
      setEvents(await eventsRes.json())
      setReports(await reportsRes.json())
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load organizer dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function fetchApplications(eventId) {
    const res = await fetch(`http://localhost:4000/api/organizer/event/${eventId}/applications`, { headers })
    if (!res.ok) {
      setError('Unable to fetch applications for selected event')
      return
    }
    const data = await res.json()
    setSelectedEvent(data.event)
    setApplications(data.applications)
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target
    const nextForm = { ...eventForm, [name]: value }
    setEventForm(nextForm)
    setEventConflict(findConflict(nextForm, editingEvent?._id))
  }

  function findConflict(form, ignoreEventId = null) {
    if (!form.location || !form.dateISO || !form.startTime || !form.endTime) return null
    const start = toMinutes(form.startTime)
    const end = toMinutes(form.endTime)
    if (start === null || end === null || end <= start) return { message: 'End time must be later than start time' }
    const sameSlot = events.find((event) => {
      if (ignoreEventId && event._id === ignoreEventId) return false
      if (event.location.trim().toLowerCase() !== form.location.trim().toLowerCase()) return false
      if (event.dateISO !== form.dateISO) return false
      const eventStart = toMinutes(event.startTime)
      const eventEnd = toMinutes(event.endTime)
      return eventStart !== null && eventEnd !== null && start < eventEnd && eventStart < end
    })
    if (!sameSlot) return null
    return {
      message: 'Event conflict detected',
      event: sameSlot,
      suggestion: suggestAlternativeTime(start, end, form, ignoreEventId),
    }
  }

  function suggestAlternativeTime(start, end, form, ignoreEventId = null) {
    const duration = end - start
    const sameDayAndLocation = events
      .filter((event) => (
        (!ignoreEventId || event._id !== ignoreEventId)
        && event.dateISO === form.dateISO
        && event.location.trim().toLowerCase() === form.location.trim().toLowerCase()
      ))
      .sort((a, b) => toMinutes(a.endTime) - toMinutes(b.endTime))
    let candidateStart = start
    for (const event of sameDayAndLocation) {
      const eventStart = toMinutes(event.startTime)
      const eventEnd = toMinutes(event.endTime)
      if (eventStart !== null && eventEnd !== null && candidateStart < eventEnd && eventStart < candidateStart + duration) {
        candidateStart = eventEnd
      }
    }
    return `${toHHMM(candidateStart)} - ${toHHMM(candidateStart + duration)}`
  }

  async function submitEvent(event) {
    event.preventDefault()
    const conflict = findConflict(eventForm, editingEvent?._id)
    setEventConflict(conflict)
    if (conflict) return

    if (!eventForm.addressLine1 || !eventForm.city || !eventForm.state || !eventForm.postalCode) {
      setError('Please fill detailed location: address, city, state and postal code')
      return
    }

    const payload = {
      ...eventForm,
      requiredSkills: eventForm.requiredSkills.split(',').map((item) => item.trim()).filter(Boolean),
      volunteerSlots: Number(eventForm.volunteerSlots || 0),
      category: 'environment',
      detailedLocation: {
        addressLine1: eventForm.addressLine1,
        area: eventForm.area,
        city: eventForm.city,
        state: eventForm.state,
        postalCode: eventForm.postalCode,
        landmark: eventForm.landmark,
      },
    }

    const endpoint = editingEvent
      ? `http://localhost:4000/api/organizer/events/${editingEvent._id}`
      : 'http://localhost:4000/api/organizer/events'
    const method = editingEvent ? 'PUT' : 'POST'
    const res = await fetch(endpoint, { method, headers, body: JSON.stringify(payload) })
    const data = await res.json()
    if (!res.ok) {
      setEventConflict(data.conflict ? { message: data.message, event: data.conflict } : null)
      setError(data.message || 'Could not save event')
      return
    }

    setShowEventModal(false)
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
    await fetchDashboard()
    setError('')
  }

  async function deleteEvent(eventId) {
    const confirmed = window.confirm('Delete this event and all related applications?')
    if (!confirmed) return
    const res = await fetch(`http://localhost:4000/api/organizer/events/${eventId}`, { method: 'DELETE', headers })
    if (!res.ok) {
      setError('Could not delete event')
      return
    }
    if (selectedEvent?._id === eventId) {
      setSelectedEvent(null)
      setApplications([])
    }
    await fetchDashboard()
  }

  async function updateApplicationStatus(appId, status) {
    const res = await fetch(`http://localhost:4000/api/organizer/application/${appId}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    })
    if (!res.ok) {
      setError('Could not update application status')
      return
    }
    if (selectedEvent?._id) await fetchApplications(selectedEvent._id)
    await fetchDashboard()
  }

  async function assignRole(appId, assignedRole) {
    const assignedTask = window.prompt('Assign task (optional):', '')
    const res = await fetch(`http://localhost:4000/api/organizer/application/${appId}/assign-role`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ assignedRole, assignedTask: assignedTask || '' }),
    })
    if (!res.ok) {
      setError('Could not assign volunteer role')
      return
    }
    if (selectedEvent?._id) await fetchApplications(selectedEvent._id)
  }

  async function sendAnnouncement() {
    if (!announcementMessage.trim()) return
    const res = await fetch('http://localhost:4000/api/organizer/communications/announcement', {
      method: 'POST',
      headers,
      body: JSON.stringify({ message: announcementMessage, eventId: selectedEvent?._id || null }),
    })
    if (res.ok) {
      setAnnStatus('Announcement sent to volunteers')
      setAnnouncementMessage('')
      return
    }
    setAnnStatus('Failed to send announcement')
  }

  function openCreateModal() {
    setEditingEvent(null)
    setEventForm(EMPTY_EVENT_FORM)
    setEventConflict(null)
    setShowEventModal(true)
  }

  function openEditModal(event) {
    setEditingEvent(event)
    setEventForm({
      title: event.title || '',
      description: event.description || '',
      dateISO: event.dateISO || '',
      startTime: event.startTime || '',
      endTime: event.endTime || '',
      location: event.location || '',
      addressLine1: event.detailedLocation?.addressLine1 || '',
      area: event.detailedLocation?.area || '',
      city: event.detailedLocation?.city || '',
      state: event.detailedLocation?.state || '',
      postalCode: event.detailedLocation?.postalCode || '',
      landmark: event.detailedLocation?.landmark || '',
      requiredSkills: (event.requiredSkills || []).join(', '),
      volunteerSlots: event.volunteerSlots || 0,
      imageUrl: event.imageUrl || '',
    })
    setEventConflict(null)
    setShowEventModal(true)
  }

  function logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/auth')
  }

  function onOpenMapView() {
    navigate('/map', { state: { fromAuth: true, user } })
  }

  function getNotificationCount() {
    return notifications.length
  }

  const filteredApplications = applications.filter((application) => {
    const skills = (application.skills || []).join(' ').toLowerCase()
    const availability = (application.availability || '').toLowerCase()
    const matchesSkills = appSkillFilter ? skills.includes(appSkillFilter.toLowerCase()) : true
    const matchesAvailability = appAvailabilityFilter ? availability.includes(appAvailabilityFilter.toLowerCase()) : true
    return matchesSkills && matchesAvailability
  })

  if (loading) return <div className="organizer-loading">Loading organizer dashboard...</div>

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <div className="brand-logo">🌿</div>
            <div>
              <h1 className="brand-name">Eco Volunteer</h1>
              <span className="brand-subtitle">Organizer Panel</span>
            </div>
          </div>
          <nav className="sidebar-nav">
            <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
            <button className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
            <button className={`nav-item ${activeTab === 'volunteers' ? 'active' : ''}`} onClick={() => setActiveTab('volunteers')}>Volunteers</button>
            <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Reports</button>
          </nav>
        </div>
        <div className="sidebar-user">
          <div className="user-avatar organizer-avatar">{firstName[0]}</div>
          <div className="user-info">
            <span className="user-name">{firstName}</span>
            <span className="user-points">Verified Organizer</span>
          </div>
          <button className="logout-btn" onClick={logout}>↩</button>
        </div>
      </aside>

      <main className="dashboard-main">
        {error && <div className="organizer-error-banner">{error}</div>}

        <header className="dashboard-header">
          <div className="header-title">
            <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
            <p>Manage your events, volunteers, communication, and reports.</p>
          </div>
          <div className="organizer-top-actions">
            <button className="organizer-create-btn" onClick={openCreateModal}>+ Create Event</button>
            <button className="organizer-bell-btn" onClick={() => setShowNotifications((current) => !current)} aria-label="Notifications">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22" height="22">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
              </svg>
              {getNotificationCount() > 0 && <span className="organizer-bell-count">{getNotificationCount()}</span>}
            </button>
            <button className="map-view-btn" onClick={onOpenMapView}>Map View</button>
            {showNotifications && (
              <div className="organizer-notification-popover">
                {notifications.map((note) => (
                  <div key={note.id} className="organizer-note-item">
                    <strong>{note.text}</strong>
                    <span>{note.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </header>

        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card stat-blue"><div className="stat-info"><h3>{stats?.totalEvents || 0}</h3><p>Total Events</p></div></div>
              <div className="stat-card stat-green"><div className="stat-info"><h3>{stats?.upcomingEvents || 0}</h3><p>Upcoming Events</p></div></div>
              <div className="stat-card stat-orange"><div className="stat-info"><h3>{stats?.pastEvents || 0}</h3><p>Past Events</p></div></div>
              <div className="stat-card stat-pink"><div className="stat-info"><h3>{stats?.appStats?.pending || 0}</h3><p>Pending Applications</p></div></div>
            </div>

            <section className="organizer-section">
              <h3>Application Pipeline</h3>
              <div className="organizer-status-cards">
                <div className="organizer-status-card pending"><div className="status-number">{stats?.appStats?.pending || 0}</div><div className="status-label">Pending</div></div>
                <div className="organizer-status-card approved"><div className="status-number">{stats?.appStats?.approved || 0}</div><div className="status-label">Approved</div></div>
                <div className="organizer-status-card rejected"><div className="status-number">{stats?.appStats?.rejected || 0}</div><div className="status-label">Rejected</div></div>
              </div>
            </section>

            <section className="organizer-section">
              <h3>Upcoming and Past Events</h3>
              <div className="organizer-dual-list">
                <div>
                  <h4>Upcoming</h4>
                  {(stats?.upcomingEventsList || []).map((event) => <p key={event._id}>{event.title} - {event.dateISO} ({event.startTime}-{event.endTime})</p>)}
                </div>
                <div>
                  <h4>Past</h4>
                  {(stats?.pastEventsList || []).map((event) => <p key={event._id}>{event.title} - {event.dateISO}</p>)}
                </div>
              </div>
            </section>
          </>
        )}

        {activeTab === 'events' && (
          <section className="organizer-section">
            <div className="organizer-view-header">
              <h3>Event Management & Calendar List</h3>
              <button className="organizer-refresh-btn" onClick={fetchDashboard}>Refresh</button>
            </div>
            <div className="organizer-events-calendar-wrap">
              <div className="organizer-calendar-card">
                <h4>Event Calendar</h4>
                <Calendar
                  onChange={(value) => setCalendarDate(value)}
                  value={calendarDate}
                  tileClassName={({ date, view }) => {
                    if (view !== 'month') return ''
                    const iso = date.toISOString().split('T')[0]
                    return events.some((event) => event.dateISO === iso) ? 'has-event-date' : ''
                  }}
                />
              </div>
              <div className="organizer-date-events-card">
                <h4>Events on {calendarDate.toDateString()}</h4>
                {eventsForSelectedDate.length === 0 ? (
                  <p className="organizer-date-empty">No scheduled events for this day.</p>
                ) : (
                  eventsForSelectedDate.map((event) => (
                    <div key={event._id} className="organizer-date-event-item">
                      <strong>{event.title}</strong>
                      <span>{event.startTime} - {event.endTime}</span>
                      <small>{event.location}</small>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="organizer-calendar-list">
              {events.map((event) => (
                <div key={event._id} className="organizer-event-row">
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.location} | {event.dateISO} | {event.startTime}-{event.endTime}</p>
                    <small>Skills: {(event.requiredSkills || []).join(', ') || 'Not specified'}</small>
                  </div>
                  <div className="organizer-row-actions">
                    <button className="event-card-btn" onClick={() => openEditModal(event)}>Edit</button>
                    <button className="event-card-btn danger" onClick={() => deleteEvent(event._id)}>Delete</button>
                    <button className="event-card-btn" onClick={() => { setActiveTab('volunteers'); fetchApplications(event._id) }}>Applicants</button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'volunteers' && (
          <section className="organizer-section">
            <h3>Volunteer Management</h3>
            <div className="applications-filter-bar">
              <input className="search-input" placeholder="Filter by skill" value={appSkillFilter} onChange={(e) => setAppSkillFilter(e.target.value)} />
              <input className="search-input" placeholder="Filter by availability" value={appAvailabilityFilter} onChange={(e) => setAppAvailabilityFilter(e.target.value)} />
            </div>

            {!selectedEvent ? (
              <div className="event-list">
                {events.map((event) => (
                  <button key={event._id} className="event-selector-btn" onClick={() => fetchApplications(event._id)}>
                    <span>{event.title} ({event.location})</span>
                    <span>{event.applicantCount} applicants</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="applications-list">
                {filteredApplications.map((application) => (
                  <div key={application._id} className="application-item">
                    <div className="app-header">
                      <div className="app-info">
                        <h4>{application.volunteerName}</h4>
                        <p>{application.volunteerEmail}</p>
                      </div>
                      <span className={`app-status-badge ${application.status}`}>{application.status}</span>
                    </div>
                    <div className="app-details">
                      <p><strong>Skills:</strong> {(application.skills || []).join(', ') || 'N/A'}</p>
                      <p><strong>Availability:</strong> {application.availability || 'N/A'}</p>
                      <p><strong>Assigned role:</strong> {application.assignedRole || 'Not assigned'}</p>
                    </div>
                    <div className="app-actions">
                      <button className="action-btn approve" onClick={() => updateApplicationStatus(application._id, 'approved')}>Approve</button>
                      <button className="action-btn reject" onClick={() => updateApplicationStatus(application._id, 'rejected')}>Reject</button>
                      <button className="action-btn" onClick={() => assignRole(application._id, 'Team Lead')}>Assign Role</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="organizer-section">
            <h3>Analytics, Reports, and Communication</h3>
            <div className="organizer-report-grid">
              <div className="stat-card stat-blue"><div className="stat-info"><h3>{reports?.totalApplications || 0}</h3><p>Total Applications</p></div></div>
              <div className="stat-card stat-green"><div className="stat-info"><h3>{reports?.attendanceCount || 0}</h3><p>Attendance Tracked</p></div></div>
              <div className="stat-card stat-orange"><div className="stat-info"><h3>{reports?.participationRate || 0}%</h3><p>Participation Rate</p></div></div>
              <div className="stat-card stat-pink"><div className="stat-info"><h3>{reports?.volunteerHoursLogged || 0}</h3><p>Volunteer Hours</p></div></div>
            </div>
            <div className="organizer-communication-box">
              <h4>Announcements</h4>
              <textarea value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} placeholder="Send update, reminder, or cancellation..." />
              <button className="organizer-create-btn" onClick={sendAnnouncement}>Send Message</button>
              {annStatus && <p>{annStatus}</p>}
            </div>
          </section>
        )}
      </main>

      {showEventModal && (
        <div className="organizer-modal-overlay" onClick={() => setShowEventModal(false)}>
          <form className="organizer-modal organizer-event-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitEvent}>
            <h2>{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
            <div className="organizer-form-grid">
              <input name="title" value={eventForm.title} onChange={handleEventFormChange} placeholder="Title" required />
              <input name="location" value={eventForm.location} onChange={handleEventFormChange} placeholder="Venue name (e.g., City Park)" required />
              <input type="date" name="dateISO" value={eventForm.dateISO} onChange={handleEventFormChange} required />
              <input type="time" name="startTime" value={eventForm.startTime} onChange={handleEventFormChange} required />
              <input type="time" name="endTime" value={eventForm.endTime} onChange={handleEventFormChange} required />
              <input name="addressLine1" value={eventForm.addressLine1} onChange={handleEventFormChange} placeholder="Address line 1" required />
              <input name="area" value={eventForm.area} onChange={handleEventFormChange} placeholder="Area / locality" />
              <input name="city" value={eventForm.city} onChange={handleEventFormChange} placeholder="City" required />
              <input name="state" value={eventForm.state} onChange={handleEventFormChange} placeholder="State" required />
              <input name="postalCode" value={eventForm.postalCode} onChange={handleEventFormChange} placeholder="Postal code" required />
              <input name="landmark" value={eventForm.landmark} onChange={handleEventFormChange} placeholder="Landmark (optional)" />
              <input type="number" name="volunteerSlots" value={eventForm.volunteerSlots} onChange={handleEventFormChange} placeholder="Volunteer slots" min="0" />
              <input name="requiredSkills" value={eventForm.requiredSkills} onChange={handleEventFormChange} placeholder="Required skills (comma separated)" />
              <input name="imageUrl" value={eventForm.imageUrl} onChange={handleEventFormChange} placeholder="Image URL" />
            </div>
            <textarea name="description" value={eventForm.description} onChange={handleEventFormChange} placeholder="Description" required />

            <div className="organizer-conflict-preview">
              <h4>Existing events (same organizer)</h4>
              {events.map((event) => (
                <p key={event._id}>{event.location} | {event.dateISO} | {event.startTime}-{event.endTime}</p>
              ))}
            </div>

            {eventConflict && (
              <div className="organizer-conflict-alert">
                <strong>{eventConflict.message}</strong>
                {eventConflict.event && <p>Conflicts with: {eventConflict.event.title} ({eventConflict.event.startTime}-{eventConflict.event.endTime})</p>}
                {eventConflict.suggestion && <p>Suggested slot: {eventConflict.suggestion}</p>}
              </div>
            )}

            <div className="organizer-modal-actions">
              <button type="button" onClick={() => setShowEventModal(false)}>Cancel</button>
              <button type="submit" disabled={Boolean(eventConflict)}>Save Event</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

function toMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null
  const [hours, minutes] = value.split(':').map(Number)
  return hours * 60 + minutes
}

function toHHMM(totalMinutes) {
  const safeMinutes = Math.max(0, Math.min(totalMinutes, 1439))
  const hh = String(Math.floor(safeMinutes / 60)).padStart(2, '0')
  const mm = String(safeMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
}

export default OrganizerDashboard
