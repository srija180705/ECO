<div align="center">


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

## 📋 Project Documentation Artifacts

This repository includes comprehensive project documentation in the root directory:

### 📄 **SRS.pdf** — Software Requirements Specification
Detailed functional and non-functional requirements, use cases, and acceptance criteria for the Eco Volunteer Match platform.

### 📐 **SDS.pdf** — Software Design Specification
Complete system architecture, component design, data flow diagrams, database schema, and design decisions that guide implementation.

### 📊 **Test_Plan.xlsx** — Test Plan
Comprehensive testing strategy including:
- Unit test cases
- Integration test scenarios
- Test coverage matrix
- User acceptance test (UAT) procedures
- Performance and security test requirements

All three documents provide the blueprint for understanding the project's vision, implementation, and quality assurance approach.


<div align="center">

## 🌱 Every Action Counts

The environmental crisis is not a problem for tomorrow — it's a challenge for today,  
and it requires people like you.

Eco Volunteer Match was built on the belief that technology, when used thoughtfully,  
can turn individual intent into collective impact.

Whether you're here to volunteer, contribute code, or simply explore —  
**welcome. You're part of the solution.**

<br/>

*Built with purpose. Deployed with passion. Maintained with care.*

<br/>

**[🌐 Live Demo](https://eco-five-gold.vercel.app)** &nbsp;•&nbsp; **[📚 Doxygen Docs](#-documentation)** &nbsp;•&nbsp; **[⬆ Back to Top](#-eco-volunteer-match)**

<br/>

Made with 💚 for the planet by the Eco Volunteer Match team

</div>