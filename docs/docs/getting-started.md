---
sidebar_position: 2
---

# Getting Started

This guide explains how to run Kickstat locally for development.

## Prerequisites

- **Node.js** 22+
- **PostgreSQL** 16+
- **Clerk account** (free) — [dashboard.clerk.com](https://dashboard.clerk.com)

## 1. Clone the repository

```sh
git clone <your-gitea-repo-url>
cd sport-coaching-tool
```

## 2. Create the database

```sh
createdb sportcoach
```

## 3. Configure environment variables

Create `backend/.env`:

```env
DATABASE_URL=postgresql://<your-pg-user>@localhost:5432/sportcoach
PORT=3000
NODE_ENV=development
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
FRONTEND_URL=http://localhost:5173
```

Create `frontend/.env`:

```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3000
```

:::note
Your Clerk keys are found in the [Clerk Dashboard](https://dashboard.clerk.com) under **API Keys**.
:::

## 4. Run migrations

```sh
cd backend
npm install
npx node-pg-migrate up
```

## 5. Start the servers

Open two terminal windows:

```sh
# Terminal 1 — Backend (port 3000)
cd backend
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## 6. Sign up

- Register with any email via Clerk
- You are automatically assigned the **Coach** role and a squad is created
- To add an assistant: go to **Dashboard → Invite an Assistant**, enter their email, and share the generated link

## Running Tests

```sh
cd backend
npm test          # Integration tests (Vitest + Supertest)
npm run lint      # ESLint

cd frontend
npm run build     # Production build + type check
npm run lint      # ESLint
```

## CI Pipeline

Every push to the repository triggers the Gitea Actions CI pipeline which:

1. Lints the frontend and backend
2. Builds the frontend
3. Spins up a PostgreSQL service container
4. Runs all backend migrations
5. Runs all integration tests

The pipeline uses `NODE_ENV=test` which activates a lightweight fake auth middleware — no real Clerk keys are needed in CI.
