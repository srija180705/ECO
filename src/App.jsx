import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  )
}

export default App
