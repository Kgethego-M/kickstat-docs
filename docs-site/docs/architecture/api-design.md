---
sidebar_position: 2
---

# API Design

## Architecture style

Kickstat uses a **RESTful** API. Every resource (squads, athletes, events, fixtures, invites) is accessed through standard HTTP methods:

| Method | Purpose |
|--------|---------|
| `GET` | Read a resource or list |
| `POST` | Create a resource |
| `PATCH` | Partially update a resource |
| `DELETE` | Remove or soft-delete a resource |

## Base URL

All API endpoints are mounted under `/api` on the backend server.

| Environment | Base URL |
|-------------|----------|
| Local development | `http://localhost:3000/api` |
| Production | `https://kickstat-api-i2rc.onrender.com/api` |

## Authentication

Every `/api/*` route (except `/api/webhooks/clerk`) requires a valid Clerk JWT token in the `Authorization` header: