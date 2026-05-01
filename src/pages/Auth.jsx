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
    role: 'volunteer'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
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
          setFormData({ name: '', email: '', password: '', role: 'volunteer' })
          const redirectPath = user.role === 'organizer' ? '/organizer-dashboard' : (user.role === 'admin' ? '/admin' : '/dashboard')
          navigate(redirectPath, { state: { fromAuth: true, user } })
        } else {
          setSuccess(data.message || 'Registration successful.')
          setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
                  setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
                  setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
                setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
                setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
                  setFormData({ name: '', email: '', password: '', role: 'volunteer' })
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
