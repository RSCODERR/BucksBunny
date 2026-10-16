# BucksBunny

A personal finance application foundation built with a decoupled architecture featuring **React 19**, **Vite**, **Tailwind CSS v4**, **Node.js with Express**, **TypeScript**, and **MongoDB with Mongoose**.

BucksBunny helps users understand their spending, track expenses, manage budgets and keep track of money they owe others or are owed.

---

## Architecture Overview

The project is structured into two completely independent, decoupled applications:
- **`backend/`**: A TypeScript Express REST API with strict configuration validation, centralized error handling, explicit CORS policy, and Mongoose database connection.
- **`frontend/`**: A React 19 single-page application built with Vite and Tailwind CSS v4, featuring a typed API client, live system diagnostics, approved brand assets, and persistent Privacy Policy and Terms and Conditions views.

```
BucksBunny/
├── .agents/
│   └── rules/
│       └── bucksbunny-rules.md     # Permanent product, design and engineering rules
├── AGENTS.md                       # Permanent rules root reference
├── .gitignore                      # Workspace-level gitignore (env, dependencies, builds, logs)
├── package.json                    # Root task runner scripts (optional convenience)
├── README.md                       # Complete documentation, setup guide and architectural breakdown
│
├── backend/                        # Express + TypeScript + Mongoose REST API
│   ├── .env.example                # Example backend environment variables template
│   ├── .gitignore                  # Backend-specific ignore rules
│   ├── package.json                # Backend scripts and dependencies
│   ├── tsconfig.json               # Backend TypeScript configuration
│   └── src/
│       ├── config/
│       │   ├── env.ts              # Strongly-typed environment validator (throws actionable errors)
│       │   └── database.ts         # Mongoose connection manager and readyState inspector
│       ├── controllers/
│       │   └── health.controller.ts# GET /api/v1/health handler
│       ├── errors/
│       │   └── AppError.ts         # Custom operational error class
│       ├── middlewares/
│       │   ├── cors.middleware.ts  # Origin-checked CORS policy middleware
│       │   ├── error.middleware.ts # Centralized JSON error-handling middleware
│       │   └── notFound.middleware.ts# Catch-all 404 middleware
│       ├── routes/
│       │   ├── api/v1/
│       │   │   ├── health.routes.ts# Health endpoint router
│       │   │   └── index.ts        # API v1 aggregator router
│       │   └── index.ts            # Top-level API router mounting /api/v1
│       ├── app.ts                  # Express application setup and middleware pipeline
│       └── server.ts               # Server bootstrap, DB connection and graceful shutdown
│
└── frontend/                       # React 19 + TypeScript + Vite + Tailwind CSS v4
    ├── .env.example                # Example frontend environment variables template
    ├── .gitignore                  # Frontend-specific ignore rules
    ├── index.html                  # HTML entry point with approved favicon, fonts and metadata
    ├── package.json                # Frontend scripts and dependencies
    ├── public/
    │   ├── favicon.png             # Approved BucksBunny favicon
    │   ├── logo.png                # Approved BucksBunny logo (transparent)
    │   └── logo-dark.jpg           # Approved BucksBunny logo (dark background)
    ├── tsconfig.json               # Root TypeScript configuration
    ├── tsconfig.app.json           # Application TypeScript configuration
    ├── tsconfig.node.json          # Node/Vite build TypeScript configuration
    ├── vite.config.ts              # Vite configuration with React and Tailwind v4 plugins
    └── src/
        ├── config/
        │   └── env.ts              # Frontend environment config and validation (VITE_API_BASE_URL)
        ├── types/
        │   └── api.ts              # Strongly-typed API and Health response interfaces
        ├── services/
        │   ├── apiClient.ts        # Reusable typed fetch wrapper with timeouts and error handling
        │   └── healthService.ts    # Service calling the backend health check API
        ├── pages/
        │   ├── PrivacyPolicy.tsx   # Preserved Privacy Policy page
        │   └── TermsAndConditions.tsx # Preserved Terms and Conditions page
        ├── components/
        │   ├── common/
        │   │   ├── Badge.tsx       # Semantic status badge component (restrained border radius)
        │   │   └── StatusIndicator.tsx # Calm status indicator
        │   ├── layout/
        │   │   ├── Header.tsx      # Main application header with brand logo and page navigation
        │   │   └── Footer.tsx      # Application footer linking to Privacy Policy and Terms
        │   └── health/
        │       └── HealthStatusCard.tsx# Live service status and diagnostics component
        ├── App.tsx                 # Main layout presenting system foundation, pillars and diagnostics
        ├── main.tsx                # React 19 DOM root mounting
        ├── vite-env.d.ts           # Vite client environment TypeScript definitions
        └── index.css               # Tailwind CSS v4 import, neutral surface tokens and typography
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `PORT` | Number | No | `5000` | Port for the Express server to listen on. |
| `NODE_ENV` | String | No | `development` | Environment mode (development, production, test). |
| `MONGODB_URI` | String | **Yes** | None | MongoDB connection string (e.g., `mongodb://localhost:27017/where_did_my_money_go`). |
| `CORS_ORIGIN` | String | **Yes** | None | Exact authorized frontend origin (e.g., `http://localhost:5173`). Wildcard `*` is denied. |

