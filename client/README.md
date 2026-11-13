# FlowPilot Client

The frontend application for **FlowPilot**, a multi-tenant workflow and
approval management platform.

This client is built with React, TypeScript, Vite, Material UI, and
React Router. It communicates with the FlowPilot Express backend through
Axios.

## Tech Stack

-   React
-   TypeScript
-   Vite
-   Material UI (MUI) and MUI Icons
-   React Router DOM
-   Axios
-   Context API for authentication state

## Project Structure

``` text
client/
├── .env
├── package.json
├── package-lock.json
└── src/
    ├── assets/
    │   └── ...
    ├── components/
    ├── context/
    │   └── AuthContext.tsx
    ├── hooks/
    ├── layouts/
    ├── pages/
    │   └── auth/
    │       ├── LoginPage.tsx
    │       └── RegisterPage.tsx
    ├── routes/
    │   └── ProtectedRoute.tsx
    ├── services/
    │   └── api.ts
    ├── App.tsx
    ├── App.css
    ├── index.css
    └── main.tsx
```

Some folders are currently reserved for upcoming frontend modules.

## Prerequisites

-   Node.js (use Node.js 22 or a compatible supported version)
-   npm
-   The FlowPilot backend running locally
-   A working MongoDB connection configured by the backend

## Installation

From the repository root, enter the client directory:

``` bash
cd client
```

Install dependencies:

``` bash
npm ci
```

If the project does not have a `package-lock.json`, use `npm install`
instead.

## Environment Configuration

Create a `.env` file inside the `client/` directory:

``` env
VITE_API_URL=http://localhost:5000
```

`VITE_API_URL` is the base URL of the backend API.

Important: - Do not put database credentials, JWT secrets, or other
private server secrets in the client environment. - Vite exposes
variables prefixed with `VITE_` to browser-side code. - Keep `.env` out
of Git. Commit a `.env.example` file if you want to document required
client variables.

After changing `.env`, restart the Vite development server.

## Running the Application

Start the backend in one terminal from the repository's `server/`
directory:

``` bash
npm run dev
```

Start the frontend in another terminal:

``` bash
cd client
npm run dev
```

Vite prints the local development URL. The default is:

``` text
http://localhost:5173
```

## Available Scripts

Run these commands from the `client/` directory.

  -----------------------------------------------------------------------
  Command                             Purpose
  ----------------------------------- -----------------------------------
  `npm run dev`                       Start the Vite development server

  `npm run build`                     Run TypeScript project build checks
                                      and create the production frontend
                                      build

  `npm run lint`                      Run ESLint

  `npm run preview`                   Preview the production build
                                      locally
  -----------------------------------------------------------------------

## Authentication

Authentication is connected to the backend and has been tested with a
working sign-in.

### Login

Route:

``` text
/login
```

The login page sends the email and password to:

``` text
POST /api/auth/login
```

The backend sets an HTTP-only JWT cookie. The client uses Axios with
`withCredentials: true`, so the browser can send that cookie on
subsequent API requests.

### Registration

Route:

``` text
/register
```

The registration page sends the user's name, email, password, and
optional organization name to:

``` text
POST /api/auth/register
```

The backend creates the user, a default organization, and an OWNER
membership, then sets the authentication cookie.

### Session restoration

When the application loads, `AuthProvider` calls:

``` text
GET /api/auth/me
```

The backend uses the cookie to identify the current user and returns the
user profile and active organization memberships. This allows the client
to restore the signed-in session after a page refresh.

### Logout

The authentication context calls:

``` text
POST /api/auth/logout
```

The backend clears the authentication cookie, and the client clears its
local authentication state.

### Protected routes

`ProtectedRoute` checks the authentication context: - While the session
is being checked, it displays a loading state. - If no authenticated
user exists, it redirects to `/login`. - If the user is authenticated,
it renders the protected page.

## API Client

The shared Axios instance is located at:

``` text
src/services/api.ts
```

It uses `VITE_API_URL` as its base URL and enables credentials. Use this
shared instance for backend requests rather than creating a separate
Axios instance in each page.

## Current Application Status

Implemented: - Login page - Registration page - Shared Axios API
client - Authentication context - Session restoration through
`/api/auth/me` - Protected-route component - React Router routes for
login, registration, and dashboard - Successful frontend production
build - Sign-in tested successfully against the backend

Still to be developed: - Full dashboard layout and overview -
Organization/workspace selector - Workflow management screens - Request
submission and tracking screens - Pending approvals and approval history
screens - Activity feed - Organization member management and admin
screens

At the current stage, `/dashboard` is an authenticated placeholder. It
is not yet the completed FlowPilot dashboard.

## Troubleshooting

### Login request fails

1.  Confirm the backend is running.
2.  Confirm `VITE_API_URL` points to the backend address.
3.  Confirm the backend can connect to MongoDB.
4.  Check the browser Network tab and backend terminal for the API
    error.

### Session is not restored after refresh

1.  Confirm Axios has `withCredentials: true`.
2.  Confirm the backend CORS configuration allows the frontend origin
    and credentials.
3.  Confirm the backend authentication cookie is being set.
4.  Check that the `/api/auth/me` endpoint is responding successfully.

### Frontend cannot reach the backend

-   Check that the backend is listening on the configured port.
-   Check `VITE_API_URL` in `client/.env`.
-   Restart Vite after changing environment variables.
-   Check for CORS errors in the browser console.

### Build fails

Run:

``` bash
npm run build
```

Read the first TypeScript or build error and fix it before continuing.
Do not ignore build failures before committing changes.

## Development Notes

-   Keep frontend code in TypeScript (`.tsx` for React components and
    `.ts` for non-UI modules).
-   Use Material UI for UI components and styling.
-   Keep API calls in the shared Axios client or dedicated service
    modules.
-   Keep authentication state in `AuthContext`.
-   Do not store JWT tokens in local storage; the backend uses an
    HTTP-only cookie.
-   Keep organization data scoped through the organization-specific
    backend endpoints.
-   Run `npm run build` before committing frontend changes.

------------------------------------------------------------------------

**FlowPilot Client** --- frontend for the FlowPilot workflow and
approval platform.
