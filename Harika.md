# Eco Volunteer Match – Auth & Dashboard Changes (Harika)

This document explains **all the changes** made to your Eco Volunteer Match project during this session, and **how** they were implemented. It focuses on:

- Proper backend authentication (MongoDB + JWT)
- Frontend login / register flow
- Strict protection of the `/dashboard` route
- Showing the logged-in user’s name on the dashboard

---

## 1. Backend environment (.env) and server startup

### 1.1. Problem

When you first ran:

```bash
npm run dev
```

in the `ECO/server` folder, the server crashed with:

- Missing required environment variables: `JWT_SECRET`, `MONGODB_URI`

The file `server/src/index.js` validates these env vars at startup and exits if they are missing.

### 1.2. Change made

I created a `.env` file inside the **server** folder:

`ECO/server/.env`

with:

```env
JWT_SECRET=eco_volunteer_match_secret_9a7f42c1
MONGODB_URI=mongodb://127.0.0.1:27017/eco_volunteer
```

### 1.3. Effect

- `JWT_SECRET` is used by the backend to sign JWT tokens (in `server/src/routes/auth.js`).
- `MONGODB_URI` is used by `connectDB` (in `server/src/db.js`, called from `server/src/index.js`) to connect to MongoDB.
- With this `.env` file in place, `npm run dev` in `ECO/server` can start the API server successfully (assuming MongoDB is available at that URI).

---

## 2. Backend authentication logic (already present)

This logic already existed; I only **used** it, not changed its behavior.

### 2.1. Registration (`POST /api/auth/register`)

File: `server/src/routes/auth.js`

- Expects `name`, `email`, `password`, optionally `city`.
- Validates that `email` and `password` are present.
- Checks if the email already exists in MongoDB (`User.findOne`).
- Hashes the password using `bcrypt`.
- Creates a new user in `User` collection with:
  - `name`, `email`, `passwordHash`, `city`, `points`, `badges`, `interests`.
- Generates a JWT:

  ```js
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
  ```

- Returns:

  ```json
  {
    "token": "<jwt>",
    "user": {
      "_id": "...",
      "name": "...",
      "email": "...",
      "city": "..."
    }
  }
  ```

### 2.2. Login (`POST /api/auth/login`)

File: `server/src/routes/auth.js`

- Expects `email`, `password`.
- Looks up the user by email.
- Compares the provided password with `passwordHash` using `bcrypt.compare`.
- If correct, generates a new JWT, and returns `{ token, user }` with the same shape as `/register`.

### 2.3. Protected endpoints using JWT

File: `server/src/middleware/auth.js`

- Reads `Authorization` header, expects `Bearer <token>`.
- Verifies the token using `JWT_SECRET`.
- On success, attaches `req.user = { userId: ... }`, then calls `next()`.
- On failure, sends `401` with `message: "Missing token"` or `"Invalid token"`.

File: `server/src/routes/users.js`

- `/api/users/me` uses `auth` middleware to return the profile of the currently logged-in user.
- Certain routes like `PATCH /api/users/:id` use `auth` to ensure only the owner can update their own profile.

**Summary:** the backend already supports **real authentication** with **MongoDB + JWT**. Our work focused primarily on the **frontend behavior** and route protection.

---

## 3. Frontend routing and initial state

### 3.1. Original router setup

File: `src/App.jsx`

Originally there were three routes:

- `/` → `Splash`
- `/auth` → `Auth`
- `/dashboard` → `Dashboard`

There was **no protection** on `/dashboard`, which allowed typing `http://localhost:5173/dashboard` directly and seeing the page.

### 3.2. Splash screen behavior

File: `src/pages/Splash.jsx`

- On mount, waits ~2.2 seconds, then navigates to `/auth`:

  ```js
  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth')
    }, 2200)

    return () => clearTimeout(timer)
  }, [navigate])
  ```

This stayed as-is; we only relied on it for initial navigation.

---

## 4. First attempt: protecting `/dashboard` with storage (then removed)

> This section documents what we tried first and later replaced to match your stricter requirements.

### 4.1. PrivateRoute using `localStorage` / `sessionStorage`