> **Missing Configuration**: If `MONGODB_URI` or `CORS_ORIGIN` is omitted, the backend refuses to start and logs a clear, human-readable error with resolution instructions.

### Frontend Configuration (`frontend/.env`)

| Variable | Type | Required | Default | Description |
|---|---|---|---|---|
| `VITE_API_BASE_URL` | String | **Yes** | `http://localhost:5000/api/v1` | Base URL of the backend API, including protocol, host, port, and version prefix. |

---

## Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or later (Tested with Node v24)
- **npm**: v9.0.0 or later
- **MongoDB**: Local MongoDB instance (or MongoDB Atlas connection string)

### 1. Installation

Install dependencies for both applications from the root or inside each directory:

```bash
# Option A: From root directory
npm run install:all

# Option B: Individually
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Files

Create your local `.env` files from their respective `.env.example` templates:

```bash
# In backend/
cp .env.example .env

# In frontend/
cp .env.example .env
```

### 3. Running in Development Mode

Run the backend and frontend concurrently in two terminal tabs:

**Terminal 1 (Backend API):**
```bash
cd backend
npm run dev
# Starts with tsx watch on http://localhost:5000
```

**Terminal 2 (Frontend Client):**
```bash
cd frontend
npm run dev
# Starts with Vite on http://localhost:5173
```

Now open [http://localhost:5173](http://localhost:5173) in your browser. The frontend will ping the backend health endpoint and display real-time service status.

---

## Production Builds

Both frontend and backend are configured with standalone production build commands:

### Backend Production Build

```bash
cd backend
npm run build
npm run start
```
- `npm run build`: Cleans `dist/` with `rimraf` and compiles TypeScript to JavaScript via `tsc`.
- `npm run start`: Runs `node dist/server.js`.

### Frontend Production Build

```bash
cd frontend
npm run build
npm run preview
```
- `npm run build`: Type-checks via `tsc -b` and compiles an optimized production bundle using Vite.
- `npm run preview`: Locally previews the production build on a local server.

---

## API Endpoints

### `GET /api/v1/health`

Returns operational health diagnostics of the API and its database connection.

**Request:**
```http
GET /api/v1/health HTTP/1.1
Host: localhost:5000
```

**Success Response (HTTP 200 OK):**
```json
{
  "success": true,
  "data": {
    "name": "BucksBunny API",
    "status": "ok",
    "timestamp": "2026-10-15T21:14:46.731Z",
    "uptimeSeconds": 78,
    "environment": "development",
    "database": {
      "status": "connected",
      "isConnected": true
    }
  }
}
```

### Centralized Error Handling

All unhandled exceptions, operational errors, and 404s return a structured JSON response:

```json
{
  "success": false,
  "error": {
    "message": "Endpoint not found: [GET] /api/v1/unknown",
    "statusCode": 404
  }
}
```
*(In `NODE_ENV=development`, the error stack trace is also included in the JSON for debugging.)*

### CORS Enforcement

Requests from origins not matching `CORS_ORIGIN` are rejected with `HTTP 403 Forbidden`:
```json
{
  "success": false,
  "error": {
    "message": "Access denied by CORS policy. Origin \"http://malicious-site.com\" is not authorized.",
    "statusCode": 403
  }
}
```

---

## File Inventory and Explanation

Here is an explanation of every file created in this foundation and why it exists:

### Root Directory
- **`AGENTS.md`** and **`.agents/rules/bucksbunny-rules.md`**: Permanent source of truth for product identity, forbidden patterns, visual design direction, copying guidelines, privacy, security, and chunked workflow rules.
- **`.gitignore`**: Excludes dependencies (`node_modules`), build artifacts (`dist`, `build`), environment secret files (`.env`, `.env.*.local`), and local system logs from git commits.
- **`package.json`**: Provides convenient root-level scripts (`dev:backend`, `dev:frontend`, `build`, `install:all`) to manage both workspaces from one place.
- **`README.md`**: Complete architectural documentation, environment variables guide, execution instructions, and file explanations.

### Backend (`backend/`)
- **`package.json`**: Defines backend dependencies (`express`, `mongoose`, `cors`, `dotenv`) and dev tools (`typescript`, `tsx`, `rimraf`).
- **`tsconfig.json`**: Configures TypeScript compiler settings (`ES2022`, `CommonJS`, strict mode, output to `dist/`).
- **`.env.example`**: Documents required backend environment variables (`PORT`, `NODE_ENV`, `MONGODB_URI`, `CORS_ORIGIN`) without containing secrets.
- **`.gitignore`**: Backend-specific ignore rules for local builds and env files.
- **`src/config/env.ts`**: Centralized environment loader that validates required variables at startup and throws descriptive, actionable errors if configuration is missing.
- **`src/config/database.ts`**: Encapsulates the Mongoose connection lifecycle, handles connection event listeners (`connected`, `error`, `disconnected`), provides readyState status, and supports clean disconnection.
- **`src/errors/AppError.ts`**: Operational error class attaching HTTP status codes and metadata to differentiate client errors from internal bugs.
- **`src/middlewares/cors.middleware.ts`**: Strict CORS configuration that verifies incoming origins against the `CORS_ORIGIN` variable.
- **`src/middlewares/notFound.middleware.ts`**: Middleware that catches any unmapped HTTP route and passes a 404 `AppError` to the error handler.
- **`src/middlewares/error.middleware.ts`**: Centralized error-handling middleware that catches all errors and formats them into a clean, uniform JSON response.
- **`src/controllers/health.controller.ts`**: Handles the health check request, querying database ready state, server uptime, and environment.
- **`src/routes/api/v1/health.routes.ts`**: Declares routes for the health subsystem (`GET /`).
- **`src/routes/api/v1/index.ts`**: Aggregator for all API version 1 sub-routes.
- **`src/routes/index.ts`**: Primary router mounting the `/api/v1` namespace.
- **`src/app.ts`**: Initializes Express, configures security headers/CORS, attaches JSON and URL-encoded body parsers, and mounts routes and error middlewares.
- **`src/server.ts`**: Application entry point that loads config, connects to MongoDB, starts the HTTP server, and handles OS termination signals (`SIGINT`, `SIGTERM`) for graceful shutdown.

### Frontend (`frontend/`)
- **`package.json`**: Defines frontend dependencies (`react` 19, `react-dom` 19, `lucide-react`) and dev tools (`vite`, `@tailwindcss/vite`, `tailwindcss` v4, `typescript`).
- **`vite.config.ts`**: Vite configuration enabling React 19 fast refresh and the official `@tailwindcss/vite` plugin.
- **`tsconfig.json`**, **`tsconfig.app.json`**, **`tsconfig.node.json`**: Modular TypeScript project references config separating application source code from build configuration.
- **`index.html`**: Root HTML5 document with approved favicon (`/favicon.png`), Google Fonts (`Plus Jakarta Sans`, `JetBrains Mono`), and title.
- **`public/`**: Stores approved brand assets (`logo.png`, `logo-dark.jpg`, `favicon.png`).
- **`.env.example`**: Documents frontend environment variables (`VITE_API_BASE_URL`).
- **`.gitignore`**: Frontend-specific ignore rules.
- **`src/index.css`**: Tailwind CSS v4 entry point with `@import "tailwindcss";`, dark neutral surfaces, restrained financial green accents, and typography.
- **`src/config/env.ts`**: Loads and validates `VITE_API_BASE_URL` with helpful console warnings if missing.
- **`src/types/api.ts`**: TypeScript definitions for API responses and the health check data model.
- **`src/services/apiClient.ts`**: Reusable HTTP client wrapper around the browser `fetch` API supporting configurable base URLs, timeouts, JSON headers, and typed responses.
- **`src/services/healthService.ts`**: API service exposing the `checkHealth()` function.
- **`src/pages/PrivacyPolicy.tsx`**: Preserved Privacy Policy page with clear information regarding data collection, storage, and user isolation.
- **`src/pages/TermsAndConditions.tsx`**: Preserved Terms and Conditions page with financial disclaimers and permitted use policies.
- **`src/components/common/Badge.tsx`**: Reusable status and category badge component with restrained border radii.
- **`src/components/common/StatusIndicator.tsx`**: Calm indicator for service status.
- **`src/components/layout/Header.tsx`**: Header with approved brand logo, application title, and navigation for Overview, Privacy Policy, and Terms.
- **`src/components/layout/Footer.tsx`**: Footer with brand identity and links to Privacy Policy and Terms and Conditions.
- **`src/components/health/HealthStatusCard.tsx`**: Service status card displaying real-time API connection status, MongoDB connection state, uptime, and collapsible connection details.
- **`src/App.tsx`**: Main application page presenting product identity, core tracking pillars, live service status card, and view switching.
- **`src/main.tsx`**: React 19 entry point mounting the root application into the DOM.
