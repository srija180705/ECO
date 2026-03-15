import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { mockDB } from '../data/mockData';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Ensure default Leaflet marker icons load correctly in bundlers like Vite
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function MapView() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = location.state && location.state.user;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';

  const [userLocation, setUserLocation] = useState(null);
  const [geoError, setGeoError] = useState(null);

  // Fallback center (India)
  const indiaCenter = [20.5937, 78.9629];

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setGeoError('Location not supported by this browser');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        setGeoError(null);
      },
      (err) => {
        console.error('Geolocation error', err);
        setGeoError('Unable to get your location');
      },
      { enableHighAccuracy: true }
    );

    return () => {
      if (watchId && navigator.geolocation.clearWatch) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const mapCenter = userLocation || indiaCenter;

  // Very simple city → coordinate mapping based on event.location text
  const cityCoords = {
    mumbai: [19.076, 72.8777],
    bengaluru: [12.9716, 77.5946],
    kolkata: [22.5726, 88.3639],
    hyderabad: [17.385, 78.4867],
    'new delhi': [28.6139, 77.209],
    chennai: [13.0827, 80.2707],
    varanasi: [25.3176, 82.9739],
    pune: [18.5204, 73.8567],
    ooty: [11.4064, 76.6932],
    jaipur: [26.9124, 75.7873],
    ahmedabad: [23.0225, 72.5714],
    kochi: [9.9312, 76.2673],
    jaipur: [26.9124, 75.7873],
  };

  const getEventPosition = (event) => {
    const lower = event.location.toLowerCase();
    const key = Object.keys(cityCoords).find((city) => lower.includes(city));
    return key ? cityCoords[key] : null;
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ padding: '16px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Map View</h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Explore volunteering events on an interactive map</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            type="button"
            style={{ padding: '8px 14px', borderRadius: 999, border: '1px solid #d1d5db', background: 'white', cursor: 'pointer' }}
            onClick={() => navigate(-1)}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <div style={{ padding: '8px 24px', fontSize: 14, color: '#4b5563' }}>
        Logged in as <strong>{firstName}</strong>
        {geoError && <span style={{ marginLeft: 12, color: '#b91c1c' }}>({geoError})</span>}
      </div>

      <div style={{ flex: 1, padding: '0 24px 24px' }}>
        <div style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 30px rgba(15, 23, 42, 0.12)' }}>
          <MapContainer center={mapCenter} zoom={5} style={{ height: '70vh', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {mockDB.events.map((event) => {
              const position = getEventPosition(event);
              if (!position) return null;
              return (
                <Marker key={event.id} position={position}>
                  <Popup>
                    <strong>{event.title}</strong>
                    <br />
                    {event.location}
                    <br />
                    {event.points} pts
                  </Popup>
                </Marker>
              );
            })}

            {userLocation && (
              <Marker position={userLocation}>
                <Popup>
                  <strong>You are here</strong>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

export default MapView;