We added a `PrivateRoute` in `App.jsx` that:

- Checked for a token in `localStorage` and later `sessionStorage`.
- If missing, redirected to `/auth`.
- If present, allowed rendering `<Dashboard />`.

We also made `Dashboard` check storage and redirect to `/auth` when no token was found.

Then, in `Auth.jsx`, we:

- Saved `data.token` and `data.user` into storage on successful login.
- Navigated to `/dashboard`.

This is a **typical web app approach** (persist login), but it did **not** match your exact requirement:

> “If I refresh the page, I should be logged out, and typing `/dashboard` in the URL should always go to auth.”

Because of that, we changed the design to **not rely on browser storage at all**.

---

## 5. Final design: ultra-strict `/dashboard` protection

Your requirements:

- **Without logging in**, you should **never** see `/dashboard`, even if you type the URL directly.
- **On refresh**, the user should be considered **logged out** and sent back to `/auth`.
- `/dashboard` should be visible **only immediately after a successful login/register**.
- While on the dashboard, you should see the **name you logged in with**.

To satisfy all of this, we:

1. Stopped using `localStorage` or `sessionStorage` for auth.
2. Used **React Router navigation state** to pass a short-lived flag and the user info from `Auth` to `Dashboard`.

### 5.1. Protected route using navigation state (`App.jsx`)

File: `src/App.jsx`

We now import `useLocation` and implement `PrivateRoute` like this:

```js
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Splash from './pages/Splash'
import Auth from './pages/Auth'
import Dashboard from './pages/Dashboard'

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
      </Routes>
    </Router>
  )
}

export default App
```

**Key idea:**

- The only way to reach `/dashboard` is via a navigation call that sets `state: { fromAuth: true }`.
- If you refresh the page or type `/dashboard` manually:
  - The router’s location state is **lost**.
  - `fromAuth` is `undefined`.
  - `PrivateRoute` redirects back to `/auth`.

This exactly matches:

- **Direct URL access** `/dashboard` → goes to `/auth`.
- **Refresh** on `/dashboard` → goes to `/auth`.

### 5.2. Passing the user’s name from Auth to Dashboard (`Auth.jsx`)

File: `src/pages/Auth.jsx`

We updated the code that runs after a successful login or registration. Previously, it stored data in storage; now it:

- Clears the form.
- Navigates to `/dashboard`.
- Passes a small state object containing:
  - `fromAuth: true` (for protection)
  - `user: data.user` (from the backend response, includes `name`)

Relevant part:

```js
const handleSubmit = async (e) => {
  e.preventDefault()
  setError('')

  // ... validation and request logic ...

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Authentication failed')
  }

  // Successful auth – do NOT store anything persistent
  // Just navigate to dashboard, mark that we came from Auth, and pass user data
  setFormData({ name: '', email: '', password: '' })
  navigate('/dashboard', { state: { fromAuth: true, user: data.user } })
}
```

**Important:**

- `data.user` comes directly from the backend and includes the `name` field you registered/logged in with.

### 5.3. Reading the user’s name on the Dashboard (`Dashboard.jsx`)

File: `src/pages/Dashboard.jsx`

Originally, `Dashboard`:

- Read `user` from storage.
- Fell back to a hard-coded name like `"Sarah"` or `"Volunteer"`.

Now, we:

1. Use `useLocation` to read the navigation state.
2. Extract the `user` from `location.state.user`.
3. Derive `firstName` from that user’s `name`.

Updated top of the file:

```js
import React from 'react';
import { useLocation } from 'react-router-dom';
import './Dashboard.css';

function Dashboard() {
  const location = useLocation();
  const user = location.state && location.state.user;
  const firstName = user?.name ? user.name.split(' ')[0] : 'Volunteer';
```

Then in the header (already present):

```jsx
<h2>Welcome back, {firstName} <span className="wave">👋</span></h2>
```

**Result:**

- If you log in with `name = "Harika Reddy"`, then `firstName` becomes `"Harika"`.
- The dashboard shows: **“Welcome back, Harika 👋”**.
- If, for some reason, the dashboard is reached without a user (which shouldn’t happen because of `PrivateRoute`), it falls back to `"Volunteer"`.

