import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import OrganizerDashboard from './pages/OrganizerDashboard'
import Profile from './pages/Profile'
import MapView from './pages/MapView'

function PrivateRoute({ children, allowedRoles = null, organizerOnly = false }) {
  const location = useLocation()
  const token = localStorage.getItem('token')
  const storedUser = localStorage.getItem('user')
  const navUser = location.state && location.state.user
  const user = navUser || (storedUser ? JSON.parse(storedUser) : null)

  if (!token || !user) return <Navigate to="/auth" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />
  if (organizerOnly && !(user.role === 'organizer' && user.isVerified)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute allowedRoles={['volunteer']}>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/organizer-dashboard"
          element={
            <PrivateRoute organizerOnly>
              <OrganizerDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/map"
          element={
            <PrivateRoute>
              <MapView />
            </PrivateRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App