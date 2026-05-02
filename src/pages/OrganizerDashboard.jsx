import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import './Dashboard.css'
import './OrganizerDashboard.css'
import { apiFetch } from '../api'
import { formatTimeAgo } from '../utils/formatTimeAgo.js'

const EMPTY_EVENT_FORM = {
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
  distanceKm: 0,
  requiredSkills: '',
  volunteerSlots: '',
  latitude: '',
  longitude: '',
  permissionPdf: null,
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
  const [actionStatus, setActionStatus] = useState('')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState(null)
  const [reports, setReports] = useState(null)
  const [events, setEvents] = useState([])
  const [calendarEvents, setCalendarEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [applications, setApplications] = useState([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState(null)
  const [eventForm, setEventForm] = useState(EMPTY_EVENT_FORM)
  const [eventConflict, setEventConflict] = useState(null)
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [bellNotifications, setBellNotifications] = useState([])
  const [notifUnread, setNotifUnread] = useState(0)
  const [entryNotifBanner, setEntryNotifBanner] = useState('')

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token])

  const uploadHeaders = useMemo(() => ({
    Authorization: `Bearer ${token}`,
  }), [token])

  const eventsForSelectedDate = useMemo(() => {
    const selectedISO = calendarDate.toISOString().split('T')[0]
    return calendarEvents.filter((event) => isEventOnDate(event, selectedISO))
  }, [calendarDate, calendarEvents])

  const createdEventsForSelectedDate = useMemo(() => {
    const selectedISO = calendarDate.toISOString().split('T')[0]
    return events.filter((event) => isEventOnDate(event, selectedISO))
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

  useEffect(() => {
    if (!entryNotifBanner) return undefined
    const t = setTimeout(() => setEntryNotifBanner(''), 14000)
    return () => clearTimeout(t)
  }, [entryNotifBanner])

  async function fetchDashboard() {
    try {
      setLoading(true)
      const [statsRes, eventsRes, reportsRes, calendarRes, notifRes] = await Promise.all([
        apiFetch('/api/organizer/stats', { headers }),
        apiFetch('/api/organizer/events', { headers }),
        apiFetch('/api/organizer/reports', { headers }),
        apiFetch('/api/organizer/calendar-events', { headers }),
        apiFetch('/api/notifications', { headers }),
      ])

      if (!statsRes.ok || !eventsRes.ok || !reportsRes.ok || !calendarRes.ok) {
        throw new Error('Could not load organizer data')
      }

      setStats(await statsRes.json())
      setEvents(await eventsRes.json())
      setReports(await reportsRes.json())
      setCalendarEvents(await calendarRes.json())

      if (notifRes.ok) {
        const nd = await notifRes.json()
        const raw = Array.isArray(nd.items) ? nd.items : []
        setBellNotifications(
          raw.map((n) => ({
            id: String(n._id),
            type: n.type || '',
            title: n.title || 'Notification',
            text: n.body || '',
            time: formatTimeAgo(n.createdAt),
            read: Boolean(n.read),
          })),
        )
        const unread =
          typeof nd.unreadCount === 'number' ? nd.unreadCount : raw.filter((n) => !n.read).length
        setNotifUnread(unread)
        if (unread > 0) {
          const joinUnread = raw.filter((n) => !n.read && n.type === 'volunteer_joined_event').length
          const previews = raw
            .filter((n) => !n.read)
            .slice(0, 3)
            .map((n) => n.title)
            .join(' · ')
          setEntryNotifBanner(
            joinUnread > 0
              ? `Volunteers joined your events (${joinUnread} new). Open the bell for details.${previews ? ` ${previews}` : ''}`
              : previews
                ? `${unread} new notification(s): ${previews}`
                : `${unread} new notification(s) — open the bell.`,
          )
        } else {
          setEntryNotifBanner('')
        }
      }

      setError('')
    } catch (err) {
      setError(err.message || 'Failed to load organizer dashboard')
    } finally {
      setLoading(false)
    }
  }

  async function markAllOrganizerNotificationsRead() {
    if (!token) return
    try {
      await apiFetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers,
      })
      setBellNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setNotifUnread(0)
      setEntryNotifBanner('')
    } catch {
      /* noop */
    }
  }

  async function fetchApplications(eventId) {
    const res = await apiFetch(`/api/organizer/event/${eventId}/applications`, { headers })
    if (!res.ok) {
      setError('Unable to fetch applications for selected event')
      return
    }
    const data = await res.json()
    setSelectedEvent(data.event)
    setApplications(data.applications)
    setActionStatus(`Loaded ${data.applications.length} volunteers for ${data.event.title}`)
    setError('')
  }

  async function confirmVolunteerAttendance(volunteerId) {
    if (!selectedEvent?._id || !volunteerId) return
    const res = await apiFetch(`/api/organizer/events/${selectedEvent._id}/confirm-attendance`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ volunteerId, confirmed: true }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      alert(data.message || 'Could not confirm attendance')
      return
    }
    await fetchApplications(selectedEvent._id)
    setActionStatus(
      data.alreadyConfirmed
        ? 'That volunteer was already marked attended.'
        : 'Attendance confirmed — points added for this volunteer.',
    )
  }

  function handleEventFormChange(event) {
    const { name, value } = event.target
    const nextForm = { ...eventForm, [name]: value }
    setEventForm(nextForm)
    setEventConflict(findConflict(nextForm, editingEvent?._id))
  }

  function handleEventFileChange(event) {
    const nextForm = { ...eventForm, permissionPdf: event.target.files[0] || null }
    setEventForm(nextForm)
  }

  function findConflict(form, ignoreEventId = null) {
    if (!form.location || !form.startDateISO || !form.endDateISO || !form.startHour || !form.endHour) return null
    const start = hourToMinutes(form.startHour)
    const end = hourToMinutes(form.endHour)
    if (start === null || end === null || end <= start) return { message: 'End time must be later than start time' }
    if (form.startDateISO > form.endDateISO) return { message: 'End date must be on or after start date' }
    const sameSlot = events.find((event) => {
      if (ignoreEventId && event._id === ignoreEventId) return false
      if (event.location.trim().toLowerCase() !== form.location.trim().toLowerCase()) return false
      const eventStartDate = event.startDateISO || event.dateISO
      const eventEndDate = event.endDateISO || event.startDateISO || event.dateISO
      if (!(form.startDateISO <= eventEndDate && eventStartDate <= form.endDateISO)) return false
      const eventStart = hourToMinutes(event.startHour)
      const eventEnd = hourToMinutes(event.endHour)
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
        && (form.startDateISO <= (event.endDateISO || event.startDateISO || event.dateISO))
        && ((event.startDateISO || event.dateISO) <= form.endDateISO)
        && event.location.trim().toLowerCase() === form.location.trim().toLowerCase()
      ))
      .sort((a, b) => hourToMinutes(a.endHour) - hourToMinutes(b.endHour))
    let candidateStart = start
    for (const event of sameDayAndLocation) {
      const eventStart = hourToMinutes(event.startHour)
      const eventEnd = hourToMinutes(event.endHour)
      if (eventStart !== null && eventEnd !== null && candidateStart < eventEnd && eventStart < candidateStart + duration) {
        candidateStart = eventEnd
      }
    }
    return `${toHour(candidateStart)} - ${toHour(candidateStart + duration)}`
  }

  async function submitEvent(event) {
    event.preventDefault()
    const conflict = findConflict(eventForm, editingEvent?._id)
    setEventConflict(conflict)
    if (conflict) return

    if (!eventForm.address) {
      setError('Please fill the event address')
      return
    }

    const payload = new FormData()
    Object.entries(eventForm).forEach(([key, value]) => {
      if (key === 'permissionPdf') return
      payload.append(key, value)
    })
    if (eventForm.permissionPdf) {
      payload.append('permissionPdf', eventForm.permissionPdf)
    }

    const endpoint = editingEvent
      ? `/api/organizer/events/${editingEvent._id}`
      : '/api/organizer/events'
    const method = editingEvent ? 'PUT' : 'POST'
    const res = await apiFetch(endpoint, { method, headers: uploadHeaders, body: payload })
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
    setActionStatus('Event saved. After admin approval it will appear on the volunteer dashboard automatically.')
  }

  async function deleteEvent(eventId) {
    const confirmed = window.confirm('Delete this event and all related applications?')
    if (!confirmed) return
    const res = await apiFetch(`/api/organizer/events/${eventId}`, { method: 'DELETE', headers })
    if (!res.ok) {
      setError('Could not delete event')
      return
    }
    if (selectedEvent?._id === eventId) {
      setSelectedEvent(null)
      setApplications([])
    }
    await fetchDashboard()
    setActionStatus('Event deleted.')
  }

  async function togglePublish(eventId, publish) {
    setActionStatus('')
    const res = await apiFetch(`/api/events/${eventId}/publish`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ publish }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.message || 'Could not update dashboard posting status')
      return
    }
    await fetchDashboard()
    setError('')
    setActionStatus(publish ? 'Event posted to the volunteer dashboard.' : 'Event removed from the volunteer dashboard.')
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
      organizationName: event.organizationName || user?.name || '',
      category: event.category || 'cleanup',
      location: event.location || '',
      address: event.address || '',
      description: event.description || '',
      startDateISO: event.startDateISO || event.dateISO || '',
      endDateISO: event.endDateISO || event.startDateISO || event.dateISO || '',
      startHour: event.startHour || 9,
      endHour: event.endHour || 17,
      points: event.points || 50,
      distanceKm: event.distanceKm || 0,
      requiredSkills: (event.requiredSkills || []).join(', '),
      volunteerSlots: event.volunteerSlots || 0,
      latitude: event.coordinates?.coordinates?.[1] ?? '',
      longitude: event.coordinates?.coordinates?.[0] ?? '',
      permissionPdf: null,
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
    return notifUnread
  }

  if (loading) return <div className="organizer-loading">Loading organizer dashboard...</div>

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-top">
            <div className="sidebar-brand">
              <div className="brand-logo">🌿</div>
              <div>
                <h1 className="brand-name">Eco Volunteer</h1>
                <span className="brand-subtitle">Organizer Panel</span>
              </div>
            </div>
            <nav className="sidebar-nav">
              <button type="button" className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>Dashboard</button>
              <button type="button" className={`nav-item ${activeTab === 'events' ? 'active' : ''}`} onClick={() => setActiveTab('events')}>Events</button>
              <button type="button" className={`nav-item ${activeTab === 'volunteers' ? 'active' : ''}`} onClick={() => setActiveTab('volunteers')}>Volunteers</button>
              <button type="button" className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>Reports</button>
            </nav>
          </div>
        </div>
        <div className="sidebar-footer-portal">
          <button type="button" className="sidebar-footer-btn sidebar-footer-btn-primary" onClick={() => fetchDashboard()}>
            Refresh
          </button>
          <button type="button" className="sidebar-footer-btn" onClick={logout}>
            Logout
          </button>
          <div className="sidebar-user">
            <div className="user-avatar organizer-avatar">{firstName[0]}</div>
            <div className="user-info">
              <span className="user-name">{firstName}</span>
              <span className="user-points">Verified Organizer</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        {error && <div className="organizer-error-banner">{error}</div>}
        {actionStatus && <div className="organizer-success-banner">{actionStatus}</div>}
        {entryNotifBanner ? (
          <div
            className="organizer-success-banner"
            style={{ background: '#eef2ff', borderColor: '#c7d2fe', color: '#312e81', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}
          >
            <span>🔔 {entryNotifBanner}</span>
            <button type="button" className="filter-btn" onClick={() => setEntryNotifBanner('')}>
              Dismiss
            </button>
          </div>
        ) : null}

        <header className="dashboard-header">
          <div className="header-title">
            <h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
            <p>Manage your events, volunteers, communication, and reports.</p>
          </div>
          <div className="organizer-top-actions">
            <button className="organizer-create-btn" onClick={openCreateModal}>+ Create Event</button>
            <button type="button" className="organizer-bell-btn" onClick={() => setShowNotifications((current) => !current)} aria-label="Notifications">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="22" height="22">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0a3 3 0 11-6 0h6z" />
              </svg>
              {getNotificationCount() > 0 ? (
                <span className="organizer-bell-count">{getNotificationCount() > 99 ? '99+' : getNotificationCount()}</span>
              ) : null}
            </button>
            <button type="button" className="map-view-btn" onClick={() => navigate('/complaints')}>
              Complaints
            </button>
            <button className="map-view-btn" onClick={onOpenMapView}>Map View</button>
            {showNotifications && (
              <div className="organizer-notification-popover" style={{ maxHeight: 360, overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <strong style={{ fontSize: 13 }}>Notifications</strong>
                  {bellNotifications.length > 0 ? (
                    <button type="button" className="filter-btn" style={{ fontSize: 11, padding: '4px 8px' }} onClick={() => markAllOrganizerNotificationsRead()}>
                      Mark all read
                    </button>
                  ) : null}
                </div>
                {bellNotifications.length === 0 ? (
                  <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>No notifications yet.</p>
                ) : (
                  bellNotifications.map((note) => (
                    <div key={note.id} className="organizer-note-item" style={{ opacity: note.read ? 0.7 : 1 }}>
                      <strong>{note.title}</strong>
                      <div style={{ fontWeight: 400, fontSize: 13 }}>{note.text}</div>
                      <span>{note.time}</span>
                    </div>
                  ))
                )}
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
            </div>

            <section className="organizer-section">
              <h3>Upcoming and Past Events</h3>
              <div className="organizer-dual-list">
                <div>
                  <h4>Upcoming</h4>
                  {(stats?.upcomingEventsList || []).map((event) => <p key={event._id}>{event.title} - {formatEventDate(event)} ({event.startHour}:00-{event.endHour}:00)</p>)}
                </div>
                <div>
                  <h4>Past</h4>
                  {(stats?.pastEventsList || []).map((event) => <p key={event._id}>{event.title} - {formatEventDate(event)}</p>)}
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
                    return calendarEvents.some((event) => isEventOnDate(event, iso)) ? 'has-event-date' : ''
                  }}
                />
              </div>
              <div className="organizer-date-events-card">
                <h4>Events on {calendarDate.toDateString()}</h4>
                <div className="organizer-date-subsection">
                  <h5>All Events Happening</h5>
                  {eventsForSelectedDate.length === 0 ? (
                    <p className="organizer-date-empty">No scheduled events for this day.</p>
                  ) : (
                    eventsForSelectedDate.map((event) => (
                      <div key={event._id} className="organizer-date-event-item">
                        <strong>{event.title}</strong>
                        <span>{formatEventDate(event)} | {event.startHour}:00 - {event.endHour}:00</span>
                        <small>{event.location}</small>
                      </div>
                    ))
                  )}
                </div>
                <div className="organizer-date-subsection">
                  <h5>My Created Events</h5>
                  {createdEventsForSelectedDate.length === 0 ? (
                    <p className="organizer-date-empty">You have not created events for this day.</p>
                  ) : (
                    createdEventsForSelectedDate.map((event) => (
                      <div key={event._id} className="organizer-date-event-item created">
                        <strong>{event.title}</strong>
                        <span>{formatEventDate(event)} | {event.startHour}:00 - {event.endHour}:00</span>
                        <small>{event.location} | {event.status || 'pending'}</small>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <h4 className="organizer-list-title">My Created Events</h4>
            <div className="organizer-calendar-list">
              {events.map((event) => (
                <div key={event._id} className="organizer-event-row">
                  <div>
                    <strong>{event.title}</strong>
                    <p>{event.location} | {formatEventDate(event)} | {event.startHour}:00-{event.endHour}:00</p>
                    <small>
                      Status: {event.status || 'pending'} | {event.isPublished ? 'Posted to dashboard' : 'Not posted'} | Skills: {(event.requiredSkills || []).join(', ') || 'Not specified'}
                    </small>
                  </div>
                  <div className="organizer-row-actions">
                    <button type="button" className="event-card-btn" onClick={() => openEditModal(event)}>Edit</button>
                    <button type="button" className="event-card-btn danger" onClick={() => deleteEvent(event._id)}>Delete</button>
                    <button type="button" className="event-card-btn" onClick={() => { setActiveTab('volunteers'); fetchApplications(event._id) }}>Applicants</button>
                    <button
                      type="button"
                      className="event-card-btn"
                      disabled={!event.approved || event.isPublished}
                      title={!event.approved ? 'Admin approval is required before posting' : event.isPublished ? 'Already posted' : 'Post to volunteer dashboard'}
                      onClick={() => togglePublish(event._id, true)}
                    >
                      Post to Dashboard
                    </button>
                    <button
                      type="button"
                      className="event-card-btn danger"
                      disabled={!event.isPublished}
                      title={!event.isPublished ? 'This event is not posted yet' : 'Remove from volunteer dashboard'}
                      onClick={() => togglePublish(event._id, false)}
                    >
                      Unpost
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'volunteers' && (
          <section className="organizer-section">
            <h3>Volunteer Management</h3>
            {selectedEvent && (
              <div className="selected-event-summary">
                <strong>{selectedEvent.title}</strong>
                <p>{selectedEvent.location} | {formatEventDate(selectedEvent)}</p>
              </div>
            )}

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
                <div className="applications-controls">
                  <button type="button" className="event-card-btn" onClick={() => { setSelectedEvent(null); setApplications([]); setActionStatus(''); }}>
                    ← Back to my events
                  </button>
                  <span className="applications-summary">Showing {applications.length} volunteer{applications.length === 1 ? '' : 's'}</span>
                </div>
                <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
                  After someone participates, confirm attendance here — they receive event points and badges update automatically.
                </p>
                {applications.length === 0 ? (
                  <div className="no-applications">No volunteer applications found for this event.</div>
                ) : (
                  <>
                    {!selectedEvent?.isPublished ? (
                      <div className="organizer-error-banner" style={{ marginBottom: 16 }}>
                        This event is not posted to volunteers, so attendance cannot be confirmed until it is posted.
                      </div>
                    ) : null}
                    {applications.map((application) => {
                      const profile = application.volunteerProfile
                      const vid = application.volunteerId
                      const canConfirm =
                        selectedEvent?.isPublished &&
                        application.status !== 'withdrawn' &&
                        application.status !== 'rejected' &&
                        !application.attended
                      return (
                        <div key={application._id} className="application-item">
                          <div className="app-header">
                            <div className="app-info">
                              <h4>{application.volunteerName}</h4>
                              <p>{application.volunteerEmail}</p>
                            </div>
                            <div className="app-status">
                              {application.status === 'withdrawn' && (
                                <span className="app-status-badge withdrawn">Withdrawn</span>
                              )}
                              {application.attended && <span className="app-status-badge attended">Attended</span>}
                            </div>
                          </div>
                          {profile && (
                            <div className="app-notes">
                              <p><strong>City:</strong> {profile.city || '—'}</p>
                              <p><strong>Interests:</strong> {(profile.interests || []).join(', ') || '—'}</p>
                            </div>
                          )}
                          {application.notes && <p className="app-notes">{application.notes}</p>}
                          <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, cursor: canConfirm ? 'pointer' : 'default' }}>
                            <input
                              type="checkbox"
                              checked={Boolean(application.attended)}
                              disabled={!canConfirm}
                              onChange={(e) => {
                                if (e.target.checked) confirmVolunteerAttendance(vid)
                              }}
                            />
                            <span>Confirm attendance (awards points)</span>
                          </label>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'reports' && (
          <section className="organizer-section">
            <h3>Analytics & reports</h3>
            <div className="organizer-report-grid">
              <div className="stat-card stat-blue"><div className="stat-info"><h3>{reports?.totalApplications || 0}</h3><p>Total Applications</p></div></div>
              <div className="stat-card stat-green"><div className="stat-info"><h3>{reports?.attendanceCount || 0}</h3><p>Attendance Tracked</p></div></div>
              <div className="stat-card stat-orange"><div className="stat-info"><h3>{reports?.participationRate || 0}%</h3><p>Participation Rate</p></div></div>
              <div className="stat-card stat-pink"><div className="stat-info"><h3>{reports?.volunteerHoursLogged || 0}</h3><p>Volunteer Hours</p></div></div>
            </div>
            <div className="organizer-past-events-section">
              <h4 className="organizer-form-section-title">Past events you conducted</h4>
              <p style={{ color: '#64748b', fontSize: 14, marginBottom: 12 }}>
                Completed events (by end date) with how many people signed up.
              </p>
              {pastConductedEvents.length === 0 ? (
                <p className="organizer-date-empty">No past events yet.</p>
              ) : (
                <table className="organizer-past-events-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Start – end</th>
                      <th>Location</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastConductedEvents.map((evt) => (
                      <tr key={evt._id}>
                        <td>{evt.title}</td>
                        <td>{formatEventDate(evt)}</td>
                        <td>{evt.location || '—'}</td>
                        <td>{joinCountDisplay(evt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        )}
      </main>

      {showEventModal && (
        <div className="organizer-modal-overlay" onClick={() => setShowEventModal(false)}>
          <form className="organizer-modal organizer-event-modal" onClick={(e) => e.stopPropagation()} onSubmit={submitEvent}>
            <h2>{editingEvent ? 'Edit Event' : 'Create New Event'}</h2>
            <div className="organizer-form-grid">
              <h4 className="organizer-form-section-title">Basics</h4>
              <label className="organizer-field-label">
                <span>Event title</span>
                <input name="title" value={eventForm.title} onChange={handleEventFormChange} placeholder="Title" required />
              </label>
              <label className="organizer-field-label">
                <span>Organization name</span>
                <input name="organizationName" value={eventForm.organizationName} onChange={handleEventFormChange} placeholder="Organization Name" required />
              </label>
              <label className="organizer-field-label">
                <span>Category</span>
                <select name="category" value={eventForm.category} onChange={handleEventFormChange} required>
                  <option value="cleanup">Cleanup</option>
                  <option value="planting">Planting</option>
                  <option value="recycling">Recycling</option>
                  <option value="awareness">Awareness</option>
                </select>
              </label>

              <h4 className="organizer-form-section-title">Where</h4>
              <label className="organizer-field-label organizer-field-full">
                <span>Location (area / landmark)</span>
                <input name="location" value={eventForm.location} onChange={handleEventFormChange} placeholder="Location (Area Name, City, State)" required />
              </label>

              <h4 className="organizer-form-section-title">Schedule</h4>
              <label className="organizer-field-label">
                <span>Start date</span>
                <input type="date" name="startDateISO" value={eventForm.startDateISO} onChange={handleEventFormChange} required />
              </label>
              <label className="organizer-field-label">
                <span>End date</span>
                <input type="date" name="endDateISO" value={eventForm.endDateISO} onChange={handleEventFormChange} required />
              </label>
              <label className="organizer-field-label">
                <span>Start time (hour 1–24)</span>
                <input type="number" name="startHour" value={eventForm.startHour} onChange={handleEventFormChange} placeholder="e.g. 9 for 9:00" min="1" max="24" required />
              </label>
              <label className="organizer-field-label">
                <span>End time (hour 1–24)</span>
                <input type="number" name="endHour" value={eventForm.endHour} onChange={handleEventFormChange} placeholder="e.g. 17 for 17:00" min="1" max="24" required />
              </label>

              <h4 className="organizer-form-section-title">Volunteers & rewards</h4>
              <label className="organizer-field-label">
                <span>Volunteer points</span>
                <input type="number" name="points" value={eventForm.points} onChange={handleEventFormChange} placeholder="Points" min="0" required />
              </label>
              <label className="organizer-field-label">
                <span>Distance (km)</span>
                <input type="number" name="distanceKm" value={eventForm.distanceKm} onChange={handleEventFormChange} placeholder="Distance km" min="0" step="0.1" />
              </label>
              <label className="organizer-field-label">
                <span>Max volunteers</span>
                <input type="number" name="volunteerSlots" value={eventForm.volunteerSlots} onChange={handleEventFormChange} placeholder="0 = no limit" min="0" />
              </label>
              <label className="organizer-field-label">
                <span>Latitude (optional)</span>
                <input type="number" name="latitude" value={eventForm.latitude} onChange={handleEventFormChange} placeholder="e.g. 17.385" step="any" />
              </label>
              <label className="organizer-field-label">
                <span>Longitude (optional)</span>
                <input type="number" name="longitude" value={eventForm.longitude} onChange={handleEventFormChange} placeholder="e.g. 78.4867" step="any" />
              </label>
              <label className="organizer-field-label organizer-field-full">
                <span>Required skills (comma separated)</span>
                <input name="requiredSkills" value={eventForm.requiredSkills} onChange={handleEventFormChange} placeholder="Required skills" />
              </label>
            </div>
            <textarea name="description" value={eventForm.description} onChange={handleEventFormChange} placeholder="Description" required />
            <textarea name="address" value={eventForm.address} onChange={handleEventFormChange} placeholder="Address" required />
            <div className="organizer-permission-help">
              <h4>Event permission slip guidance</h4>
              <p>This event will require admin review and approval before it can be published to volunteers.</p>
              <p>Please include the following details in your event permission slip PDF:</p>
              <ul>
                <li>When the event is conducted: start date, end date, and timing.</li>
                <li>Where the event is conducted: location and full address.</li>
                <li>How the event is conducted: activity plan, expected process, and organizer contact responsibility.</li>
              </ul>
            </div>
            <input type="file" accept="application/pdf" onChange={handleEventFileChange} />
            {eventForm.permissionPdf && <span className="file-name">Selected: {eventForm.permissionPdf.name}</span>}

            <div className="organizer-conflict-preview">
              <h4>Existing events (same organizer)</h4>
              {events.map((event) => (
                <p key={event._id}>{event.location} | {formatEventDate(event)} | {event.startHour}:00-{event.endHour}:00</p>
              ))}
            </div>

            {eventConflict && (
              <div className="organizer-conflict-alert">
                <strong>{eventConflict.message}</strong>
                {eventConflict.event && <p>Conflicts with: {eventConflict.event.title} ({eventConflict.event.startHour}:00-{eventConflict.event.endHour}:00)</p>}
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

function hourToMinutes(value) {
  const hour = Number(value)
  if (!Number.isFinite(hour)) return null
  return Math.min(24, Math.max(1, Math.floor(hour))) * 60
}

function toHour(totalMinutes) {
  const safeMinutes = Math.max(60, Math.min(totalMinutes, 1440))
  return `${Math.floor(safeMinutes / 60)}:00`
}

function formatEventDate(event) {
  const start = event.startDateISO || event.dateISO || ''
  const end = event.endDateISO || event.startDateISO || event.dateISO || ''
  if (!start) return 'Date not set'
  if (!end || start === end) return start
  return `${start} - ${end}`
}

function isEventOnDate(event, isoDate) {
  const start = event.startDateISO || event.dateISO || ''
  const end = event.endDateISO || event.startDateISO || event.dateISO || ''
  if (!start) return false
  return start <= isoDate && isoDate <= (end || start)
}

export default OrganizerDashboard