---

## 6. Final behavior summary (what the user sees)

### 6.1. Authentication flow

1. User opens `http://localhost:5173/`.
2. Sees the splash screen for ~2.2 seconds.
3. Auto-navigated to `/auth`.
4. On `/auth`, user can:
   - **Register** (name + email + password).
   - Or **Login** (email + password).
5. `Auth.jsx` sends the credentials to the backend (`http://localhost:4000/api/auth/*`).
6. Backend checks credentials against MongoDB and returns `{ token, user }` if valid.
7. Frontend:
   - Does **not** store token or user in storage.
   - Directly navigates to `/dashboard` and passes `{ fromAuth: true, user: data.user }` in router **state**.

### 6.2. Dashboard access rules

- **Direct URL** `http://localhost:5173/dashboard`:
  - `PrivateRoute` does not see `fromAuth` in the location state.
  - Immediately redirects to `/auth`.
- **After a successful login/register**:
  - `navigate('/dashboard', { state: { fromAuth: true, user } })`.
  - `PrivateRoute` allows access.
  - `Dashboard` reads `user.name`, shows “Welcome back, \<FirstName\>”.
- **On page refresh** while on `/dashboard`:
  - Browser reloads the app from scratch; navigation state is lost.
  - `PrivateRoute` no longer sees `fromAuth`.
  - User is redirected to `/auth` (effectively “logged out” from the front-end’s point of view).

This exactly matches your requirement:

- **No login = no dashboard**, even if the user types `/dashboard` manually.
- **Refresh = logged out**, and the user is sent back to `/auth`.
- **Dashboard shows the name used at login/registration**.

---

## 7. How to run and test everything

### 7.1. Start backend (API server)

In a terminal:

```bash
cd "C:\Users\harik\Desktop\Eco Volunteer Match\ECO\server"
npm install         # only needed once
npm run dev
```

Requirements:

- MongoDB running and reachable at `mongodb://127.0.0.1:27017/eco_volunteer` (or adjust `MONGODB_URI` in `server/.env` if you use MongoDB Atlas).

### 7.2. Start frontend (Vite dev server)

In a **separate terminal**:

```bash
cd "C:\Users\harik\Desktop\Eco Volunteer Match\ECO"
npm install         # only needed once
npm run dev
```

Open the URL it shows (usually `http://localhost:5173`).

### 7.3. Test cases to try

1. **Direct `/dashboard` without login**
   - In a fresh browser window/tab, type: `http://localhost:5173/dashboard`.
   - Expected: you see the **auth page**, not the dashboard.

2. **Login and see your name**
   - Go to `http://localhost:5173`.
   - Wait for splash → `/auth`.
   - Register or login with a name like "Harika Reddy".
   - Expected: you are taken to `/dashboard`, and see:
     - “Welcome back, Harika 👋”.

3. **Refresh logs you out**
   - While on `/dashboard`, press **F5** or click refresh.
   - Expected: you are redirected back to `/auth`.

4. **Re-typing `/dashboard`**
   - In the same or a new tab, type: `http://localhost:5173/dashboard`.
   - Expected: you are redirected to `/auth`.

---

## 8. Notes and future improvements

- **Security**:
  - The frontend currently does not send the JWT back to the server for protected calls (except for simple auth flows). If you start calling protected endpoints like `/api/users/me`, you will need to:
    - Decide whether to persist the token (e.g., in `httpOnly` cookies or memory).
    - Attach the token as `Authorization: Bearer <token>` from the frontend.
  - Right now, the frontend behavior is intentionally **very strict** and **non-persistent** to match your requirement.

- **User experience**:
  - Most production apps remember the user’s login at least for the browser session or multiple days. You explicitly preferred:
    - No remembered login.
    - Refresh = logged out.
  - If you later want a more typical behavior (stay logged in until logout), we can:
    - Reintroduce `sessionStorage` or `localStorage` for the token and user.
    - Use the existing JWT-based backend to validate on each API call.

---

If you want, we can now:

- Add a **Logout button** that explicitly returns you to `/auth`.
- Or switch to a more standard **“remember me”** behavior while still keeping `/dashboard` protected using the backend token.

