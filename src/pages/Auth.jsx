import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Auth() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Basic validation
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

      // MOCKED AUTH FLOW (no backend):
      // Pretend to call a server, then build a user object from the form data.
      await new Promise(resolve => setTimeout(resolve, 600))

      const mockUser = {
        id: 'mock-user-1',
        name: isLogin ? (formData.name || 'Eco Volunteer') : formData.name,
        email: formData.email,
        city: 'Hyderabad',
        points: 1520,
        badges: ['b1', 'b2', 'b3'],
        joinedEventIds: ['e1', 'e3', 'e6', 'e8'],
        interests: ['cleanup', 'planting', 'recycling'],
      }

      setFormData({ name: '', email: '', password: '' })
      navigate('/dashboard', { state: { fromAuth: true, user: mockUser } })

    } catch (err) {
      setError(err.message || 'An error occurred')
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
            onClick={() => {
              setIsLogin(true)
              setFormData({ name: '', email: '', password: '' })
              setError('')
            }}
          >
            Login
          </button>
          <button
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => {
              setIsLogin(false)
              setFormData({ name: '', email: '', password: '' })
              setError('')
            }}
          >
            Register
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

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

          {/* Role selection removed — only 'volunteer' supported */}

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Processing...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setIsLogin(!isLogin)
              setFormData({ name: '', email: '', password: '' })
              setError('')
            }}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth
