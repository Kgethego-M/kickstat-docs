---
sidebar_position: 2
---

# Frontend Setup

The frontend is a React app built with [Vite](https://vite.dev), using
[Clerk](https://clerk.com) (`@clerk/clerk-react`) for authentication and
talking to the backend API over HTTP.

## Prerequisites

- Node.js 22 (matching the backend/CI)
- A running instance of the [backend](./backend.md), or its deployed URL

## Install dependencies

```bash
cd frontend
npm install
```

## Environment variables

Create a `.env` file in `frontend/` (never commit this file):

```bash
VITE_API_URL=http://localhost:5000
```

:::note
The frontend also uses Clerk's React SDK, which typically needs a publishable
key set as `VITE_CLERK_PUBLISHABLE_KEY`. Confirm the exact variable name
against your Clerk dashboard and add it here.
:::

## Run the dev server

```bash
npm run dev
```

Vite's dev server defaults to `http://localhost:5173` with hot module
reloading.

## Build for production

```bash
npm run build
```

## Linting

```bash
npm run lint
```

This runs ESLint across the codebase. See `frontend/eslint.config.js` in the
repo for project-specific rule overrides and why they're there (e.g. why
`react-hooks/set-state-in-effect` is disabled project-wide).
