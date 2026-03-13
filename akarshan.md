## Eco‑Volunteer Match – Profile Feature (Akarshan)

### What I Implemented

- **Profile page (`Profile.jsx`)**
  - Reads the current user either from `location.state.user` (after login) or from `mockDB.users[0]` as a fallback.
  - Shows key info: **name, email, city, interests, total points, earned badges, volunteering history**.
  - Lets the user edit **name, city, interests** (email is read‑only) and saves changes locally.
  - On “Back to Dashboard”, sends the updated user back via `navigate('/dashboard', { state: { fromAuth: true, user } })`.

- **Points & badges logic**
  - **Volunteering history** comes from `resolvedUser.joinedEventIds`, mapped to `mockDB.events` and sorted by date (newest first).
  - **Total points** is taken from `resolvedUser.points` if present; otherwise it’s the sum of `points` from all joined events.
  - **Badges** use `resolvedUser.badges` (IDs) and resolve to full badge objects from `mockDB.badges` for display (icon + title).

- **Routing & sidebar**
  - In `App.jsx`, added a protected route: `/profile` wrapped with `PrivateRoute`, same as `/dashboard`.
  - In `Dashboard.jsx`, changed only the **Profile** item so it uses `navigate('/profile', { state: { fromAuth: true, user } })`.
  - **Community** and **Map** sidebar entries were not changed.

### How This Fits Future Express.js Backend

- All data now comes from **mock objects** (`mockDB` + `location.state.user`), but the shapes match what an API would return:
  - `user` with `name`, `email`, `city`, `points`, `badges`, `joinedEventIds`, `interests`.
  - `events` with `id`, `title`, `category`, `points`, `dateISO`, `location`.
  - `badges` with `id`, `title`, `icon`.
- Later, an Express.js server can replace `mockDB` with real endpoints (for example `GET /api/profile`, `GET /api/events`), without changing the overall Profile UI or the points/badges logic—only the data source.  
