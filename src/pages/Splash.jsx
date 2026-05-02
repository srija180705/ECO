import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth')
    }, 2200)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="splash-container">
      <div className="splash-content">
        <div className="splash-leaf">🌿</div>
        <h1>Eco Volunteer Match</h1>
        <p className="splash-tagline">
          Connecting volunteers with environmental opportunities — sign in to explore events near you.
        </p>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  )
}

export default Splash
