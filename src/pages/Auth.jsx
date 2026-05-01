import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api.js'

function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'volunteer',
    permissionSlip: null,
    organizerConsent: false
  })

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    setError('')
    setSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (forgotMode) {
      const email = formData.email.trim()
      if (!email) {
        setError('Please enter your email')
        return
      }

      try {
        setLoading(true)
        const response = await apiFetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({ email })
        })

        if (response.ok) {
          const data = await response.json()
          setSuccess(data.message || 'If an account exists with that email, a reset link has been sent.')
        } else {
          let message = 'Unable to send reset instructions'
          const text = await response.text()
          if (text) {
            try {
              const errorData = JSON.parse(text)
              message = errorData.message || message
            } catch {
              message = text
            }
          }
          setError(message)
        }
      } catch (err) {
        const message = err?.message || 'Unable to send reset instructions. Please try again.'
        setError(`${message} Check backend /api/auth/forgot-password and email env setup.`)
        console.error('Forgot password error:', err)
      } finally {
        setLoading(false)
      }
      return
    }

    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields')
      return
    }

    if (!isLogin && !formData.name) {
      setError('Please enter your name')
      return
    }

    if (!isLogin && formData.role === 'organizer' && !formData.permissionSlip) {
      setError('Please upload the permission slip to register as an organizer')
      return
    }

    if (!isLogin && formData.role === 'organizer' && !formData.organizerConsent) {
      setError('Please confirm organizer responsibility terms before registering')
      return
    }

    try {
      setLoading(true)

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const options = { method: 'POST' }

      if (isLogin) {
        options.headers = { 'Content-Type': 'application/json' }
        options.body = JSON.stringify({ email: formData.email, password: formData.password })
      } else {
        const formPayload = new FormData()
        formPayload.append('name', formData.name)
        formPayload.append('email', formData.email)
        formPayload.append('password', formData.password)
        formPayload.append('role', formData.role)
        if (formData.role === 'organizer' && formData.permissionSlip) {
          formPayload.append('permissionSlip', formData.permissionSlip)
        }
        options.body = formPayload
      }

      const response = await apiFetch(endpoint, options)

      if (response.ok) {
        const data = await response.json()
        if (data.token) {
          const user = {
            _id: data.user._id,
            id: data.user._id,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role === 'user' ? 'volunteer' : (data.user.role || 'volunteer'),
            isVerified: data.user.isVerified ?? true,
            city: data.user.city || 'Hyderabad',
            points: data.user.points ?? 0,
            badges: [],
            joinedEventIds: [],
            interests: [],
          }
          localStorage.setItem('token', data.token)
          localStorage.setItem('user', JSON.stringify(user))
          setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
          const redirectPath = user.role === 'organizer' ? '/organizer-dashboard' : (user.role === 'admin' ? '/admin' : '/dashboard')
          navigate(redirectPath, { state: { fromAuth: true, user } })
        } else {
          setSuccess(data.message || 'Registration submitted. Please wait for admin approval.')
          setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
        }
      } else {
        const errorData = await response.json()
        setError(errorData.message || 'Authentication failed')
      }
    } catch (err) {
      setError('Authentication failed. Please try again.')
      console.error('Auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Eco Volunteer Match</h2>

        <div className="tabs">
          {!forgotMode && (
            <>
              <button
                className={`tab ${isLogin ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setIsLogin(true)
                  setForgotMode(false)
                  setError('')
                  setSuccess('')
                  setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
                }}
              >
                Login
              </button>
              <button
                className={`tab ${!isLogin ? 'active' : ''}`}
                type="button"
                onClick={() => {
                  setIsLogin(false)
                  setForgotMode(false)
                  setError('')
                  setSuccess('')
                  setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
                }}
              >
                Register
              </button>
            </>
          )}
          {forgotMode && (
            <button className="tab active" type="button">Forgot Password</button>
          )}
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && !forgotMode && (
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>
          )}

          {!isLogin && !forgotMode && (
            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
              >
                <option value="volunteer">Volunteer</option>
                <option value="organizer">Event Organizer</option>
              </select>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
            />
          </div>

          {!isLogin && !forgotMode && formData.role === 'organizer' && (
            <div className="form-group auth-guidance-box">
              <label htmlFor="permissionSlip">Permission Slip (PDF)</label>
              <p className="auth-guidance-title">Include these details in the organizer permission slip:</p>
              <ul className="auth-guidance-list">
                <li>Aadhaar details (or equivalent government ID details).</li>
                <li>Organization details, if you are representing an organization.</li>
                <li>A declaration that all submitted details are true and legal.</li>
                <li>An acceptance statement that you are responsible for your own actions in case of false or illegal activity.</li>
              </ul>
              <p className="auth-guidance-note">This document will be sent to admin for verification before organizer login is approved.</p>
              <input
                type="file"
                id="permissionSlip"
                name="permissionSlip"
                accept="application/pdf"
                onChange={(e) => setFormData((prev) => ({ ...prev, permissionSlip: e.target.files[0] || null }))}
              />
              <label className="auth-checkbox">
                <input
                  type="checkbox"
                  name="organizerConsent"
                  checked={formData.organizerConsent}
                  onChange={handleChange}
                />
                <span>I confirm I have included the required details and agree to these organizer responsibility terms.</span>
              </label>
            </div>
          )}

          {!forgotMode && (
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
            </div>
          )}

          {forgotMode && (
            <div className="form-group">
              <p>Enter your email address to receive a reset link.</p>
            </div>
          )}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? 'Processing...'
              : forgotMode
                ? 'Send Reset Link'
                : isLogin
                  ? 'Login'
                  : 'Create Account'}
          </button>

          {!forgotMode && isLogin && (
            <p className="auth-guidance-note auth-inline-note">
              Organizer accounts can log in only after admin verifies their permission slip submission.
            </p>
          )}
        </form>

        <div className="auth-footer">
          {!forgotMode && isLogin && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setForgotMode(true)
                setIsLogin(true)
                setError('')
                setSuccess('')
                setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
              }}
            >
              Forgot password?
            </button>
          )}

          {forgotMode && (
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setForgotMode(false)
                setIsLogin(true)
                setError('')
                setSuccess('')
                setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
              }}
            >
              Back to login
            </button>
          )}

          {!forgotMode && (
            <p>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                className="link-btn"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setError('')
                  setSuccess('')
                  setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null, organizerConsent: false })
                }}
              >
                {isLogin ? 'Register' : 'Login'}
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Auth
