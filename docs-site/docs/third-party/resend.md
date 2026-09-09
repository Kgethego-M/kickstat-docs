---
sidebar_position: 4
---

# Resend Email Delivery

## What Resend does for us

[Resend](https://resend.com) is the transactional email service for Kickstat. It sends:

- **Assistant invite emails** with a sign-up link when a coach invites an assistant coach during onboarding.
- **Event reminder emails** to coaches when a scheduled event is within 24 hours.

We chose Resend because it has a straightforward Node.js SDK and a generous free tier for development.

## Where Resend is used

| Feature | File | Purpose |
|---|---|---|
| Assistant invites | `backend/src/lib/email.js` | `resend.emails.send(...)` sends the invite link if `RESEND_API_KEY` is configured. |
| Event reminders | `backend/src/lib/reminders.js` | The hourly sweep calls `resend.emails.send(...)` for upcoming events whose `reminder_sent` flag is still `false`. |

## Required environment variables

Add these to `backend/.env`:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=KickStat <reminders@example.com>
```

You can create an API key in the Resend dashboard under **API keys**.

## Local development notes

- If `RESEND_API_KEY` is not set, the backend logs a skip message and continues normally. This is useful for local development and CI where real email delivery is not needed.
- On a **free Resend account**, you can only send emails **to your own email address** (the address used to sign up for Resend) unless you verify a custom domain. If you try to send to another recipient, Resend returns a 403 error:

  ```text
  You can only send testing emails to your own email address (...).
  To send emails to other recipients, please verify a domain at resend.com/domains.
  ```

- For testing invites or reminders, use your own email address or a Gmail `+` alias of your own address (for example `youremail+coach@gmail.com`).

## Verifying a domain (optional)

To send emails to arbitrary recipients:

1. Own a domain (for example from Namecheap, GoDaddy, etc.).
2. In the Resend dashboard go to **Domains → Add domain**.
3. Enter the domain and region.
4. Add the DNS records Resend provides to your domain registrar's DNS settings.
5. Wait for Resend to verify the domain.
6. Update `EMAIL_FROM` in `backend/.env` to use an address on that domain, for example:

   ```bash
   EMAIL_FROM=KickStat <reminders@yourdomain.com>
   ```

## Compliance / attribution

Resend's brand and trademarks belong to Resend, Inc. We use Resend under its standard terms of service. No Resend code is modified or redistributed.
