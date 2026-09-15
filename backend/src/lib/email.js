const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendInviteEmail({ to, role, inviteLink, squadName }) {
  if (!resend) {
    // No API key configured — don't crash invite creation over it, just log
    // so the link is still visible for manual testing.
    console.warn('RESEND_API_KEY not set — invite email skipped. Link:', inviteLink);
    return false;
  }

  const roleLabel = role === 'athlete' ? 'an athlete' : 'an assistant coach';

  try {
    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'KickStat <onboarding@resend.dev>',
      to,
      subject: `You've been invited to join ${squadName} on KickStat`,
      html: `
        <p>You've been invited to join <strong>${squadName}</strong> as ${roleLabel} on KickStat.</p>
        <p><a href="${inviteLink}">Accept your invite</a></p>
        <p>Or paste this link into your browser:<br>${inviteLink}</p>
      `,
    });
    if (error) {
      // The Resend SDK returns API-level rejections (e.g. sandbox-domain
      // restriction, unverified domain) as `{ error }` in the response
      // rather than throwing — without this check those failures were
      // logged nowhere at all and looked identical to a successful send.
      console.error('Resend rejected the invite email:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    // A failed email shouldn't fail the whole request — the invite row and
    // link still exist, the coach can still share it manually.
    console.error('Failed to send invite email:', err.message);
    return false;
  }
}

module.exports = { sendInviteEmail };
