<div align="center">

<<<<<<< HEAD
ECO Volunteer Match is a purpose-built platform that connects volunteers with environmental events, cleanup campaigns, and community sustainability projects.

It is designed to make eco volunteering easy, rewarding, and impactful. Volunteers discover local green initiatives, organizers manage events and participants, and the whole experience is supported by clean full-stack architecture.

> Match passion with purpose.
> 
> Volunteer for nature, grow your impact.
> 
> Turning local environmental care into shared action.
=======
<img src="https://img.shields.io/badge/version-1.0.0-brightgreen?style=for-the-badge" alt="Version"/>
<img src="https://img.shields.io/badge/license-MIT-blue?style=for-the-badge" alt="License"/>
<img src="https://img.shields.io/badge/deployment-Vercel-black?style=for-the-badge&logo=vercel" alt="Vercel"/>
<img src="https://img.shields.io/badge/stack-MERN-61DAFB?style=for-the-badge&logo=react" alt="MERN"/>
<img src="https://img.shields.io/badge/docs-Doxygen-informational?style=for-the-badge" alt="Doxygen"/>
>>>>>>> 3d2516eb8e5d7d9d696eecc4351d719031d51512

<br/><br/>

# 🌿 Eco Volunteer Match

### *Bridging the gap between passionate volunteers and the planet's most urgent needs.*

