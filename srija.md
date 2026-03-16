## Srija - Recent Changes (Dashboard branch)

Date: 2026-03-15

### Frontend setup & environment
- Created `.env` files for the demo app:
  - Project root `.env` with `VITE_API_BASE_URL=http://localhost:4000` for frontend → backend communication.
  - `server/.env` with `PORT=4000`, `MONGODB_URI`, `JWT_SECRET`, and `CLIENT_ORIGIN=http://localhost:5173`.
- Installed all frontend and backend `node_modules` and verified dev servers run on:
  - Frontend: `http://localhost:5173`
  - Backend: `http://localhost:4000`

### Map feature (React + Leaflet)
- Installed map dependencies in the frontend:
  - `leaflet`
  - `react-leaflet`
- Added a new page `src/pages/MapView.jsx`:
  - Uses **React Leaflet** (`MapContainer`, `TileLayer`, `Marker`, `Popup`) with OpenStreetMap tiles.
  - Fixes Leaflet default marker icons by importing the marker PNGs and wiring them via `L.Icon.Default.mergeOptions`.
  - Tracks the logged-in user via React Router (`useLocation`) to show their first name.
  - Integrates the **browser Geolocation API**:
    - Watches the user’s current position and keeps updating it.
    - Falls back to an India-wide center if location is not available.
    - Shows an inline error message if geolocation fails or is unsupported.
  - Shows event markers for all mock events from `src/data/mockData.js`:
    - Maps the city name found in the event’s `location` string (Mumbai, Hyderabad, etc.) to approximate latitude/longitude.
    - Renders a marker and popup for each event showing title, location, and points.
  - Adds a special marker for the user’s own location labeled **“You are here”** when available.
  - Provides a “Back to Dashboard” button that navigates back using React Router.

### Routing & dashboard integration
- Updated `src/App.jsx`:
  - Imported the new `MapView` page.
  - Added a protected route at `/map` wrapped in the existing `PrivateRoute` so the map is only accessible after auth.
- Updated `src/pages/Dashboard.jsx`:
  - Wired the existing **“Map View”** button in the dashboard header to navigate to `/map` while preserving auth state and user data.
  - Updated the left sidebar **“Map”** nav item to:
    - Set the active tab to `map`.
    - Navigate to `/map` with the current user passed in navigation state.

### Git / branch
- Committed all of the above changes on the `dashboard` branch.
- Pushed the updated `dashboard` branch to the GitHub repo `srija180705/ECO`.

