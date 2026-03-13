import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

// Protected route wrapper using navigation state only
function PrivateRoute({ children }) {
  const location = useLocation()
  const fromAuth = location.state && location.state.fromAuth

  if (!fromAuth) {
    return <Navigate to="/auth" replace />
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
            <PrivateRoute>
              <Dashboard />
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