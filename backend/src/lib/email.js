const { Resend } = require('resend');

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function sendInviteEmail({ to, role, inviteLink, squadName }) {
  if (!resend) {
    console.warn('RESEND_API_KEY not set — invite email skipped. Link:', inviteLink);
    return false;
  }

  const roleLabel = role === 'athlete' ? 'an athlete' : 'an assistant coach';

  try {
    await resend.emails.send({
      from: 'KickStat <onboarding@resend.dev>',
      to,
      subject: `You've been invited to join ${squadName} on KickStat`,
      html: `
        <p>You've been invited to join <strong>${squadName}</strong> as ${roleLabel} on KickStat.</p>
        <p><a href="${inviteLink}">Accept your invite</a></p>
        <p>Or paste this link into your browser:<br>${inviteLink}</p>
      `,
    });
    return true;
  } catch (err) {
    console.error('Failed to send invite email:', err.message);
    return false;
  }
}

module.exports = { sendInviteEmail };