**[🌐 View Live Demo](https://eco-five-gold.vercel.app)** &nbsp;|&nbsp; **[📚 Doxygen Docs](#-documentation)**

</div>

---

## 🌍 The Problem We're Solving

Every year, millions of people want to contribute to environmental causes — planting trees, cleaning rivers, protecting wildlife, reducing urban pollution — but **they don't know where to start**. On the other side of the equation, thousands of environmental organizations and community-led projects struggle to find consistent, committed volunteers.

The result? Passionate people scroll past causes they care about, and vital conservation efforts go understaffed.

**Eco Volunteer Match exists to fix this.** It is a full-stack web platform that acts as an intelligent bridge — matching volunteers with environmental projects based on their interests, location, and availability. Whether you're an individual wanting to make your weekends count, a student fulfilling community service hours, or a professional looking to give back, Eco Volunteer Match connects you to causes that matter, in your city, right now.

### 🎯 Real-World Impact

| Challenge | Our Solution |
|---|---|
| Volunteers can't find relevant local projects | Location & interest-based matching |
| Organizations lose volunteer momentum | Persistent accounts with badges & reward points |
| No accountability or recognition system | Gamified points system to motivate continued engagement |
| Fragmented sign-up processes | Unified, secure registration with JWT authentication |

> *"The greatest threat to our planet is the belief that someone else will save it."* — Robert Swan

Eco Volunteer Match turns that belief into action — **one volunteer at a time.**

---

## 🚀 Live Deployment

**Frontend:** [https://eco-five-gold.vercel.app](https://eco-five-gold.vercel.app) *(hosted on Vercel)*

> The live deployment connects to the hosted backend. For full local development including the backend, follow the Quick Start guide below.

---

## ✨ Features at a Glance

### 🖥️ Frontend
- **Animated Splash Screen** → Auto-navigates to login after 2.2s for a smooth first impression
- **Login & Register Pages** → Clean tabbed interface for authentication
- **Responsive Design** → Seamlessly adapts to mobile, tablet, and desktop viewports
- **Validation & Error Handling** → Real-time feedback for all user inputs
- **JWT Token Storage** → Secure session management via localStorage
- **Modular React Architecture** → Component-driven UI for easy extensibility

### ⚙️ Backend
- **User Registration & Login** → Full authentication lifecycle
- **Password Security** → bcrypt hashing with salt rounds
- **JWT Tokens** → 7-day stateless session management
- **MongoDB Persistence** → All volunteer profiles stored and queryable
- **CORS Configured** → Secure cross-origin communication between frontend and backend
- **RESTful API Design** → Clean, predictable endpoint structure

### 🏅 Volunteer Engagement System
- **Points Tracking** → Volunteers earn points for participation
- **Badges** → Achievement markers for milestones (e.g., `b1 — First Contribution`)
- **Interest Tags** → Personalized matching via `interests[]` (e.g., `environmental`, `wildlife`)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT LAYER                       │
│          React + Vite  (Port 5173 / Vercel)             │
│   Splash → Auth → Dashboard → Profile → Projects        │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTP / REST (Vite Proxy → /api)
┌───────────────────────▼─────────────────────────────────┐
│                      SERVER LAYER                       │
│           Node.js + Express  (Port 4000)                │
│    /api/auth   |   /api/users   |   Middleware (JWT)    │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose ODM
┌───────────────────────▼─────────────────────────────────┐
│                    DATABASE LAYER                       │
│               MongoDB (eco-volunteer DB)                │
│           Users Collection  |  Future: Projects         │
└─────────────────────────────────────────────────────────┘
```

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose ODM
- **Auth**: JWT (7-day expiry) + bcrypt password hashing
- **Deployment**: Vercel (frontend) + hosted backend

---

## 📚 Documentation

### Doxygen-Generated API & Code Reference

This project includes **full Doxygen documentation** for the backend source code, covering all modules, routes, middleware, and utility functions. The documentation is auto-generated from inline JSDoc-style comments throughout the codebase.

#### Generating the Docs Locally

**Prerequisites:** [Doxygen](https://www.doxygen.nl/download.html) must be installed.

```bash
# From the project root
doxygen Doxyfile
```

The generated HTML documentation will be available at:

```
docs/html/index.html
```

Open it in your browser to explore:

- **Module Dependency Graphs** — Visual maps of how server components relate
- **File Reference** — Every source file with annotated function signatures
- **Route Documentation** — Each API endpoint with parameter and return type docs
- **Middleware Chain** — JWT authentication and error-handling middleware explained
- **Data Model Reference** — Mongoose schema definitions with field-level documentation

#### Doxygen Configuration Highlights (`Doxyfile`)

| Setting | Value |
|---|---|
| `PROJECT_NAME` | Eco Volunteer Match |
| `INPUT` | `./server/src` |
| `RECURSIVE` | YES |
| `EXTRACT_ALL` | YES |
| `HAVE_DOT` | YES (for dependency graphs) |
| `GENERATE_HTML` | YES |
| `OUTPUT_DIRECTORY` | `./docs` |

> Doxygen documentation is a first-class part of this project — every function, route handler, and middleware is annotated inline to ensure the codebase remains understandable and maintainable as it scales.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- **Node.js** v18+
- **MongoDB** running locally (`mongodb://localhost:27017`)
- **Doxygen** (optional, for generating code docs)

### Terminal 1 — Backend

```bash
cd server
npm install
npm start
```

Expected output:
```
[DB] Connected
[API] running on http://localhost:4000
```

### Terminal 2 — Frontend

```bash
npm install
npm run dev
```

App opens at **[http://localhost:5173](http://localhost:5173)**

> Local dev uses the Vite proxy for `/api` requests — no `VITE_API_BASE` needed during development on `http://localhost:5173`. For production builds pointing to a separate backend host, set `VITE_API_BASE` in the frontend `.env`.

---

## 🛠️ Environment Variables

Create a `server/.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/eco-volunteer
JWT_SECRET=your-secret-key-change-in-production
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
```

---

## ⚙️ Development Commands

### Frontend
```bash
npm run dev       # Start dev server at port 5173
npm run build     # Production build
npm run preview   # Preview production build locally
```

### Backend
```bash
npm start         # Start production server
npm run dev       # Hot-reload with nodemon
npm run seed      # Seed database with sample volunteer data
```

### Documentation
```bash
doxygen Doxyfile  # Generate Doxygen HTML docs → ./docs/html/index.html
```

---

## 🧪 Testing the App — Example Flow

```
1. Load app            →  Splash screen with eco branding appears
2. Wait 2.2s           →  Auto-navigates to /auth
3. Click Register tab  →  Name, email, password fields appear
4. Fill in details:
     Name:     "Jane Doe"
     Email:    "jane@example.com"
     Password: "password123"
5. Click "Create Account"  →  Backend registers user in MongoDB
6. Success message         →  "Welcome Jane Doe! 🌿"
7. Switch to Login tab     →  Enter same credentials
8. Login success           →  JWT token saved, user redirected to dashboard
```

---
## 📘 Doxygen Documentation
This repository includes generated Doxygen documentation for the full source tree. It provides file references, searchable code listings, and documentation for frontend pages and backend API routes.

To view the generated docs locally, open:

```text
docs/html/index.html
```

If your source code changes, regenerate the docs with your Doxygen toolchain and refresh this file.

---
## 🐛 Troubleshooting

**MongoDB not running?**
```bash
mongod
```

**Port 4000 in use?** Change in `server/.env`:
```env
PORT=5000
```

**Frontend can't reach backend?**
- Verify `CLIENT_ORIGIN=http://localhost:5173` in `.env`
- Check the Network tab in browser DevTools (F12)

**Registration not saving?**
```bash
mongosh
use eco-volunteer
db.users.find()
```

---

## 🗺️ Roadmap

- [ ] Project listings with volunteer sign-up flows
- [ ] Interest-based project recommendation engine
- [ ] Volunteer activity feed and leaderboard
- [ ] Email notifications for new nearby projects
- [ ] Admin dashboard for project organizers
- [ ] OAuth (Google / GitHub) login support

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change. Ensure all new backend functions include Doxygen-compatible annotations so documentation stays up to date.

---

<div align="center">

Made with 💚 for the planet &nbsp;|&nbsp; **Eco Volunteer Match** &nbsp;|&nbsp; [Live Demo](https://eco-five-gold.vercel.app)

</div>
