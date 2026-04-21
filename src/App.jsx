import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import MapView from './pages/MapView'
import AdminPage from './pages/AdminPage'

// Protected route wrapper - checks localStorage token/user only
function PrivateRoute({ children }) {
  const storedToken = localStorage.getItem('token')
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null')

  if (!storedToken || !storedUser) {
    return <Navigate to="/auth" replace />
  }
  return children
}

// Admin route wrapper
function AdminRoute({ children }) {
  const storedToken = localStorage.getItem('token')
  const storedUser = JSON.parse(localStorage.getItem('user') || 'null')

  if (!storedToken || !storedUser || storedUser.role !== 'admin') {
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
            <PrivateRoute>
              <Dashboard />
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
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPage />
            </AdminRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App