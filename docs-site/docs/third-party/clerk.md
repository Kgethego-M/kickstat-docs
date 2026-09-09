---
sidebar_position: 1
---

# Clerk Authentication

## What Clerk does for us

[Clerk](https://clerk.com) is the authentication and user-management service for Kickstat. It handles:

- Sign-up, sign-in, password reset, and account deletion UI flows.
- Secure session tokens for both frontend and backend.
- Webhooks that notify our backend when a user is created or deleted, so our own `users` table stays in sync.

We chose Clerk because the project brief requires an established authentication library rather than a hand-rolled auth system, and its React/Express SDKs share the same user pool.

## Where Clerk is used

| Layer | Package | Purpose |
|---|---|---|
| Frontend | `@clerk/clerk-react` | `ClerkProvider`, `useAuth`, `useUser`, and the `<SignIn />` / `<SignUp />` components in `Home.jsx`. |
| Backend | `@clerk/express` | `clerkMiddleware`, `requireAuth`, `getAuth`, and the `user.created` / `user.deleted` webhook handlers in `webhooks.js`. |
| Reminders | `@clerk/express` | `clerkClient.users.getUser(...)` looks up the coach's primary email address before sending an event reminder. |

## Required environment variables

Add these to `backend/.env`:

```bash
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
```

And in `frontend/.env`:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
```

You can find all three keys in your Clerk dashboard under **API keys** and **Webhooks**.

## Webhook setup

1. In the Clerk dashboard, go to **Configure → Webhooks** and create an endpoint.
2. Set the URL to `https://<your-backend>/api/webhooks/clerk` (or `http://localhost:5000/api/webhooks/clerk` for local testing with a tool like `ngrok`).
3. Subscribe to `user.created` and `user.deleted` events.
4. Copy the **Signing secret** into `CLERK_WEBHOOK_SECRET`.

## Local development notes

- The backend `auth.js` middleware has a test fallback: if `@clerk/express` is unavailable (for example in a minimal CI environment), it reads `x-test-clerk-user-id` from the request header.
- Do not commit `.env` files. They are already listed in `.gitignore`.

## Compliance / attribution

Clerk's brand and trademarks belong to Clerk, Inc. We use Clerk under its standard terms of service. No Clerk code is modified or redistributed.
