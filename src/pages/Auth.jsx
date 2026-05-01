import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../api.js'

function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'volunteer',
    permissionSlip: null
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
          setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null })
          const redirectPath = user.role === 'organizer' ? '/organizer-dashboard' : (user.role === 'admin' ? '/admin' : '/dashboard')
          navigate(redirectPath, { state: { fromAuth: true, user } })
        } else {
          setSuccess(data.message || 'Registration submitted. Please wait for admin approval.')
          setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null })
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
          <button
            className={`tab ${isLogin ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setIsLogin(true)
              setError('')
              setSuccess('')
              setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null })
            }}
          >
            Login
          </button>
          <button
            className={`tab ${!isLogin ? 'active' : ''}`}
            type="button"
            onClick={() => {
              setIsLogin(false)
              setError('')
              setSuccess('')
              setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null })
            }}
          >
            Register
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
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

          {!isLogin && (
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

          {!isLogin && formData.role === 'organizer' && (
            <div className="form-group">
              <label htmlFor="permissionSlip">Permission Slip (PDF)</label>
              <input
                type="file"
                id="permissionSlip"
                name="permissionSlip"
                accept="application/pdf"
                onChange={(e) => setFormData((prev) => ({ ...prev, permissionSlip: e.target.files[0] || null }))}
              />
            </div>
          )}

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

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? 'Processing...'
              : isLogin
                ? 'Login'
                : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setIsLogin(!isLogin)
                setError('')
                setSuccess('')
                setFormData({ name: '', email: '', password: '', role: 'volunteer', permissionSlip: null })
              }}
            >
              {isLogin ? 'Register' : 'Login'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Auth
