import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './Dashboard.css'
import { apiFetch } from '../api'

function readVolunteerUser() {
  try {
    const raw = localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const COMPLAINT_INBOX_BANNER_ACK = 'eco_complaints_admin_inbox_ack'

const ROLE_OPTIONS = ['Volunteer', 'Organizer', 'User']
const TYPE_OPTIONS = [
  'Technical Issue',
  'Complaint on Organizers/Volunteers',
  'Complaint on Organization',
  'Other',
]

function wordCount(text) {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}

export default function Complaints() {
  const navigate = useNavigate()
  const volUser = readVolunteerUser()
  const firstName = volUser?.name ? volUser.name.split(' ')[0] : 'Volunteer'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    navigate('/auth')
  }
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [complaintType, setComplaintType] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [myComplaints, setMyComplaints] = useState([])
  const [loadingMine, setLoadingMine] = useState(true)
  const [complaintInboxAlert, setComplaintInboxAlert] = useState('')

  const wc = useMemo(() => wordCount(description), [description])
  const overLimit = wc > 600

  const complaintsSortedOldestFirst = useMemo(
    () =>
      [...myComplaints].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      ),
    [myComplaints],
  )

  async function loadMyComplaints() {
    const token = localStorage.getItem('token')
    if (!token) {
      setLoadingMine(false)
      return []
    }
    setLoadingMine(true)
    let list = []
    try {
      const [mineRes, notifRes] = await Promise.all([
        apiFetch('/api/grievances/mine', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        apiFetch('/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
      if (mineRes.ok) {
        const data = await mineRes.json()
        list = Array.isArray(data) ? data : []
        setMyComplaints(list)
      }
      if (notifRes.ok) {
        const nd = await notifRes.json()
        const raw = Array.isArray(nd.items) ? nd.items : []
        const complaintRel = raw.filter(
          (n) =>
            !n.read && (n.type === 'complaint_reply' || n.type === 'complaint_resolved'),
        )
        if (complaintRel.length > 0) {
          const sig = complaintRel.map((n) => String(n._id)).sort().join('|')
          let prev = ''
          try {
            prev = localStorage.getItem(COMPLAINT_INBOX_BANNER_ACK) || ''
          } catch {
            prev = ''
          }
          if (prev !== sig) {
            setComplaintInboxAlert(
              `You have ${complaintRel.length} unread admin update(s) on your complaint(s). Check “Your submissions” below.`,
            )
            try {
              localStorage.setItem(COMPLAINT_INBOX_BANNER_ACK, sig)
            } catch {
              /* noop */
            }
          } else {
            setComplaintInboxAlert('')
          }
        } else {
          setComplaintInboxAlert('')
        }
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingMine(false)
    }
    return list
  }

  useEffect(() => {
    loadMyComplaints()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!name.trim() || !role || !complaintType || !description.trim()) {
      setError('Please fill in every required field.')
      return
    }
    if (overLimit) {
      setError('Description must be at most 600 words.')
      return
    }

    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/auth')
      return
    }

    setSubmitting(true)
    try {
      const res = await apiFetch('/api/grievances', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          role,
          complaintType,
          description: description.trim(),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Unable to submit complaint.')
        return
      }
      const newId = data.grievance?._id
      const updated = await loadMyComplaints()
      const sorted = [...updated].sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
      )
      let complaintNo = sorted.length
      if (newId) {
        const ix = sorted.findIndex((g) => String(g._id) === String(newId))
        complaintNo = ix >= 0 ? ix + 1 : sorted.length
      }
      setMessage(
        complaintNo > 0
          ? `Complaint submitted. It appears below as Complaint ${complaintNo}.`
          : 'Complaint submitted — check your submissions below.',
      )
      setName('')
      setRole('')
      setComplaintType('')
      setDescription('')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-scroll">
          <div className="sidebar-top">
            <div className="sidebar-brand">
              <div className="brand-logo">📋</div>
              <div>
                <h1 className="brand-name">Eco-Volunteer</h1>
                <span className="brand-subtitle">Complaints</span>
              </div>
            </div>
            <nav className="sidebar-nav">
              <button type="button" className="nav-item" onClick={() => navigate('/dashboard')}>
                <span className="nav-icon">🏠</span>
                <span>Dashboard</span>
              </button>
              <button type="button" className="nav-item" onClick={() => navigate('/map')}>
                <span className="nav-icon">📍</span>
                <span>Map</span>
              </button>
              <button type="button" className="nav-item" style={{ background: '#ecfdf5', color: '#059669', fontWeight: 700 }}>
                <span className="nav-icon">📋</span>
                <span>Complaints</span>
              </button>
              <button type="button" className="nav-item" onClick={() => navigate('/profile')}>
                <span className="nav-icon">👤</span>
                <span>Profile</span>
              </button>
            </nav>
          </div>
        </div>
        <div className="sidebar-footer-portal">
          <button type="button" className="sidebar-footer-btn sidebar-footer-btn-primary" onClick={() => loadMyComplaints()}>
            Refresh
          </button>
          <button type="button" className="sidebar-footer-btn" onClick={handleLogout}>
            Logout
          </button>
          <div className="sidebar-user">
            <div className="user-avatar">😊</div>
            <div className="user-info">
              <span className="user-name">{firstName}</span>
              <span className="user-points">Complaints</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <h2>Complaints</h2>
            <p>
              Submit a grievance for the admin team. When they reply, you will see their message below under{' '}
              <strong>Your submissions</strong>.
            </p>
          </div>
        </header>

        <div style={{ maxWidth: 720 }}>
          {complaintInboxAlert ? (
            <div
              className="feedback"
              style={{
                marginBottom: 16,
                background: '#fffbeb',
                borderColor: '#fcd34d',
                color: '#78350f',
              }}
            >
              🔔 {complaintInboxAlert}
            </div>
          ) : null}

          <section style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0 }}>Your submissions</h3>
              <button type="button" className="filter-btn" onClick={() => loadMyComplaints()}>
                Refresh
              </button>
            </div>
            {loadingMine ? (
              <p style={{ color: '#6b7280', marginTop: 12 }}>Loading…</p>
            ) : myComplaints.length === 0 ? (
              <p style={{ color: '#6b7280', marginTop: 12 }}>No complaints yet. Use the form below to submit one.</p>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, marginTop: 12 }}>
                {complaintsSortedOldestFirst.map((g, idx) => (
                  <li
                    key={g._id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: 12,
                      padding: 16,
                      marginBottom: 12,
                      background: '#fafafa',
                    }}
                  >
                    <p style={{ margin: '0 0 8px', fontWeight: 700 }}>
                      Complaint {idx + 1}{' '}
                      <span style={{ fontWeight: 500, color: '#6b7280' }}>({g.status})</span>
                    </p>
                    {g.complaintType && (
                      <p style={{ margin: '4px 0', fontSize: 14 }}>
                        <strong>Type:</strong> {g.complaintType}
                      </p>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: 14, color: '#374151' }}>
                      <strong>Your message:</strong> {g.description}
                    </p>
                    {g.adminResponse ? (
                      <div
                        style={{
                          marginTop: 12,
                          padding: 12,
                          background: '#ecfdf5',
                          borderRadius: 8,
                          border: '1px solid #6ee7b7',
                          fontSize: 14,
                        }}
                      >
                        <strong>Admin reply:</strong> {g.adminResponse}
                      </div>
                    ) : (
                      <p style={{ marginTop: 12, fontSize: 14, color: '#92400e' }}>
                        No admin reply yet — check back after the team reviews your complaint.
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <h3 style={{ marginBottom: 12 }}>New complaint</h3>
          {error && <div className="feedback feedback-error">{error}</div>}
          {message && <div className="feedback" style={{ background: '#ecfdf5', borderColor: '#6ee7b7', color: '#065f46' }}>{message}</div>}

          <form onSubmit={handleSubmit} className="organizer-modal organizer-event-modal" style={{ marginTop: 16 }}>
            <label style={{ display: 'block', marginBottom: 12 }}>
              <span>Name</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span>Role</span>
              <select
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              >
                <option value="">Select role</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 12 }}>
              <span>Complaint type</span>
              <select
                required
                value={complaintType}
                onChange={(e) => setComplaintType(e.target.value)}
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }}
              >
                <option value="">Select type</option>
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>

            <label style={{ display: 'block', marginBottom: 8 }}>
              <span>Description</span>
              <textarea
                required
                maxLength={12000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your complaint (max 600 words)"
                rows={10}
                style={{ width: '100%', marginTop: 6, padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', resize: 'vertical' }}
              />
            </label>
            <p style={{ margin: '0 0 16px', fontSize: 14, color: overLimit ? '#b91c1c' : '#6b7280' }}>
              {wc} / 600 words
            </p>

            <button type="submit" className="join-btn" disabled={submitting || overLimit}>
              {submitting ? 'Submitting…' : 'Submit complaint'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
