import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Eye, EyeOff } from 'lucide-react'
import { apiFetch } from '../api.js'

async function readErrorMessage(response) {
  const text = await response.text()
  if (!text) return `Request failed (${response.status})`
  try {
    const data = JSON.parse(text)
    return data.message || text.slice(0, 280)
  } catch {
    return text.slice(0, 280)
  }
}

function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [forgotMode, setForgotMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
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

    if (!isLogin && !formData.role) {
      setError('Please select a role')
      return
    }

    try {
      setLoading(true)

      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register'
      const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }

      options.body = JSON.stringify({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role
      })

      const response = await apiFetch(endpoint, options)

      if (response.ok) {
        let data
        try {
          data = await response.json()
        } catch {
          setError('Invalid response from server. Try again or restart the API.')
          return
        }
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
          setFormData({ name: '', email: '', password: '', role: '' })
          const redirectPath = user.role === 'organizer' ? '/organizer-dashboard' : (user.role === 'admin' ? '/admin' : '/dashboard')
          navigate(redirectPath, { state: { fromAuth: true, user } })
        } else {
          setSuccess(data.message || 'Registration successful.')
          setFormData({ name: '', email: '', password: '', role: '' })
        }
      } else {
        const message = await readErrorMessage(response)
        setError(message || 'Authentication failed')
      }
    } catch (err) {
      const isNetwork =
        err instanceof TypeError ||
        (typeof err?.message === 'string' && err.message.toLowerCase().includes('fetch'))
      setError(
        isNetwork
          ? 'Cannot reach the server. Start the backend (port 4000), ensure MongoDB is connected, and open the app from Vite (http://localhost:5173) so /api requests are proxied.'
          : (err?.message || 'Authentication failed. Please try again.'),
      )
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
                  setFormData({ name: '', email: '', password: '', role: '' })
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
              <div className="auth-role-select-wrap">
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="auth-role-select"
                  required
                  aria-label="Select your role"
                >
                  <option value="" disabled>Select a role</option>
                  <option value="volunteer">Volunteer</option>
                  <option value="organizer">Event Organizer</option>
                </select>
                <ChevronDown className="auth-role-chevron" size={18} strokeWidth={2} aria-hidden />
              </div>
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
              <div className="password-field-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? <EyeOff size={20} strokeWidth={2} /> : <Eye size={20} strokeWidth={2} />}
                </button>
              </div>
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
                setFormData({ name: '', email: '', password: '', role: '' })
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
                setFormData({ name: '', email: '', password: '', role: '' })
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
                  const nextLogin = !isLogin
                  setIsLogin(nextLogin)
                  setError('')
                  setSuccess('')
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    role: nextLogin ? 'volunteer' : '',
                  })
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
